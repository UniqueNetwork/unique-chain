#![cfg_attr(not(feature = "std"), no_std)]

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

#[ink::chain_extension]
pub trait NftChainExtension {
    type ErrorCode = NftErrorCode;

    /// Transfer one NFT token from sender
    ///
    #[ink(extension = 0, returns_result = false)]
    fn transfer(recipient: <DefaultEnvironment as Environment>::AccountId, collection_id: u32, token_id: u32, amount: u128);
}

#[ink::contract(env = crate::NftEnvironment)]
mod nft_transfer {

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

    }

}
