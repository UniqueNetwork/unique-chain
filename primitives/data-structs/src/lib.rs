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

use core::{
	convert::{TryFrom, TryInto},
	fmt,
};
use frame_support::{
	storage::{bounded_btree_map::BoundedBTreeMap, bounded_btree_set::BoundedBTreeSet},
	traits::Get,
};

#[cfg(feature = "serde")]
use serde::{Serialize, Deserialize};

use sp_core::U256;
use sp_runtime::{ArithmeticError, sp_std::prelude::Vec, DispatchError};
use codec::{Decode, Encode, EncodeLike, MaxEncodedLen};
use frame_support::{BoundedVec, traits::ConstU32};
use derivative::Derivative;
use scale_info::TypeInfo;

mod bounded;
pub mod budget;
pub mod mapping;
mod migration;

pub const MAX_DECIMAL_POINTS: DecimalPoints = 30;
pub const MAX_REFUNGIBLE_PIECES: u128 = 1_000_000_000_000_000_000_000;
pub const MAX_SPONSOR_TIMEOUT: u32 = 10_368_000;

pub const MAX_TOKEN_OWNERSHIP: u32 = if cfg!(not(feature = "limit-testing")) {
	100_000
} else {
	10
};
pub const COLLECTION_NUMBER_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	100_000
} else {
	10
};
pub const CUSTOM_DATA_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	2048
} else {
	10
};
pub const COLLECTION_ADMINS_LIMIT: u32 = 5;
pub const COLLECTION_TOKEN_LIMIT: u32 = u32::MAX;
pub const ACCOUNT_TOKEN_OWNERSHIP_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	1_000_000
} else {
	10
};

// Timeouts for item types in passed blocks
pub const NFT_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
pub const FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
pub const REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;

pub const SPONSOR_APPROVE_TIMEOUT: u32 = 5;

// Schema limits
pub const OFFCHAIN_SCHEMA_LIMIT: u32 = 8192;
pub const VARIABLE_ON_CHAIN_SCHEMA_LIMIT: u32 = 8192;
pub const CONST_ON_CHAIN_SCHEMA_LIMIT: u32 = 32768;

pub const COLLECTION_FIELD_LIMIT: u32 = CONST_ON_CHAIN_SCHEMA_LIMIT;
// u32::max is not const: OFFCHAIN_SCHEMA_LIMIT.max(VARIABLE_ON_CHAIN_SCHEMA_LIMIT).max(CONST_ON_CHAIN_SCHEMA_LIMIT);

pub const MAX_COLLECTION_NAME_LENGTH: u32 = 64;
pub const MAX_COLLECTION_DESCRIPTION_LENGTH: u32 = 256;
pub const MAX_TOKEN_PREFIX_LENGTH: u32 = 16;

pub const MAX_PROPERTY_KEY_LENGTH: u32 = 256;
pub const MAX_PROPERTY_VALUE_LENGTH: u32 = 32768;
pub const MAX_PROPERTIES_PER_ITEM: u32 = 64;

// pub const MAX_PROPERTY_KEYS_OVERALL_LENGTH: u32 = MAX_PROPERTY_KEY_LENGTH * MAX_PROPERTIES_PER_ITEM;
pub const MAX_COLLECTION_PROPERTIES_SIZE: u32 = 40960;
pub const MAX_TOKEN_PROPERTIES_SIZE: u32 = 32768;

pub const MAX_COLLECTION_PROPERTIES_ENCODE_LEN: u32 =
	MAX_PROPERTIES_PER_ITEM * MAX_PROPERTY_KEY_LENGTH + MAX_COLLECTION_PROPERTIES_SIZE;

pub struct MaxPropertiesPermissionsEncodeLen;

impl Get<u32> for MaxPropertiesPermissionsEncodeLen {
	fn get() -> u32 {
		MAX_PROPERTIES_PER_ITEM * MAX_PROPERTY_KEY_LENGTH
			+ <PropertyPermission as MaxEncodedLen>::max_encoded_len() as u32
	}
}

/// How much items can be created per single
/// create_many call
pub const MAX_ITEMS_PER_BATCH: u32 = 200;

pub type CustomDataLimit = ConstU32<CUSTOM_DATA_LIMIT>;

#[derive(
	Encode,
	Decode,
	PartialEq,
	Eq,
	PartialOrd,
	Ord,
	Clone,
	Copy,
	Debug,
	Default,
	TypeInfo,
	MaxEncodedLen,
)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionId(pub u32);
impl EncodeLike<u32> for CollectionId {}
impl EncodeLike<CollectionId> for u32 {}

