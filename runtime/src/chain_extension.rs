//! NFT Chain Extension

//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

use codec::{Decode, Encode};
use max_encoded_len::MaxEncodedLen;
use derivative::Derivative;

pub use pallet_contracts::chain_extension::RetVal;
use pallet_contracts::chain_extension::{
	ChainExtension, Environment, Ext, InitState, SysConfig, UncheckedFrom,
};

pub use frame_support::debug;
use frame_support::dispatch::DispatchError;

extern crate pallet_nft;
pub use pallet_nft::*;
use pallet_nft::CrossAccountId;
use nft_data_structs::*;

/// Create item parameters
#[derive(Debug, PartialEq, Encode, Decode, MaxEncodedLen)]
pub struct NFTExtCreateItem<AccountId> {
	pub owner: AccountId,
	pub collection_id: u32,
	pub data: CreateItemData,
}

/// Transfer parameters
#[derive(Debug, PartialEq, Encode, Decode, MaxEncodedLen)]
pub struct NFTExtTransfer<AccountId> {
	pub recipient: AccountId,
	pub collection_id: u32,
	pub token_id: u32,
	pub amount: u128,
}

#[derive(Derivative, PartialEq, Encode, Decode, MaxEncodedLen)]
#[derivative(Debug)]
pub struct NFTExtCreateMultipleItems<AccountId> {
	pub owner: AccountId,
	pub collection_id: u32,
	#[derivative(Debug = "ignore")]
	pub data: BoundedVec<CreateItemData, MaxItemsPerBatch>,
}

#[derive(Debug, PartialEq, Encode, Decode, MaxEncodedLen)]
pub struct NFTExtApprove<AccountId> {
	pub spender: AccountId,
	pub collection_id: u32,
	pub item_id: u32,
	pub amount: u128,
}

#[derive(Debug, PartialEq, Encode, Decode, MaxEncodedLen)]
pub struct NFTExtTransferFrom<AccountId> {
	pub owner: AccountId,
	pub recipient: AccountId,
	pub collection_id: u32,
	pub item_id: u32,
	pub amount: u128,
}

#[derive(Derivative, PartialEq, Encode, Decode, MaxEncodedLen)]
#[derivative(Debug)]
pub struct NFTExtSetVariableMetaData {
	pub collection_id: u32,
	pub item_id: u32,
	#[derivative(Debug = "ignore")]
	pub data: BoundedVec<u8, MaxDataSize>,
}

#[derive(Debug, PartialEq, Encode, Decode, MaxEncodedLen)]
pub struct NFTExtToggleWhiteList<AccountId> {
	pub collection_id: u32,
	pub address: AccountId,
	pub whitelisted: bool,
}

/// The chain Extension of NFT pallet
pub struct NFTExtension;

pub type NftWeightInfoOf<C> = <C as pallet_nft::Config>::WeightInfo;

pub type AccountIdOf<C> = <C as SysConfig>::AccountId;

impl<C: Config + pallet_contracts::Config> ChainExtension<C> for NFTExtension {
	fn call<E: Ext>(func_id: u32, env: Environment<E, InitState>) -> Result<RetVal, DispatchError>
	where
		E: Ext<T = C>,
		C: pallet_nft::Config,
		<E::T as SysConfig>::AccountId: UncheckedFrom<<E::T as SysConfig>::Hash> + AsRef<[u8]>,
	{
		// The memory of the vm stores buf in scale-codec
		match func_id {
			0 => {
				let mut env = env.buf_in_buf_out();
				let input: NFTExtTransfer<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::transfer())?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::transfer_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&C::CrossAccountId::from_sub(input.recipient),
					&collection,
					input.token_id,
					input.amount,
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			1 => {
				// Create Item
				let mut env = env.buf_in_buf_out();
				let input: NFTExtCreateItem<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::create_item(input.data.data_size()))?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::create_item_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&collection,
					&C::CrossAccountId::from_sub(input.owner),
					input.data,
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			2 => {
				// Create multiple items
				let mut env = env.buf_in_buf_out();
				let input: NFTExtCreateMultipleItems<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::create_item(
					input.data.iter().map(|i| i.data_size()).sum(),
				))?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::create_multiple_items_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&collection,
					&C::CrossAccountId::from_sub(input.owner),
					input.data.into_inner(),
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			3 => {
				// Approve
				let mut env = env.buf_in_buf_out();
				let input: NFTExtApprove<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::approve())?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::approve_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&C::CrossAccountId::from_sub(input.spender),
					&collection,
					input.item_id,
					input.amount,
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			4 => {
				// Transfer from
				let mut env = env.buf_in_buf_out();
				let input: NFTExtTransferFrom<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::transfer_from())?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::transfer_from_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&C::CrossAccountId::from_sub(input.owner),
					&C::CrossAccountId::from_sub(input.recipient),
					&collection,
					input.item_id,
					input.amount,
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			5 => {
				// Set variable metadata
				let mut env = env.buf_in_buf_out();
				let input: NFTExtSetVariableMetaData = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::set_variable_meta_data())?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::set_variable_meta_data_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&collection,
					input.item_id,
					input.data.into_inner(),
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			6 => {
				// Toggle whitelist
				let mut env = env.buf_in_buf_out();
				let input: NFTExtToggleWhiteList<AccountIdOf<C>> = env.read_as()?;
				env.charge_weight(NftWeightInfoOf::<C>::add_to_white_list())?;

				let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

				pallet_nft::Module::<C>::toggle_white_list_internal(
					&C::CrossAccountId::from_sub(env.ext().address().clone()),
					&collection,
					&C::CrossAccountId::from_sub(input.address),
					input.whitelisted,
				)?;

				collection.submit_logs()?;
				Ok(RetVal::Converging(0))
			}
			_ => Err(DispatchError::Other("unknown chain_extension func_id")),
		}
	}
}
