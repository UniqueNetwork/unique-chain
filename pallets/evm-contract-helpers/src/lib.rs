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

use codec::{Decode, Encode, MaxEncodedLen};
pub use pallet::*;
pub use eth::*;
use scale_info::TypeInfo;
pub mod eth;

#[frame_support::pallet]
pub mod pallet {
	pub use super::*;
	use evm_coder::execution::Result;
	use frame_support::pallet_prelude::*;
	use sp_core::H160;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config + pallet_evm::account::Config {
		type ContractAddress: Get<H160>;
		type DefaultSponsoringRateLimit: Get<Self::BlockNumber>;
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This method is only executable by owner
		NoPermission,
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::storage]
	pub(super) type Owner<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = H160, QueryKind = ValueQuery>;

	#[pallet::storage]
	#[deprecated]
	pub(super) type SelfSponsoring<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub(super) type SponsoringMode<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = SponsoringModeT, QueryKind = OptionQuery>;

	#[pallet::storage]
	pub(super) type SponsoringRateLimit<T: Config> = StorageMap<
		Hasher = Twox128,
		Key = H160,
		Value = T::BlockNumber,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultSponsoringRateLimit,
	>;

	#[pallet::storage]
	pub(super) type SponsorBasket<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = H160,
		Hasher2 = Twox128,
		Key2 = H160,
		Value = T::BlockNumber,
		QueryKind = OptionQuery,
	>;

	#[pallet::storage]
	pub(super) type AllowlistEnabled<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub(super) type Allowlist<T: Config> = StorageDoubleMap<
		Hasher1 = Twox128,
		Key1 = H160,
		Hasher2 = Twox128,
		Key2 = H160,
		Value = bool,
		QueryKind = ValueQuery,
	>;

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

		pub fn allowed(contract: H160, user: H160) -> bool {
			<Allowlist<T>>::get(&contract, &user) || <Owner<T>>::get(&contract) == user
		}

		pub fn toggle_allowlist(contract: H160, enabled: bool) {
			<AllowlistEnabled<T>>::insert(contract, enabled)
		}

		pub fn toggle_allowed(contract: H160, user: H160, allowed: bool) {
			<Allowlist<T>>::insert(contract, user, allowed);
		}

		pub fn ensure_owner(contract: H160, user: H160) -> Result<()> {
			ensure!(<Owner<T>>::get(&contract) == user, "no permission");
			Ok(())
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
