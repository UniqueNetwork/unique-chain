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
use crate::Runtime;
use sp_runtime::AccountId32;
use crate::Vec;

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
        <E::T as SysConfig>::AccountId: UncheckedFrom<<E::T as SysConfig>::Hash> + AsRef<[u8]>,
    {
        // The memory of the vm stores buf in scale-codec
        match func_id {
            0 => {
                let mut env = env.buf_in_buf_out();
                let input: NFTExtTransfer<E> = env.read_as()?;

                // Sender to AccountId32
                let mut bytes_sender: [u8; 32] = [0; 32];
                let addr_vec_sender: Vec<u8> = env.ext().caller().encode();
                for i in 0..32 {
                    bytes_sender[i] = addr_vec_sender[i];
                }
                let sender = AccountId32::from(bytes_sender);

                // Recipient to AccountId32
                let mut bytes_rec: [u8; 32] = [0; 32];
                let addr_vec_rec: Vec<u8> = input.recipient.encode();
                for i in 0..32 {
                    bytes_rec[i] = addr_vec_rec[i];
                }
                let recipient = AccountId32::from(bytes_rec);

                match pallet_nft::Module::<Runtime>::transfer_internal(sender, recipient, input.collection_id, input.token_id, input.amount) {
                    Ok(_) => Ok(RetVal::Converging(func_id)),
                    _ => Err(DispatchError::Other("Transfer error"))
                }
            },
			_ => {
				panic!("Passed unknown func_id to test chain extension: {}", func_id);
            }
        }
    }
}
