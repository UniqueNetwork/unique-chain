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
#![deny(missing_docs)]

use core::marker::PhantomData;
use fp_evm::WithdrawReason;
use frame_support::traits::IsSubType;
pub use pallet::*;
use pallet_evm::{EnsureAddressOrigin, account::CrossAccountId};
use sp_core::H160;
use sp_runtime::{TransactionOutcome, DispatchError};
use up_sponsorship::SponsorshipHandler;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	use sp_std::vec::Vec;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::account::Config {
		/// Loosly-coupled handlers for evm call sponsoring
		type EvmSponsorshipHandler: SponsorshipHandler<Self::CrossAccountId, (H160, Vec<u8>)>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);
}

/// Implements [`fp_evm::TransactionValidityHack`], which provides sponsor address to pallet-evm
pub struct TransactionValidityHack<T: Config>(PhantomData<*const T>);
impl<T: Config> fp_evm::TransactionValidityHack<T::CrossAccountId> for TransactionValidityHack<T> {
	fn who_pays_fee(origin: H160, reason: &WithdrawReason) -> Option<T::CrossAccountId> {
		match reason {
			WithdrawReason::Call { target, input } => {
				let origin_sub = T::CrossAccountId::from_eth(origin);
				T::EvmSponsorshipHandler::get_sponsor(&origin_sub, &(*target, input.clone()))
			}
			_ => None,
		}
	}
}

/// Implements sponsoring for evm calls performed from pallet-evm (via api.tx.ethereum.transact/api.tx.evm.call)
pub struct BridgeSponsorshipHandler<T>(PhantomData<T>);
impl<T, C> SponsorshipHandler<T::AccountId, C> for BridgeSponsorshipHandler<T>
where
	T: Config + pallet_evm::Config,
	C: IsSubType<pallet_evm::Call<T>>,
{
	fn get_sponsor(who: &T::AccountId, call: &C) -> Option<T::AccountId> {
		match call.is_sub_type()? {
			pallet_evm::Call::call {
				source,
				target,
				input,
				..
			} => {
				let _ = T::CallOrigin::ensure_address_origin(
					source,
					<frame_system::RawOrigin<T::AccountId>>::Signed(who.clone()).into(),
				)
				.ok()?;
				let who = T::CrossAccountId::from_sub(who.clone());
				// Effects from EvmSponsorshipHandler are applied by pallet_evm::runner
				// TODO: Should we implement simulation mode (test, but do not apply effects) in `up-sponsorship`?
				let sponsor = frame_support::storage::with_transaction(|| {
					TransactionOutcome::Rollback(Ok::<_, DispatchError>(
						T::EvmSponsorshipHandler::get_sponsor(&who, &(*target, input.clone())),
					))
				})
				// FIXME: it may fail with DispatchError in case of depth limit
				.ok()??;
				Some(sponsor.as_sub().clone())
			}
			_ => None,
		}
	}
}
