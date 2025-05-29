//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

use codec::{Decode, Encode};
use frame_support::{
	dispatch::{DispatchClass, DispatchInfo, PostDispatchInfo},
	pallet_prelude::{DecodeWithMemTracking, TransactionSource},
	traits::{Get, OriginTrait},
};
pub use pallet::*;
use pallet_transaction_payment::OnChargeTransaction;
use scale_info::TypeInfo;
#[cfg(feature = "std")]
pub use serde::*;
use sp_runtime::{
	traits::{
		DispatchInfoOf, DispatchOriginOf, Dispatchable, Implication, One, PostDispatchInfoOf,
		SaturatedConversion, Saturating, TransactionExtension, ValidateResult,
	},
	transaction_validity::{
		InvalidTransaction, TransactionLongevity, TransactionPriority, TransactionValidityError,
		ValidTransaction,
	},
	DispatchResult, FixedPointOperand, Weight,
};
use sp_std::prelude::*;
use up_sponsorship::SponsorshipHandler;

#[frame_support::pallet]
mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_transaction_payment::Config {
		type SponsorshipHandler: SponsorshipHandler<Self::AccountId, Self::RuntimeCall>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);
}

type BalanceOf<T> = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::Balance;

/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, TypeInfo)]
pub struct ChargeTransactionPayment<T: Config>(#[codec(compact)] BalanceOf<T>);

impl<T: Config + Send + Sync> ChargeTransactionPayment<T> {
	/// Create new `TransactionExtension`
	pub fn new(tip: BalanceOf<T>) -> Self {
		Self(tip)
	}
}

impl<T: Config + Send + Sync> sp_std::fmt::Debug for ChargeTransactionPayment<T> {
	#[cfg(feature = "std")]
	fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		write!(f, "ChargeTransactionPayment<{:?}>", self.0)
	}
	#[cfg(not(feature = "std"))]
	fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		Ok(())
	}
}

impl<T: Config> ChargeTransactionPayment<T>
where
	T::RuntimeCall: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
{
	pub fn traditional_fee(
		len: usize,
		info: &DispatchInfoOf<T::RuntimeCall>,
		tip: BalanceOf<T>,
	) -> BalanceOf<T>
	where
		T::RuntimeCall: Dispatchable<Info = DispatchInfo>,
	{
		<pallet_transaction_payment::Pallet<T>>::compute_fee(len as u32, info, tip)
	}

	fn get_priority(
		len: usize,
		info: &DispatchInfoOf<T::RuntimeCall>,
		final_fee: BalanceOf<T>,
	) -> TransactionPriority {
		let weight_saturation =
			T::BlockWeights::get().max_block / info.total_weight().ref_time().max(1);
		let max_block_length = *T::BlockLength::get().max.get(DispatchClass::Normal);
		let len_saturation = max_block_length as u64 / (len as u64).max(1);
		let coefficient: BalanceOf<T> = weight_saturation
			.ref_time()
			.min(len_saturation)
			.saturated_into::<BalanceOf<T>>();
		final_fee
			.saturating_mul(coefficient)
			.saturated_into::<TransactionPriority>()
	}

	fn can_withdraw_fee(
		&self,
		who: &T::AccountId,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		len: usize,
	) -> Result<(BalanceOf<T>, T::AccountId), TransactionValidityError> {
		let tip = self.0;
		let fee = Self::traditional_fee(len, info, tip);

		// Determine who is paying transaction fee based on ecnomic model
		// Parse call to extract collection ID and access collection sponsor
		let sponsor = T::SponsorshipHandler::get_sponsor(who, call);
		let who_pays_fee = sponsor.unwrap_or_else(|| who.clone());

		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::can_withdraw_fee(&who_pays_fee, call, info, fee, tip)?;

		Ok((fee, who_pays_fee))
	}

	#[allow(clippy::type_complexity)]
    fn withdraw_fee(
        &self,
        who: &T::AccountId,
        call: &T::RuntimeCall,
        info: &DispatchInfoOf<T::RuntimeCall>,
		fee: BalanceOf<T>,
	) -> Result<
		(
			BalanceOf<T>,
			<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
		),
		TransactionValidityError,
	>{
		let tip = self.0;

		let liquidity_info = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::withdraw_fee(who, call, info, fee, tip)?;

		Ok((fee, liquidity_info))
	}
}

impl<T: Config + Send + Sync + TypeInfo> TransactionExtension<T::RuntimeCall>
	for ChargeTransactionPayment<T>
