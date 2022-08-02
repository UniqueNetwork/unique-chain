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

#![cfg_attr(not(feature = "std"), no_std)]
#![feature(is_some_with)]

use codec::{Decode, Encode, MaxEncodedLen};
pub use pallet::*;
pub use eth::*;
use scale_info::TypeInfo;
pub mod eth;

#[frame_support::pallet]
pub mod pallet {
	pub use super::*;
	use frame_support::pallet_prelude::*;
	use sp_core::H160;
	use pallet_evm::account::CrossAccountId;
	use frame_system::pallet_prelude::BlockNumberFor;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + pallet_evm::account::Config
	{
		type ContractAddress: Get<H160>;
		type DefaultSponsoringRateLimit: Get<Self::BlockNumber>;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This method is only executable by owner.
		NoPermission,

		/// Contract has no owner.
		NoContractOwner,
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	/// Store owner for contract.
	///
	/// * **Key** - contract address.
	/// * **Value** - owner for contract.
	#[pallet::storage]
	pub(super) type Owner<T: Config> = StorageMap<
		Hasher = Twox128,
		Key = H160,
		Value = T::CrossAccountId,
		QueryKind = OptionQuery,
	>;

	#[pallet::storage]
	#[deprecated]
	pub(super) type SelfSponsoring<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

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

	#[pallet::storage]
	#[deprecated]
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

	#[pallet::storage]
	#[deprecated]
	pub(super) type Allowlist<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = H160,
		Hasher2 = Twox128,
		Key2 = H160,
		Value = bool,
		QueryKind = ValueQuery,
	>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			let storage_version = StorageVersion::get::<Pallet<T>>();
			if storage_version < StorageVersion::new(1) {
				<Owner<T>>::translate_values::<H160, _>(|address| Some(T::CrossAccountId::from_eth(address)));
			}

			0
		}
	}

	impl<T: Config> Pallet<T> {
		pub fn sponsoring_mode(contract: H160) -> SponsoringModeT {
			<SponsoringMode<T>>::get(contract)
				.or_else(|| {
					<SelfSponsoring<T>>::get(contract).then(|| SponsoringModeT::Allowlisted)
				})
				.unwrap_or_default()
		}
		pub fn set_sponsoring_mode(contract: H160, mode: SponsoringModeT) {
			if mode == SponsoringModeT::Disabled {
				<SponsoringMode<T>>::remove(contract);
			} else {
				<SponsoringMode<T>>::insert(contract, mode);
			}
			<SelfSponsoring<T>>::remove(contract)
		}

		pub fn toggle_sponsoring(contract: H160, enabled: bool) {
			Self::set_sponsoring_mode(
				contract,
				if enabled {
					SponsoringModeT::Allowlisted
				} else {
					SponsoringModeT::Disabled
				},
			)
		}

		pub fn set_sponsoring_rate_limit(contract: H160, rate_limit: T::BlockNumber) {
			<SponsoringRateLimit<T>>::insert(contract, rate_limit);
		}

		pub fn allowed(contract: H160, user: T::CrossAccountId) -> bool {
			<Allowlist<T>>::get(&contract, user.as_eth())
				|| Pallet::<T>::contract_owner(contract).is_ok_and(|owner| *owner == user)
		}

		pub fn toggle_allowlist(contract: H160, enabled: bool) {
			<AllowlistEnabled<T>>::insert(contract, enabled)
		}

		pub fn toggle_allowed(contract: H160, user: H160, allowed: bool) {
			<Allowlist<T>>::insert(contract, user, allowed);
		}

		pub fn ensure_owner(contract: H160, user: H160) -> evm_coder::execution::Result<()> {
			ensure!(Pallet::<T>::contract_owner(contract).is_ok_and(|owner| *owner.as_eth() == user), "no permission");
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		pub fn contract_owner(contract: H160) -> Result<T::CrossAccountId, DispatchError> {
			Ok(<Owner<T>>::get(contract).ok_or::<Error<T>>(Error::NoContractOwner)?)
		}
	}
}

#[derive(Encode, Decode, PartialEq, TypeInfo, MaxEncodedLen)]
pub enum SponsoringModeT {
	Disabled,
	Allowlisted,
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

impl Default for SponsoringModeT {
	fn default() -> Self {
		Self::Disabled
	}
}