#[derive(
	Encode,
	Decode,
	PartialEq,
	Eq,
	PartialOrd,
	Ord,
	Clone,
	Copy,
	Debug,
	Default,
	TypeInfo,
	MaxEncodedLen,
)]
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

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
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

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum AccessMode {
	Normal,
	AllowList,
}
impl Default for AccessMode {
	fn default() -> Self {
		Self::Normal
	}
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
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

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Ownership<AccountId> {
	pub owner: AccountId,
	pub fraction: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
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

/// Used in storage
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
pub struct Collection<AccountId> {
	pub owner: AccountId,
	pub mode: CollectionMode,
	pub access: AccessMode,
	pub name: BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>,
	pub description: BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>,
	pub token_prefix: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,
	pub mint_mode: bool,

	#[version(..2)]
	pub offchain_schema: BoundedVec<u8, ConstU32<OFFCHAIN_SCHEMA_LIMIT>>,

	pub schema_version: SchemaVersion,
	pub sponsorship: SponsorshipState<AccountId>,

	#[version(..2)]
	pub limits: CollectionLimitsVersion1, // Collection private restrictions
	#[version(2.., upper(limits.into()))]
	pub limits: CollectionLimitsVersion2,

	#[version(..2)]
	pub variable_on_chain_schema: BoundedVec<u8, ConstU32<VARIABLE_ON_CHAIN_SCHEMA_LIMIT>>,
	#[version(..2)]
	pub const_on_chain_schema: BoundedVec<u8, ConstU32<CONST_ON_CHAIN_SCHEMA_LIMIT>>,

	pub meta_update_permission: MetaUpdatePermission,
}

/// Used in RPC calls
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct RpcCollection<AccountId> {
	pub owner: AccountId,
	pub mode: CollectionMode,
	pub access: AccessMode,
	pub name: Vec<u16>,
	pub description: Vec<u16>,
	pub token_prefix: Vec<u8>,
	pub mint_mode: bool,
	pub offchain_schema: Vec<u8>,
	pub schema_version: SchemaVersion,
	pub sponsorship: SponsorshipState<AccountId>,
	pub limits: CollectionLimits,
	pub variable_on_chain_schema: Vec<u8>,
	pub const_on_chain_schema: Vec<u8>,
	pub meta_update_permission: MetaUpdatePermission,
}

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CollectionField {
	VariableOnChainSchema,
	ConstOnChainSchema,
	OffchainSchema,
}

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, Derivative, MaxEncodedLen)]
#[derivative(Debug, Default(bound = ""))]
pub struct CreateCollectionData<AccountId> {
	#[derivative(Default(value = "CollectionMode::NFT"))]
	pub mode: CollectionMode,
	pub access: Option<AccessMode>,
	pub name: BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>,
	pub description: BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>,
	pub token_prefix: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,
	pub offchain_schema: BoundedVec<u8, ConstU32<OFFCHAIN_SCHEMA_LIMIT>>,
	pub schema_version: Option<SchemaVersion>,
	pub pending_sponsor: Option<AccountId>,
	pub limits: Option<CollectionLimits>,
	pub variable_on_chain_schema: BoundedVec<u8, ConstU32<VARIABLE_ON_CHAIN_SCHEMA_LIMIT>>,
	pub const_on_chain_schema: BoundedVec<u8, ConstU32<CONST_ON_CHAIN_SCHEMA_LIMIT>>,
	pub meta_update_permission: Option<MetaUpdatePermission>,
	pub token_property_permissions: CollectionPropertiesPermissionsVec,
	pub properties: CollectionPropertiesVec,
}

pub type CollectionPropertiesPermissionsVec =
	BoundedVec<PropertyKeyPermission, MaxPropertiesPermissionsEncodeLen>;

pub type CollectionPropertiesVec =
	BoundedVec<Property, ConstU32<MAX_COLLECTION_PROPERTIES_ENCODE_LEN>>;

#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
	pub owner: AccountId,
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct FungibleItemType {
	pub value: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
	pub owner: Vec<Ownership<AccountId>>,
	pub const_data: Vec<u8>,
	pub variable_data: Vec<u8>,
}

