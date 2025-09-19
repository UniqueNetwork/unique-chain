//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

use codec::{Decode, Encode};
use frame_support::{
	dispatch::{DispatchInfo, PostDispatchInfo},
	pallet_prelude::{DecodeWithMemTracking, TransactionSource},
	traits::{
		tokens::fungibles::{Credit, Inspect},
		IsType, OriginTrait,
	},
};
pub use pallet::*;
use pallet_asset_tx_payment::{InitialPayment, Pre, WeightInfo};
use pallet_transaction_payment::OnChargeTransaction;
use scale_info::TypeInfo;
#[cfg(feature = "std")]
pub use serde::*;
use sp_runtime::{
	traits::{
		AsSystemOriginSigner, DispatchInfoOf, DispatchOriginOf, Dispatchable, Implication, One,
		PostDispatchInfoOf, RefundWeight, TransactionExtension, ValidateResult, Zero,
	},
	transaction_validity::{
		InvalidTransaction, TransactionLongevity, TransactionValidityError,
		ValidTransaction,
	},
	DispatchResult, FixedPointOperand, Weight,
};
use sp_std::{marker::PhantomData, prelude::*};
use up_sponsorship::SponsorshipHandler;

#[frame_support::pallet]
mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_transaction_payment::Config + pallet_asset_tx_payment::Config
	{
		/// The overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
		type SponsorshipHandler: SponsorshipHandler<Self::AccountId, Self::RuntimeCall>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A transaction fee `actual_fee`, of which `tip` was added to the minimum inclusion fee,
		/// has been paid by `who` in an asset `asset_id`.
		AssetTxFeePaid {
			who: T::AccountId,
			actual_fee: AssetBalanceOf<T>,
			tip: AssetBalanceOf<T>,
			asset_id: Option<ChargeAssetIdOf<T>>,
		},
	}
}

type BalanceOf<T> = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::Balance;

/// Type alias used for interaction with fungibles (assets).
/// Balance type alias.
pub(crate) type AssetBalanceOf<T> =
	<<T as pallet_asset_tx_payment::Config>::Fungibles as Inspect<
		<T as frame_system::Config>::AccountId,
	>>::Balance;
/// Asset id type alias.
pub(crate) type ChargeAssetIdOf<T> =
	<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::AssetId;

// Type aliases used for interaction with `OnChargeAssetTransaction`.
/// Balance type alias.
pub(crate) type ChargeAssetBalanceOf<T> =
	<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::Balance;

/// Liquidity info type alias.
pub(crate) type ChargeAssetLiquidityOf<T> =
	<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::LiquidityInfo;

/// Type aliases used for interaction with `OnChargeTransaction`.
pub(crate) type OnChargeTransactionOf<T> =
	<T as pallet_transaction_payment::Config>::OnChargeTransaction;

/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, TypeInfo)]
pub struct ChargeAssetTxPayment<T: Config, U: ApplyFeeCoefficient<T>> {
	#[codec(compact)]
	tip: BalanceOf<T>,
	asset_id: Option<ChargeAssetIdOf<T>>,
	_phantom: PhantomData<U>,
}

impl<T: Config + Send + Sync, U: ApplyFeeCoefficient<T>> ChargeAssetTxPayment<T, U> {
	/// Create new `TransactionExtension`
	pub fn new(tip: BalanceOf<T>, asset_id: Option<ChargeAssetIdOf<T>>) -> Self {
		Self {
			tip,
			asset_id,
			_phantom: PhantomData,
		}
	}
}

impl<T: Config + Send + Sync, U: ApplyFeeCoefficient<T>> sp_std::fmt::Debug
	for ChargeAssetTxPayment<T, U>
{
	#[cfg(feature = "std")]
	fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		write!(f, "ChargeAssetTxPayment<{:?}>", self.tip)
	}
	#[cfg(not(feature = "std"))]
	fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
		Ok(())
	}
}

pub trait ApplyFeeCoefficient<T: Config> {
	fn apply_calculate_coefficient(
		call: &T::RuntimeCall,
		len: usize,
		fee: BalanceOf<T>,
	) -> BalanceOf<T>;
}

