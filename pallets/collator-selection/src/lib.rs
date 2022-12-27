// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

// Original license:
// Copyright (C) 2021 Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// todo:collator documentation
//! Collator Selection pallet.
//!
//! A pallet to manage collators in a parachain.
//!
//! ## Overview
//!
//! The Collator Selection pallet manages the collators of a parachain. **Collation is _not_ a
//! secure activity** and this pallet does not implement any game-theoretic mechanisms to meet BFT
//! safety assumptions of the chosen set.
//!
//! ## Terminology
//!
//! - Collator: A parachain block producer.
//! - Bond: An amount of `Balance` _reserved_ for candidate registration.
//! - Invulnerable: An account guaranteed to be in the collator set.
//!
//! ## Implementation
//!
//! The final `Collators` are aggregated from two individual lists:
//!
//! 1. [`Invulnerables`]: a set of collators appointed by governance. These accounts will always be
//!    collators.
//! 2. [`Candidates`]: these are *candidates to the collation task* and may or may not be elected as
//!    a final collator.
//!
//! The current implementation resolves congestion of [`Candidates`] in a first-come-first-serve
//! manner.
//!
//! Candidates will not be allowed to get kicked or leave_intent if the total number of candidates
//! fall below MinCandidates. This is for potential disaster recovery scenarios.
//!
//! ### Rewards
//!
//! The Collator Selection pallet maintains an on-chain account (the "Pot"). In each block, the
//! collator who authored it receives:
//!
//! - Half the value of the Pot.
//! - Half the value of the transaction fees within the block. The other half of the transaction
//!   fees are deposited into the Pot.
//!
//! To initiate rewards an ED needs to be transferred to the pot address.
//!
//! Note: Eventually the Pot distribution may be modified as discussed in
//! [this issue](https://github.com/paritytech/statemint/issues/21#issuecomment-810481073).

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

#[frame_support::pallet]
pub mod pallet {
	pub use crate::weights::WeightInfo;
	use core::ops::Div;
	use frame_support::{
		dispatch::{DispatchClass, DispatchResultWithPostInfo},
		inherent::Vec,
		pallet_prelude::*,
		sp_runtime::traits::{AccountIdConversion, CheckedSub, Saturating, Zero},
		traits::{
			Currency, EnsureOrigin, ExistenceRequirement::KeepAlive, ReservableCurrency,
			ValidatorRegistration,
		},
		BoundedVec, PalletId,
	};
	use frame_system::pallet_prelude::*;
	use pallet_session::SessionManager;
	use sp_runtime::{Perbill, traits::Convert};
	use pallet_configuration::{
		CollatorSelectionDesiredCollatorsOverride as DesiredCollators,
		CollatorSelectionLicenseBondOverride as LicenseBond,
		CollatorSelectionKickThresholdOverride as KickThreshold, BalanceOf,
	};
	use sp_staking::SessionIndex;

	/// A convertor from collators id. Since this pallet does not have stash/controller, this is
	/// just identity.
	pub struct IdentityCollator;
	impl<T> sp_runtime::traits::Convert<T, Option<T>> for IdentityCollator {
		fn convert(t: T) -> Option<T> {
			Some(t)
		}
	}

