#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;
use core::ops::Deref;

use frame_support::sp_runtime::DispatchResult;
use pallet_evm_coder_substrate::{WithRecorder, SubstrateRecorder};
pub use pallet::*;

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
	use super::*;
	use alloc::string::String;
	use frame_support::{
		dispatch::PostDispatchInfo,
		ensure,
		pallet_prelude::{DispatchResultWithPostInfo, Pays},
		traits::{Currency, ExistenceRequirement, Get},
	};
	use pallet_balances::WeightInfo;
	use pallet_common::{erc::CrossAccountId, Error as CommonError, Pallet as PalletCommon};
	use pallet_structure::Pallet as PalletStructure;
	use sp_core::U256;
	use sp_runtime::DispatchError;
	use up_data_structs::{budget::Budget, mapping::TokenAddressMapping};

	#[pallet::config]
	pub trait Config:
		frame_system::Config
		+ pallet_evm_coder_substrate::Config
		+ pallet_common::Config
		+ pallet_structure::Config
	{
		/// Currency from `pallet_balances`
		type Currency: frame_support::traits::Currency<
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

		/// Weight information
		type WeightInfo: WeightInfo;
	}
	#[pallet::pallet]
	pub struct Pallet<T>(_);

	impl<T: Config> Pallet<T> {
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

			Ok(<T as Config>::Currency::free_balance(from.as_sub()).into())
		}

		/// Transfers the specified amount of tokens. Will check that
		/// the transfer is allowed for the token.
		///
		/// - `collection`: Collection that contains the token.
		/// - `from`: Owner of tokens to transfer.
		/// - `to`: Recepient of transfered tokens.
		/// - `amount`: Amount of tokens to transfer.
		/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
		pub fn transfer(
			_collection: &NativeFungibleHandle<T>,
			from: &T::CrossAccountId,
			to: &T::CrossAccountId,
			amount: u128,
			_nesting_budget: &dyn Budget,
		) -> DispatchResultWithPostInfo {
			<PalletCommon<T>>::ensure_correct_receiver(to)?;

			if from != to && amount != 0 {
				<T as Config>::Currency::transfer(
					from.as_sub(),
					to.as_sub(),
					amount
						.try_into()
						.map_err(|_| sp_runtime::ArithmeticError::Overflow)?,
					ExistenceRequirement::AllowDeath,
				)?;
			};

			Ok(PostDispatchInfo {
				actual_weight: Some(<SelfWeightOf<T>>::transfer_allow_death()),
				pays_fee: Pays::Yes,
			})
		}

		/// Transfer NFT token from one account to another.
		///
		/// Same as the [`Self::transfer`] but spender doesn't needs to be the owner of the token.
		/// The owner should set allowance for the spender to transfer token.
		///
		/// - `collection`: Collection that contains the token.
		/// - `spender`: Account that spend the money.
		/// - `from`: Owner of tokens to transfer.
		/// - `to`: Recepient of transfered tokens.
		/// - `amount`: Amount of tokens to transfer.
		/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
		pub fn transfer_from(
			collection: &NativeFungibleHandle<T>,
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
			Self::transfer(collection, from, to, amount, nesting_budget)
		}
	}
}
