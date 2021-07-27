//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

#[cfg(feature = "std")]
pub use serde::*;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

use frame_support::{decl_module, decl_storage};
use sp_std::prelude::*;
use up_sponsorship::SponsorshipHandler;

pub trait Config: frame_system::Config + pallet_transaction_payment::Config {
	type SponsorshipHandler: SponsorshipHandler<Self::AccountId, Self::Call>;
}

decl_storage! {
	trait Store for Module<T: Config> as NftTransactionPayment{
	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin,
	{
	}
}

impl<T: Config> Module<T> {
	pub fn withdraw_type(who: &T::AccountId, call: &T::Call) -> Option<T::AccountId> {
		T::SponsorshipHandler::get_sponsor(who, call)
	}
}
