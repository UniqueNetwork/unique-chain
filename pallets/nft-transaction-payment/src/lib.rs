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

#[cfg(test)]
mod tests;

use frame_support::{
	decl_error, decl_module, decl_storage,
	traits::{
		IsSubType, 
	},
	weights::{
		DispatchInfo
	}
};
use sp_runtime::traits::StaticLookup;
use sp_runtime::{
	traits::{ 
		Hash, Dispatchable,
	},
};
use pallet_contracts::chain_extension::UncheckedFrom;
use sp_std::prelude::*;
use nft_data_structs::{
	CreateItemData,
	CollectionId, CollectionMode, TokenId
};

type CodeHash<T> = <T as frame_system::Config>::Hash;

	pub trait Config: frame_system::Config + pallet_contracts::Config + pallet_transaction_payment::Config + pallet_nft::Config {
	}

	// Error for non-fungible-token module.
	
	decl_error! {
		/// Error for non-fungible-token module.
		pub enum Error for Module<T: Config> {
		/// No available class ID
		NoAvailableClassId,
		/// No available token ID
		NoAvailableTokenId,
		/// Token(ClassId, TokenId) not found
		TokenNotFound,
		/// Class not found
		CollectionNotFound,
		/// The operator is not the owner of the token and has no permission
		NoPermission,
		/// Arithmetic calculation overflow
		NumOverflow,
		/// Can not destroy class
		/// Total issuance is not 0
		CannotDestroyClass,
	}
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

impl<T: Config> Module<T> 
{

	pub fn withdraw_type(
		who: &T::AccountId,
		call: &T::Call
	) -> Option<T::AccountId> where 
		T::Call: Dispatchable<Info=DispatchInfo>,
		T::Call: IsSubType<pallet_nft::Call<T>>, 
		T::Call: IsSubType<pallet_contracts::Call<T>>,
		T::AccountId: AsRef<[u8]>,
		T::AccountId: UncheckedFrom<T::Hash>
		{

        let mut sponsor: Option<T::AccountId> = match IsSubType::<pallet_nft::Call<T>>::is_sub_type(call)  {
            Some(pallet_nft::Call::create_item(collection_id, _owner, _properties)) => {

                Self::withdraw_create_item(who, collection_id, &_properties)
            },
            Some(pallet_nft::Call::transfer(_new_owner, collection_id, item_id, _value)) => {

                Self::withdraw_transfer(who, collection_id, item_id)
            },
            Some(pallet_nft::Call::set_variable_meta_data(collection_id, item_id, data)) => {

                Self::withdraw_set_variable_meta_data(who, collection_id, item_id, &data)
			},
			_ => None,
        };

        sponsor = sponsor.or_else(|| match IsSubType::<pallet_contracts::Call<T>>::is_sub_type(call) {
            Some(pallet_contracts::Call::call(dest, _value, _gas_limit, _data)) => {

                Self::withdraw_contract_call(who, dest)
            },
            Some(pallet_contracts::Call::instantiate(_endowment, _gas_limit, code_hash, _data, salt)) => {

                Self::withdraw_contract_instantiate(&who, code_hash, salt)
            },
            Some(pallet_contracts::Call::instantiate_with_code(_endowment, _gas_limit, _code, _data, _salt))  => {

                Self::withdraw_contract_instantiate(&who, &T::Hashing::hash(&_code), _salt)
			},
			_ => None,
        });

		sponsor
	}



	pub fn withdraw_create_item(
		who: &T::AccountId,
		collection_id: &CollectionId,
		_properties: &CreateItemData,
	) -> Option<T::AccountId> {
	
		let collection = pallet_nft::CollectionById::<T>::get(collection_id)?;

		// sponsor timeout
		let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;

		let limit = collection.limits.sponsor_transfer_timeout;
		if pallet_nft::CreateItemBasket::<T>::contains_key((collection_id, &who)) {
			let last_tx_block = pallet_nft::CreateItemBasket::<T>::get((collection_id, &who));
			let limit_time = last_tx_block + limit.into();
			if block_number <= limit_time {
				return None;
			}
		}
		pallet_nft::CreateItemBasket::<T>::insert((collection_id, who.clone()), block_number);

		// check free create limit
		if collection.limits.sponsored_data_size >= (_properties.len() as u32) {
			collection.sponsorship.sponsor()
				.cloned()
		} else {
			None
		}
	}

	pub fn withdraw_transfer(
		who: &T::AccountId,
		collection_id: &CollectionId,
		item_id: &TokenId,
	) -> Option<T::AccountId> {

		let collection = pallet_nft::CollectionById::<T>::get(collection_id)?;
		let limits = pallet_nft::ChainLimit::get();

		let mut sponsor_transfer = false;
		if collection.sponsorship.confirmed() {

			let collection_limits = collection.limits.clone();
			let collection_mode = collection.mode.clone();

			// sponsor timeout
			let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;
			sponsor_transfer = match collection_mode {
				CollectionMode::NFT => {

					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
						collection_limits.sponsor_transfer_timeout
					} else {
						limits.nft_sponsor_transfer_timeout
					};

					let mut sponsored = true;
					if pallet_nft::NftTransferBasket::<T>::contains_key(collection_id, item_id) {
						let last_tx_block = pallet_nft::NftTransferBasket::<T>::get(collection_id, item_id);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						pallet_nft::NftTransferBasket::<T>::insert(collection_id, item_id, block_number);
					}

					sponsored
				}
				CollectionMode::Fungible(_) => {

					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
						collection_limits.sponsor_transfer_timeout
					} else {
						limits.fungible_sponsor_transfer_timeout
					};

					let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;
					let mut sponsored = true;
					if pallet_nft::FungibleTransferBasket::<T>::contains_key(collection_id, who) {
						let last_tx_block = pallet_nft::FungibleTransferBasket::<T>::get(collection_id, who);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						pallet_nft::FungibleTransferBasket::<T>::insert(collection_id, who, block_number);
					}

					sponsored
				}
				CollectionMode::ReFungible => {

					// get correct limit
					let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
						collection_limits.sponsor_transfer_timeout
					} else {
						limits.refungible_sponsor_transfer_timeout
					};

					let mut sponsored = true;
					if pallet_nft::ReFungibleTransferBasket::<T>::contains_key(collection_id, item_id) {
						let last_tx_block = pallet_nft::ReFungibleTransferBasket::<T>::get(collection_id, item_id);
						let limit_time = last_tx_block + limit.into();
						if block_number <= limit_time {
							sponsored = false;
						}
					}
					if sponsored {
						pallet_nft::ReFungibleTransferBasket::<T>::insert(collection_id, item_id, block_number);
					}

					sponsored
				}
				_ => {
					false
				},
			};
		}

		if !sponsor_transfer {
			None
		} else {
			collection.sponsorship.sponsor()
				.cloned()
		}
	}
	
	pub fn withdraw_set_variable_meta_data(
		who: &T::AccountId,
		collection_id: &CollectionId,
		item_id: &TokenId,
		data: &Vec<u8>,
	) -> Option<T::AccountId> {

		let mut sponsor_metadata_changes = false;

		let collection = pallet_nft::CollectionById::<T>::get(collection_id)?;

		if
			collection.sponsorship.confirmed() &&
			// Can't sponsor fungible collection, this tx will be rejected
			// as invalid
			!matches!(collection.mode, CollectionMode::Fungible(_)) &&
			data.len() <= collection.limits.sponsored_data_size as usize
		{
			if let Some(rate_limit) = collection.limits.sponsored_data_rate_limit {
				let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;

				if pallet_nft::VariableMetaDataBasket::<T>::get(collection_id, item_id)
					.map(|last_block| block_number - last_block > rate_limit)
					.unwrap_or(true) 
				{
					sponsor_metadata_changes = true;
					pallet_nft::VariableMetaDataBasket::<T>::insert(collection_id, item_id, block_number);
				}
			}
		}

		if !sponsor_metadata_changes {
			None
		} else {
			collection.sponsorship.sponsor().cloned()
		}

	}

	pub fn withdraw_contract_call(
		who: &T::AccountId,
		dest: &<T::Lookup as StaticLookup>::Source
	) -> Option<T::AccountId> {

		let called_contract: T::AccountId = T::Lookup::lookup((dest).clone()).unwrap_or(T::AccountId::default());

		let owned_contract = pallet_nft::ContractOwner::<T>::get(called_contract.clone()).as_ref() == Some(who);
		let white_list_enabled = pallet_nft::ContractWhiteListEnabled::<T>::contains_key(called_contract.clone());
		  
		// ???
		if !owned_contract && white_list_enabled {
		 	if !pallet_nft::ContractWhiteList::<T>::contains_key(called_contract.clone(), who) {
				return Some(who.clone())
		 		// return Err(InvalidTransaction::Call.into());
		 	}
		}

		let mut sponsor_transfer = false;
		if pallet_nft::ContractSponsoringRateLimit::<T>::contains_key(called_contract.clone()) {
			let last_tx_block = pallet_nft::ContractSponsorBasket::<T>::get((&called_contract, &who));
			let block_number = <frame_system::Module<T>>::block_number() as T::BlockNumber;
			let rate_limit = pallet_nft::ContractSponsoringRateLimit::<T>::get(&called_contract);
			let limit_time = last_tx_block + rate_limit;

			if block_number >= limit_time {
				pallet_nft::ContractSponsorBasket::<T>::insert((called_contract.clone(), who.clone()), block_number);
				sponsor_transfer = true;
			}
		} else {
			sponsor_transfer = false;
		}
	   
		if sponsor_transfer {
			if pallet_nft::ContractSelfSponsoring::<T>::contains_key(called_contract.clone()) {
				if pallet_nft::ContractSelfSponsoring::<T>::get(called_contract.clone()) {
					return Some(called_contract);
				}
			}
		}

		None
	}

	pub fn withdraw_contract_instantiate(
		who: &T::AccountId,
		code_hash: &CodeHash<T>,
		salt: &[u8],
	) -> Option<T::AccountId> where
	T::AccountId: AsRef<[u8]>,
	T::AccountId: UncheckedFrom<T::Hash>
	{

		let new_contract_address = <pallet_contracts::Module<T>>::contract_address(
			&who,
			code_hash,
			salt,
		);
		pallet_nft::ContractOwner::<T>::insert(new_contract_address.clone(), who.clone());

		None
	}
}

