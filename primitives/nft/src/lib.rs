#![cfg_attr(not(feature = "std"), no_std)]

use core::convert::{TryFrom, TryInto};

#[cfg(feature = "serde")]
pub use serde::{Serialize, Deserialize};

use sp_core::U256;
use sp_runtime::{ArithmeticError, sp_std::prelude::Vec};
use codec::{Decode, Encode, EncodeLike, MaxEncodedLen};
pub use frame_support::{
	BoundedVec, construct_runtime, decl_event, decl_module, decl_storage, decl_error,
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
	StorageValue, transactional,
};
use derivative::Derivative;

pub const MAX_DECIMAL_POINTS: DecimalPoints = 30;
pub const MAX_REFUNGIBLE_PIECES: u128 = 1_000_000_000_000_000_000_000;
pub const MAX_SPONSOR_TIMEOUT: u32 = 10_368_000;
pub const MAX_TOKEN_OWNERSHIP: u32 = 10_000_000;

pub const COLLECTION_NUMBER_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	100000
} else {
	10
};
pub const CUSTOM_DATA_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	2048
} else {
	10
};
pub const COLLECTION_ADMINS_LIMIT: u64 = 5;
pub const ACCOUNT_TOKEN_OWNERSHIP_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	1000000
} else {
	10
};

// Timeouts for item types in passed blocks
pub const NFT_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
pub const FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
pub const REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;

// Schema limits
pub const OFFCHAIN_SCHEMA_LIMIT: u32 = 1024;
pub const VARIABLE_ON_CHAIN_SCHEMA_LIMIT: u32 = 1024;
pub const CONST_ON_CHAIN_SCHEMA_LIMIT: u32 = 1024;

pub const MAX_COLLECTION_NAME_LENGTH: usize = 64;
pub const MAX_COLLECTION_DESCRIPTION_LENGTH: usize = 256;
pub const MAX_TOKEN_PREFIX_LENGTH: usize = 16;

/// How much items can be created per single
/// create_many call
pub const MAX_ITEMS_PER_BATCH: u32 = 200;

parameter_types! {
	pub const CustomDataLimit: u32 = CUSTOM_DATA_LIMIT;
}

#[derive(Encode, Decode, PartialEq, Eq, PartialOrd, Ord, Clone, Copy, Debug, Default)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionId(pub u32);
impl EncodeLike<u32> for CollectionId {}
impl EncodeLike<CollectionId> for u32 {}

#[derive(Encode, Decode, PartialEq, Eq, PartialOrd, Ord, Clone, Copy, Debug, Default)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct TokenId(pub u32);
impl EncodeLike<u32> for TokenId {}
impl EncodeLike<TokenId> for u32 {}

impl TokenId {
	pub fn try_next(self) -> Result<TokenId, ArithmeticError> {
		self.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)
			.map(Self)
	}
}

impl From<TokenId> for U256 {
	fn from(t: TokenId) -> Self {
		t.0.into()
	}
}

impl TryFrom<U256> for TokenId {
	type Error = &'static str;

	fn try_from(value: U256) -> Result<Self, Self::Error> {
		Ok(TokenId(value.try_into().map_err(|_| "too large token id")?))
	}
}

pub struct OverflowError;
impl From<OverflowError> for &'static str {
	fn from(_: OverflowError) -> Self {
		"overflow occured"
	}
}

pub type DecimalPoints = u8;

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CollectionMode {
	NFT,
	// decimal points
	Fungible(DecimalPoints),
	ReFungible,
}

impl CollectionMode {
	pub fn id(&self) -> u8 {
		match self {
			CollectionMode::NFT => 1,
			CollectionMode::Fungible(_) => 2,
			CollectionMode::ReFungible => 3,
		}
	}
}

