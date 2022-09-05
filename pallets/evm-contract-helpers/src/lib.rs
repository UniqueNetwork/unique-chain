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

#![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![warn(missing_docs)]

use codec::{Decode, Encode, MaxEncodedLen};
pub use pallet::*;
pub use eth::*;
use scale_info::TypeInfo;
pub mod eth;

#[frame_support::pallet]
pub mod pallet {
	pub use super::*;
	use crate::eth::ContractHelpersEvents;
	use frame_support::pallet_prelude::*;
	use pallet_evm_coder_substrate::DispatchResult;
	use sp_core::H160;
	use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
	use up_data_structs::SponsorshipState;
	use evm_coder::ToLog;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + pallet_evm::account::Config
	{
		/// Overarching event type.
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		/// Address, under which magic contract will be available
		type ContractAddress: Get<H160>;

		/// In case of enabled sponsoring, but no sponsoring rate limit set,
		/// this value will be used implicitly
		type DefaultSponsoringRateLimit: Get<Self::BlockNumber>;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This method is only executable by contract owner
		NoPermission,

		/// No pending sponsor for contract.
		NoPendingSponsor,
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// Store owner for contract.
	///
	/// * **Key** - contract address.
	/// * **Value** - owner for contract.
	#[pallet::storage]
	pub(super) type Owner<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = H160, QueryKind = ValueQuery>;

	#[pallet::storage]
	#[deprecated]
	pub(super) type SelfSponsoring<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

	/// Store for contract sponsorship state.
	///
	/// * **Key** - contract address.
	/// * **Value** - sponsorship state.
	#[pallet::storage]
	pub type Sponsoring<T: Config> = StorageMap<
		Hasher = Twox64Concat,
		Key = H160,
		Value = SponsorshipState<T::CrossAccountId>,
		QueryKind = ValueQuery,
	>;

	/// Store for sponsoring mode.
	///
	/// ### Usage
	/// Prefer to delete collection from storage if mode chaged to [`Disabled`](SponsoringModeT::Disabled).
	///
	/// * **Key** - contract address.
	/// * **Value** - [`sponsoring mode`](SponsoringModeT).
	#[pallet::storage]
	pub(super) type SponsoringMode<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = SponsoringModeT, QueryKind = OptionQuery>;

	/// Storage for sponsoring rate limit in blocks.
	///
	/// * **Key** - contract address.
	/// * **Value** - amount of sponsored blocks.
	#[pallet::storage]
	pub(super) type SponsoringRateLimit<T: Config> = StorageMap<
		Hasher = Twox128,
		Key = H160,
		Value = T::BlockNumber,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultSponsoringRateLimit,
	>;

	/// Storage for last sponsored block.
	///
	/// * **Key1** - contract address.
	/// * **Key2** - sponsored user address.
	/// * **Value** - last sponsored block number.
	#[pallet::storage]
	pub(super) type SponsorBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = H160,
		Hasher2 = Twox128,
		Key2 = H160,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;

	/// Storege for contracts with [`Allowlisted`](SponsoringModeT::Allowlisted) sponsoring mode.
	///
	/// ### Usage
	/// Prefer to delete collection from storage if mode chaged to non `Allowlisted`, than set **Value** to **false**.
	///
	/// * **Key** - contract address.
	/// * **Value** - is contract in [`Allowlisted`](SponsoringModeT::Allowlisted) mode.
	#[pallet::storage]
	pub(super) type AllowlistEnabled<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

	/// Storage for users that allowed for sponsorship.
	///
	/// ### Usage
	/// Prefer to delete record from storage if user no more allowed for sponsorship.
	///
	/// * **Key1** - contract address.
	/// * **Key2** - user that allowed for sponsorship.
	/// * **Value** - allowance for sponsorship.
	#[pallet::storage]
	pub(super) type Allowlist<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = H160,
		Hasher2 = Twox128,
		Key2 = H160,
		Value = bool,
		QueryKind = ValueQuery,
	>;

	#[pallet::event]
	#[pallet::generate_deposit(pub fn deposit_event)]
	pub enum Event<T: Config> {
		/// Contract sponsor was set.
		ContractSponsorSet(
			/// Contract address of the affected collection.
			H160,
			/// New sponsor address.
			T::AccountId,
		),

		/// New sponsor was confirm.
		ContractSponsorshipConfirmed(
			/// Contract address of the affected collection.
			H160,
			/// New sponsor address.
			T::AccountId,
		),

		/// Collection sponsor was removed.
		ContractSponsorRemoved(
			/// Contract address of the affected collection.
			H160,
		),
	}

	impl<T: Config> Pallet<T> {
		/// Get contract owner.
		pub fn contract_owner(contract: H160) -> H160 {
			<Owner<T>>::get(contract)
		}

		/// Set `sponsor` for `contract`.
		///
		/// `sender` must be owner of contract.
		pub fn set_sponsor(
			sender: &T::CrossAccountId,
			contract: H160,
			sponsor: &T::CrossAccountId,
		) -> DispatchResult {
			Pallet::<T>::ensure_owner(contract, *sender.as_eth())?;
			Sponsoring::<T>::insert(
				contract,
				SponsorshipState::<T::CrossAccountId>::Unconfirmed(sponsor.clone()),
			);

			<Pallet<T>>::deposit_event(Event::<T>::ContractSponsorSet(
				contract,
				sponsor.as_sub().clone(),
			));
			<PalletEvm<T>>::deposit_log(
				ContractHelpersEvents::ContractSponsorSet {
					contract,
					sponsor: *sponsor.as_eth(),
				}
				.to_log(contract),
			);
			Ok(())
		}

		/// Set sponsor as already confirmed.
		///
		/// `sender` must be owner of contract.
		pub fn force_set_sponsor(
			sender: &T::CrossAccountId,
			contract: H160,
			sponsor: &T::CrossAccountId,
		) -> DispatchResult {
			Pallet::<T>::ensure_owner(contract, *sender.as_eth())?;
			Sponsoring::<T>::insert(
				contract,
				SponsorshipState::<T::CrossAccountId>::Confirmed(T::CrossAccountId::from_eth(
					contract,
				)),
			);

			let eth_sponsor = *sponsor.as_eth();
			let sub_sponsor = sponsor.as_sub().clone();

			<Pallet<T>>::deposit_event(Event::<T>::ContractSponsorSet(
				contract,
				sub_sponsor.clone(),
			));
			<PalletEvm<T>>::deposit_log(
				ContractHelpersEvents::ContractSponsorSet {
					contract,
					sponsor: eth_sponsor,
				}
				.to_log(contract),
			);

			<Pallet<T>>::deposit_event(Event::<T>::ContractSponsorshipConfirmed(
				contract,
				sub_sponsor,
			));
			<PalletEvm<T>>::deposit_log(
				ContractHelpersEvents::ContractSponsorshipConfirmed {
					contract,
					sponsor: eth_sponsor,
				}
				.to_log(contract),
			);

			Ok(())
		}

		/// Remove sponsor for `contract`.
		///
		/// `sender` must be owner of contract.
		pub fn remove_sponsor(sender: &T::CrossAccountId, contract: H160) -> DispatchResult {
			Pallet::<T>::ensure_owner(contract, *sender.as_eth())?;
			Sponsoring::<T>::remove(contract);

			<Pallet<T>>::deposit_event(Event::<T>::ContractSponsorRemoved(contract));
			<PalletEvm<T>>::deposit_log(
				ContractHelpersEvents::ContractSponsorRemoved { contract }.to_log(contract),
			);

			Ok(())
		}

		/// Confirm sponsorship.
		///
		/// `sender` must be same that set via [`set_sponsor`].
		pub fn confirm_sponsorship(sender: &T::CrossAccountId, contract: H160) -> DispatchResult {
			match Sponsoring::<T>::get(contract) {
				SponsorshipState::Unconfirmed(sponsor) => {
					ensure!(sponsor == *sender, Error::<T>::NoPermission);
					let eth_sponsor = *sponsor.as_eth();
					let sub_sponsor = sponsor.as_sub().clone();
					Sponsoring::<T>::insert(
						contract,
						SponsorshipState::<T::CrossAccountId>::Confirmed(sponsor),
					);

					<Pallet<T>>::deposit_event(Event::<T>::ContractSponsorshipConfirmed(
						contract,
						sub_sponsor,
					));
					<PalletEvm<T>>::deposit_log(
						ContractHelpersEvents::ContractSponsorshipConfirmed {
							contract,
							sponsor: eth_sponsor,
						}
						.to_log(contract),
					);

					Ok(())
				}
				SponsorshipState::Disabled | SponsorshipState::Confirmed(_) => {
					Err(Error::<T>::NoPendingSponsor.into())
				}
			}
		}

		/// Get sponsor.
		pub fn get_sponsor(contract: H160) -> Option<T::CrossAccountId> {
			match Sponsoring::<T>::get(contract) {
				SponsorshipState::Disabled | SponsorshipState::Unconfirmed(_) => None,
				SponsorshipState::Confirmed(sponsor) => Some(sponsor),
			}
		}

		/// Get current sponsoring mode, performing lazy migration from legacy storage
		pub fn sponsoring_mode(contract: H160) -> SponsoringModeT {
			<SponsoringMode<T>>::get(contract)
				.or_else(|| {
					<SelfSponsoring<T>>::get(contract).then(|| SponsoringModeT::Allowlisted)
				})
				.unwrap_or_default()
		}

		/// Reconfigure contract sponsoring mode
		pub fn set_sponsoring_mode(contract: H160, mode: SponsoringModeT) {
			if mode == SponsoringModeT::Disabled {
				<SponsoringMode<T>>::remove(contract);
			} else {
				<SponsoringMode<T>>::insert(contract, mode);
			}
			<SelfSponsoring<T>>::remove(contract)
		}

		/// Set duration between two sponsored contract calls
		pub fn set_sponsoring_rate_limit(contract: H160, rate_limit: T::BlockNumber) {
			<SponsoringRateLimit<T>>::insert(contract, rate_limit);
		}

		/// Is user added to allowlist, or he is owner of specified contract
		pub fn allowed(contract: H160, user: H160) -> bool {
			<Allowlist<T>>::get(&contract, &user) || <Owner<T>>::get(&contract) == user
		}

		/// Toggle contract allowlist access
		pub fn toggle_allowlist(contract: H160, enabled: bool) {
			<AllowlistEnabled<T>>::insert(contract, enabled)
		}

		/// Toggle user presence in contract's allowlist
		pub fn toggle_allowed(contract: H160, user: H160, allowed: bool) {
			<Allowlist<T>>::insert(contract, user, allowed);
		}

		/// Throw error if user is not allowed to reconfigure target contract
		pub fn ensure_owner(contract: H160, user: H160) -> DispatchResult {
			ensure!(<Owner<T>>::get(&contract) == user, Error::<T>::NoPermission);
			Ok(())
		}
	}
}

/// Available contract sponsoring modes
#[derive(Encode, Decode, PartialEq, TypeInfo, MaxEncodedLen, Default)]
pub enum SponsoringModeT {
	/// Sponsoring is disabled
	#[default]
	Disabled,
	/// Only users from allowlist will be sponsored
	Allowlisted,
	/// All users will be sponsored
	Generous,
}

impl SponsoringModeT {
	fn from_eth(v: u8) -> Option<Self> {
		Some(match v {
			0 => Self::Disabled,
			1 => Self::Allowlisted,
			2 => Self::Generous,
			_ => return None,
		})
	}
	fn to_eth(self) -> u8 {
		match self {
			SponsoringModeT::Disabled => 0,
			SponsoringModeT::Allowlisted => 1,
			SponsoringModeT::Generous => 2,
		}
	}
}