where
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
	T::RuntimeCall: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
{
	const IDENTIFIER: &'static str = "ChargeTransactionPayment";

	type Implicit = ();

	type Pre = (
		// tip
		BalanceOf<T>,
		// who pays fee
		T::AccountId,
		// imbalance resulting from withdrawing the fee
		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
	);

	type Val = (BalanceOf<T>, T::AccountId);

	fn weight(&self, _call: &T::RuntimeCall) -> Weight {
		Weight::zero()
	}

	fn validate(
		&self,
		origin: DispatchOriginOf<T::RuntimeCall>,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		len: usize,
		_self_implicit: Self::Implicit,
		_inherited_implication: &impl Implication,
		_source: TransactionSource,
	) -> ValidateResult<Self::Val, T::RuntimeCall> {
		//TODO: do we need to switch to DispatchOriginOf instead of AccountID?
		let Some(who) = &origin.clone().into_signer() else {
			return Err(TransactionValidityError::Invalid(
				InvalidTransaction::BadSigner,
			));
		};
		let (final_fee, who_pays_fee) = self.can_withdraw_fee(who, call, info, len)?;
		Ok((
			ValidTransaction {
				priority: Self::get_priority(len, info, final_fee),
				..Default::default()
			},
			(final_fee, who_pays_fee),
			origin,
		))
	}

	fn prepare(
		self,
		val: Self::Val,
		_origin: &DispatchOriginOf<T::RuntimeCall>,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		_len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		let (final_fee, who_pays_fee) = val;
		let (_fee, imbalance) = self.withdraw_fee(&who_pays_fee, call, info, final_fee)?;
		Ok((self.0, who_pays_fee, imbalance))
	}

	fn post_dispatch_details(
		pre: Self::Pre,
		info: &DispatchInfoOf<T::RuntimeCall>,
		post_info: &PostDispatchInfoOf<T::RuntimeCall>,
		len: usize,
		_result: &DispatchResult,
	) -> Result<Weight, TransactionValidityError> {
		let (tip, who_pays_fee, imbalance) = pre;
		let actual_fee = pallet_transaction_payment::Pallet::<T>::compute_actual_fee(
			len as u32, info, post_info, tip,
		);
		//TODO: looks like we can just return unspent fee here instead of refunding in `correct_and_deposit_fee`
		<T as pallet_transaction_payment::Config>::OnChargeTransaction::correct_and_deposit_fee(
			&who_pays_fee,
			info,
			post_info,
			actual_fee,
			tip,
			imbalance,
		)?;
		Ok(Weight::zero())
	}
}

/// Copy of CheckNonce from frame-system, except for removed
/// providers/consumers check, added in https://github.com/paritytech/polkadot-sdk/pull/1578.
/// TODO: Make this check configurable for the upstream CheckNonce/remove as it gets removed/made configurable in
/// upstream (Looks like it is planned: https://github.com/paritytech/polkadot-sdk/pull/1578#issuecomment-1754928101)
#[derive(Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, TypeInfo)]
#[scale_info(skip_type_params(T))]
pub struct CheckNonce<T: Config>(#[codec(compact)] pub T::Nonce);

impl<T: Config> CheckNonce<T> {
	/// utility constructor. Used only in client/factory code.
	pub fn from(nonce: T::Nonce) -> Self {
		Self(nonce)
	}
}

impl<T: Config> sp_std::fmt::Debug for CheckNonce<T> {
	#[cfg(feature = "std")]
	fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		write!(f, "CheckNonce({})", self.0)
	}

	#[cfg(not(feature = "std"))]
	fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		Ok(())
	}
}

impl<T: Config> TransactionExtension<T::RuntimeCall> for CheckNonce<T>
where
	T::RuntimeCall: Dispatchable<Info = DispatchInfo>,
{
	type Implicit = ();
	type Pre = ();
	type Val = ();
	const IDENTIFIER: &'static str = "CheckNonce";

	fn weight(&self, _call: &T::RuntimeCall) -> Weight {
		Weight::zero()
	}

	fn validate(
		&self,
		origin: DispatchOriginOf<T::RuntimeCall>,
		_call: &T::RuntimeCall,
		_info: &DispatchInfoOf<T::RuntimeCall>,
		_len: usize,
		_self_implicit: Self::Implicit,
		_inherited_implication: &impl Implication,
		_source: TransactionSource,
	) -> ValidateResult<Self::Val, T::RuntimeCall> {
		let Some(who) = &origin.clone().into_signer() else {
			return Err(TransactionValidityError::Invalid(
				InvalidTransaction::BadSigner,
			));
		};
		let account = frame_system::Account::<T>::get(who);
		// if account.providers.is_zero() && account.sufficients.is_zero() {
		// 	// Nonce storage not paid for
		// 	return InvalidTransaction::Payment.into();
		// }
		if self.0 < account.nonce {
			return Err(TransactionValidityError::Invalid(InvalidTransaction::Stale));
		}

		let provides = vec![Encode::encode(&(who, self.0))];
		let requires = if account.nonce < self.0 {
			vec![Encode::encode(&(who, self.0 - One::one()))]
		} else {
			vec![]
		};

		Ok((
			ValidTransaction {
				priority: 0,
				requires,
				provides,
				longevity: TransactionLongevity::MAX,
				propagate: true,
			},
			(),
			origin,
		))
	}

	fn prepare(
		self,
		_val: Self::Val,
		origin: &DispatchOriginOf<T::RuntimeCall>,
		_call: &T::RuntimeCall,
		_info: &DispatchInfoOf<T::RuntimeCall>,
		_len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		let Some(who) = &origin.clone().into_signer() else {
			return Err(TransactionValidityError::Invalid(
				InvalidTransaction::BadSigner,
			));
		};
		let mut account = frame_system::Account::<T>::get(who);
		// if account.providers.is_zero() && account.sufficients.is_zero() {
		// 	// Nonce storage not paid for
		// 	return Err(InvalidTransaction::Payment.into());
		// }
		if self.0 != account.nonce {
			return Err(if self.0 < account.nonce {
				InvalidTransaction::Stale
			} else {
				InvalidTransaction::Future
			}
			.into());
		}
		account.nonce += T::Nonce::one();
		frame_system::Account::<T>::insert(who, account);
		Ok(())
	}
}
