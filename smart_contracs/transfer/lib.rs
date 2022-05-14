// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

#![cfg_attr(not(feature = "std"), no_std)]
extern crate alloc;
use alloc::vec::Vec;

use ink_lang as ink;
use ink_env::{Environment, DefaultEnvironment};

pub enum NftEnvironment {}

impl Environment for NftEnvironment {
    const MAX_EVENT_TOPICS: usize =
        <DefaultEnvironment as Environment>::MAX_EVENT_TOPICS;

    type AccountId = <DefaultEnvironment as Environment>::AccountId;
    type Balance = <DefaultEnvironment as Environment>::Balance;
    type Hash = <DefaultEnvironment as Environment>::Hash;
    type BlockNumber = <DefaultEnvironment as Environment>::BlockNumber;
    type Timestamp = <DefaultEnvironment as Environment>::Timestamp;

    type ChainExtension = NftChainExtension;
}

/// The shared error code for the NFT chain extension.
#[derive(
    Debug, Copy, Clone, PartialEq, Eq, scale::Encode, scale::Decode,
)]
pub enum NftErrorCode {
    SomeError,
}

impl ink_env::chain_extension::FromStatusCode for NftErrorCode {
    fn from_status_code(status_code: u32) -> Result<(), Self> {
        match status_code {
            0 => Ok(()),
            1 => Err(Self::SomeError),
            _ => panic!("encountered unknown status code"),
        }
    }
}

#[derive(scale::Encode, scale::Decode, scale_info::TypeInfo)]
pub enum CreateItemData {
    Nft {
        const_data: Vec<u8>,
    },
    Fungible {
        value: u128,
    },
    ReFungible {
        const_data: Vec<u8>,
        pieces: u128,
    },
}

type DefaultAccountId = <DefaultEnvironment as Environment>::AccountId;

#[ink::chain_extension]
pub trait NftChainExtension {
    type ErrorCode = NftErrorCode;

    /// Transfer one NFT token from sender
    ///
    #[ink(extension = 0, returns_result = false)]
    fn transfer(recipient: DefaultAccountId, collection_id: u32, token_id: u32, amount: u128);
    #[ink(extension = 1, returns_result = false)]
    fn create_item(owner: DefaultAccountId, collection_id: u32, data: CreateItemData);
    #[ink(extension = 2, returns_result = false)]
    fn create_multiple_items(owner: DefaultAccountId, collection_id: u32, data: Vec<CreateItemData>);
    #[ink(extension = 3, returns_result = false)]
    fn approve(spender: DefaultAccountId, collection_id: u32, item_id: u32, amount: u128);
    #[ink(extension = 4, returns_result = false)]
    fn transfer_from(owner: DefaultAccountId, recipient: DefaultAccountId, collection_id: u32, item_id: u32, amount: u128);
    #[ink(extension = 6, returns_result = false)]
    fn toggle_allow_list(collection_id: u32, address: DefaultAccountId, allowlisted: bool);
}

#[ink::contract(env = crate::NftEnvironment, dynamic_storage_allocator = true)]
mod nft_transfer {
    use alloc::vec::Vec;
    // use ink_storage::Vec;
    use crate::CreateItemData;

    #[ink(storage)]
    pub struct NftTransfer {
    }

    impl NftTransfer {
        /// Default Constructor
        ///
        /// Constructors can delegate to other constructors.
        #[ink(constructor)]
        pub fn default() -> Self {
            Self {}
        }

        /// Transfer one NFT token
        #[ink(message)]
        pub fn transfer(&mut self, recipient: AccountId, collection_id: u32, token_id: u32, amount: u128) {
            let _ = self.env()
                .extension()
                .transfer(recipient, collection_id, token_id, amount);
        }
        #[ink(message)]
        pub fn create_item(&mut self, recipient: AccountId, collection_id: u32, data: CreateItemData) {
            let _ = self.env()
                .extension()
                .create_item(recipient, collection_id, data);
        }
        #[ink(message)]
        pub fn create_multiple_items(&mut self, owner: AccountId, collection_id: u32, data: Vec<CreateItemData>) {
            let _ = self.env()
                .extension()
                .create_multiple_items(owner, collection_id, data);
        }
        #[ink(message)]
        pub fn approve(&mut self, spender: AccountId, collection_id: u32, item_id: u32, amount: u128) {
            let _ = self.env()
                .extension()
                .approve(spender, collection_id, item_id, amount);
        }
        #[ink(message)]
        pub fn transfer_from(&mut self, owner: AccountId, recipient: AccountId, collection_id: u32, item_id: u32, amount: u128) {
            let _ = self.env()
                .extension()
                .transfer_from(owner, recipient, collection_id, item_id, amount);
        }
        #[ink(message)]
        pub fn toggle_allow_list(&mut self, collection_id: u32, address: AccountId, allowlisted: bool) {
            let _ = self.env()
                .extension()
                .toggle_allow_list(collection_id, address, allowlisted);
        }

    }

}
