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
	parameter_types,
};

#[cfg(feature = "serde")]
use serde::{Serialize, Deserialize};

use sp_core::U256;
use sp_runtime::{ArithmeticError, sp_std::prelude::Vec, Permill};
use codec::{Decode, Encode, EncodeLike, MaxEncodedLen};
use frame_support::{BoundedVec, traits::ConstU32};
use derivative::Derivative;
use scale_info::TypeInfo;

// RMRK
use rmrk_traits::{
	CollectionInfo, NftInfo, ResourceInfo, PropertyInfo, BaseInfo, PartType, Theme, ThemeProperty,
	ResourceTypes, BasicResource, ComposableResource, SlotResource, EquippableList,
};
pub use rmrk_traits::{
	primitives::{
		CollectionId as RmrkCollectionId, NftId as RmrkNftId, BaseId as RmrkBaseId,
		SlotId as RmrkSlotId, PartId as RmrkPartId, ResourceId as RmrkResourceId,
	},
	NftChild as RmrkNftChild, AccountIdOrCollectionNftTuple as RmrkAccountIdOrCollectionNftTuple,
	FixedPart as RmrkFixedPart, SlotPart as RmrkSlotPart,
};

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

pub const MAX_COLLECTION_NAME_LENGTH: u32 = 64;
pub const MAX_COLLECTION_DESCRIPTION_LENGTH: u32 = 256;
pub const MAX_TOKEN_PREFIX_LENGTH: u32 = 16;

pub const MAX_PROPERTY_KEY_LENGTH: u32 = 256;
pub const MAX_PROPERTY_VALUE_LENGTH: u32 = 32768;
pub const MAX_PROPERTIES_PER_ITEM: u32 = 64;

pub const MAX_AUX_PROPERTY_VALUE_LENGTH: u32 = 2048;

pub const MAX_COLLECTION_PROPERTIES_SIZE: u32 = 40960;
pub const MAX_TOKEN_PROPERTIES_SIZE: u32 = 32768;

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

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct TokenData<CrossAccountId> {
	pub properties: Vec<Property>,
	pub owner: Option<CrossAccountId>,
	pub pieces: u128,
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

#[derive(Encode, Decode, Eq, Debug, Clone, Copy, PartialEq, TypeInfo, MaxEncodedLen)]
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
	#[version(..2)]
	pub access: AccessMode,
	pub name: BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>,
	pub description: BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>,
	pub token_prefix: BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>,

	#[version(..2)]
	pub mint_mode: bool,

	#[version(..2)]
	pub offchain_schema: BoundedVec<u8, ConstU32<OFFCHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub schema_version: SchemaVersion,
	pub sponsorship: SponsorshipState<AccountId>,

	pub limits: CollectionLimits,

	#[version(2.., upper(Default::default()))]
	pub permissions: CollectionPermissions,

	/// Marks that this collection is not "unique", and managed from external.
	#[version(2.., upper(false))]
	pub external_collection: bool,

	#[version(..2)]
	pub variable_on_chain_schema: BoundedVec<u8, ConstU32<VARIABLE_ON_CHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub const_on_chain_schema: BoundedVec<u8, ConstU32<CONST_ON_CHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub meta_update_permission: MetaUpdatePermission,
}

/// Used in RPC calls
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct RpcCollection<AccountId> {
	pub owner: AccountId,
	pub mode: CollectionMode,
	pub name: Vec<u16>,
	pub description: Vec<u16>,
	pub token_prefix: Vec<u8>,
	pub sponsorship: SponsorshipState<AccountId>,
	pub limits: CollectionLimits,
	pub permissions: CollectionPermissions,
	pub token_property_permissions: Vec<PropertyKeyPermission>,
	pub properties: Vec<Property>,
	pub read_only: bool,
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
	pub pending_sponsor: Option<AccountId>,
	pub limits: Option<CollectionLimits>,
	pub permissions: Option<CollectionPermissions>,
	pub token_property_permissions: CollectionPropertiesPermissionsVec,
	pub properties: CollectionPropertiesVec,
}

pub type CollectionPropertiesPermissionsVec =
	BoundedVec<PropertyKeyPermission, ConstU32<MAX_PROPERTIES_PER_ITEM>>;

pub type CollectionPropertiesVec = BoundedVec<Property, ConstU32<MAX_PROPERTIES_PER_ITEM>>;

/// All fields are wrapped in `Option`s, where None means chain default
// When adding/removing fields from this struct - don't forget to also update clamp_limits
#[derive(Encode, Decode, Debug, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionLimits {
	pub account_token_ownership_limit: Option<u32>,
	pub sponsored_data_size: Option<u32>,

	/// FIXME should we delete this or repurpose it?
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
		self.owner_can_transfer.unwrap_or(false)
	}
	pub fn owner_can_transfer_instaled(&self) -> bool {
		self.owner_can_transfer.is_some()
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
}

