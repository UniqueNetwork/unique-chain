// #![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![warn(missing_docs)]

extern crate alloc;
use frame_support::sp_runtime::DispatchResult;
pub use pallet::*;
use pallet_common::CollectionHandle;
use pallet_evm_coder_substrate::{WithRecorder, SubstrateRecorder};

pub mod common;
pub mod erc;

pub struct NativeFungibleHandle<T: Config>(SubstrateRecorder<T>);
impl<T: Config> NativeFungibleHandle<T> {
	pub fn new() -> NativeFungibleHandle<T> {
		Self(SubstrateRecorder::new(u64::MAX))
	}

	pub fn check_is_internal(&self) -> DispatchResult {
		Ok(())
	}
}

impl<T: Config> WithRecorder<T> for NativeFungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		&self.0
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0
	}
}
#[frame_support::pallet]
pub mod pallet {
	use alloc::string::String;
	use frame_support::{traits::Get, sp_runtime::DispatchResult};
	use sp_core::U256;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + pallet_common::Config
	{
		type Currency: frame_support::traits::Currency<
			Self::AccountId,
			Balance = Self::CurrencyBalance,
		>;
		type CurrencyBalance: Into<U256> + TryFrom<U256> + PartialEq<u128> + From<u128> + Into<u128>;

		type Decimals: Get<u8>;
		type Name: Get<String>;
		type Symbol: Get<String>;
	}
	#[pallet::pallet]
	pub struct Pallet<T>(_);

	// #[pallet::call]
	impl<T: Config> Pallet<T> {
		pub fn dummy() -> DispatchResult {
			Ok(())
		}
	}
}
