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

//! # App Promotion pallet
//!
//! The pallet implements the mechanics of staking and sponsoring collections/contracts.
//!
//! - [`Config`]
//! - [`Pallet`]
//! - [`Error`]
//! - [`Event`]
//!
//! ## Overview
//! The App Promotion pallet allows fund holders to stake at a certain daily rate of return.
//! The mechanics implemented in the pallet allow it to act as a sponsor for collections / contracts,
//! the list of which is set by the pallet administrator.
//!
//!
//! ## Interface
//!	The pallet provides interfaces for funds, collection/contract operations (see [types] module).

//!
//! ### Dispatchable Functions
//!	- [`set_admin_address`][`Pallet::set_admin_address`] - sets an address as the the admin.
//! - [`stake`][`Pallet::stake`] - stakes the amount of native tokens.
//! - [`unstake`][`Pallet::unstake`] - unstakes all stakes.
//! - [`sponsor_collection`][`Pallet::sponsor_collection`] - sets the pallet to be the sponsor for the collection.
//! - [`stop_sponsoring_collection`][`Pallet::stop_sponsoring_collection`] - removes the pallet as the sponsor for the collection.
//! - [`sponsor_contract`][`Pallet::sponsor_contract`] - sets the pallet to be the sponsor for the contract.
//! - [`stop_sponsoring_contract`][`Pallet::stop_sponsoring_contract`] - removes the pallet as the sponsor for the contract.
//! - [`payout_stakers`][`Pallet::payout_stakers`] - recalculates interest for the specified number of stakers.
//!

// #![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

pub mod types;
pub mod weights;

use sp_std::{
	vec::{Vec},
	vec,
	iter::Sum,
	borrow::ToOwned,
	cell::RefCell,
};
use sp_core::H160;
use codec::EncodeLike;
use pallet_balances::BalanceLock;
pub use types::*;

use up_data_structs::CollectionId;

use frame_support::{
	dispatch::{DispatchResult},
	traits::{
		Get, LockableCurrency,
		tokens::Balance,
		fungible::{Inspect, InspectFreeze, Mutate, MutateFreeze},
	},
	ensure, BoundedVec,
};

use weights::WeightInfo;

pub use pallet::*;
use pallet_evm::account::CrossAccountId;
use sp_runtime::{
	Perbill,
	traits::{BlockNumberProvider, CheckedAdd, CheckedSub, AccountIdConversion, Zero},
	ArithmeticError,
};

pub const LOCK_IDENTIFIER: [u8; 8] = *b"appstake";

const PENDING_LIMIT_PER_BLOCK: u32 = 3;

