// #![doc = include_str!("../README.md")]
#![cfg_attr(not(feature = "std"), no_std)]
#![warn(missing_docs)]

pub use pallet::*;

pub mod erc;

#[frame_support::pallet]
pub mod pallet {
	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config {}
	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {}
}
