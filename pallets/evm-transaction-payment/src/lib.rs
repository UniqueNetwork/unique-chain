#![cfg_attr(not(feature = "std"), no_std)]

use core::marker::PhantomData;
use fp_evm::WithdrawReason;
use frame_support::traits::{Currency, IsSubType};
pub use pallet::*;
use pallet_evm::{EVMCurrencyAdapter, EnsureAddressOrigin};
use sp_core::{H160, U256};
use sp_runtime::TransactionOutcome;
use up_sponsorship::SponsorshipHandler;
use up_evm_mapping::EvmBackwardsAddressMapping;
use pallet_evm::AddressMapping;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	use frame_support::traits::Currency;
	use sp_std::vec::Vec;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type EvmSponsorshipHandler: SponsorshipHandler<H160, (H160, Vec<u8>)>;
		type Currency: Currency<Self::AccountId>;
		type EvmBackwardsAddressMapping: EvmBackwardsAddressMapping<Self::AccountId>;
		type EvmAddressMapping: AddressMapping<Self::AccountId>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);
}

type NegativeImbalanceOf<C, T> =
	<C as Currency<<T as frame_system::Config>::AccountId>>::NegativeImbalance;

pub struct ChargeEvmLiquidityInfo<T>
where
	T: Config,
	T: pallet_evm::Config,
{
	who: H160,
	negative_imbalance: NegativeImbalanceOf<<T as Config>::Currency, T>,
}

pub struct TransactionValidityHack<T: Config>(PhantomData<*const T>);
impl<T: Config> fp_evm::TransactionValidityHack for TransactionValidityHack<T> {
	fn who_pays_fee(origin: H160, reason: &WithdrawReason) -> Option<H160> {
		match reason {
			WithdrawReason::Call { target, input } => {
				// This method is only used for checking, we shouldn't touch storage in it
				frame_support::storage::with_transaction(|| {
					TransactionOutcome::Rollback(T::EvmSponsorshipHandler::get_sponsor(
						&origin,
						&(*target, input.clone()),
					))
				})
			}
			_ => None,
		}
	}
}
pub struct OnChargeTransaction<T: Config>(PhantomData<*const T>);
impl<T> pallet_evm::OnChargeEVMTransaction<T> for OnChargeTransaction<T>
where
	T: Config,
	T: pallet_evm::Config,
{
	type LiquidityInfo = Option<ChargeEvmLiquidityInfo<T>>;

	fn withdraw_fee(
		who: &H160,
		reason: WithdrawReason,
		fee: U256,
	) -> core::result::Result<Self::LiquidityInfo, pallet_evm::Error<T>> {
		let mut who_pays_fee = *who;
		if let WithdrawReason::Call { target, input } = &reason {
			who_pays_fee = T::EvmSponsorshipHandler::get_sponsor(who, &(*target, input.clone()))
				.unwrap_or(who_pays_fee);
		}
		let negative_imbalance = EVMCurrencyAdapter::<<T as Config>::Currency, ()>::withdraw_fee(
			&who_pays_fee,
			reason,
			fee,
		)?;
		Ok(negative_imbalance.map(|i| ChargeEvmLiquidityInfo {
			who: who_pays_fee,
			negative_imbalance: i,
		}))
	}

	fn correct_and_deposit_fee(
		who: &H160,
		corrected_fee: U256,
		already_withdrawn: Self::LiquidityInfo,
	) {
		<EVMCurrencyAdapter<<T as Config>::Currency, ()> as pallet_evm::OnChargeEVMTransaction<T>>::correct_and_deposit_fee(
			&already_withdrawn.as_ref().map(|e| e.who).unwrap_or(*who),
			corrected_fee,
			already_withdrawn.map(|e| e.negative_imbalance),
		)
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
				let who = T::EvmBackwardsAddressMapping::from_account_id(who.clone());
				// Effects from EvmSponsorshipHandler are applied in OnChargeEvmTransaction by pallet_evm::runner
				// TODO: Should we implement simulation mode (test, but do not apply effects) in `up-sponsorship`?
				let sponsor = frame_support::storage::with_transaction(|| {
					TransactionOutcome::Rollback(T::EvmSponsorshipHandler::get_sponsor(
						&who,
						&(*target, input.clone()),
					))
				})?;
				let sponsor = T::EvmAddressMapping::into_account_id(sponsor);
				Some(sponsor)
			}
			_ => None,
		}
	}
}
