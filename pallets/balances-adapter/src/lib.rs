#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;
use core::ops::Deref;

use frame_support::{sp_runtime::DispatchResult, PalletId};
pub use pallet::*;
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};

pub mod common;
pub mod erc;

pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;

/// Handle for native fungible collection
pub struct NativeFungibleHandle<T: Config>(SubstrateRecorder<T>);
impl<T: Config> NativeFungibleHandle<T> {
	/// Creates a handle
	pub fn new() -> NativeFungibleHandle<T> {
		Self(SubstrateRecorder::new(u64::MAX))
	}

	/// Creates a handle
	pub fn new_with_gas_limit(gas_limit: u64) -> NativeFungibleHandle<T> {
		Self(SubstrateRecorder::new(gas_limit))
	}

	/// Check if the collection is internal
	pub fn check_is_internal(&self) -> DispatchResult {
		Ok(())
	}
}

impl<T: Config> Default for NativeFungibleHandle<T> {
	fn default() -> Self {
		Self::new()
	}
}

impl<T: Config> WithRecorder<T> for NativeFungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		&self.0
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0
	}
}

impl<T: Config> Deref for NativeFungibleHandle<T> {
	type Target = SubstrateRecorder<T>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}
#[frame_support::pallet]
pub mod pallet {
	use alloc::string::String;

	use frame_support::{
		dispatch::PostDispatchInfo,
		ensure,
		pallet_prelude::*,
		traits::{
			fungible::{Inspect, Mutate},
			tokens::Preservation,
			Get,
		},
	};
	use pallet_balances::WeightInfo;
	use pallet_common::{erc::CrossAccountId, Error as CommonError, Pallet as PalletCommon};
	use pallet_structure::Pallet as PalletStructure;
	use sp_core::U256;
	use sp_runtime::DispatchError;
	use up_data_structs::{budget::Budget, mapping::TokenAddressMapping};

	use super::*;

	#[pallet::config]
	pub trait Config:
		frame_system::Config
		+ pallet_evm_coder_substrate::Config
		+ pallet_common::Config
		+ pallet_structure::Config
	{
		/// Inspect from `pallet_balances`
		type Inspect: frame_support::traits::tokens::fungible::Inspect<
			Self::AccountId,
			Balance = Self::CurrencyBalance,
		>;

		/// Mutate from `pallet_balances`
		type Mutate: frame_support::traits::tokens::fungible::Mutate<
			Self::AccountId,
			Balance = Self::CurrencyBalance,
		>;

		/// Balance type of chain
		type CurrencyBalance: Into<U256> + TryFrom<U256> + TryFrom<u128> + Into<u128>;

		/// Decimals of balance
		type Decimals: Get<u8>;
		/// Collection name
		type Name: Get<String>;
		/// Collection symbol
		type Symbol: Get<String>;

		type XcmDepositorPalletId: Get<PalletId>;

		/// Weight information
		type WeightInfo: WeightInfo;
	}
	#[pallet::pallet]
	pub struct Pallet<T>(_);

	impl<T: Config> Pallet<T> {
		pub fn balance_of(account: &T::CrossAccountId) -> u128 {
			T::Inspect::balance(account.as_sub()).into()
		}

		pub fn total_balance(account: &T::CrossAccountId) -> u128 {
			T::Inspect::total_balance(account.as_sub()).into()
		}

		pub fn total_issuance() -> u128 {
			T::Inspect::total_issuance().into()
		}

		/// Checks if a non-owner has (enough) allowance from the owner to perform operations on the tokens.
		/// Returns the expected remaining allowance - it should be set manually if the transaction proceeds.
		///
		/// - `spender`: CrossAccountId who has the allowance rights.
		/// - `from`: The owner of the tokens who sets the allowance.
		/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
		fn check_allowed(
			spender: &T::CrossAccountId,
			from: &T::CrossAccountId,
			nesting_budget: &dyn Budget,
		) -> Result<u128, DispatchError> {
			if let Some((collection_id, token_id)) =
				T::CrossTokenAddressMapping::address_to_token(from)
			{
				ensure!(
					<PalletStructure<T>>::check_indirectly_owned(
						spender.clone(),
						collection_id,
						token_id,
						None,
						nesting_budget
					)?,
					<CommonError<T>>::ApprovedValueTooLow,
				);
			} else if !spender.conv_eq(from) {
				return Ok(0);
			}

			Ok(Self::balance_of(from))
		}

		/// Transfers the specified amount of tokens.
		///
		/// - `from`: Owner of tokens to transfer.
		/// - `to`: Recepient of transfered tokens.
		/// - `amount`: Amount of tokens to transfer.
		pub fn transfer(
			from: &T::CrossAccountId,
			to: &T::CrossAccountId,
			amount: u128,
		) -> DispatchResultWithPostInfo {
			<PalletCommon<T>>::ensure_correct_receiver(to)?;

			if from != to && amount != 0 {
				let amount = amount
					.try_into()
					.map_err(|_| sp_runtime::ArithmeticError::Overflow)?;
				T::Mutate::transfer(from.as_sub(), to.as_sub(), amount, Preservation::Expendable)?;
			};

			Ok(PostDispatchInfo {
				actual_weight: Some(<SelfWeightOf<T>>::transfer_allow_death()),
				pays_fee: Pays::Yes,
			})
		}

		/// Transfer tokens from one account to another.
		///
		/// Same as the [`Self::transfer`] but the spender doesn't needs to be the direct owner of the token.
		/// The spender must be allowed to transfer token.
		/// If the tokens are nested in an NFT and the spender owns the NFT, the allowance is considered to be set.
		///
		/// - `spender`: Account that spend the money.
		/// - `from`: Owner of tokens to transfer.
		/// - `to`: Recepient of transfered tokens.
		/// - `amount`: Amount of tokens to transfer.
		/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
		pub fn transfer_from(
			spender: &T::CrossAccountId,
			from: &T::CrossAccountId,
			to: &T::CrossAccountId,
			amount: u128,
			nesting_budget: &dyn Budget,
		) -> DispatchResultWithPostInfo {
			let allowance = Self::check_allowed(spender, from, nesting_budget)?;
			if allowance < amount {
				return Err(<CommonError<T>>::ApprovedValueTooLow.into());
			}
			Self::transfer(from, to, amount)
		}
	}
}
