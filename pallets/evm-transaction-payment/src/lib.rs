#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use core::marker::PhantomData;
	use frame_support::traits::Currency;
	use pallet_evm::EVMCurrencyAdapter;
	use fp_evm::WithdrawReason;
	use sp_core::{H160, U256};
	use sp_runtime::TransactionOutcome;
	use up_sponsorship::SponsorshipHandler;
	use sp_std::vec::Vec;

	type NegativeImbalanceOf<C, T> =
		<C as Currency<<T as frame_system::Config>::AccountId>>::NegativeImbalance;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type SponsorshipHandler: SponsorshipHandler<H160, (H160, Vec<u8>)>;
		type Currency: Currency<Self::AccountId>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

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
						TransactionOutcome::Rollback(T::SponsorshipHandler::get_sponsor(
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
				who_pays_fee = T::SponsorshipHandler::get_sponsor(who, &(*target, input.clone()))
					.unwrap_or(who_pays_fee);
			}
			let negative_imbalance =
				EVMCurrencyAdapter::<<T as Config>::Currency, ()>::withdraw_fee(
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
		) -> core::result::Result<(), pallet_evm::Error<T>> {
			EVMCurrencyAdapter::<<T as Config>::Currency, ()>::correct_and_deposit_fee(
				&already_withdrawn.as_ref().map(|e| e.who).unwrap_or(*who),
				corrected_fee,
				already_withdrawn.map(|e| e.negative_imbalance),
			)
		}
	}
}
