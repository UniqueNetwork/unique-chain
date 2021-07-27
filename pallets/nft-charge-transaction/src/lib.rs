//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

#[cfg(feature = "std")]
pub use serde::*;

use codec::{Decode, Encode};
use frame_support::traits::Get;
use frame_support::{
	decl_module, decl_storage,
	weights::{DispatchInfo, PostDispatchInfo, DispatchClass},
};
use sp_runtime::{
	traits::{
		DispatchInfoOf, Dispatchable, PostDispatchInfoOf, Saturating, SaturatedConversion,
		SignedExtension, Zero,
	},
	transaction_validity::{
		TransactionPriority, TransactionValidity, TransactionValidityError, ValidTransaction,
	},
	FixedPointOperand, DispatchResult,
};
use pallet_transaction_payment::OnChargeTransaction;
use sp_std::prelude::*;

pub trait Config: frame_system::Config + pallet_nft_transaction_payment::Config {}

decl_storage! {
	trait Store for Module<T: Config> as NftTransactionPayment
	{}
}

decl_module! {

	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin,
	{}
}

type BalanceOf<T> = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::Balance;

/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, Clone, Eq, PartialEq)]
pub struct ChargeTransactionPayment<T: Config>(#[codec(compact)] BalanceOf<T>);

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
	T::Call: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
{
	fn traditional_fee(
		len: usize,
		info: &DispatchInfoOf<T::Call>,
		tip: BalanceOf<T>,
	) -> BalanceOf<T>
	where
		T::Call: Dispatchable<Info = DispatchInfo>,
	{
		<pallet_transaction_payment::Module<T>>::compute_fee(len as u32, info, tip)
	}

	fn get_priority(
		len: usize,
		info: &DispatchInfoOf<T::Call>,
		final_fee: BalanceOf<T>,
	) -> TransactionPriority {
		let weight_saturation = T::BlockWeights::get().max_block / info.weight.max(1);
		let max_block_length = *T::BlockLength::get().max.get(DispatchClass::Normal);
		let len_saturation = max_block_length as u64 / (len as u64).max(1);
		let coefficient: BalanceOf<T> = weight_saturation
			.min(len_saturation)
			.saturated_into::<BalanceOf<T>>();
		final_fee
			.saturating_mul(coefficient)
			.saturated_into::<TransactionPriority>()
	}

	#[allow(clippy::type_complexity)]
    fn withdraw_fee(
        &self,
        who: &T::AccountId,
        call: &T::Call,
        info: &DispatchInfoOf<T::Call>,
        len: usize,
	) -> Result<
		(
			BalanceOf<T>,
			<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
		),
		TransactionValidityError,
	>{
		let tip = self.0;

		let fee = Self::traditional_fee(len, info, tip);

		// Only mess with balances if fee is not zero.
		if fee.is_zero() {
			return <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::withdraw_fee(who, call, info, fee, tip)
			.map(|i| (fee, i));
		}

		// Determine who is paying transaction fee based on ecnomic model
		// Parse call to extract collection ID and access collection sponsor
		let sponsor = <pallet_nft_transaction_payment::Module<T>>::withdraw_type(who, call);

		let who_pays_fee = sponsor.unwrap_or_else(|| who.clone());

		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::withdraw_fee(&who_pays_fee, call, info, fee, tip)
			.map(|i| (fee, i))
	}
}

impl<T: Config + Send + Sync> SignedExtension for ChargeTransactionPayment<T>
where
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
	T::Call: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
{
	const IDENTIFIER: &'static str = "ChargeTransactionPayment";
	type AccountId = T::AccountId;
	type Call = T::Call;
	type AdditionalSigned = ();
	type Pre = (
        // tip
        BalanceOf<T>,
        // who pays fee
        Self::AccountId,
		// imbalance resulting from withdrawing the fee
		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
    );
	fn additional_signed(&self) -> sp_std::result::Result<(), TransactionValidityError> {
		Ok(())
	}

	fn validate(
		&self,
		who: &Self::AccountId,
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize,
	) -> TransactionValidity {
		let (fee, _) = self.withdraw_fee(who, call, info, len)?;
		Ok(ValidTransaction {
			priority: Self::get_priority(len, info, fee),
			..Default::default()
		})
	}

	fn pre_dispatch(
		self,
		who: &Self::AccountId,
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		let (_fee, imbalance) = self.withdraw_fee(who, call, info, len)?;
		Ok((self.0, who.clone(), imbalance))
	}

	fn post_dispatch(
		pre: Self::Pre,
		info: &DispatchInfoOf<Self::Call>,
		post_info: &PostDispatchInfoOf<Self::Call>,
		len: usize,
		_result: &DispatchResult,
	) -> Result<(), TransactionValidityError> {
		let (tip, who, imbalance) = pre;
		let actual_fee = pallet_transaction_payment::Pallet::<T>::compute_actual_fee(
			len as u32, info, post_info, tip,
		);
		<T as pallet_transaction_payment::Config>::OnChargeTransaction::correct_and_deposit_fee(
			&who, info, post_info, actual_fee, tip, imbalance,
		)?;
		Ok(())
	}
}
