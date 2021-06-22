
#![cfg_attr(not(feature = "std"), no_std)]

pub use serde::{Serealize, Deserialize};

use frame_system;
use sp_runtime::sp_std::prelude::Vec;
use codec::{Decode, Encode};
pub use frame_support::{
    construct_runtime, decl_event, decl_module, decl_storage, decl_error,
    dispatch::DispatchResult,
    ensure, fail, parameter_types,
    traits::{
        Currency, ExistenceRequirement, Get, Imbalance, KeyOwnerProofSystem, OnUnbalanced,
        Randomness, IsSubType, WithdrawReasons,
    },
    weights::{
        constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
        DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
        WeightToFeePolynomial, DispatchClass,
    },
    StorageValue,
    transactional,
};

pub const MAX_DECIMAL_POINTS: DecimalPoints = 30;
pub const MAX_REFUNGIBLE_PIECES: u128 = 1_000_000_000_000_000_000_000;
pub const MAX_SPONSOR_TIMEOUT: u32 = 10_368_000;
pub const MAX_TOKEN_OWNERSHIP: u32 = 10_000_000;

pub type CollectionId = u32;
pub type TokenId = u32;
pub type DecimalPoints = u8;

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CollectionMode {
    Invalid,
    NFT,
    // decimal points
    Fungible(DecimalPoints),
    ReFungible,
}

impl Default for CollectionMode {
    fn default() -> Self {
        Self::Invalid
    }
}

impl Into<u8> for CollectionMode {
    fn into(self) -> u8 {
        match self {
            CollectionMode::Invalid => 0,
            CollectionMode::NFT => 1,
            CollectionMode::Fungible(_) => 2,
            CollectionMode::ReFungible => 3,
        }
    }
}

pub trait SponsoringResolve<AccountId, Call> {
    fn resolve(
        who: &AccountId,
		call: &Call) -> Option<AccountId>;
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum AccessMode {
    Normal,
    WhiteList,
}
impl Default for AccessMode {
    fn default() -> Self {
        Self::Normal
    }
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum SchemaVersion {
    ImageURL,
    Unique,
}
impl Default for SchemaVersion {
    fn default() -> Self {
        Self::ImageURL
    }
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct Ownership<AccountId> {
    pub owner: AccountId,
    pub fraction: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum SponsorshipState<AccountId> {
    /// The fees are applied to the transaction sender
    Disabled,
    Unconfirmed(AccountId),
    /// Transactions are sponsored by specified account
    Confirmed(AccountId),
}

impl<AccountId> SponsorshipState<AccountId> {
    pub fn sponsor(&self) -> Option<&AccountId> {
        match self {
            Self::Confirmed(sponsor) => Some(sponsor),
            _ => None,
        }
    }

    pub fn pending_sponsor(&self) -> Option<&AccountId> {
        match self {
            Self::Unconfirmed(sponsor) | Self::Confirmed(sponsor) => Some(sponsor),
            _ => None,
        }
    }

    pub fn confirmed(&self) -> bool {
        matches!(self, Self::Confirmed(_))
    }
}

impl<T> Default for SponsorshipState<T> {
    fn default() -> Self {
        Self::Disabled
    }
}

#[derive(Encode, Decode, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct Collection<T: frame_system::Config> {
    pub owner: T::AccountId,
    pub mode: CollectionMode,
    pub access: AccessMode,
    pub decimal_points: DecimalPoints,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub mint_mode: bool,
    pub offchain_schema: Vec<u8>,
    pub schema_version: SchemaVersion,
    pub sponsorship: SponsorshipState<T::AccountId>,
    pub limits: CollectionLimits<T::BlockNumber>, // Collection private restrictions 
    pub variable_on_chain_schema: Vec<u8>, //
    pub const_on_chain_schema: Vec<u8>, //
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
    pub owner: AccountId,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct FungibleItemType {
    pub value: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
    pub owner: Vec<Ownership<AccountId>>,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}


#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CollectionLimits<BlockNumber: Encode + Decode> {
    pub account_token_ownership_limit: u32,
    pub sponsored_data_size: u32,
    /// None - setVariableMetadata is not sponsored
    /// Some(v) - setVariableMetadata is sponsored 
    ///           if there is v block between txs
    pub sponsored_data_rate_limit: Option<BlockNumber>,
    pub token_limit: u32,

    // Timeouts for item types in passed blocks
    pub sponsor_transfer_timeout: u32,
    pub owner_can_transfer: bool,
    pub owner_can_destroy: bool,
}

impl<BlockNumber: Encode + Decode> Default for CollectionLimits<BlockNumber> {
    fn default() -> Self {
        Self { 
            account_token_ownership_limit: 10_000_000, 
            token_limit: u32::max_value(),
            sponsored_data_size: u32::MAX, 
            sponsored_data_rate_limit: None,
            sponsor_transfer_timeout: 14400,
            owner_can_transfer: true,
            owner_can_destroy: true
        }
    }
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ChainLimits {
    pub collection_numbers_limit: u32,
    pub account_token_ownership_limit: u32,
    pub collections_admins_limit: u64,
    pub custom_data_limit: u32,

    // Timeouts for item types in passed blocks
    pub nft_sponsor_transfer_timeout: u32,
    pub fungible_sponsor_transfer_timeout: u32,
    pub refungible_sponsor_transfer_timeout: u32,

    // Schema limits
    pub offchain_schema_limit: u32,
    pub variable_on_chain_schema_limit: u32,
    pub const_on_chain_schema_limit: u32,
}


#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateNftData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
    pub value: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateReFungibleData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
    pub pieces: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CreateItemData {
    NFT(CreateNftData),
    Fungible(CreateFungibleData),
    ReFungible(CreateReFungibleData),
}

impl CreateItemData {
    pub fn len(&self) -> usize {
        let len = match self {
            CreateItemData::NFT(data) => data.variable_data.len() + data.const_data.len(),
            CreateItemData::ReFungible(data) => data.variable_data.len() + data.const_data.len(),
            _ => 0
        };
        
        return len;
    }
}

impl From<CreateNftData> for CreateItemData {
    fn from(item: CreateNftData) -> Self {
        CreateItemData::NFT(item)
    }
}

impl From<CreateReFungibleData> for CreateItemData {
    fn from(item: CreateReFungibleData) -> Self {
        CreateItemData::ReFungible(item)
    }
}

impl From<CreateFungibleData> for CreateItemData {
    fn from(item: CreateFungibleData) -> Self {
        CreateItemData::Fungible(item)
    }
}