#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "serde")]
pub use serde::{Serialize, Deserialize};

use sp_runtime::sp_std::prelude::Vec;
use codec::{Decode, Encode};
use max_encoded_len::MaxEncodedLen;
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

pub type CollectionId = u32;
pub type TokenId = u32;
pub type DecimalPoints = u8;

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
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

impl CollectionMode {
	pub fn id(&self) -> u8 {
		match self {
			CollectionMode::Invalid => 0,
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
	pub decimal_points: DecimalPoints,
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
			owner_can_destroy: true,
		}
	}
}

pub trait ChainLimits {
	type CollectionNumberLimit: Get<u32>;
	type AccountTokenOwnershipLimit: Get<u32>;
	type CollectionAdminsLimit: Get<u64>;
	type CustomDataLimit: Get<u32>;

	// Timeouts for item types in passed blocks
	type NftSponsorTransferTimeout: Get<u32>;
	type FungibleSponsorTransferTimeout: Get<u32>;
	type ReFungibleSponsorTransferTimeout: Get<u32>;

	// Schema limits
	type OffchainSchemaLimit: Get<u32>;
	type VariableOnChainSchemaLimit: Get<u32>;
	type ConstOnChainSchemaLimit: Get<u32>;

	/// How much items can be created per single
	/// create_many call
	type MaxItemsPerBatch: Get<u32>;
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

#[derive(Encode, Decode, MaxEncodedLen, Default, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug(bound = ""), PartialEq(bound = ""), Clone(bound = ""))]
pub struct CreateNftData<T: ChainLimits> {
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub const_data: BoundedVec<u8, T::CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub variable_data: BoundedVec<u8, T::CustomDataLimit>,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
	pub value: u128,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug(bound = ""), PartialEq(bound = ""), Clone(bound = ""))]
pub struct CreateReFungibleData<T: ChainLimits> {
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub const_data: BoundedVec<u8, T::CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded_serde"))]
	#[derivative(Debug = "ignore")]
	pub variable_data: BoundedVec<u8, T::CustomDataLimit>,
	pub pieces: u128,
}

#[derive(Encode, Decode, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug(bound = ""), PartialEq(bound = ""), Clone(bound = ""))]
pub enum CreateItemData<T: ChainLimits> {
	NFT(CreateNftData<T>),
	Fungible(CreateFungibleData),
	ReFungible(CreateReFungibleData<T>),
}

impl<T: ChainLimits> CreateItemData<T> {
	pub fn data_size(&self) -> usize {
		match self {
			CreateItemData::NFT(data) => data.variable_data.len() + data.const_data.len(),
			CreateItemData::ReFungible(data) => data.variable_data.len() + data.const_data.len(),
			_ => 0,
		}
	}
}

impl<T: ChainLimits> From<CreateNftData<T>> for CreateItemData<T> {
	fn from(item: CreateNftData<T>) -> Self {
		CreateItemData::NFT(item)
	}
}

impl<T: ChainLimits> From<CreateReFungibleData<T>> for CreateItemData<T> {
	fn from(item: CreateReFungibleData<T>) -> Self {
		CreateItemData::ReFungible(item)
	}
}

impl<T: ChainLimits> From<CreateFungibleData> for CreateItemData<T> {
	fn from(item: CreateFungibleData) -> Self {
		CreateItemData::Fungible(item)
	}
}