// When adding/removing fields from this struct - don't forget to also update clamp_limits
#[derive(Encode, Decode, Debug, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionPermissions {
	pub access: Option<AccessMode>,
	pub mint_mode: Option<bool>,
	pub nesting: Option<NestingPermissions>,
}

impl CollectionPermissions {
	pub fn access(&self) -> AccessMode {
		self.access.unwrap_or(AccessMode::Normal)
	}
	pub fn mint_mode(&self) -> bool {
		self.mint_mode.unwrap_or(false)
	}
	pub fn nesting(&self) -> &NestingPermissions {
		static DEFAULT: NestingPermissions = NestingPermissions {
			token_owner: false,
			collection_admin: false,
			restricted: None,
			#[cfg(feature = "runtime-benchmarks")]
			permissive: false,
		};
		self.nesting.as_ref().unwrap_or(&DEFAULT)
	}
}

type OwnerRestrictedSetInner = BoundedBTreeSet<CollectionId, ConstU32<16>>;

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct OwnerRestrictedSet(
	#[cfg_attr(feature = "serde1", serde(with = "bounded::set_serde"))]
	#[derivative(Debug(format_with = "bounded::set_debug"))]
	pub OwnerRestrictedSetInner,
);
impl OwnerRestrictedSet {
	pub fn new() -> Self {
		Self(Default::default())
	}
}
impl core::ops::Deref for OwnerRestrictedSet {
	type Target = OwnerRestrictedSetInner;
	fn deref(&self) -> &Self::Target {
		&self.0
	}
}
impl core::ops::DerefMut for OwnerRestrictedSet {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.0
	}
}

#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct NestingPermissions {
	/// Owner of token can nest tokens under it
	pub token_owner: bool,
	/// Admin of token collection can nest tokens under token
	pub collection_admin: bool,
	/// If set - only tokens from specified collections can be nested
	pub restricted: Option<OwnerRestrictedSet>,

	#[cfg(feature = "runtime-benchmarks")]
	/// Anyone can nest tokens, mutually exclusive with `token_owner`, `admin`
	pub permissive: bool,
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
	pub properties: CollectionPropertiesVec,
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
	pub pieces: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum MetaUpdatePermission {
	ItemOwner,
	Admin,
	None,
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
	pub properties: CollectionPropertiesVec,
	pub owner: CrossAccountId,
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug + Ord"))]
pub struct CreateRefungibleExData<CrossAccountId> {
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub const_data: BoundedVec<u8, CustomDataLimit>,
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
			CreateItemData::ReFungible(data) => data.const_data.len(),
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
// todo possibly rename to be used generally as an address pair
pub struct TokenChild {
	pub token: TokenId,
	pub collection: CollectionId,
}

#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionStats {
	pub created: u32,
	pub destroyed: u32,
	pub alive: u32,
}

#[derive(Encode, Decode, Clone, Debug)]
#[cfg_attr(feature = "std", derive(PartialEq))]
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

pub type BoundedBytes<S> = BoundedVec<u8, S>;

pub type AuxPropertyValue = BoundedBytes<ConstU32<MAX_AUX_PROPERTY_VALUE_LENGTH>>;

pub type PropertyKey = BoundedBytes<ConstU32<MAX_PROPERTY_KEY_LENGTH>>;
pub type PropertyValue = BoundedBytes<ConstU32<MAX_PROPERTY_VALUE_LENGTH>>;

#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct PropertyPermission {
	pub mutable: bool,
	pub collection_admin: bool,
	pub token_owner: bool,
}

impl PropertyPermission {
	pub fn none() -> Self {
		Self {
			mutable: true,
			collection_admin: false,
			token_owner: false,
		}
	}
}

#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Property {
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub key: PropertyKey,

	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub value: PropertyValue,
}

impl Into<(PropertyKey, PropertyValue)> for Property {
	fn into(self) -> (PropertyKey, PropertyValue) {
		(self.key, self.value)
	}
}

#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct PropertyKeyPermission {
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub key: PropertyKey,

	pub permission: PropertyPermission,
}

impl Into<(PropertyKey, PropertyPermission)> for PropertyKeyPermission {
	fn into(self) -> (PropertyKey, PropertyPermission) {
		(self.key, self.permission)
	}
}

#[derive(Debug)]
pub enum PropertiesError {
	NoSpaceForProperty,
	PropertyLimitReached,
	InvalidCharacterInPropertyKey,
	PropertyKeyIsTooLong,
	EmptyPropertyKey,
}

