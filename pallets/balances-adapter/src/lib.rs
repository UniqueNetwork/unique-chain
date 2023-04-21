// #![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![warn(missing_docs)]

extern crate alloc;
pub use pallet::*;
use pallet_common::CollectionHandle;
use pallet_evm_coder_substrate::{WithRecorder, SubstrateRecorder};

pub mod common;
pub mod erc;

pub struct NativeFungibleHandle<T: Config>(CollectionHandle<T>);
impl<T: Config> NativeFungibleHandle<T> {
	pub fn cast(inner: CollectionHandle<T>) -> Self {
		Self(inner)
	}

	/// Casts [`NativeFungibleHandle`] into [`CollectionHandle`][`pallet_common::CollectionHandle`].
	pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
		self.0
	}
}

impl<T: Config> WithRecorder<T> for NativeFungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		&self.0.recorder
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0.recorder
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
		type CurrencyBalance: Into<U256> + TryFrom<U256>;

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