impl<T: Config, U: ApplyFeeCoefficient<T>> ChargeAssetTxPayment<T, U>
where
	T::RuntimeCall: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand + IsType<ChargeAssetBalanceOf<T>>,
	Credit<T::AccountId, T::Fungibles>: IsType<ChargeAssetLiquidityOf<T>>,
{
	pub fn traditional_fee(
		len: usize,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		tip: BalanceOf<T>,
	) -> BalanceOf<T>
	where
		T::RuntimeCall: Dispatchable<Info = DispatchInfo>,
	{
		let fee = <pallet_transaction_payment::Pallet<T>>::compute_fee(len as u32, info, tip);
		U::apply_calculate_coefficient(call, len, fee)
	}

	fn can_withdraw_fee(
		&self,
		who: &T::AccountId,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		fee: BalanceOf<T>,
	) -> Result<(T::AccountId, bool), TransactionValidityError> {
		// Determine who is paying transaction fee based on ecnomic model
		// Parse call to extract collection ID and access collection sponsor
		let sponsor = T::SponsorshipHandler::get_sponsor(who, call);
		let payed_by_sponsor = sponsor.is_some();
		let who_pays_fee = sponsor.unwrap_or_else(|| who.clone());

		debug_assert!(
			self.tip <= fee,
			"tip should be included in the computed fee"
		);
		if fee.is_zero() {
			return Ok((who_pays_fee, false));
		}
		if payed_by_sponsor {
			let result = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::can_withdraw_fee(&who_pays_fee, call, info, fee, self.tip)
			.map_err(|_| -> TransactionValidityError { InvalidTransaction::Payment.into() });
			if result.is_ok() {
				return Ok((who_pays_fee, true));
			}
		}
		if let Some(asset_id) = self.asset_id.clone() {
			<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::can_withdraw_fee(
				who,
				call,
				info,
				asset_id,
				fee.into(),
				self.tip.into(),
			)?
		} else {
			<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::can_withdraw_fee(&who_pays_fee, call, info, fee, self.tip)
			.map_err(|_| -> TransactionValidityError { InvalidTransaction::Payment.into() })?
		}

		Ok((who_pays_fee, false))
	}

	#[allow(clippy::type_complexity)]
	fn withdraw_fee(
		&self,
		who: &T::AccountId,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		fee: BalanceOf<T>,
		payed_by_sponsor: bool,
	) -> Result<(BalanceOf<T>, InitialPayment<T>), TransactionValidityError> {
		debug_assert!(
			self.tip <= fee,
			"tip should be included in the computed fee"
		);
		if fee.is_zero() {
			Ok((fee, InitialPayment::Nothing))
		} else if payed_by_sponsor {
			<OnChargeTransactionOf<T> as OnChargeTransaction<T>>::withdraw_fee(
				who, call, info, fee, self.tip,
			)
			.map(|i| (fee, InitialPayment::Native(i)))
			.map_err(|_| -> TransactionValidityError { InvalidTransaction::Payment.into() })
		} else if let Some(asset_id) = self.asset_id.clone() {
			<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::withdraw_fee(
				who,
				call,
				info,
				asset_id,
				fee.into(),
				self.tip.into(),
			)
			.map(|i| (fee, InitialPayment::Asset(i.into())))
		} else {
			<OnChargeTransactionOf<T> as OnChargeTransaction<T>>::withdraw_fee(
				who, call, info, fee, self.tip,
			)
			.map(|i| (fee, InitialPayment::Native(i)))
			.map_err(|_| -> TransactionValidityError { InvalidTransaction::Payment.into() })
		}
	}
}

pub enum Val<T: Config> {
	Charge {
		tip: BalanceOf<T>,
		// who paid the fee
		who: T::AccountId,
		// transaction fee
		fee: BalanceOf<T>,
		payed_by_sponsor: bool,
	},
	NoCharge,
}

impl<
		T: Config + Send + Sync + TypeInfo,
		U: ApplyFeeCoefficient<T> + Clone + Eq + Send + Sync + TypeInfo + 'static,
	> TransactionExtension<T::RuntimeCall> for ChargeAssetTxPayment<T, U>