	/// Configure the pallet by specifying the parameters and types on which it depends.
	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_configuration::Config {
		/// Overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// Origin that can dictate updating parameters of this pallet.
		type UpdateOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		/// Account Identifier that holds the chain's treasury.
		type TreasuryAccountId: Get<Self::AccountId>;

		/// Account Identifier from which the internal Pot is generated.
		type PotId: Get<PalletId>;

		/// Maximum number of candidates and invulnerables that we should have. This is enforced in code.
		type MaxCollators: Get<u32>;

		/// If kicked, how much of the collator's deposit will be slashed and sent to the slash destination.
		type SlashRatio: Get<Perbill>;

		/// A stable ID for a validator.
		type ValidatorId: Member + Parameter;

		/// A conversion from account ID to validator ID.
		///
		/// Its cost must be at most one storage read.
		type ValidatorIdOf: Convert<Self::AccountId, Option<Self::ValidatorId>>;

		/// Validate a user is registered
		type ValidatorRegistration: ValidatorRegistration<Self::ValidatorId>;

		/// The weight information of this pallet.
		type WeightInfo: WeightInfo;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// The invulnerable, fixed collators.
	#[pallet::storage]
	#[pallet::getter(fn invulnerables)]
	pub type Invulnerables<T: Config> =
		StorageValue<_, BoundedVec<T::AccountId, T::MaxCollators>, ValueQuery>;

	/// The (community) collation license holders.
	#[pallet::storage]
	#[pallet::getter(fn license_deposit_of)]
	pub type LicenseDepositOf<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, BalanceOf<T>, ValueQuery>;

	/// The (community, limited) collation candidates.
	#[pallet::storage]
	#[pallet::getter(fn candidates)]
	pub type Candidates<T: Config> =
		StorageValue<_, BoundedVec<T::AccountId, T::MaxCollators>, ValueQuery>;

	/// Last block authored by collator.
	#[pallet::storage]
	#[pallet::getter(fn last_authored_block)]
	pub type LastAuthoredBlock<T: Config> =
		StorageMap<_, Twox64Concat, T::AccountId, T::BlockNumber, ValueQuery>;

	#[pallet::genesis_config]
	pub struct GenesisConfig<T: Config> {
		pub invulnerables: Vec<T::AccountId>,
	}

	#[cfg(feature = "std")]
	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self {
				invulnerables: Default::default(),
			}
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> GenesisBuild<T> for GenesisConfig<T> {
		fn build(&self) {
			let duplicate_invulnerables = self
				.invulnerables
				.iter()
				.collect::<std::collections::BTreeSet<_>>();
			assert!(
				duplicate_invulnerables.len() == self.invulnerables.len(),
				"duplicate invulnerables in genesis."
			);

			let bounded_invulnerables =
				BoundedVec::<_, T::MaxCollators>::try_from(self.invulnerables.clone())
					.expect("genesis invulnerables are more than T::MaxCollators");

			<Invulnerables<T>>::put(bounded_invulnerables);
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		InvulnerableAdded {
			invulnerable: T::AccountId,
		},
		InvulnerableRemoved {
			invulnerable: T::AccountId,
		},
		LicenseObtained {
			account_id: T::AccountId,
			deposit: BalanceOf<T>,
		},
		LicenseReleased {
			account_id: T::AccountId,
			deposit_returned: BalanceOf<T>,
		},
		CandidateAdded {
			account_id: T::AccountId,
		},
		CandidateRemoved {
			account_id: T::AccountId,
		},
	}

	// Errors inform users that something went wrong.
	#[pallet::error]
	pub enum Error<T> {
		/// Too many candidates
		TooManyCandidates,
		/// Unknown error
		Unknown,
		/// Permission issue
		Permission,
		/// User already holds license to collate
		AlreadyHoldingLicense,
		/// User does not hold a license to collate
		NoLicense,
		/// User is already a candidate
		AlreadyCandidate,
		/// User is not a candidate
		NotCandidate,
		/// Too many invulnerables
		TooManyInvulnerables,
		/// Too few invulnerables
		TooFewInvulnerables,
		/// User is already an Invulnerable
		AlreadyInvulnerable,
		/// User is not an Invulnerable
		NotInvulnerable,
		/// Account has no associated validator ID
		NoAssociatedValidatorId,
		/// Validator ID is not yet registered
		ValidatorNotRegistered,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Add a collator to the list of invulnerable (fixed) collators.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::add_invulnerable(T::MaxCollators::get()))] // todo:collator weight
		pub fn add_invulnerable(
			origin: OriginFor<T>,
			new: T::AccountId,
		) -> DispatchResultWithPostInfo {
			T::UpdateOrigin::ensure_origin(origin)?;

			// check if the new invulnerable has associated validator keys before it is added
			let validator_key = T::ValidatorIdOf::convert(new.clone())
				.ok_or(Error::<T>::NoAssociatedValidatorId)?;
			ensure!(
				T::ValidatorRegistration::is_registered(&validator_key),
				Error::<T>::ValidatorNotRegistered
			);
			if Self::invulnerables().contains(&new) {
				return Ok(().into());
			}

			<Invulnerables<T>>::try_append(new.clone())
				.map_err(|_| Error::<T>::TooManyInvulnerables)?;

			// try to offboard the new invulnerable if it was a collator candidate before
			let _ = Self::try_remove_candidate(&new);

			Self::deposit_event(Event::InvulnerableAdded { invulnerable: new });
			Ok(().into())
		}

		/// Remove a collator from the list of invulnerable (fixed) collators.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::remove_invulnerable(T::MaxCollators::get()))] // todo:collator weight
		pub fn remove_invulnerable(
			origin: OriginFor<T>,
			who: T::AccountId,
		) -> DispatchResultWithPostInfo {
			T::UpdateOrigin::ensure_origin(origin)?;

			<Invulnerables<T>>::try_mutate(|invulnerables| -> DispatchResult {
				if invulnerables.len() <= 1 {
					return Err(Error::<T>::TooFewInvulnerables.into());
				}

				let index = invulnerables
					.into_iter()
					.position(|r| *r == who)
					.ok_or(Error::<T>::NotInvulnerable)?;
				invulnerables.remove(index);
				Ok(())
			})?;
			Self::deposit_event(Event::InvulnerableRemoved { invulnerable: who });
			Ok(().into())
		}

		/// Purchase a license on block collation for this account.
		/// It does not make it a collator candidate, use `onboard` afterward. The account must
		/// (a) already have registered session keys and (b) be able to reserve the `LicenseBond`.
		///
		/// This call is not available to `Invulnerable` collators.
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::get_license(T::MaxCollators::get()))] // todo:collator weight
		pub fn get_license(origin: OriginFor<T>) -> DispatchResultWithPostInfo {
			// register_as_candidate
			let who = ensure_signed(origin)?;

			if LicenseDepositOf::<T>::contains_key(&who) {
				return Err(Error::<T>::AlreadyHoldingLicense.into());
			}

			let validator_key = T::ValidatorIdOf::convert(who.clone())
				.ok_or(Error::<T>::NoAssociatedValidatorId)?;
			ensure!(
				T::ValidatorRegistration::is_registered(&validator_key),
				Error::<T>::ValidatorNotRegistered
			);

			let deposit = <LicenseBond<T>>::get();

			T::Currency::reserve(&who, deposit)?;
			LicenseDepositOf::<T>::insert(who.clone(), deposit);

			Self::deposit_event(Event::LicenseObtained {
				account_id: who,
				deposit,
			});
			Ok(().into()) // Some(T::WeightInfo::register_as_candidate(current_count as u32)).into())
		}

		/// Register this account as a candidate for collators for next sessions.
		/// The account must already hold a license, and cannot offboard immediately during a session.
		///
		/// This call is not available to `Invulnerable` collators.
		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::onboard(T::MaxCollators::get()))] // todo:collator weight
		pub fn onboard(origin: OriginFor<T>) -> DispatchResultWithPostInfo {
			// register_as_candidate
			let who = ensure_signed(origin)?;

			// ensure the user obtained the license.
			ensure!(
				LicenseDepositOf::<T>::contains_key(&who),
				Error::<T>::NoLicense
			);
			// ensure we are below limit.
			let length = <Candidates<T>>::decode_len().unwrap_or_default()
				+ <Invulnerables<T>>::decode_len().unwrap_or_default();
			ensure!(
				(length as u32) < <DesiredCollators<T>>::get(),
				Error::<T>::TooManyCandidates
			);
			ensure!(
				!Self::invulnerables().contains(&who),
				Error::<T>::AlreadyInvulnerable
			);

			let current_count =
				<Candidates<T>>::try_mutate(|candidates| -> Result<usize, DispatchError> {
					if candidates.iter().any(|candidate| *candidate == who) {
						Err(Error::<T>::AlreadyCandidate)?
					} else {
						candidates
							.try_push(who.clone())
							.map_err(|_| Error::<T>::TooManyCandidates)?;
						// First authored block is current block plus kick threshold to handle session delay
						<LastAuthoredBlock<T>>::insert(
							who.clone(),
							frame_system::Pallet::<T>::block_number() + <KickThreshold<T>>::get(),
						);
						Ok(candidates.len())
					}
				})?;

			Self::deposit_event(Event::CandidateAdded { account_id: who });
			Ok(Some(T::WeightInfo::onboard(current_count as u32)).into())
		}

		/// Deregister `origin` as a collator candidate. Note that the collator can only leave on
		/// session change. The license to `onboard` later at any other time will remain.
		#[pallet::call_index(4)]
		#[pallet::weight(T::WeightInfo::offboard(T::MaxCollators::get()))] // todo:collator weight
		pub fn offboard(origin: OriginFor<T>) -> DispatchResultWithPostInfo {
			// leave_intent
			let who = ensure_signed(origin)?;
			let current_count = Self::try_remove_candidate(&who)?;

			Ok(Some(T::WeightInfo::offboard(current_count as u32)).into()) // todo:collator weight
		}

		/// Forfeit `origin`'s own license. The `LicenseBond` will be unreserved immediately.
		///
		/// This call is not available to `Invulnerable` collators.
		#[pallet::call_index(5)]
		#[pallet::weight(T::WeightInfo::release_license(T::MaxCollators::get()))] // todo:collator weight
		pub fn release_license(origin: OriginFor<T>) -> DispatchResultWithPostInfo {
			// leave_intent
			let who = ensure_signed(origin)?;

			let current_count = Self::try_remove_candidate_and_release_license(&who, false, true)?;

			Ok(Some(T::WeightInfo::release_license(current_count as u32)).into()) // todo:collator weight
		}

		/// Force deregister `origin` as a collator candidate as a governing authority, and revoke its license.
		/// Note that the collator can only leave on session change.
		/// The `LicenseBond` will be unreserved and returned immediately.
		///
		/// This call is, of course, not applicable to `Invulnerable` collators.
		#[pallet::call_index(6)]
		#[pallet::weight(T::WeightInfo::force_release_license(T::MaxCollators::get()))] // todo:collator weight
		pub fn force_release_license(
			origin: OriginFor<T>,
			who: T::AccountId,
		) -> DispatchResultWithPostInfo {
			// leave_intent
			T::UpdateOrigin::ensure_origin(origin)?;

			let current_count = Self::try_remove_candidate_and_release_license(&who, false, true)?;

			Ok(Some(T::WeightInfo::force_release_license(current_count as u32)).into()) // todo:collator weight
		}
	}

	impl<T: Config> Pallet<T> {
		/// Get a unique, inaccessible account id from the `PotId`.
		pub fn account_id() -> T::AccountId {
			T::PotId::get().into_account_truncating()
		}

		/// Removes a candidate and their license, optionally slashed and optionally ignoring,
		/// whether or not they actually are a candidate.
		fn try_remove_candidate_and_release_license(
			who: &T::AccountId,
			should_slash: bool,
			ignore_if_not_candidate: bool,
		) -> Result<usize, DispatchError> {
			let current_count = Self::try_remove_candidate(who);
			let current_count = if ignore_if_not_candidate
				&& current_count == Err(Error::<T>::NotCandidate.into())
			{
				<Candidates<T>>::decode_len().unwrap_or_default()
			} else {
				current_count?
			};
			Self::try_release_license(who, should_slash)?;
			Ok(current_count)
		}

		/// Removes a candidate from the collator pool for the next session if they exist.
		fn try_remove_candidate(who: &T::AccountId) -> Result<usize, DispatchError> {
			let current_count =
				<Candidates<T>>::try_mutate(|candidates| -> Result<usize, DispatchError> {
					let index = candidates
						.iter()
						.position(|candidate| *candidate == *who)
						.ok_or(Error::<T>::NotCandidate)?;
					candidates.remove(index);
					<LastAuthoredBlock<T>>::remove(who.clone());
					Ok(candidates.len())
				})?;
			Self::deposit_event(Event::CandidateRemoved {
				account_id: who.clone(),
			});
			Ok(current_count)
		}

		/// Removes a candidate if they exist and sends them back their deposit, optionally slashed.
		fn try_release_license(who: &T::AccountId, should_slash: bool) -> DispatchResult {
			let mut deposit_returned = BalanceOf::<T>::default();
			LicenseDepositOf::<T>::try_mutate_exists(who, |deposit| -> DispatchResult {
				if let Some(deposit) = deposit.take() {
					if should_slash {
						let slashed = T::SlashRatio::get() * deposit;
						let remaining = deposit - slashed;

						let (imbalance, _) = T::Currency::slash_reserved(who, slashed);
						//T::Currency::unreserve(who, remaining);
						deposit_returned = remaining;

						T::Currency::resolve_creating(&T::TreasuryAccountId::get(), imbalance);
					} else {
						//T::Currency::unreserve(who, deposit);
						deposit_returned = deposit;
					}

					T::Currency::unreserve(who, deposit_returned);
					Ok(())
				} else {
					Err(Error::<T>::NoLicense.into())
				}
			})?;
			Self::deposit_event(Event::LicenseReleased {
				account_id: who.clone(),
				deposit_returned,
			});
			Ok(())
		}

		/// Assemble the current set of candidates and invulnerables into the next collator set.
		///
		/// This is done on the fly, as frequent as we are told to do so, as the session manager.
		pub fn assemble_collators(
			candidates: BoundedVec<T::AccountId, T::MaxCollators>,
		) -> Vec<T::AccountId> {
			let mut collators = Self::invulnerables().to_vec();
			collators.extend(candidates);
			collators
		}

		/// Kicks out candidates that did not produce a block in the kick threshold
		/// and **confiscates** their deposits to the treasury.
		pub fn kick_stale_candidates(
			candidates: BoundedVec<T::AccountId, T::MaxCollators>,
		) -> BoundedVec<T::AccountId, T::MaxCollators> {
			let now = frame_system::Pallet::<T>::block_number();
			let kick_threshold = <KickThreshold<T>>::get();
			candidates
				.into_iter()
				.filter_map(|c| {
					let last_block = <LastAuthoredBlock<T>>::get(c.clone());
					let since_last = now.saturating_sub(last_block);
					if since_last < kick_threshold {
						Some(c)
					} else {
						let outcome = Self::try_remove_candidate_and_release_license(&c, true, false);
						if let Err(why) = outcome {
							log::warn!("Failed to kick collator and release license {:?}", why);
							debug_assert!(false, "failed to kick collator and release license {why:?}");
						}
						None
					}
				})
				.collect::<Vec<_>>()
				.try_into()
				.expect("filter_map operation can't result in a bounded vec larger than its original; qed")
		}
	}

	/// Keep track of number of authored blocks per authority, uncles are counted as well since
	/// they're a valid proof of being online.
	impl<T: Config + pallet_authorship::Config>
		pallet_authorship::EventHandler<T::AccountId, T::BlockNumber> for Pallet<T>
	{
		fn note_author(author: T::AccountId) {
			let pot = Self::account_id();
			// assumes an ED will be sent to pot.
			let reward = T::Currency::free_balance(&pot)
				.checked_sub(&T::Currency::minimum_balance())
				.unwrap_or_else(Zero::zero)
				.div(2u32.into());
			// `reward` is half of pot account minus ED, this should never fail.
			let _success = T::Currency::transfer(&pot, &author, reward, KeepAlive);
			debug_assert!(_success.is_ok());
			<LastAuthoredBlock<T>>::insert(author, frame_system::Pallet::<T>::block_number());

			frame_system::Pallet::<T>::register_extra_weight_unchecked(
				T::WeightInfo::note_author(),
				DispatchClass::Mandatory,
			);
		}

		fn note_uncle(_author: T::AccountId, _age: T::BlockNumber) {
			//TODO can we ignore this?
		}
	}

	/// Play the role of the session manager.
	impl<T: Config> SessionManager<T::AccountId> for Pallet<T> {
		fn new_session(index: SessionIndex) -> Option<Vec<T::AccountId>> {
			log::info!(
				"assembling new collators for new session {} at #{:?}",
				index,
				<frame_system::Pallet<T>>::block_number(),
			);

			let candidates = Self::candidates();
			let candidates_len_before = candidates.len();
			let active_candidates = Self::kick_stale_candidates(candidates);
			let removed = candidates_len_before - active_candidates.len();
			let result = Self::assemble_collators(active_candidates);

			frame_system::Pallet::<T>::register_extra_weight_unchecked(
				T::WeightInfo::new_session(candidates_len_before as u32, removed as u32),
				DispatchClass::Mandatory,
			);
			Some(result)
		}
		fn start_session(_: SessionIndex) {
			// we don't care.
		}
		fn end_session(_: SessionIndex) {
			// we don't care.
		}
	}
}