type BalanceOf<T> =
	<<T as Config>::Currency as Inspect<<T as frame_system::Config>::AccountId>>::Balance;

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use frame_support::{
		Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key, PalletId, weights::Weight,
	};
	use frame_system::pallet_prelude::*;
	use sp_runtime::DispatchError;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm::Config + pallet_configuration::Config
	{
		/// Type to interact with the native token
		type Currency: MutateFreeze<Self::AccountId>
			+ Mutate<Self::AccountId>
			+ ExtendedLockableCurrency<
				Self::AccountId,
				Balance = <<Self as Config>::Currency as Inspect<Self::AccountId>>::Balance,
			>;

		/// Type for interacting with collections
		type CollectionHandler: CollectionHandler<
			AccountId = Self::AccountId,
			CollectionId = CollectionId,
		>;

		/// Type for interacting with conrtacts
		type ContractHandler: ContractHandler<AccountId = Self::CrossAccountId, ContractId = H160>;

		/// `AccountId` for treasury
		type TreasuryAccountId: Get<Self::AccountId>;

		/// The app's pallet id, used for deriving its sovereign account address.
		#[pallet::constant]
		type PalletId: Get<PalletId>;

		/// Freeze identifier used by the pallet
		#[pallet::constant]
		type FreezeIdentifier: Get<
			<<Self as Config>::Currency as InspectFreeze<Self::AccountId>>::Id,
		>;

		/// In relay blocks.
		#[pallet::constant]
		type RecalculationInterval: Get<Self::BlockNumber>;

		/// In parachain blocks.
		#[pallet::constant]
		type PendingInterval: Get<Self::BlockNumber>;

		/// Rate of return for interval in blocks defined in `RecalculationInterval`.
		#[pallet::constant]
		type IntervalIncome: Get<Perbill>;

		/// Decimals for the `Currency`.
		#[pallet::constant]
		type Nominal: Get<BalanceOf<Self>>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		// The relay block number provider
		type RelayBlockNumberProvider: BlockNumberProvider<BlockNumber = Self::BlockNumber>;

		/// Events compatible with [`frame_system::Config::Event`].
		type RuntimeEvent: IsType<<Self as frame_system::Config>::RuntimeEvent> + From<Event<Self>>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Staking recalculation was performed
		///
		/// # Arguments
		/// * AccountId: account of the staker.
		/// * Balance : recalculation base
		/// * Balance : total income
		StakingRecalculation(
			/// An recalculated staker
			T::AccountId,
			/// Base on which interest is calculated
			BalanceOf<T>,
			/// Amount of accrued interest
			BalanceOf<T>,
		),

		/// Staking was performed
		///
		/// # Arguments
		/// * AccountId: account of the staker
		/// * Balance : staking amount
		Stake(T::AccountId, BalanceOf<T>),

		/// Unstaking was performed
		///
		/// # Arguments
		/// * AccountId: account of the staker
		/// * Balance : unstaking amount
		Unstake(T::AccountId, BalanceOf<T>),

		/// The admin was set
		///
		/// # Arguments
		/// * AccountId: account address of the admin
		SetAdmin(T::AccountId),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Error due to action requiring admin to be set.
		AdminNotSet,
		/// No permission to perform an action.
		NoPermission,
		/// Insufficient funds to perform an action.
		NotSufficientFunds,
		/// Occurs when a pending unstake cannot be added in this block. PENDING_LIMIT_PER_BLOCK` limits exceeded.
		PendingForBlockOverflow,
		/// The error is due to the fact that the collection/contract must already be sponsored in order to perform the action.
		SponsorNotSet,
		/// Errors caused by insufficient staked balance.
		InsufficientStakedBalance,
		/// Errors caused by incorrect state of a staker in context of the pallet.
		InconsistencyState,
	}

	/// Stores the total staked amount.
	#[pallet::storage]
	pub type TotalStaked<T: Config> = StorageValue<Value = BalanceOf<T>, QueryKind = ValueQuery>;

	/// Stores the `admin` account. Some extrinsics can only be executed if they were signed by `admin`.
	#[pallet::storage]
	pub type Admin<T: Config> = StorageValue<Value = T::AccountId, QueryKind = OptionQuery>;

	/// Stores the amount of tokens staked by account in the blocknumber.
	///
	/// * **Key1** - Staker account.
	/// * **Key2** - Relay block number when the stake was made.
	/// * **(Balance, BlockNumber)** - Balance of the stake.
	/// The number of the relay block in which we must perform the interest recalculation
	#[pallet::storage]
	pub type Staked<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, T::AccountId>,
			Key<Twox64Concat, T::BlockNumber>,
		),
		Value = (BalanceOf<T>, T::BlockNumber),
		QueryKind = ValueQuery,
	>;

	/// Stores number of stake records for an `Account`.
	///
	/// * **Key** - Staker account.
	/// * **Value** - Amount of stakes.
	#[pallet::storage]
	pub type StakesPerAccount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u8, ValueQuery>;

	/// Pending unstake records for an `Account`.
	///
	/// * **Key** - Staker account.
	/// * **Value** - Amount of stakes.
	#[pallet::storage]
	pub type PendingUnstake<T: Config> = StorageMap<
		_,
		Twox64Concat,
		T::BlockNumber,
		BoundedVec<(T::AccountId, BalanceOf<T>), ConstU32<PENDING_LIMIT_PER_BLOCK>>,
		ValueQuery,
	>;

	/// Stores a key for record for which the revenue recalculation was performed.
	/// If `None`, then recalculation has not yet been performed or calculations have been completed for all stakers.
	#[pallet::storage]
	#[pallet::getter(fn get_next_calculated_record)]
	pub type PreviousCalculatedRecord<T: Config> =
		StorageValue<Value = (T::AccountId, T::BlockNumber), QueryKind = OptionQuery>;

	// #[pallet::storage]
	// pub(crate) type UpgradedToFreezes<T: Config> =
	// 	StorageValue<Value = bool, QueryKind = ValueQuery>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Block overflow is impossible due to the fact that the unstake algorithm in on_initialize
		/// implies the execution of a strictly limited number of relatively lightweight operations.
		/// A separate benchmark has been implemented to scale the weight depending on the number of pendings.
		fn on_initialize(current_block_number: T::BlockNumber) -> Weight
		where
			<T as frame_system::Config>::BlockNumber: From<u32>,
		{
			let block_pending = PendingUnstake::<T>::take(current_block_number);
			let counter = block_pending.len() as u32;

			if !block_pending.is_empty() {
				block_pending.into_iter().for_each(|(staker, amount)| {
					Self::get_frozen_balance(&staker).map(|b| {
						let new_state = b.checked_sub(&amount).unwrap_or_default();
						Self::set_freeze_unchecked(&staker, new_state);
					});
				});
			}

			<T as Config>::WeightInfo::on_initialize(counter)
		}

		// fn on_runtime_upgrade() -> Weight {
		// 	use scale_info::prelude::collections::HashSet;
		// 	let mut consumed_weight = Weight::zero();
		// 	let mut add_weight = |reads, writes, weight| {
		// 		consumed_weight += T::DbWeight::get().reads_writes(reads, writes);
		// 		consumed_weight += weight;
		// 	};

		// 	let mut stakes_unstakes = vec![];

		// 	if <UpgradedToFreezes<T>>::get() {
		// 		add_weight(1, 0, Weight::zero());
		// 		return consumed_weight;
		// 	} else {
		// 		add_weight(1, 1, Weight::zero());
		// 		<UpgradedToFreezes<T>>::set(true);
		// 	}
		// 	<Staked<T>>::iter_keys().for_each(|(staker_id, _)| {
		// 		add_weight(1, 0, Weight::zero());
		// 		stakes_unstakes.push(staker_id);
		// 	});

		// 	<PendingUnstake<T>>::iter().for_each(|(_, v)| {
		// 		add_weight(1, 0, Weight::zero());
		// 		v.into_iter().for_each(|(staker, _)| {
		// 			stakes_unstakes.push(staker);
		// 		});
		// 	});

		// 	// filter duplicated id.
		// 	stakes_unstakes = stakes_unstakes
		// 		.into_iter()
		// 		.map(|key| key)
		// 		.collect::<HashSet<_>>()
		// 		.into_iter()
		// 		.collect();

		// 	stakes_unstakes
		// 		.map(|a| (a, <Pallet<T>>::get_locked_balance(&a).amount))
		// 		.for_each(|(staker, amount)| {
		// 			<<T as Config>::Currency as LockableCurrency<T::AccountId>>::remove_lock(
		// 				LOCK_IDENTIFIER,
		// 				&staker,
		// 			);
		// 			<<T as Config>::Currency as MutateFreeze<T::AccountId>>::set_freeze(
		// 				&<T as Config>::FreezeIdentifier::get(),
		// 				&staker,
		// 				amount,
		// 			);
		// 			add_weight(1, 2, Weight::zero())
		// 		});

		// 	consumed_weight
		// }

		// #[cfg(feature = "try-runtime")]
		// fn pre_upgrade() -> Result<Vec<u8>, &'static str> {
		// 	use sp_std::collections::btree_map::BTreeMap;
		// 	if <UpgradedToFreezes<T>>::get() {
		// 		return Ok(Default::default());
		// 	}
		// 	// Staker -> (total (stakes and unstakes) locked by promotion);
		// 	let mut pre_state: BTreeMap<T::AccountId, BalanceOf<T>> = BTreeMap::new();

		// 	<Staked<T>>::iter().for_each(|((staker, _), (amount, _))| {
		// 		if let Some(locked_balance) = pre_state.get_mut(&staker) {
		// 			*locked_balance += amount;
		// 		} else {
		// 			pre_state.insert(staker, amount);
		// 		}
		// 	});

		// 	<PendingUnstake<T>>::iter().for_each(|(_, v)| {
		// 		v.into_iter().for_each(|(staker, amount)| {
		// 			if let Some(locked_balance) = pre_state.get_mut(&staker) {
		// 				*locked_balance += amount;
		// 			} else {
		// 				pre_state.insert(staker, amount);
		// 			}
		// 		})
		// 	});

		// 	Ok(pre_state.encode())
		// }

		// #[cfg(feature = "try-runtime")]
		// fn post_upgrade(pre_state: Vec<u8>) -> Result<(), &'static str> {
		// 	use sp_std::collections::btree_map::BTreeMap;

		// 	if <UpgradedToFreezes<T>>::get() {
		// 		return Ok(());
		// 	}

		// 	let mut is_ok = true;

		// 	let pre_state: BTreeMap<T::AccountId, BalanceOf<T>> =
		// 		Decode::decode(&mut &pre_state[..]).map_err(|_| "failed to decode pre_state")?;
		// 	for (staker, frozen_by_promo) in pre_state.into_iter() {
		// 		let storage_freeze_state = <<T as Config>::Currency as InspectFreeze<
		// 			T::AccountId,
		// 		>>::balance_frozen(
		// 			&<T as Config>::FreezeIdentifier::get(), staker
		// 		);
		// 		if storage_freeze_state != frozen_by_promo {
		// 			is_ok = false;
		// 			log::error!(
		// 						"Incorrect frozen balance for {:?}. New balance: {:?}. Before runtime upgrade: locked by promo - {:?}",
		// 						staker, storage_freeze_state, frozen_by_promo
		// 					);
		// 		}

		// 		if !<Pallet<T>>::get_locked_balance(&staker).amount.is_zero() {
		// 			is_ok = false;
		// 			log::error!(
		// 				"Incorrect(non-zero) locked by app promo balance for {:?}",
		// 				staker
		// 			);
		// 		}
		// 	}

		// 	if is_ok {
		// 		Ok(())
		// 	} else {
		// 		Err("Incorrect balance for some of stakers... See logs")
		// 	}
		// }
	}

	#[pallet::call]
	impl<T: Config> Pallet<T>
	where
		T::BlockNumber: From<u32> + Into<u32>,
		<<T as Config>::Currency as Inspect<T::AccountId>>::Balance: Sum + From<u128>,
	{
		/// Sets an address as the the admin.
		///
		/// # Permissions
		///
		/// * Sudo
		///
		/// # Arguments
		///
		/// * `admin`: account of the new admin.
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::set_admin_address())]
		pub fn set_admin_address(origin: OriginFor<T>, admin: T::CrossAccountId) -> DispatchResult {
			ensure_root(origin)?;

			<Admin<T>>::set(Some(admin.as_sub().to_owned()));

			Self::deposit_event(Event::SetAdmin(admin.as_sub().to_owned()));

			Ok(())
		}

		/// Stakes the amount of native tokens.
		/// Sets `amount` to the locked state.
		/// The maximum number of stakes for a staker is 10.
		///
		/// # Arguments
		///
		/// * `amount`: in native tokens.
		#[pallet::call_index(1)]
		#[pallet::weight(<T as Config>::WeightInfo::stake())]
		pub fn stake(staker: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			ensure!(
				StakesPerAccount::<T>::get(&staker_id) < 10,
				Error::<T>::NoPermission
			);

			ensure!(
				amount >= <BalanceOf<T>>::from(100u128) * T::Nominal::get(),
				ArithmeticError::Underflow
			);
			let config = <PalletConfiguration<T>>::get();

			let balance = <<T as Config>::Currency as Inspect<T::AccountId>>::balance(&staker_id);

			// checks that we can freeze `amount` on the `staker` account.
			ensure!(
				amount
					<= match Self::get_frozen_balance(&staker_id) {
						Some(frozen_by_pallet) => balance
							.checked_sub(&frozen_by_pallet)
							.ok_or(ArithmeticError::Underflow)?,
						None => balance,
					},
				ArithmeticError::Underflow
			);

			Self::add_freeze_balance(&staker_id, amount)?;

			let block_number = T::RelayBlockNumberProvider::current_block_number();

			// Calculation of the number of recalculation periods,
			// after how much the first interest calculation should be performed for the stake
			let recalculate_after_interval: T::BlockNumber =
				if block_number % config.recalculation_interval == 0u32.into() {
					1u32.into()
				} else {
					2u32.into()
				};

			// Сalculation of the number of the relay block
			// in which it is necessary to accrue remuneration for the stake.
			let recalc_block = (block_number / config.recalculation_interval
				+ recalculate_after_interval)
				* config.recalculation_interval;

			<Staked<T>>::insert((&staker_id, block_number), {
				let mut balance_and_recalc_block = <Staked<T>>::get((&staker_id, block_number));
				balance_and_recalc_block.0 = balance_and_recalc_block
					.0
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?;
				balance_and_recalc_block.1 = recalc_block;
				balance_and_recalc_block
			});

			<TotalStaked<T>>::set(
				<TotalStaked<T>>::get()
					.checked_add(&amount)
					.ok_or(ArithmeticError::Overflow)?,
			);

			StakesPerAccount::<T>::mutate(&staker_id, |stakes| *stakes += 1);

			Self::deposit_event(Event::Stake(staker_id, amount));

			Ok(())
		}

		/// Unstakes all stakes.
		/// After the end of `PendingInterval` this sum becomes completely
		/// free for further use.
		#[pallet::call_index(2)]
		#[pallet::weight(<T as Config>::WeightInfo::unstake_all())]
		pub fn unstake_all(staker: OriginFor<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			Self::unstake_all_internal(staker_id)
		}

		/// Unstakes the amount of balance for the staker.
		/// After the end of `PendingInterval` this sum becomes completely
		/// free for further use.
		///
		///  # Arguments
		///
		/// * `staker`: staker account.
		/// * `amount`: amount of unstaked funds.
		#[pallet::call_index(8)]
		#[pallet::weight(<T as Config>::WeightInfo::unstake_partial())]
		pub fn unstake_partial(staker: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let staker_id = ensure_signed(staker)?;

			Self::unstake_partial_internal(staker_id, amount)
		}

		/// Sets the pallet to be the sponsor for the collection.
		///
		/// # Permissions
		///
		/// * Pallet admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection that will be sponsored by `pallet_id`
		#[pallet::call_index(3)]
		#[pallet::weight(<T as Config>::WeightInfo::sponsor_collection())]
		pub fn sponsor_collection(
			admin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;
			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			T::CollectionHandler::set_sponsor(Self::account_id(), collection_id)
		}

		/// Removes the pallet as the sponsor for the collection.
		/// Returns [`NoPermission`][`Error::NoPermission`]
		/// if the pallet wasn't the sponsor.
		///
		/// # Permissions
		///
		/// * Pallet admin
		///
		/// # Arguments
		///
		/// * `collection_id`: ID of the collection that is sponsored by `pallet_id`
		#[pallet::call_index(4)]
		#[pallet::weight(<T as Config>::WeightInfo::stop_sponsoring_collection())]
		pub fn stop_sponsoring_collection(
			admin: OriginFor<T>,
			collection_id: CollectionId,
		) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			ensure!(
				T::CollectionHandler::sponsor(collection_id)?.ok_or(<Error<T>>::SponsorNotSet)?
					== Self::account_id(),
				<Error<T>>::NoPermission
			);
			T::CollectionHandler::remove_collection_sponsor(collection_id)
		}

		/// Sets the pallet to be the sponsor for the contract.
		///
		/// # Permissions
		///
		/// * Pallet admin
		///
		/// # Arguments
		///
		/// * `contract_id`: the contract address that will be sponsored by `pallet_id`
		#[pallet::call_index(5)]
		#[pallet::weight(<T as Config>::WeightInfo::sponsor_contract())]
		pub fn sponsor_contract(admin: OriginFor<T>, contract_id: H160) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			T::ContractHandler::set_sponsor(
				T::CrossAccountId::from_sub(Self::account_id()),
				contract_id,
			)
		}

		/// Removes the pallet as the sponsor for the contract.
		/// Returns [`NoPermission`][`Error::NoPermission`]
		/// if the pallet wasn't the sponsor.
		///
		/// # Permissions
		///
		/// * Pallet admin
		///
		/// # Arguments
		///
		/// * `contract_id`: the contract address that is sponsored by `pallet_id`
		#[pallet::call_index(6)]
		#[pallet::weight(<T as Config>::WeightInfo::stop_sponsoring_contract())]
		pub fn stop_sponsoring_contract(admin: OriginFor<T>, contract_id: H160) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);

			ensure!(
				T::ContractHandler::sponsor(contract_id)?
					.ok_or(<Error<T>>::SponsorNotSet)?
					.as_sub() == &Self::account_id(),
				<Error<T>>::NoPermission
			);
			T::ContractHandler::remove_contract_sponsor(contract_id)
		}

		/// Recalculates interest for the specified number of stakers.
		/// If all stakers are not recalculated, the next call of the extrinsic
		/// will continue the recalculation, from those stakers for whom this
		/// was not perform in last call.
		///
		/// # Permissions
		///
		/// * Pallet admin
		///
		/// # Arguments
		///
		/// * `stakers_number`: the number of stakers for which recalculation will be performed
		#[pallet::call_index(7)]
		#[pallet::weight(<T as Config>::WeightInfo::payout_stakers(stakers_number.unwrap_or(DEFAULT_NUMBER_PAYOUTS) as u32))]
		pub fn payout_stakers(admin: OriginFor<T>, stakers_number: Option<u8>) -> DispatchResult {
			let admin_id = ensure_signed(admin)?;

			ensure!(
				admin_id == Admin::<T>::get().ok_or(Error::<T>::AdminNotSet)?,
				Error::<T>::NoPermission
			);
			let config = <PalletConfiguration<T>>::get();

			let mut stakers_number = stakers_number.unwrap_or(DEFAULT_NUMBER_PAYOUTS);

			ensure!(
				stakers_number <= config.max_stakers_per_calculation && stakers_number != 0,
				Error::<T>::NoPermission
			);

			// calculate the number of the current recalculation block,
			// this is necessary in order to understand which stakers we should calculate interest
			let current_recalc_block = Self::get_current_recalc_block(
				T::RelayBlockNumberProvider::current_block_number(),
				&config,
			);

			// calculate the number of the next recalculation block,
			// this value is set for the stakers to whom the recalculation will be performed
			let next_recalc_block = current_recalc_block + config.recalculation_interval;

			let mut storage_iterator = Self::get_next_calculated_key()
				.map_or(Staked::<T>::iter(), |key| Staked::<T>::iter_from(key));

			PreviousCalculatedRecord::<T>::set(None);

			{
				// Address handled in the last payout loop iteration (below)
				let last_id = RefCell::new(None);
				// Block number (as a part of the key) for which calculation was performed in the last payout loop iteration
				let mut last_staked_calculated_block = Default::default();
				// Reward balance for the address in the iteration
				let income_acc = RefCell::new(BalanceOf::<T>::default());
				// Staked balance for the address in the iteration (before stake is recalculated)
				let amount_acc = RefCell::new(BalanceOf::<T>::default());

				// This closure is used to finalize handling single staker address in each of the two conditions: (1) when we break out of the payout
				// loop because we reached the number of stakes for rewarding, (2) When all stakes by the single address are handled and the payout
				// loop switches to handling the next staker address:
				//   1. Transfer full reward amount to the payee
				//   2. Lock the reward in staking lock
				//   3. Update TotalStaked amount
				//   4. Issue StakingRecalculation event
				let flush_stake = || -> DispatchResult {
					if let Some(last_id) = &*last_id.borrow() {
						if !income_acc.borrow().is_zero() {
							<<T as Config>::Currency as Mutate<T::AccountId>>::transfer(
								&T::TreasuryAccountId::get(),
								last_id,
								*income_acc.borrow(),
								frame_support::traits::tokens::Preservation::Protect,
							)?;

							Self::add_freeze_balance(last_id, *income_acc.borrow())?;
							<TotalStaked<T>>::try_mutate(|staked| -> DispatchResult {
								*staked = staked
									.checked_add(&*income_acc.borrow())
									.ok_or(ArithmeticError::Overflow)?;
								Ok(())
							})?;

							Self::deposit_event(Event::StakingRecalculation(
								last_id.clone(),
								*amount_acc.borrow(),
								*income_acc.borrow(),
							));
						}

						*income_acc.borrow_mut() = BalanceOf::<T>::default();
						*amount_acc.borrow_mut() = BalanceOf::<T>::default();
					}
					Ok(())
				};

				// Reward payment loop. Should loop for no more than config.max_stakers_per_calculation
				// iterations in one extrinsic call
				//
				// stakers_number - keeps the remaining number of iterations (staker addresses to handle)
				// next_recalc_block_for_stake - is taken from the state and stores the starting relay block from which reward should be paid out
				// income_acc - stores the reward amount to pay to the staker address (accumulates over all address stake records)
				while let Some((
					(current_id, staked_block),
					(amount, next_recalc_block_for_stake),
				)) = storage_iterator.next()
				{
					// last_id is not equal current_id when we switch to handling a new staker address
					// or just start handling the very first address. In the latter case last_id will be None and
					// flush_stake will do nothing
					if last_id.borrow().as_ref() != Some(&current_id) {
						if stakers_number > 0 {
							flush_stake()?;
							*last_id.borrow_mut() = Some(current_id.clone());
							stakers_number -= 1;
						}
						// Break out if we reached the address limit
						else {
							if let Some(staker) = &*last_id.borrow() {
								// Save the last calculated record to pick up in the next extrinsic call
								PreviousCalculatedRecord::<T>::set(Some((
									staker.clone(),
									last_staked_calculated_block,
								)));
							}
							break;
						};
					};

					// Increase accumulated reward for current address and update current staking record, i.e. (address, staked_block) -> amount
					if current_recalc_block >= next_recalc_block_for_stake {
						*amount_acc.borrow_mut() += amount;
						Self::recalculate_and_insert_stake(
							&current_id,
							staked_block,
							next_recalc_block,
							amount,
							((current_recalc_block - next_recalc_block_for_stake)
								/ config.recalculation_interval)
								.into() + 1,
							&mut *income_acc.borrow_mut(),
						);
					}
					last_staked_calculated_block = staked_block;
				}
				flush_stake()?;
			}

			Ok(())
		}

		///  Migrates lock state into freeze one
		///
		///  # Arguments
		///
		/// * `origin`: Must be `Signed`.
		/// * `stakers`: Accounts to be upgraded.
		#[pallet::call_index(9)]
		#[pallet::weight(T::DbWeight::get().reads_writes(2, 2) * stakers.len() as u64)]
		pub fn upgrade_accounts(
			origin: OriginFor<T>,
			stakers: Vec<T::AccountId>,
		) -> DispatchResult {
			ensure_signed(origin)?;

			stakers
				.into_iter()
				.try_for_each(|s| -> Result<_, DispatchError> {
					if let Some(lock) = Self::get_locked_balance(&s) {
						if let Some(_) = Self::get_frozen_balance(&s) {
							return Err(Error::<T>::InconsistencyState.into());
						}

						<<T as Config>::Currency as LockableCurrency<T::AccountId>>::remove_lock(
							LOCK_IDENTIFIER,
							&s,
						);

						Self::set_freeze_unchecked(&s, lock.amount);
						Ok(())
					} else {
						Ok(())
					}
				})?;

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	/// The account address of the app promotion pot.
	///
	/// This actually does computation. If you need to keep using it, then make sure you cache the
	/// value and only call this once.
	pub fn account_id() -> T::AccountId {
		T::PalletId::get().into_account_truncating()
	}

	/// Unstakes the balance for the staker.
	///
	/// - `staker`: staker account.
	/// - `amount`: amount of unstaked funds.
	fn unstake_partial_internal(
		staker_id: T::AccountId,
		unstaked_balance: BalanceOf<T>,
	) -> DispatchResult {
		if unstaked_balance == Default::default() {
			return Ok(());
		}

		let config = <PalletConfiguration<T>>::get();

		// calculate block number where the sum would be free
		let unpending_block = <frame_system::Pallet<T>>::block_number() + config.pending_interval;

		let mut pendings = <PendingUnstake<T>>::get(unpending_block);

		// checks that we can do unstake in the block
		ensure!(!pendings.is_full(), Error::<T>::PendingForBlockOverflow);

		let mut stakes = Staked::<T>::iter_prefix((&staker_id,)).collect::<Vec<_>>();

		let total_staked = stakes
			.iter()
			.fold(<BalanceOf<T>>::default(), |acc, (_, (balance, _))| {
				acc + *balance
			});

		ensure!(
			unstaked_balance <= total_staked,
			<Error<T>>::InsufficientStakedBalance
		);

		<TotalStaked<T>>::set(
			<TotalStaked<T>>::get()
				.checked_sub(&unstaked_balance)
				.ok_or(ArithmeticError::Underflow)?,
		);

		stakes.sort_by_key(|(block, _)| *block);

		let mut acc_amount = unstaked_balance;
		let mut will_deleted_stakes_count = 0u8;

		let changed_stakes = stakes
			.into_iter()
			.map_while(|(block, (balance_per_block, _))| {
				if acc_amount == <BalanceOf<T>>::default() {
					return None;
				}
				if acc_amount < balance_per_block {
					let res = (block, balance_per_block - acc_amount);
					acc_amount = <BalanceOf<T>>::default();
					return Some(res);
				} else {
					acc_amount -= balance_per_block;
					will_deleted_stakes_count += 1;
					return Some((block, <BalanceOf<T>>::default()));
				}
			})
			.collect::<Vec<_>>();

		pendings
			.try_push((staker_id.clone(), unstaked_balance))
			.map_err(|_| Error::<T>::PendingForBlockOverflow)?;

		StakesPerAccount::<T>::try_mutate(&staker_id, |stakes| -> DispatchResult {
			*stakes = stakes
				.checked_sub(will_deleted_stakes_count)
				.ok_or(ArithmeticError::Underflow)?;
			Ok(())
		})?;

		changed_stakes
			.into_iter()
			.for_each(|(staked_block, current_stake_state)| {
				if current_stake_state == Default::default() {
					<Staked<T>>::remove((&staker_id, staked_block));
				} else {
					<Staked<T>>::mutate((&staker_id, staked_block), |(old_stake_state, _)| {
						*old_stake_state = current_stake_state
					});
				}
			});

		<PendingUnstake<T>>::insert(unpending_block, pendings);

		Self::deposit_event(Event::Unstake(staker_id, unstaked_balance));

		Ok(())
	}

	/// Adds the balance to locked by the pallet.
	///
	/// - `staker`: staker account.
	/// - `amount`: amount of added locked funds.
	// fn add_lock_balance(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
	// 	Self::get_locked_balance(staker)
	// 		.map_or(<BalanceOf<T>>::default(), |l| l.amount)
	// 		.checked_add(&amount)
	// 		.map(|new_lock| Self::set_lock_unchecked(staker, new_lock))
	// 		.ok_or(ArithmeticError::Overflow.into())
	// }

	/// Adds the balance to frozen by the pallet.
	///
	/// - `staker`: staker account.
	/// - `amount`: amount of added frozen funds.
	fn add_freeze_balance(staker: &T::AccountId, amount: BalanceOf<T>) -> DispatchResult {
		Self::get_frozen_balance(staker)
			.unwrap_or_default()
			.checked_add(&amount)
			.map(|freeze| Self::set_freeze_unchecked(staker, freeze))
			.ok_or(ArithmeticError::Overflow.into())
	}

	/// Sets the new state of a balance locked by the pallet.
	///
	/// - `staker`: staker account.
	/// - `amount`: amount of locked funds.
	// fn set_lock_unchecked(staker: &T::AccountId, amount: BalanceOf<T>) {
	// 	if amount.is_zero() {
	// 		<<T as Config>::Currency as LockableCurrency<T::AccountId>>::remove_lock(
	// 			LOCK_IDENTIFIER,
	// 			&staker,
	// 		);
	// 	} else {
	// 		<<T as Config>::Currency as LockableCurrency<T::AccountId>>::set_lock(
	// 			LOCK_IDENTIFIER,
	// 			staker,
	// 			amount,
	// 			WithdrawReasons::all(),
	// 		)
	// 	}
	// }

	/// Sets the new state of a balance frozen by the pallet.
	///
	/// - `staker`: staker account.
	/// - `amount`: amount of frozen funds.
	fn set_freeze_unchecked(staker: &T::AccountId, amount: BalanceOf<T>) {
		if amount.is_zero() {
			<<T as Config>::Currency as MutateFreeze<T::AccountId>>::thaw(
				&T::FreezeIdentifier::get(),
				&staker,
			);
		} else {
			<<T as Config>::Currency as MutateFreeze<T::AccountId>>::set_freeze(
				&T::FreezeIdentifier::get(),
				staker,
				amount,
			);
		}
	}

	/// Returns the balance locked by the pallet for the staker.
	///
	/// - `staker`: staker account.
	pub fn get_locked_balance(
		staker: impl EncodeLike<T::AccountId>,
	) -> Option<BalanceLock<BalanceOf<T>>> {
		<<T as Config>::Currency as ExtendedLockableCurrency<T::AccountId>>::locks(staker)
			.into_iter()
			.find(|l| l.id == LOCK_IDENTIFIER)
	}

	/// Returns the balance frozen by the pallet for the staker.
	///
	/// - `staker`: staker account.
	pub fn get_frozen_balance(staker: &T::AccountId) -> Option<BalanceOf<T>> {
		let res = <<T as Config>::Currency as InspectFreeze<T::AccountId>>::balance_frozen(
			&T::FreezeIdentifier::get(),
			staker,
		);

		if res == Zero::zero() {
			None
		} else {
			Some(res)
		}
	}

	/// Returns the total staked balance for the staker.
	///
	/// - `staker`: staker account.
	pub fn total_staked_by_id(staker: impl EncodeLike<T::AccountId>) -> Option<BalanceOf<T>> {
		let staked = Staked::<T>::iter_prefix((staker,))
			.fold(<BalanceOf<T>>::default(), |acc, (_, (amount, _))| {
				acc + amount
			});
		if staked != <BalanceOf<T>>::default() {
			Some(staked)
		} else {
			None
		}
	}

	/// Returns all relay block numbers when stake was made,
	/// the amount of the stake.
	///
	/// - `staker`: staker account.
	pub fn total_staked_by_id_per_block(
		staker: impl EncodeLike<T::AccountId>,
	) -> Option<Vec<(T::BlockNumber, BalanceOf<T>)>> {
		let mut staked = Staked::<T>::iter_prefix((staker,))
			.map(|(block, (amount, _))| (block, amount))
			.collect::<Vec<_>>();
		staked.sort_by_key(|(block, _)| *block);
		if !staked.is_empty() {
			Some(staked)
		} else {
			None
		}
	}

	/// Returns the total staked balance for the staker.
	/// If `staker` is `None`, returns the total amount staked.
	/// - `staker`: staker account.
	pub fn cross_id_total_staked(staker: Option<T::CrossAccountId>) -> Option<BalanceOf<T>> {
		staker.map_or(Some(<TotalStaked<T>>::get()), |s| {
			Self::total_staked_by_id(s.as_sub())
		})
	}

	/// Returns all relay block numbers when stake was made,
	/// the amount of the stake.
	///
	/// - `staker`: staker account.
	pub fn cross_id_total_staked_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		Self::total_staked_by_id_per_block(staker.as_sub()).unwrap_or_default()
	}

	fn recalculate_and_insert_stake(
		staker: &T::AccountId,
		staked_block: T::BlockNumber,
		next_recalc_block: T::BlockNumber,
		base: BalanceOf<T>,
		iters: u32,
		income_acc: &mut BalanceOf<T>,
	) {
		let income = Self::calculate_income(base, iters);

		base.checked_add(&income).map(|res| {
			<Staked<T>>::insert((staker, staked_block), (res, next_recalc_block));
			*income_acc += income;
		});
	}

	fn calculate_income<I>(base: I, iters: u32) -> I
	where
		I: EncodeLike<BalanceOf<T>> + Balance,
	{
		let config = <PalletConfiguration<T>>::get();
		let mut income = base;

		(0..iters).for_each(|_| income += config.interval_income * income);

		income - base
	}

	/// Get relay block number rounded down to multiples of config.recalculation_interval.
	/// We need it to reward stakers in integer parts of recalculation_interval
	fn get_current_recalc_block(
		current_relay_block: T::BlockNumber,
		config: &PalletConfiguration<T>,
	) -> T::BlockNumber {
		(current_relay_block / config.recalculation_interval) * config.recalculation_interval
	}

	fn get_next_calculated_key() -> Option<Vec<u8>> {
		Self::get_next_calculated_record().map(|key| Staked::<T>::hashed_key_for(key))
	}
}

