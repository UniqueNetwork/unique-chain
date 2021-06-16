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

                match pallet_nft::Module::<C>::transfer_internal(
                    env.ext().caller().clone(),
                    input.recipient,
                    &collection,
                    input.token_id,
                    input.amount,
                ) {
                    Ok(_) => Ok(RetVal::Converging(func_id)),
                    _ => Err(DispatchError::Other("Transfer error"))
                }
            },
            1 => {
                // Create Item
                let mut env = env.buf_in_buf_out();
                let input: NFTExtCreateItem<E> = env.read_as()?;

                match pallet_nft::Module::<C>::create_item_internal(
                    env.ext().address().clone(),
                    input.collection_id,
                    input.owner,
                    input.data,
                ) {
                    Ok(_) => Ok(RetVal::Converging(func_id)),
                    _ => Err(DispatchError::Other("CreateItem error"))
                }
            },
            _ => {
                panic!("Passed unknown func_id to test chain extension: {}", func_id);
            }
        }
    }
}