/// All fields are wrapped in `Option`s, where None means chain default
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Debug, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionLimits {
	pub account_token_ownership_limit: Option<u32>,
	pub sponsored_data_size: Option<u32>,
	/// None - setVariableMetadata is not sponsored
	/// Some(v) - setVariableMetadata is sponsored
	///           if there is v block between txs
	pub sponsored_data_rate_limit: Option<SponsoringRateLimit>,
	pub token_limit: Option<u32>,

	// Timeouts for item types in passed blocks
	pub sponsor_transfer_timeout: Option<u32>,
	pub sponsor_approve_timeout: Option<u32>,
	pub owner_can_transfer: Option<bool>,
	pub owner_can_destroy: Option<bool>,
	pub transfers_enabled: Option<bool>,

	#[version(2.., upper(None))]
	pub nesting_rule: Option<NestingRule>,
}

impl CollectionLimits {
	pub fn account_token_ownership_limit(&self) -> u32 {
		self.account_token_ownership_limit
			.unwrap_or(ACCOUNT_TOKEN_OWNERSHIP_LIMIT)
			.min(MAX_TOKEN_OWNERSHIP)
	}
	pub fn sponsored_data_size(&self) -> u32 {
		self.sponsored_data_size
			.unwrap_or(CUSTOM_DATA_LIMIT)
			.min(CUSTOM_DATA_LIMIT)
	}
	pub fn token_limit(&self) -> u32 {
		self.token_limit
			.unwrap_or(COLLECTION_TOKEN_LIMIT)
			.min(COLLECTION_TOKEN_LIMIT)
	}
	pub fn sponsor_transfer_timeout(&self, default: u32) -> u32 {
		self.sponsor_transfer_timeout
			.unwrap_or(default)
			.min(MAX_SPONSOR_TIMEOUT)
	}
	pub fn sponsor_approve_timeout(&self) -> u32 {
		self.sponsor_approve_timeout
			.unwrap_or(SPONSOR_APPROVE_TIMEOUT)
			.min(MAX_SPONSOR_TIMEOUT)
	}
	pub fn owner_can_transfer(&self) -> bool {
		self.owner_can_transfer.unwrap_or(true)
	}
	pub fn owner_can_destroy(&self) -> bool {
		self.owner_can_destroy.unwrap_or(true)
	}
	pub fn transfers_enabled(&self) -> bool {
		self.transfers_enabled.unwrap_or(true)
	}
	pub fn sponsored_data_rate_limit(&self) -> Option<u32> {
		match self
			.sponsored_data_rate_limit
			.unwrap_or(SponsoringRateLimit::SponsoringDisabled)
		{
			SponsoringRateLimit::SponsoringDisabled => None,
			SponsoringRateLimit::Blocks(v) => Some(v.min(MAX_SPONSOR_TIMEOUT)),
		}
	}
	pub fn nesting_rule(&self) -> &NestingRule {
		static DEFAULT: NestingRule = NestingRule::Owner;
		self.nesting_rule.as_ref().unwrap_or(&DEFAULT)
	}
}

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub enum NestingRule {
	/// No one can nest tokens
	Disabled,
	/// Owner can nest any tokens
	Owner,
	/// Owner can nest tokens from specified collections
	OwnerRestricted(
		#[cfg_attr(feature = "serde1", serde(with = "bounded::set_serde"))]
		#[derivative(Debug(format_with = "bounded::set_debug"))]
		BoundedBTreeSet<CollectionId, ConstU32<16>>,
	),
}

#[derive(Encode, Decode, Debug, Clone, Copy, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum SponsoringRateLimit {
	SponsoringDisabled,
	Blocks(u32),
}

#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateNftData {
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
	pub value: u128,
}

#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateReFungibleData {
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	pub pieces: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
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

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CreateItemData {
	NFT(CreateNftData),
	Fungible(CreateFungibleData),
	ReFungible(CreateReFungibleData),
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug)]
pub struct CreateNftExData<CrossAccountId> {
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	pub owner: CrossAccountId,
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug + Ord"))]
pub struct CreateRefungibleExData<CrossAccountId> {
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub variable_data: BoundedVec<u8, CustomDataLimit>,
	#[derivative(Debug(format_with = "bounded::map_debug"))]
	pub users: BoundedBTreeMap<CrossAccountId, u128, ConstU32<MAX_ITEMS_PER_BATCH>>,
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug + Ord"))]
pub enum CreateItemExData<CrossAccountId> {
	NFT(
		#[derivative(Debug(format_with = "bounded::vec_debug"))]
		BoundedVec<CreateNftExData<CrossAccountId>, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),
	Fungible(
		#[derivative(Debug(format_with = "bounded::map_debug"))]
		BoundedBTreeMap<CrossAccountId, u128, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),
	/// Many tokens, each may have only one owner
	RefungibleMultipleItems(
		#[derivative(Debug(format_with = "bounded::vec_debug"))]
		BoundedVec<CreateRefungibleExData<CrossAccountId>, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),
	/// Single token, which may have many owners
	RefungibleMultipleOwners(CreateRefungibleExData<CrossAccountId>),
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

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionStats {
	pub created: u32,
	pub destroyed: u32,
	pub alive: u32,
}

#[derive(Encode, Decode, PartialEq, Clone, Debug)]
pub struct PhantomType<T>(core::marker::PhantomData<T>);

impl<T: TypeInfo + 'static> TypeInfo for PhantomType<T> {
	type Identity = PhantomType<T>;