// type BalanceOf<T> = <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::Balance;

// /// Require the transactor pay for themselves and maybe include a tip to gain additional priority
// /// in the queue.
// #[derive(Encode, Decode, Clone, Eq, PartialEq)]
// pub struct ChargeTransactionPayment<T: Config>(#[codec(compact)] BalanceOf<T>);

// impl<T: Config + Send + Sync> sp_std::fmt::Debug 
//     for ChargeTransactionPayment<T>
// {
// 	#[cfg(feature = "std")]
// 	fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
// 		write!(f, "ChargeTransactionPayment<{:?}>", self.0)
// 	}
// 	#[cfg(not(feature = "std"))]
// 	fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
// 		Ok(())
// 	}
// }

// impl<T: Config> ChargeTransactionPayment<T>
// where
// 	T::Call: Dispatchable<Info=DispatchInfo, PostInfo=PostDispatchInfo> + IsSubType<pallet_nft::Call<T>> + IsSubType<pallet_contracts::Call<T>>,
//     BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
//     T::AccountId: AsRef<[u8]>,
//     T::AccountId: UncheckedFrom<T::Hash>,
// {
//     fn traditional_fee(
//         len: usize,
//         info: &DispatchInfoOf<T::Call>,
//         tip: BalanceOf<T>,
//     ) -> BalanceOf<T>
//     where
//         T::Call: Dispatchable<Info = DispatchInfo>,
//     {
//         <pallet_transaction_payment::Module<T>>::compute_fee(len as u32, info, tip)
//     }

