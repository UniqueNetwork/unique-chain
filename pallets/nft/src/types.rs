#[cfg(feature = "std")]
pub use std::*;

pub use serde::{Serealize, Deserialize};

use codec::{Decode, Encode};

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
    // decimal points
    ReFungible(DecimalPoints),
}

impl Into<u8> for CollectionMode {
    fn into(self) -> u8 {
        match self {
            CollectionMode::Invalid => 0,
            CollectionMode::NFT => 1,
            CollectionMode::Fungible(_) => 2,
            CollectionMode::ReFungible(_) => 3,
        }
    }
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

impl Default for CollectionMode {
    fn default() -> Self {
        Self::Invalid
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

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CollectionType<AccountId> {
    pub owner: AccountId,
    pub mode: CollectionMode,
    pub access: AccessMode,
    pub decimal_points: DecimalPoints,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub mint_mode: bool,
    pub offchain_schema: Vec<u8>,
    pub schema_version: SchemaVersion,
    pub sponsor: AccountId, // Who pays fees. If set to default address, the fees are applied to the transaction sender
    pub unconfirmed_sponsor: AccountId, // Sponsor address that has not yet confirmed sponsorship
    pub limits: CollectionLimits, // Collection private restrictions 
    pub variable_on_chain_schema: Vec<u8>, //
    pub const_on_chain_schema: Vec<u8>, //
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
    pub collection: CollectionId,
    pub owner: AccountId,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct FungibleItemType<AccountId> {
    pub collection: CollectionId,
    pub owner: AccountId,
    pub value: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
    pub collection: CollectionId,
    pub owner: Vec<Ownership<AccountId>>,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ApprovePermissions<AccountId> {
    pub approved: AccountId,
    pub amount: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct VestingItem<AccountId, Moment> {
    pub sender: AccountId,
    pub recipient: AccountId,
    pub collection_id: CollectionId,
    pub item_id: TokenId,
    pub amount: u64,
    pub vesting_date: Moment,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct BasketItem<AccountId, BlockNumber> {
    pub address: AccountId,
    pub start_block: BlockNumber,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CollectionLimits {
    pub account_token_ownership_limit: u32,
    pub sponsored_data_size: u32,
    pub token_limit: u32,

    // Timeouts for item types in passed blocks
    pub sponsor_transfer_timeout: u32,
}

impl Default for CollectionLimits {
    fn default() -> CollectionLimits {
        CollectionLimits { 
            account_token_ownership_limit: 10_000_000, 
            token_limit: u32::max_value(),
            sponsored_data_size: u32::max_value(), 
            sponsor_transfer_timeout: 14400 }
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
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateReFungibleData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
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