pub trait SponsoringResolve<AccountId, Call> {
	fn resolve(who: &AccountId, call: &Call) -> Option<AccountId>;
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
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
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
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
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Ownership<AccountId> {
	pub owner: AccountId,
	pub fraction: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
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
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Collection<T: frame_system::Config> {
	pub owner: T::AccountId,
	pub mode: CollectionMode,
	pub access: AccessMode,
	pub name: Vec<u16>,        // 64 include null escape char
	pub description: Vec<u16>, // 256 include null escape char
	pub token_prefix: Vec<u8>, // 16 include null escape char
	pub mint_mode: bool,
	pub offchain_schema: Vec<u8>,
	pub schema_version: SchemaVersion,
	pub sponsorship: SponsorshipState<T::AccountId>,
	pub limits: CollectionLimits<T::BlockNumber>, // Collection private restrictions
	pub variable_on_chain_schema: Vec<u8>,        //
	pub const_on_chain_schema: Vec<u8>,           //
	pub meta_update_permission: MetaUpdatePermission,
	pub transfers_enabled: bool,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
	pub owner: AccountId,
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct FungibleItemType {
	pub value: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
	pub owner: Vec<Ownership<AccountId>>,
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionLimits<BlockNumber: Encode + Decode> {
	pub account_token_ownership_limit: Option<u32>,
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

impl<BlockNumber: Encode + Decode> CollectionLimits<BlockNumber> {
	pub fn account_token_ownership_limit(&self) -> u32 {
		self.account_token_ownership_limit
			.unwrap_or(ACCOUNT_TOKEN_OWNERSHIP_LIMIT)
			.min(ACCOUNT_TOKEN_OWNERSHIP_LIMIT)
	}
}

impl<BlockNumber: Encode + Decode> Default for CollectionLimits<BlockNumber> {
	fn default() -> Self {
		Self {
			account_token_ownership_limit: Some(10_000_000),
			token_limit: u32::max_value(),
			sponsored_data_size: u32::MAX,
			sponsored_data_rate_limit: None,
			sponsor_transfer_timeout: 14400,
			owner_can_transfer: true,
			owner_can_destroy: true,
		}
	}
}

/// BoundedVec doesn't supports serde
#[cfg(feature = "serde1")]
mod bounded_serde {
	use core::convert::TryFrom;
	use frame_support::{BoundedVec, traits::Get};
	use serde::{
		ser::{self, Serialize},
		de::{self, Deserialize, Error},
	};
	use sp_std::vec::Vec;

	pub fn serialize<D, V, S>(value: &BoundedVec<V, S>, serializer: D) -> Result<D::Ok, D::Error>
	where
		D: ser::Serializer,
		V: Serialize,
	{
		let vec: &Vec<_> = &value;
		vec.serialize(serializer)
	}

	pub fn deserialize<'de, D, V, S>(deserializer: D) -> Result<BoundedVec<V, S>, D::Error>
	where
		D: de::Deserializer<'de>,
		V: de::Deserialize<'de>,
		S: Get<u32>,
	{
		// TODO: Implement custom visitor, which will limit vec size at parse time? Will serde only be used by chainspec?
		let vec = <Vec<V>>::deserialize(deserializer)?;
		let len = vec.len();
		TryFrom::try_from(vec).map_err(|_| D::Error::invalid_length(len, &"lesser size"))
	}
}

#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateNftData {
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
	pub value: u128,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateReFungibleData {
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	pub pieces: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum MetaUpdatePermission {
	ItemOwner,
	Admin,
	None,
}

impl Default for MetaUpdatePermission {
	fn default() -> Self {
		Self::ItemOwner
	}
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CreateItemData {
	NFT(CreateNftData),
	Fungible(CreateFungibleData),
	ReFungible(CreateReFungibleData),
}

impl CreateItemData {
	pub fn data_size(&self) -> usize {
		match self {
			CreateItemData::NFT(data) => data.variable_data.len() + data.const_data.len(),
			CreateItemData::ReFungible(data) => data.variable_data.len() + data.const_data.len(),
			_ => 0,
		}
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