	fn type_info() -> scale_info::Type {
		use scale_info::{
			Type, Path,
			build::{FieldsBuilder, UnnamedFields},
			type_params,
		};
		Type::builder()
			.path(Path::new("up_data_structs", "PhantomType"))
			.type_params(type_params!(T))
			.composite(<FieldsBuilder<UnnamedFields>>::default().field(|b| b.ty::<[T; 0]>()))
	}
}
impl<T> MaxEncodedLen for PhantomType<T> {
	fn max_encoded_len() -> usize {
		0
	}
}

pub type PropertyKey = BoundedVec<u8, ConstU32<MAX_PROPERTY_KEY_LENGTH>>;
pub type PropertyValue = BoundedVec<u8, ConstU32<MAX_PROPERTY_VALUE_LENGTH>>;

#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
pub enum PropertyPermission {
	None,
	AdminConst,
	Admin,
	ItemOwnerConst,
	ItemOwner,
	ItemOwnerOrAdmin,
}

#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
pub struct Property {
	pub key: PropertyKey,
	pub value: PropertyValue,
}

#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
pub struct PropertyKeyPermission {
	pub key: PropertyKey,
	pub permission: PropertyPermission,
}

pub enum PropertiesError {
	NoSpaceForProperty,
	PropertyLimitReached,
}

impl From<PropertiesError> for DispatchError {
	fn from(error: PropertiesError) -> Self {
		match error {
			PropertiesError::NoSpaceForProperty => DispatchError::Other("no space for property"),
			PropertiesError::PropertyLimitReached => {
				DispatchError::Other("property key limit reached")
			}
		}
	}
}

pub type PropertiesMap =
	BoundedBTreeMap<PropertyKey, PropertyValue, ConstU32<MAX_PROPERTIES_PER_ITEM>>;
pub type PropertiesPermissionMap =
	BoundedBTreeMap<PropertyKey, PropertyPermission, ConstU32<MAX_PROPERTIES_PER_ITEM>>;

#[derive(Encode, Decode, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
pub struct Properties {
	map: PropertiesMap,
	consumed_space: u32,
	space_limit: u32,
}

impl Properties {
	pub fn new(space_limit: u32) -> Self {
		Self {
			map: BoundedBTreeMap::new(),
			consumed_space: 0,
			space_limit,
		}
	}

	pub fn from_collection_props_vec(
		data: CollectionPropertiesVec,
	) -> Result<Self, PropertiesError> {
		let mut props = Self::new(MAX_COLLECTION_PROPERTIES_SIZE);

		for property in data.into_iter() {
			props.try_set_property(property)?;
		}

		Ok(props)
	}

	pub fn try_set_property(&mut self, property: Property) -> Result<(), PropertiesError> {
		let value_len = property.value.len();

		if self.consumed_space as usize + value_len > self.space_limit as usize {
			return Err(PropertiesError::NoSpaceForProperty);
		}

		self.map
			.try_insert(property.key, property.value)
			.map_err(|_| PropertiesError::PropertyLimitReached)?;

		self.consumed_space += value_len as u32;

		Ok(())
	}

	pub fn remove_property(&mut self, key: &PropertyKey) {
		let property = self.map.get(key);

		if let Some(value) = property {
			let value_len = value.len() as u32;

			self.map.remove(key);
			self.consumed_space -= value_len;
		}
	}

	pub fn get_property(&self, key: &PropertyKey) -> Option<&PropertyValue> {
		self.map.get(key)
	}
}

pub struct CollectionProperties;

impl Get<Properties> for CollectionProperties {
	fn get() -> Properties {
		Properties::new(MAX_COLLECTION_PROPERTIES_SIZE)
	}
}

pub struct TokenProperties;

impl Get<Properties> for TokenProperties {
	fn get() -> Properties {
		Properties::new(MAX_TOKEN_PROPERTIES_SIZE)
	}
}
