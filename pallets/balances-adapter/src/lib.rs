// #![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;
use frame_support::sp_runtime::DispatchResult;
pub use pallet::*;
use pallet_evm_coder_substrate::{WithRecorder, SubstrateRecorder};

pub mod common;
pub mod erc;

pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

/// Handle for native fungible collection
pub struct NativeFungibleHandle<T: Config>(SubstrateRecorder<T>);
impl<T: Config> NativeFungibleHandle<T> {
	/// Creates a handle
	pub fn new() -> NativeFungibleHandle<T> {
		Self(SubstrateRecorder::new(u64::MAX))
	}

	/// Check if the collection is internal
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
	use frame_support::{traits::Get};
	use pallet_balances::WeightInfo;
	use sp_core::U256;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + pallet_common::Config
	{
		/// Currency from `pallet_balances`
		type Currency: frame_support::traits::Currency<
			Self::AccountId,
			Balance = Self::CurrencyBalance,
		>;
		/// Balance type of chain
		type CurrencyBalance: Into<U256> + TryFrom<U256> + PartialEq<u128> + From<u128> + Into<u128>;

		/// Decimals of balance
		type Decimals: Get<u8>;
		/// Collection name
		type Name: Get<String>;
		/// Collection symbol
		type Symbol: Get<String>;

		/// Weight information
		type WeightInfo: WeightInfo;
	}
	#[pallet::pallet]
	pub struct Pallet<T>(_);
}