where
	T::RuntimeCall: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand + IsType<ChargeAssetBalanceOf<T>>,
	Credit<T::AccountId, T::Fungibles>: IsType<ChargeAssetLiquidityOf<T>>,
	ChargeAssetIdOf<T>: Send + Sync,
	<T::RuntimeCall as Dispatchable>::RuntimeOrigin: AsSystemOriginSigner<T::AccountId> + Clone,
{
	const IDENTIFIER: &'static str = "ChargeAssetTxPayment";

	type Implicit = ();

	type Val = Val<T>;
	type Pre = Pre<T>;

	fn weight(&self, _call: &T::RuntimeCall) -> Weight {
		if self.asset_id.is_some() {
			<T as pallet_asset_tx_payment::Config>::WeightInfo::charge_asset_tx_payment_asset()
		} else {
			<T as pallet_asset_tx_payment::Config>::WeightInfo::charge_asset_tx_payment_native()
		}
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
	) -> Result<
		(
			ValidTransaction,
			Self::Val,
			<T::RuntimeCall as Dispatchable>::RuntimeOrigin,
		),
		TransactionValidityError,
	> {
		use pallet_transaction_payment::ChargeTransactionPayment;
		let Some(who) = origin.as_system_origin_signer() else {
			return Ok((ValidTransaction::default(), Val::NoCharge, origin));
		};
		let fee = Self::traditional_fee(len, call, info, self.tip);
		let (who_pays_fee, payed_by_sponsor) = self.can_withdraw_fee(&who, call, info, fee)?;
		let priority = ChargeTransactionPayment::<T>::get_priority(info, len, self.tip, fee);
		let val = Val::Charge {
			tip: self.tip,
			who: who_pays_fee,
			fee,
			payed_by_sponsor,
		};
		let validity = ValidTransaction {
			priority,
			..Default::default()
		};
		Ok((validity, val, origin))
	}

	fn prepare(
		self,
		val: Self::Val,
		_origin: &DispatchOriginOf<T::RuntimeCall>,
		call: &T::RuntimeCall,
		info: &DispatchInfoOf<T::RuntimeCall>,
		_len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		match val {
			Val::Charge {
				tip,
				who,
				fee,
				payed_by_sponsor,
			} => {
				// Mutating call of `withdraw_fee` to actually charge for the transaction.
				let (_fee, initial_payment) =
					self.withdraw_fee(&who, call, info, fee, payed_by_sponsor)?;
				Ok(Pre::Charge {
					tip,
					who,
					initial_payment,
					asset_id: self.asset_id.clone(),
					weight: self.weight(call),
				})
			}
			Val::NoCharge => Ok(Pre::NoCharge {
				refund: self.weight(call),
			}),
		}
	}

	fn post_dispatch_details(
		pre: Self::Pre,
		info: &DispatchInfoOf<T::RuntimeCall>,
		post_info: &PostDispatchInfoOf<T::RuntimeCall>,
		len: usize,
		result: &DispatchResult,
	) -> Result<Weight, TransactionValidityError> {
		let (tip, who, initial_payment, asset_id, extension_weight) = match pre {
			Pre::Charge {
				tip,
				who,
				initial_payment,
				asset_id,
				weight,
			} => (tip, who, initial_payment, asset_id, weight),
			Pre::NoCharge { refund } => {
				// No-op: Refund everything
				return Ok(refund);
			}
		};

		match initial_payment {
			InitialPayment::Native(already_withdrawn) => {
				// Take into account the weight used by this extension before calculating the
				// refund.
				let actual_ext_weight = <T as pallet_asset_tx_payment::Config>::WeightInfo::charge_asset_tx_payment_native();
				let unspent_weight = extension_weight.saturating_sub(actual_ext_weight);
				let mut actual_post_info = *post_info;
				actual_post_info.refund(unspent_weight);
				pallet_transaction_payment::ChargeTransactionPayment::<T>::post_dispatch_details(
					pallet_transaction_payment::Pre::Charge {
						tip,
						who,
						imbalance: already_withdrawn,
					},
					info,
					&actual_post_info,
					len,
					result,
				)?;
				Ok(unspent_weight)
			}
			InitialPayment::Asset(already_withdrawn) => {
				let actual_ext_weight = <T as pallet_asset_tx_payment::Config>::WeightInfo::charge_asset_tx_payment_asset();
				let unspent_weight = extension_weight.saturating_sub(actual_ext_weight);
				let mut actual_post_info = *post_info;
				actual_post_info.refund(unspent_weight);
				let actual_fee = pallet_transaction_payment::Pallet::<T>::compute_actual_fee(
					len as u32,
					info,
					&actual_post_info,
					tip,
				);

				let (converted_fee, converted_tip) =
					<<T as pallet_asset_tx_payment::Config>::OnChargeAssetTransaction as pallet_asset_tx_payment::OnChargeAssetTransaction<T>>::correct_and_deposit_fee(
						&who,
						info,
						&actual_post_info,
						actual_fee.into(),
						tip.into(),
						already_withdrawn.into(),
					)?;
				Pallet::<T>::deposit_event(Event::<T>::AssetTxFeePaid {
					who,
					actual_fee: converted_fee,
					tip: converted_tip,
					asset_id,
				});
				Ok(unspent_weight)
			}
			InitialPayment::Nothing => {
				// `actual_fee` should be zero here for any signed extrinsic. It would be
				// non-zero here in case of unsigned extrinsics as they don't pay fees but
				// `compute_actual_fee` is not aware of them. In both cases it's fine to just
				// move ahead without adjusting the fee, though, so we do nothing.
				debug_assert!(tip.is_zero(), "tip should be zero if initial fee was zero.");
				Ok(extension_weight
					.saturating_sub(<T as pallet_asset_tx_payment::Config>::WeightInfo::charge_asset_tx_payment_zero()))
			}
		}
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