#[derive(Encode, Decode, MaxEncodedLen, TypeInfo, PartialEq, Clone, Copy)]
pub enum PropertyScope {
	None,
	Rmrk,
}

impl PropertyScope {
	pub fn apply(self, key: PropertyKey) -> Result<PropertyKey, PropertiesError> {
		let scope_str: &[u8] = match self {
			Self::None => return Ok(key),
			Self::Rmrk => b"rmrk",
		};

		[scope_str, b":", key.as_slice()]
			.concat()
			.try_into()
			.map_err(|_| PropertiesError::PropertyKeyIsTooLong)
	}
}

pub trait TrySetProperty: Sized {
	type Value;

	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<(), PropertiesError>;

	fn try_scoped_set_from_iter<I, KV>(
		&mut self,
		scope: PropertyScope,
		iter: I,
	) -> Result<(), PropertiesError>
	where
		I: Iterator<Item = KV>,
		KV: Into<(PropertyKey, Self::Value)>,
	{
		for kv in iter {
			let (key, value) = kv.into();
			self.try_scoped_set(scope, key, value)?;
		}

		Ok(())
	}

	fn try_set(&mut self, key: PropertyKey, value: Self::Value) -> Result<(), PropertiesError> {
		self.try_scoped_set(PropertyScope::None, key, value)
	}

	fn try_set_from_iter<I, KV>(&mut self, iter: I) -> Result<(), PropertiesError>
	where
		I: Iterator<Item = KV>,
		KV: Into<(PropertyKey, Self::Value)>,
	{
		self.try_scoped_set_from_iter(PropertyScope::None, iter)
	}
}

#[derive(Encode, Decode, TypeInfo, Derivative, Clone, PartialEq, MaxEncodedLen)]
#[derivative(Default(bound = ""))]
pub struct PropertiesMap<Value>(
	BoundedBTreeMap<PropertyKey, Value, ConstU32<MAX_PROPERTIES_PER_ITEM>>,
);

impl<Value> PropertiesMap<Value> {
	pub fn new() -> Self {
		Self(BoundedBTreeMap::new())
	}

	pub fn remove(&mut self, key: &PropertyKey) -> Result<Option<Value>, PropertiesError> {
		Self::check_property_key(key)?;

		Ok(self.0.remove(key))
	}

	pub fn get(&self, key: &PropertyKey) -> Option<&Value> {
		self.0.get(key)
	}

	pub fn contains_key(&self, key: &PropertyKey) -> bool {
		self.0.contains_key(key)
	}

	fn check_property_key(key: &PropertyKey) -> Result<(), PropertiesError> {
		if key.is_empty() {
			return Err(PropertiesError::EmptyPropertyKey);
		}

		for byte in key.as_slice().iter() {
			let byte = *byte;

			if !byte.is_ascii_alphanumeric() && byte != b'_' && byte != b'-' && byte != b'.' {
				return Err(PropertiesError::InvalidCharacterInPropertyKey);
			}
		}

		Ok(())
	}
}

impl<Value> IntoIterator for PropertiesMap<Value> {
	type Item = (PropertyKey, Value);
	type IntoIter = <
		BoundedBTreeMap<
			PropertyKey,
			Value,
			ConstU32<MAX_PROPERTIES_PER_ITEM>
		> as IntoIterator
	>::IntoIter;

	fn into_iter(self) -> Self::IntoIter {
		self.0.into_iter()
	}
}

impl<Value> TrySetProperty for PropertiesMap<Value> {
	type Value = Value;

	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<(), PropertiesError> {
		Self::check_property_key(&key)?;

		let key = scope.apply(key)?;
		self.0
			.try_insert(key, value)
			.map_err(|_| PropertiesError::PropertyLimitReached)?;

		Ok(())
	}
}

pub type PropertiesPermissionMap = PropertiesMap<PropertyPermission>;

#[derive(Encode, Decode, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
pub struct Properties {
	map: PropertiesMap<PropertyValue>,
	consumed_space: u32,
	space_limit: u32,
}

impl Properties {
	pub fn new(space_limit: u32) -> Self {
		Self {
			map: PropertiesMap::new(),
			consumed_space: 0,
			space_limit,
		}
	}

	pub fn remove(&mut self, key: &PropertyKey) -> Result<Option<PropertyValue>, PropertiesError> {
		let value = self.map.remove(key)?;

		if let Some(ref value) = value {
			let value_len = value.len() as u32;
			self.consumed_space -= value_len;
		}

		Ok(value)
	}

	pub fn get(&self, key: &PropertyKey) -> Option<&PropertyValue> {
		self.map.get(key)
	}
}