// 	fn get_priority(len: usize, info: &DispatchInfoOf<T::Call>, final_fee: BalanceOf<T>) -> TransactionPriority {
//         let weight_saturation = T::BlockWeights::get().max_block / info.weight.max(1);
//         let max_block_length = *T::BlockLength::get().max.get(DispatchClass::Normal);
//         let len_saturation = max_block_length as u64 / (len as u64).max(1);
//         let coefficient: BalanceOf<T> = weight_saturation
//             .min(len_saturation)
//             .saturated_into::<BalanceOf<T>>();
//         final_fee
//             .saturating_mul(coefficient)
//             .saturated_into::<TransactionPriority>()
//     }

//     fn withdraw_fee(
//         &self,
//         who: &T::AccountId,
//         call: &T::Call,
//         info: &DispatchInfoOf<T::Call>,
//         len: usize,
// 	) -> Result<
// 		(
// 			BalanceOf<T>,
// 			<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
// 		),
// 		TransactionValidityError,
// 	> {
//         let tip = self.0;

//         let fee = Self::traditional_fee(len, info, tip);

//         // Only mess with balances if fee is not zero.
//         if fee.is_zero() {
//             return <<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::withdraw_fee(who, call, info, fee, tip)
// 			.map(|i| (fee, i));
//         }

