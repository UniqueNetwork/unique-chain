// #![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![warn(missing_docs)]

pub use pallet::*;

pub mod erc;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::traits::Get;
	use sp_core::U256;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config {
		type Currency: frame_support::traits::Currency<
			Self::AccountId,
			Balance = Self::CurrencyBalance,
		>;
		type CurrencyBalance: Into<U256>;

		type Decimals: Get<u8>;
		type Name: Get<String>;
		type Symbol: Get<String>;
	}
	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {}
}