impl IntoIterator for Properties {
	type Item = (PropertyKey, PropertyValue);
	type IntoIter = <PropertiesMap<PropertyValue> as IntoIterator>::IntoIter;

	fn into_iter(self) -> Self::IntoIter {
		self.map.into_iter()
	}
}

impl TrySetProperty for Properties {
	type Value = PropertyValue;

	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<(), PropertiesError> {
		let value_len = value.len();

		if self.consumed_space as usize + value_len > self.space_limit as usize
			&& !cfg!(feature = "runtime-benchmarks")
		{
			return Err(PropertiesError::NoSpaceForProperty);
		}

		self.map.try_scoped_set(scope, key, value)?;

		self.consumed_space += value_len as u32;

		Ok(())
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

// RMRK
// todo document?
parameter_types! {
	#[derive(PartialEq, TypeInfo)]
	pub const RmrkStringLimit: u32 = 128;
	#[derive(PartialEq)]
	pub const RmrkCollectionSymbolLimit: u32 = MAX_TOKEN_PREFIX_LENGTH;
	#[derive(PartialEq)]
	pub const RmrkResourceSymbolLimit: u32 = 10;
	#[derive(PartialEq)]
	pub const RmrkBaseSymbolLimit: u32 = MAX_TOKEN_PREFIX_LENGTH;
	#[derive(PartialEq)]
	pub const RmrkKeyLimit: u32 = 32;
	#[derive(PartialEq)]
	pub const RmrkValueLimit: u32 = 256;
	#[derive(PartialEq)]
	pub const RmrkMaxCollectionsEquippablePerPart: u32 = 100;
	#[derive(PartialEq)]
	pub const MaxPropertiesPerTheme: u32 = 5;
	#[derive(PartialEq)]
	pub const RmrkPartsLimit: u32 = 25;
	#[derive(PartialEq)]
	pub const RmrkMaxPriorities: u32 = 25;
	#[derive(PartialEq)]
	pub const MaxResourcesOnMint: u32 = 100;
}

impl From<RmrkCollectionId> for CollectionId {
	fn from(id: RmrkCollectionId) -> Self {
		Self(id)
	}
}

impl From<RmrkNftId> for TokenId {
	fn from(id: RmrkNftId) -> Self {
		Self(id)
	}
}

pub type RmrkCollectionInfo<AccountId> =
	CollectionInfo<RmrkString, RmrkCollectionSymbol, AccountId>;
pub type RmrkInstanceInfo<AccountId> = NftInfo<AccountId, Permill, RmrkString>;
pub type RmrkResourceInfo = ResourceInfo<RmrkString, RmrkBoundedParts>;
pub type RmrkPropertyInfo = PropertyInfo<RmrkKeyString, RmrkValueString>;
pub type RmrkBaseInfo<AccountId> = BaseInfo<AccountId, RmrkString>;
pub type BoundedEquippableCollectionIds =
	BoundedVec<RmrkCollectionId, RmrkMaxCollectionsEquippablePerPart>;
pub type RmrkPartType = PartType<RmrkString, BoundedEquippableCollectionIds>;
pub type RmrkEquippableList = EquippableList<BoundedEquippableCollectionIds>;
pub type RmrkThemeProperty = ThemeProperty<RmrkString>;
pub type RmrkTheme = Theme<RmrkString, Vec<RmrkThemeProperty>>;
pub type RmrkBoundedTheme = Theme<RmrkString, BoundedVec<RmrkThemeProperty, MaxPropertiesPerTheme>>;
pub type RmrkResourceTypes = ResourceTypes<RmrkString, RmrkBoundedParts>;

pub type RmrkBasicResource = BasicResource<RmrkString>;
pub type RmrkComposableResource = ComposableResource<RmrkString, RmrkBoundedParts>;
pub type RmrkSlotResource = SlotResource<RmrkString>;

pub type RmrkString = BoundedVec<u8, RmrkStringLimit>;
pub type RmrkCollectionSymbol = BoundedVec<u8, RmrkCollectionSymbolLimit>;
pub type RmrkBaseSymbol = BoundedVec<u8, RmrkBaseSymbolLimit>;
pub type RmrkKeyString = BoundedVec<u8, RmrkKeyLimit>;
pub type RmrkValueString = BoundedVec<u8, RmrkValueLimit>;
pub type RmrkBoundedResource = BoundedVec<u8, RmrkResourceSymbolLimit>;
pub type RmrkBoundedParts = BoundedVec<RmrkPartId, RmrkPartsLimit>; // todo make sure it is needed

pub type RmrkRpcString = Vec<u8>;
pub type RmrkThemeName = RmrkRpcString;
pub type RmrkPropertyKey = RmrkRpcString;