//         // Determine who is paying transaction fee based on ecnomic model
// 		// Parse call to extract collection ID and access collection sponsor
		
// 		let sponsor = pallet_nft_transaction_payment::<T>::withdraw_type(who, call);
// 		//let sponsor = Self::Module::<T>::withdraw_type(who, call);;
// 		// <pallet_nft_transaction_payment::Module<T>>::withdraw_type(who, call);

//         let who_pays_fee = sponsor.unwrap_or_else(|| who.clone());

// 		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::withdraw_fee(&who_pays_fee, call, info, fee, tip)
// 			.map(|i| (fee, i))
//     }
// }


// impl<T: Config + Send + Sync> SignedExtension
//     for ChargeTransactionPayment<T>
// where
//     BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
// 	T::Call: Dispatchable<Info=DispatchInfo, PostInfo=PostDispatchInfo> + IsSubType<pallet_nft::Call<T>> + IsSubType<pallet_contracts::Call<T>>,
//     T::AccountId: AsRef<[u8]>,
//     T::AccountId: UncheckedFrom<T::Hash>,
// {
//     const IDENTIFIER: &'static str = "ChargeTransactionPayment";
//     type AccountId = T::AccountId;
//     type Call = T::Call;
//     type AdditionalSigned = ();
//     type Pre = (
//         // tip
//         BalanceOf<T>,
//         // who pays fee
//         Self::AccountId,
// 		// imbalance resulting from withdrawing the fee
// 		<<T as pallet_transaction_payment::Config>::OnChargeTransaction as pallet_transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
//     );
//     fn additional_signed(&self) -> sp_std::result::Result<(), TransactionValidityError> {
//         Ok(())
//     }

//     fn validate(
//         &self,
//         who: &Self::AccountId,
//         call: &Self::Call,
//         info: &DispatchInfoOf<Self::Call>,
//         len: usize,
//     ) -> TransactionValidity {
// 		let (fee, _) = self.withdraw_fee(who, call, info, len)?;
// 		Ok(ValidTransaction {
// 			priority: Self::get_priority(len, info, fee),
// 			..Default::default()
// 		})
//     }

//     fn pre_dispatch(
//         self,
//         who: &Self::AccountId,
//         call: &Self::Call,
//         info: &DispatchInfoOf<Self::Call>,
//         len: usize,
//     ) -> Result<Self::Pre, TransactionValidityError> {
//         let (_fee, imbalance) = self.withdraw_fee(who, call, info, len)?;
//         Ok((self.0, who.clone(), imbalance))
//     }

//     fn post_dispatch(
//         pre: Self::Pre,
//         info: &DispatchInfoOf<Self::Call>,
//         post_info: &PostDispatchInfoOf<Self::Call>,
//         len: usize,
//         _result: &DispatchResult,
//     ) -> Result<(), TransactionValidityError> {
// 		let (tip, who, imbalance) = pre;
// 		let actual_fee = pallet_transaction_payment::Module::<T>::compute_actual_fee(
// 			len as u32,
// 			info,
// 			post_info,
// 			tip,
// 		);
// 		<T as pallet_transaction_payment::Config>::OnChargeTransaction::correct_and_deposit_fee(&who, info, post_info, actual_fee, tip, imbalance)?;
// 		Ok(())
//     }
// }