impl<T: Config> Pallet<T>
where
	<<T as Config>::Currency as Inspect<T::AccountId>>::Balance: Sum,
{
	/// Returns the amount reserved by the pending.
	/// If `staker` is `None`, returns the total pending.
	///
	/// -`staker`: staker account.
	///
	/// Since user funds are not transferred anywhere by staking, overflow protection is provided
	/// at the level of the associated type `Balance` of `Currency` trait. In order to overflow,
	/// the staker must have more funds on his account than the maximum set for `Balance` type.
	pub fn cross_id_pending_unstake(staker: Option<T::CrossAccountId>) -> BalanceOf<T> {
		staker.map_or(
			PendingUnstake::<T>::iter_values()
				.flat_map(|pendings| pendings.into_iter().map(|(_, amount)| amount))
				.sum(),
			|s| {
				PendingUnstake::<T>::iter_values()
					.flatten()
					.filter_map(|(id, amount)| {
						if id == *s.as_sub() {
							Some(amount)
						} else {
							None
						}
					})
					.sum()
			},
		)
	}

	/// Returns all parachain block numbers when unreserve is expected,
	/// the amount of the unreserved funds.
	///
	/// - `staker`: staker account.
	pub fn cross_id_pending_unstake_per_block(
		staker: T::CrossAccountId,
	) -> Vec<(T::BlockNumber, BalanceOf<T>)> {
		let mut unsorted_res = vec![];
		PendingUnstake::<T>::iter().for_each(|(block, pendings)| {
			pendings.into_iter().for_each(|(id, amount)| {
				if id == *staker.as_sub() {
					unsorted_res.push((block, amount));
				};
			})
		});

		unsorted_res.sort_by_key(|(block, _)| *block);
		unsorted_res
	}

	fn unstake_all_internal(staker_id: T::AccountId) -> DispatchResult {
		let config = <PalletConfiguration<T>>::get();

		// calculate block number where the sum would be free
		let block = <frame_system::Pallet<T>>::block_number() + config.pending_interval;

		let mut pendings = <PendingUnstake<T>>::get(block);

		// checks that we can do unstake in the block
		ensure!(!pendings.is_full(), Error::<T>::PendingForBlockOverflow);

		let total_staked: BalanceOf<T> = Staked::<T>::drain_prefix((&staker_id,))
			.map(|(_, (amount, _))| amount)
			.sum();

		if total_staked.is_zero() {
			return Ok(());
		}

		pendings
			.try_push((staker_id.clone(), total_staked))
			.map_err(|_| Error::<T>::PendingForBlockOverflow)?;

		<PendingUnstake<T>>::insert(block, pendings);

		TotalStaked::<T>::set(
			TotalStaked::<T>::get()
				.checked_sub(&total_staked)
				.ok_or(ArithmeticError::Underflow)?,
		);

		StakesPerAccount::<T>::remove(&staker_id);

		Self::deposit_event(Event::Unstake(staker_id, total_staked));

		Ok(())
	}
}
