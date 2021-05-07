//! NFT Chain Extension

//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

use codec::{Decode, Encode};

pub use pallet_contracts::chain_extension::RetVal;
use pallet_contracts::chain_extension::{
    ChainExtension, Environment, Ext, InitState, SysConfig, UncheckedFrom,
};

pub use frame_support::debug;
use frame_support::dispatch::DispatchError;

extern crate pallet_nft;
pub use pallet_nft::*;
use pallet_nft::CrossAccountId;
use crate::Vec;

/// Create item parameters
#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtCreateItem<E: Ext> {
    pub owner: <E::T as SysConfig>::AccountId,
    pub collection_id: u32,
    pub data: CreateItemData,
}

/// Transfer parameters
#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtTransfer<E: Ext> {
    pub recipient: <E::T as SysConfig>::AccountId,
    pub collection_id: u32,
    pub token_id: u32,
    pub amount: u128,
}

#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtCreateMultipleItems<E: Ext> {
    pub owner: <E::T as SysConfig>::AccountId,
    pub collection_id: u32,
    pub data: Vec<CreateItemData>,
}

#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtApprove<E: Ext> {
    pub spender: <E::T as SysConfig>::AccountId,
    pub collection_id: u32,
    pub item_id: u32,
    pub amount: u128,
}

#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtTransferFrom<E: Ext> {
    pub owner: <E::T as SysConfig>::AccountId,
    pub recipient: <E::T as SysConfig>::AccountId,
    pub collection_id: u32,
    pub item_id: u32,
    pub amount: u128,
}

#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtSetVariableMetaData {
    pub collection_id: u32,
    pub item_id: u32,
    pub data: Vec<u8>,   
}

#[derive(Debug, PartialEq, Encode, Decode)]
pub struct NFTExtToggleWhiteList<E: Ext> {
    pub collection_id: u32,
    pub address: <E::T as SysConfig>::AccountId,
    pub whitelisted: bool,
}

/// The chain Extension of NFT pallet
pub struct NFTExtension;

impl<C: Config> ChainExtension<C> for NFTExtension {
    fn call<E: Ext>(func_id: u32, env: Environment<E, InitState>) -> Result<RetVal, DispatchError>
    where
        E: Ext<T = C>,
        <E::T as SysConfig>::AccountId: UncheckedFrom<<E::T as SysConfig>::Hash> + AsRef<[u8]>,
    {
        // The memory of the vm stores buf in scale-codec
        match func_id {
            0 => {
                let mut env = env.buf_in_buf_out();
                let input: NFTExtTransfer<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::transfer_internal(
                    &C::CrossAccountId::from_sub(env.ext().caller().clone()),
                    &C::CrossAccountId::from_sub(input.recipient),
                    &collection,
                    input.token_id,
                    input.amount,
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            1 => {
                // Create Item
                let mut env = env.buf_in_buf_out();
                let input: NFTExtCreateItem<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::create_item_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &collection,
                    &C::CrossAccountId::from_sub(input.owner),
                    input.data,
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            2 => {
                // Create multiple items
                let mut env = env.buf_in_buf_out();
                let input: NFTExtCreateMultipleItems<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::create_multiple_items_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &collection,
                    &C::CrossAccountId::from_sub(input.owner),
                    input.data,
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            3 => {
                // Approve
                let mut env = env.buf_in_buf_out();
                let input: NFTExtApprove<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::approve_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &C::CrossAccountId::from_sub(input.spender),
                    &collection,
                    input.item_id,
                    input.amount,
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            4 => {
                // Transfer from
                let mut env = env.buf_in_buf_out();
                let input: NFTExtTransferFrom<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::transfer_from_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &C::CrossAccountId::from_sub(input.owner),
                    &C::CrossAccountId::from_sub(input.recipient),
                    &collection,
                    input.item_id,
                    input.amount
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            5 => {
                // Set variable metadata
                let mut env = env.buf_in_buf_out();
                let input: NFTExtSetVariableMetaData = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::set_variable_meta_data_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &collection,
                    input.item_id,
                    input.data,
                )?;

                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            },
            6 => {
                // Toggle whitelist
                let mut env = env.buf_in_buf_out();
                let input: NFTExtToggleWhiteList<E> = env.read_as()?;

                let collection = pallet_nft::Module::<C>::get_collection(input.collection_id)?;

                pallet_nft::Module::<C>::toggle_white_list_internal(
                    &C::CrossAccountId::from_sub(env.ext().address().clone()),
                    &collection,
                    &C::CrossAccountId::from_sub(input.address),
                    input.whitelisted,
                )?;
 
                pallet_nft::Module::<C>::submit_logs(collection)?;
                Ok(RetVal::Converging(func_id))
            }
            _ => {
                panic!("Passed unknown func_id to test chain extension: {}", func_id);
            }
        }
    }
}
