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

use fp_evm::{CheckEvmTransaction, FeeCalculator, TransactionValidationError, WithdrawReason};
use frame_support::{
	storage::with_transaction,
	traits::{Currency, Imbalance, IsSubType, OnUnbalanced},
};
pub use pallet::*;
use pallet_evm::{
	account::CrossAccountId, EnsureAddressOrigin, NegativeImbalanceOf, OnChargeEVMTransaction,
	OnCheckEvmTransaction,
};
use sp_core::{H160, U256};
use sp_runtime::{traits::UniqueSaturatedInto, DispatchError, TransactionOutcome};
use up_sponsorship::SponsorshipHandler;

#[frame_support::pallet]
pub mod pallet {
	use sp_std::vec::Vec;

	use super::*;

	/// Contains call data
	pub struct CallContext {
		/// Contract address
		pub contract_address: H160,
		/// Transaction data
		pub input: Vec<u8>,
		/// Max fee for transaction - gasLimit * gasPrice
		pub max_fee: U256,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm::Config {
		/// Loosly-coupled handlers for evm call sponsoring
		type EvmSponsorshipHandler: SponsorshipHandler<Self::CrossAccountId, CallContext>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);
}

fn who_pays_fee<T: Config>(
	origin: H160,
	max_fee: U256,
	reason: &WithdrawReason,
) -> Option<T::CrossAccountId> {
	match reason {
		WithdrawReason::Call { target, input, .. } => {
			let origin_sub = T::CrossAccountId::from_eth(origin);
			let call_context = CallContext {
				contract_address: *target,
				input: input.clone(),
				max_fee,
			};
			T::EvmSponsorshipHandler::get_sponsor(&origin_sub, &call_context)
		}
		_ => None,
	}
}

fn get_sponsor<T: Config>(
	source: H160,
	max_fee_per_gas: Option<U256>,
	gas_limit: u64,
	reason: &WithdrawReason,
	is_transactional: bool,
	is_check: bool,
) -> Option<T::CrossAccountId> {
	let accept_gas_fee = |gas_fee| {
		let (base_fee, _) = T::FeeCalculator::min_gas_price();
		// Metamask specifies base fee twice as much as chain reported minGasPrice
		// But we allow further leeway (why?), sponsored base_fee to be 2.1*minGasPrice, thus 21/10.
		base_fee <= gas_fee && gas_fee <= base_fee * 21 / 10
	};
	let (max_fee_per_gas, may_sponsor) = match (max_fee_per_gas, is_transactional) {
		(Some(max_fee_per_gas), _) => (max_fee_per_gas, accept_gas_fee(max_fee_per_gas)),
		// Gas price check is skipped for non-transactional calls that don't
		// define a `max_fee_per_gas` input.
		(None, false) => (Default::default(), true),
		_ => return None,
	};

	let max_fee = max_fee_per_gas.saturating_mul(gas_limit.into());

	// #[cfg(feature = "debug-logging")]
	// log::trace!(target: "sponsoring", "checking who will pay fee for {:?} {:?}", source, reason);
	with_transaction(|| {
		let result = may_sponsor
			.then(|| who_pays_fee::<T>(source, max_fee, reason))
			.flatten();
		if is_check {
			TransactionOutcome::Rollback(Ok::<_, DispatchError>(result))
		} else {
			TransactionOutcome::Commit(Ok(result))
		}
	})
	.ok()
	.flatten()
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
				gas_limit,
				max_fee_per_gas,
				..
			} => {
				let _ = T::CallOrigin::ensure_address_origin(
					source,
					<frame_system::RawOrigin<T::AccountId>>::Signed(who.clone()).into(),
				)
				.ok()?;
				let who = T::CrossAccountId::from_sub(who.clone());
				let max_fee = max_fee_per_gas.saturating_mul((*gas_limit).into());
				let call_context = CallContext {
					contract_address: *target,
					input: input.clone(),
					max_fee,
				};
				// Effects from EvmSponsorshipHandler are applied by pallet_evm::runner
				// TODO: Should we implement simulation mode (test, but do not apply effects) in `up-sponsorship`?
				let sponsor = frame_support::storage::with_transaction(|| {
					TransactionOutcome::Rollback(Ok::<_, DispatchError>(
						T::EvmSponsorshipHandler::get_sponsor(&who, &call_context),
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

/// Set transaction sponsor if available and enough balance.
pub struct TransactionValidity<T>(PhantomData<T>);
impl<T: Config> OnCheckEvmTransaction<T> for TransactionValidity<T> {
	fn on_check_evm_transaction(
		v: &mut CheckEvmTransaction,
		origin: &T::CrossAccountId,
	) -> Result<(), TransactionValidationError> {
		let who = &v.who;
		let max_fee_per_gas = v.transaction_fee_input()?.0;
		let gas_limit = v.transaction.gas_limit.low_u64();
		let reason = if let Some(to) = v.transaction.to {
			WithdrawReason::Call {
				target: to,
				input: v.transaction.input.clone(),
				max_fee_per_gas: Some(max_fee_per_gas),
				gas_limit,
				is_transactional: v.config.is_transactional,
				is_check: true,
			}
		} else {
			WithdrawReason::Create
		};
		let sponsor = get_sponsor::<T>(
			*origin.as_eth(),
			Some(max_fee_per_gas),
			gas_limit,
			&reason,
			v.config.is_transactional,
			true,
		)
		.as_ref()
		.map(pallet_evm::Pallet::<T>::account_basic_by_id)
		.map(|v| v.0);
		let fee = max_fee_per_gas.saturating_mul(v.transaction.gas_limit);
		if let Some(sponsor) = sponsor.as_ref() {
			if who.balance < v.transaction.value || sponsor.balance < fee {
				return Err(TransactionValidationError::BalanceTooLow);
			}
		} else {
			let total_payment = v.transaction.value.saturating_add(fee);
			if who.balance < total_payment {
				return Err(TransactionValidationError::BalanceTooLow);
			}
		}

		let who = sponsor.unwrap_or_else(|| v.who.clone());
		v.who.balance = who.balance;
		Ok(())
	}
}

/// Implements the transaction payment for a pallet implementing the `Currency`
/// trait (eg. the pallet_balances) using an unbalance handler (implementing
/// `OnUnbalanced`).
/// Similar to `CurrencyAdapter` of `pallet_transaction_payment`
pub struct WrappedEVMCurrencyAdapter<C, OU>(sp_std::marker::PhantomData<(C, OU)>);
impl<T, C, OU> OnChargeEVMTransaction<T> for WrappedEVMCurrencyAdapter<C, OU>
where
	T: Config,
	C: Currency<<T as frame_system::Config>::AccountId>,
	C::PositiveImbalance: Imbalance<
		<C as Currency<<T as frame_system::Config>::AccountId>>::Balance,
		Opposite = C::NegativeImbalance,
	>,
	C::NegativeImbalance: Imbalance<
		<C as Currency<<T as frame_system::Config>::AccountId>>::Balance,
		Opposite = C::PositiveImbalance,
	>,
	OU: OnUnbalanced<NegativeImbalanceOf<C, T>>,
	U256: UniqueSaturatedInto<<C as Currency<<T as frame_system::Config>::AccountId>>::Balance>,
{
	// Kept type as Option to satisfy bound of Default
	type LiquidityInfo = (Option<NegativeImbalanceOf<C, T>>, Option<T::CrossAccountId>);

	fn withdraw_fee(
		who: &T::CrossAccountId,
		reason: WithdrawReason,
		fee: U256,
	) -> Result<Self::LiquidityInfo, pallet_evm::Error<T>> {
		let sponsor = match reason {
			WithdrawReason::Call {
				max_fee_per_gas,
				gas_limit,
				is_transactional,
				is_check,
				..
			} => get_sponsor::<T>(
				*who.as_eth(),
				max_fee_per_gas,
				gas_limit,
				&reason,
				is_transactional,
				is_check,
			),
			_ => None,
		};

		let who = sponsor.as_ref().unwrap_or(who);
		<pallet_evm::EVMCurrencyAdapter<C, OU> as OnChargeEVMTransaction<T>>::withdraw_fee(
			who, reason, fee,
		)
		.map(|li| (li, sponsor))
	}

	fn correct_and_deposit_fee(
		who: &T::CrossAccountId,
		corrected_fee: U256,
		base_fee: U256,
		already_withdrawn: Self::LiquidityInfo,
	) -> Self::LiquidityInfo {
		let (already_withdrawn, sponsor) = already_withdrawn;
		let who = sponsor.as_ref().unwrap_or(who);
		(
			<pallet_evm::EVMCurrencyAdapter<C, OU> as OnChargeEVMTransaction<T>>::correct_and_deposit_fee(
				who,
				corrected_fee,
				base_fee,
				already_withdrawn,
			),
			None
		)
	}

	fn pay_priority_fee(tip: Self::LiquidityInfo) {
		<pallet_evm::EVMCurrencyAdapter<C, OU> as OnChargeEVMTransaction<T>>::pay_priority_fee(
			tip.0,
		)
	}
}
