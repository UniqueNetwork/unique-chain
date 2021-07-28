#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub use eth::*;
pub mod eth;

#[frame_support::pallet]
pub mod pallet {
	use evm_coder::execution::Result;
	use frame_support::pallet_prelude::*;
	use sp_core::H160;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config {
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
	pub(super) type SelfSponsoring<T: Config> =
		StorageMap<Hasher = Twox128, Key = H160, Value = bool, QueryKind = ValueQuery>;

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
		pub fn toggle_sponsoring(contract: H160, enabled: bool) {
			<SelfSponsoring<T>>::insert(contract, enabled);
		}

		pub fn set_sponsoring_rate_limit(contract: H160, rate_limit: T::BlockNumber) {
			<SponsoringRateLimit<T>>::insert(contract, rate_limit);
		}

		/// Default is returned if allowlist is disabled
		pub fn allowed(contract: H160, user: H160, default: bool) -> bool {
			if !<AllowlistEnabled<T>>::get(contract) {
				return default;
			}
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
