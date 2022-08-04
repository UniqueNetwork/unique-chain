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

//! # Primitives crate.
//!
//! This crate contains types, traits and constants.

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

/// Maximum of decimal points.
pub const MAX_DECIMAL_POINTS: DecimalPoints = 30;

/// Maximum pieces for refungible token.
pub const MAX_REFUNGIBLE_PIECES: u128 = 1_000_000_000_000_000_000_000;
pub const MAX_SPONSOR_TIMEOUT: u32 = 10_368_000;

/// Maximum tokens for user.
pub const MAX_TOKEN_OWNERSHIP: u32 = if cfg!(not(feature = "limit-testing")) {
	100_000
} else {
	10
};

/// Maximum for collections can be created.
pub const COLLECTION_NUMBER_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	100_000
} else {
	10
};

/// Maximum for various custom data of token.
pub const CUSTOM_DATA_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	2048
} else {
	10
};

/// Maximum admins per collection.
pub const COLLECTION_ADMINS_LIMIT: u32 = 5;

/// Maximum tokens per collection.
pub const COLLECTION_TOKEN_LIMIT: u32 = u32::MAX;

/// Maximum tokens per account.
pub const ACCOUNT_TOKEN_OWNERSHIP_LIMIT: u32 = if cfg!(not(feature = "limit-testing")) {
	1_000_000
} else {
	10
};

/// Default timeout for transfer sponsoring NFT item.
pub const NFT_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
/// Default timeout for transfer sponsoring fungible item.
pub const FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;
/// Default timeout for transfer sponsoring refungible item.
pub const REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT: u32 = 5;

/// Default timeout for sponsored approving.
pub const SPONSOR_APPROVE_TIMEOUT: u32 = 5;

// Schema limits
pub const OFFCHAIN_SCHEMA_LIMIT: u32 = 8192;
pub const VARIABLE_ON_CHAIN_SCHEMA_LIMIT: u32 = 8192;
pub const CONST_ON_CHAIN_SCHEMA_LIMIT: u32 = 32768;

// TODO: not used. Delete?
pub const COLLECTION_FIELD_LIMIT: u32 = CONST_ON_CHAIN_SCHEMA_LIMIT;

/// Maximum length for collection name.
pub const MAX_COLLECTION_NAME_LENGTH: u32 = 64;

/// Maximum length for collection description.
pub const MAX_COLLECTION_DESCRIPTION_LENGTH: u32 = 256;

/// Maximal token prefix length.
pub const MAX_TOKEN_PREFIX_LENGTH: u32 = 16;

/// Maximal lenght of property key.
pub const MAX_PROPERTY_KEY_LENGTH: u32 = 256;

/// Maximal lenght of property value.
pub const MAX_PROPERTY_VALUE_LENGTH: u32 = 32768;

/// Maximum properties that can be assigned to token.
pub const MAX_PROPERTIES_PER_ITEM: u32 = 64;

/// Maximal lenght of extended property value.
pub const MAX_AUX_PROPERTY_VALUE_LENGTH: u32 = 2048;

/// Maximum size for all collection properties.
pub const MAX_COLLECTION_PROPERTIES_SIZE: u32 = 40960;

/// Maximum size for all token properties.
pub const MAX_TOKEN_PROPERTIES_SIZE: u32 = 32768;

/// How much items can be created per single
/// create_many call.
pub const MAX_ITEMS_PER_BATCH: u32 = 200;

/// Used for limit bounded types of token custom data.
pub type CustomDataLimit = ConstU32<CUSTOM_DATA_LIMIT>;

/// Collection id.
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

/// Token id.
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
	/// Try to get next token id.
	///
	/// If next id cause overflow, then [`ArithmeticError::Overflow`] returned.
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

/// Token data.
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct TokenData<CrossAccountId> {
	/// Properties of token.
	pub properties: Vec<Property>,

	/// Token owner.
	pub owner: Option<CrossAccountId>,

	/// Token pieces.
	pub pieces: u128,
}

// TODO: unused type
pub struct OverflowError;
impl From<OverflowError> for &'static str {
	fn from(_: OverflowError) -> Self {
		"overflow occured"
	}
}

/// Alias for decimal points type.
pub type DecimalPoints = u8;

/// Collection mode.
///
/// Collection can represent various types of tokens.
/// Each collection can contain only one type of tokens at a time.
/// This type helps to understand which tokens the collection contains.
#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CollectionMode {
	/// Non fungible tokens.
	NFT,
	/// Fungible tokens.
	Fungible(DecimalPoints),
	/// Refungible tokens.
	ReFungible,
}

impl CollectionMode {
	/// Get collection mod as number.
	pub fn id(&self) -> u8 {
		match self {
			CollectionMode::NFT => 1,
			CollectionMode::Fungible(_) => 2,
			CollectionMode::ReFungible => 3,
		}
	}
}

// TODO: unused trait
pub trait SponsoringResolve<AccountId, Call> {
	fn resolve(who: &AccountId, call: &Call) -> Option<AccountId>;
}

/// Access mode for some token operations.
#[derive(Encode, Decode, Eq, Debug, Clone, Copy, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum AccessMode {
	/// Access grant for owner and admins. Used as default.
	Normal,
	/// Like a [`Normal`](AccessMode::Normal) but also users in allow list.
	AllowList,
}
impl Default for AccessMode {
	fn default() -> Self {
		Self::Normal
	}
}

// TODO: remove in future.
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

// TODO: unused type
#[derive(Encode, Decode, Default, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Ownership<AccountId> {
	pub owner: AccountId,
	pub fraction: u128,
}

/// The state of collection sponsorship.
#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum SponsorshipState<AccountId> {
	/// The fees are applied to the transaction sender.
	Disabled,
	/// The sponsor is under consideration. Until the sponsor gives his consent,
	/// the fee will still be charged to sender.
	Unconfirmed(AccountId),
	/// Transactions are sponsored by specified account.
	Confirmed(AccountId),
}

impl<AccountId> SponsorshipState<AccountId> {
	/// Get a sponsor of the collection who has confirmed his status.
	pub fn sponsor(&self) -> Option<&AccountId> {
		match self {
			Self::Confirmed(sponsor) => Some(sponsor),
			_ => None,
		}
	}

	/// Get a sponsor of the collection who has pending or confirmed status.
	pub fn pending_sponsor(&self) -> Option<&AccountId> {
		match self {
			Self::Unconfirmed(sponsor) | Self::Confirmed(sponsor) => Some(sponsor),
			_ => None,
		}
	}

	/// Whether the sponsorship is confirmed.
	pub fn confirmed(&self) -> bool {
		matches!(self, Self::Confirmed(_))
	}
}

impl<T> Default for SponsorshipState<T> {
	fn default() -> Self {
		Self::Disabled
	}
}

pub type CollectionName = BoundedVec<u16, ConstU32<MAX_COLLECTION_NAME_LENGTH>>;
pub type CollectionDescription = BoundedVec<u16, ConstU32<MAX_COLLECTION_DESCRIPTION_LENGTH>>;
pub type CollectionTokenPrefix = BoundedVec<u8, ConstU32<MAX_TOKEN_PREFIX_LENGTH>>;

/// Base structure for represent collection.
///
/// Used to provide basic functionality for all types of collections.
///
/// #### Note
/// Collection parameters, used in storage (see [`RpcCollection`] for the RPC version).
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
pub struct Collection<AccountId> {
	/// Collection owner account.
	pub owner: AccountId,

	/// Collection mode.
	pub mode: CollectionMode,

	/// Access mode.
	#[version(..2)]
	pub access: AccessMode,

	/// Collection name.
	pub name: CollectionName,

	/// Collection description.
	pub description: CollectionDescription,

	/// Token prefix.
	pub token_prefix: CollectionTokenPrefix,

	#[version(..2)]
	pub mint_mode: bool,

	#[version(..2)]
	pub offchain_schema: BoundedVec<u8, ConstU32<OFFCHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub schema_version: SchemaVersion,

	/// The state of sponsorship of the collection.
	pub sponsorship: SponsorshipState<AccountId>,

	/// Collection limits.
	pub limits: CollectionLimits,

	/// Collection permissions.
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

/// Collection parameters, used in RPC calls (see [`Collection`] for the storage version).
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct RpcCollection<AccountId> {
	/// Collection owner account.
	pub owner: AccountId,

	/// Collection mode.
	pub mode: CollectionMode,

	/// Collection name.
	pub name: Vec<u16>,

	/// Collection description.
	pub description: Vec<u16>,

	/// Token prefix.
	pub token_prefix: Vec<u8>,

	/// The state of sponsorship of the collection.
	pub sponsorship: SponsorshipState<AccountId>,

	/// Collection limits.
	pub limits: CollectionLimits,

	/// Collection permissions.
	pub permissions: CollectionPermissions,

	/// Token property permissions.
	pub token_property_permissions: Vec<PropertyKeyPermission>,

	/// Collection properties.
	pub properties: Vec<Property>,

	/// Is collection read only.
	pub read_only: bool,
}

/// Data used for create collection.
///
/// All fields are wrapped in [`Option`], where `None` means chain default.
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, Derivative, MaxEncodedLen)]
#[derivative(Debug, Default(bound = ""))]
pub struct CreateCollectionData<AccountId> {
	/// Collection mode.
	#[derivative(Default(value = "CollectionMode::NFT"))]
	pub mode: CollectionMode,

	/// Access mode.
	pub access: Option<AccessMode>,

	/// Collection name.
	pub name: CollectionName,

	/// Collection description.
	pub description: CollectionDescription,

	/// Token prefix.
	pub token_prefix: CollectionTokenPrefix,

	/// Pending collection sponsor.
	pub pending_sponsor: Option<AccountId>,

	/// Collection limits.
	pub limits: Option<CollectionLimits>,

	/// Collection permissions.
	pub permissions: Option<CollectionPermissions>,

	/// Token property permissions.
	pub token_property_permissions: CollectionPropertiesPermissionsVec,

	/// Collection properties.
	pub properties: CollectionPropertiesVec,
}

/// Bounded vector of properties permissions. Max length is [`MAX_PROPERTIES_PER_ITEM`].
// TODO: maybe rename to PropertiesPermissionsVec
pub type CollectionPropertiesPermissionsVec =
	BoundedVec<PropertyKeyPermission, ConstU32<MAX_PROPERTIES_PER_ITEM>>;

/// Bounded vector of properties. Max length is [`MAX_PROPERTIES_PER_ITEM`].
pub type CollectionPropertiesVec = BoundedVec<Property, ConstU32<MAX_PROPERTIES_PER_ITEM>>;

/// Limits and restrictions of a collection.
///
/// All fields are wrapped in [`Option`], where `None` means chain default.
///
/// Update with `pallet_common::Pallet::clamp_limits`.
// IMPORTANT: When adding/removing fields from this struct - don't forget to also
#[derive(Encode, Decode, Debug, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
// When adding/removing fields from this struct - don't forget to also update with `pallet_common::Pallet::clamp_limits`.
// TODO: move `pallet_common::Pallet::clamp_limits` into `impl CollectionLimits`.
// TODO: may be remove [`Option`] and **pub** from fields and create struct with default values.
pub struct CollectionLimits {
	/// How many tokens can a user have on one account.
	/// * Default - [`ACCOUNT_TOKEN_OWNERSHIP_LIMIT`].
	/// * Limit - [`MAX_TOKEN_OWNERSHIP`].
	pub account_token_ownership_limit: Option<u32>,

	/// How many bytes of data are available for sponsorship.
	/// * Default - [`CUSTOM_DATA_LIMIT`].
	/// * Limit - [`CUSTOM_DATA_LIMIT`].
	pub sponsored_data_size: Option<u32>,

	// FIXME should we delete this or repurpose it?
	/// Times in how many blocks we sponsor data.
	///
	/// If is `Some(v)` then **setVariableMetadata** is sponsored if there is `v` block between transactions.
	///
	/// * Default - [`SponsoringDisabled`](SponsoringRateLimit::SponsoringDisabled).
	/// * Limit - [`MAX_SPONSOR_TIMEOUT`].
	///
	/// In any case, chain default: [`SponsoringRateLimit::SponsoringDisabled`]
	pub sponsored_data_rate_limit: Option<SponsoringRateLimit>,
	/// Maximum amount of tokens inside the collection. Chain default: [`COLLECTION_TOKEN_LIMIT`]

	/// How many tokens can be mined into this collection.
	///
	/// * Default - [`COLLECTION_TOKEN_LIMIT`].
	/// * Limit - [`COLLECTION_TOKEN_LIMIT`].
	pub token_limit: Option<u32>,

	/// Timeouts for transfer sponsoring.
	///
	/// * Default
	///   - **Fungible** - [`FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT`]
	///   - **NFT** - [`NFT_SPONSOR_TRANSFER_TIMEOUT`]
	///   - **Refungible** - [`REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT`]
	/// * Limit - [`MAX_SPONSOR_TIMEOUT`].
	pub sponsor_transfer_timeout: Option<u32>,

	/// Timeout for sponsoring an approval in passed blocks.
	///
	/// * Default - [`SPONSOR_APPROVE_TIMEOUT`].
	/// * Limit - [`MAX_SPONSOR_TIMEOUT`].
	pub sponsor_approve_timeout: Option<u32>,

	/// Whether the collection owner of the collection can send tokens (which belong to other users).
	///
	/// * Default - **false**.
	pub owner_can_transfer: Option<bool>,

	/// Can the collection owner burn other people's tokens.
	///
	/// * Default - **true**.
	pub owner_can_destroy: Option<bool>,

	/// Is it possible to send tokens from this collection between users.
	///
	/// * Default - **true**.
	pub transfers_enabled: Option<bool>,
}

impl CollectionLimits {
	/// Get effective value for [`account_token_ownership_limit`](self.account_token_ownership_limit).
	pub fn account_token_ownership_limit(&self) -> u32 {
		self.account_token_ownership_limit
			.unwrap_or(ACCOUNT_TOKEN_OWNERSHIP_LIMIT)
			.min(MAX_TOKEN_OWNERSHIP)
	}

	/// Get effective value for [`sponsored_data_size`](self.sponsored_data_size).
	pub fn sponsored_data_size(&self) -> u32 {
		self.sponsored_data_size
			.unwrap_or(CUSTOM_DATA_LIMIT)
			.min(CUSTOM_DATA_LIMIT)
	}

	/// Get effective value for [`token_limit`](self.token_limit).
	pub fn token_limit(&self) -> u32 {
		self.token_limit
			.unwrap_or(COLLECTION_TOKEN_LIMIT)
			.min(COLLECTION_TOKEN_LIMIT)
	}

	// TODO: may be replace u32 to mode?
	/// Get effective value for [`sponsor_transfer_timeout`](self.sponsor_transfer_timeout).
	pub fn sponsor_transfer_timeout(&self, default: u32) -> u32 {
		self.sponsor_transfer_timeout
			.unwrap_or(default)
			.min(MAX_SPONSOR_TIMEOUT)
	}

	/// Get effective value for [`sponsor_approve_timeout`](self.sponsor_approve_timeout).
	pub fn sponsor_approve_timeout(&self) -> u32 {
		self.sponsor_approve_timeout
			.unwrap_or(SPONSOR_APPROVE_TIMEOUT)
			.min(MAX_SPONSOR_TIMEOUT)
	}

	/// Get effective value for [`owner_can_transfer`](self.owner_can_transfer).
	pub fn owner_can_transfer(&self) -> bool {
		self.owner_can_transfer.unwrap_or(false)
	}

	/// Get effective value for [`owner_can_transfer_instaled`](self.owner_can_transfer_instaled).
	pub fn owner_can_transfer_instaled(&self) -> bool {
		self.owner_can_transfer.is_some()
	}

	/// Get effective value for [`owner_can_destroy`](self.owner_can_destroy).
	pub fn owner_can_destroy(&self) -> bool {
		self.owner_can_destroy.unwrap_or(true)
	}

	/// Get effective value for [`transfers_enabled`](self.transfers_enabled).
	pub fn transfers_enabled(&self) -> bool {
		self.transfers_enabled.unwrap_or(true)
	}

	/// Get effective value for [`sponsored_data_rate_limit`](self.sponsored_data_rate_limit).
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

/// Permissions on certain operations within a collection.
///
/// Some fields are wrapped in [`Option`], where `None` means chain default.
///
/// Update with `pallet_common::Pallet::clamp_permissions`.
#[derive(Encode, Decode, Debug, Default, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
// When adding/removing fields from this struct - don't forget to also update `pallet_common::Pallet::clamp_permissions`.
// TODO: move `pallet_common::Pallet::clamp_permissions` into `impl CollectionPermissions`.
pub struct CollectionPermissions {
	/// Access mode.
	///
	/// * Default - [`AccessMode::Normal`].
	pub access: Option<AccessMode>,

	/// Minting allowance.
	///
	/// * Default - **false**.
	pub mint_mode: Option<bool>,

	/// Permissions for nesting.
	///
	/// * Default
	///   - `token_owner` - **false**
	///   - `collection_admin` - **false**
	///   - `restricted` - **None**
	pub nesting: Option<NestingPermissions>,
}

impl CollectionPermissions {
	/// Get effective value for [`access`](self.access).
	pub fn access(&self) -> AccessMode {
		self.access.unwrap_or(AccessMode::Normal)
	}

	/// Get effective value for [`mint_mode`](self.mint_mode).
	pub fn mint_mode(&self) -> bool {
		self.mint_mode.unwrap_or(false)
	}

	/// Get effective value for [`nesting`](self.nesting).
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

/// Inner set for collections allowed to nest.
type OwnerRestrictedSetInner = BoundedBTreeSet<CollectionId, ConstU32<16>>;

/// Wraper for collections set allowing nest.
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct OwnerRestrictedSet(
	#[cfg_attr(feature = "serde1", serde(with = "bounded::set_serde"))]
	#[derivative(Debug(format_with = "bounded::set_debug"))]
	pub OwnerRestrictedSetInner,
);

impl OwnerRestrictedSet {
	/// Create new set.
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

/// Part of collection permissions, if set, defines who is able to nest tokens into other tokens.
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct NestingPermissions {
	/// Owner of token can nest tokens under it.
	pub token_owner: bool,
	/// Admin of token collection can nest tokens under token.
	pub collection_admin: bool,
	/// If set - only tokens from specified collections can be nested.
	pub restricted: Option<OwnerRestrictedSet>,

	#[cfg(feature = "runtime-benchmarks")]
	/// Anyone can nest tokens, mutually exclusive with `token_owner`, `admin`.
	pub permissive: bool,
}

/// Enum denominating how often can sponsoring occur if it is enabled.
///
/// Used for [`collection limits`](CollectionLimits).
#[derive(Encode, Decode, Debug, Clone, Copy, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum SponsoringRateLimit {
	/// Sponsoring is disabled, and the collection sponsor will not pay for transactions
	SponsoringDisabled,
	/// Once per how many blocks can sponsorship of a transaction type occur
	Blocks(u32),
}

/// Data used to describe an NFT at creation.
#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateNftData {
	/// Key-value pairs used to describe the token as metadata
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	/// Properties that wil be assignet to created item.
	pub properties: CollectionPropertiesVec,
}

/// Data used to describe a Fungible token at creation.
#[derive(Encode, Decode, MaxEncodedLen, Default, Debug, Clone, PartialEq, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
	/// Number of fungible coins minted
	pub value: u128,
}

/// Data used to describe a Refungible token at creation.
#[derive(Encode, Decode, MaxEncodedLen, Default, PartialEq, Clone, Derivative, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
#[derivative(Debug)]
pub struct CreateReFungibleData {
	/// Number of pieces the RFT is split into
	pub pieces: u128,

	/// Key-value pairs used to describe the token as metadata
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub properties: CollectionPropertiesVec,
}

// TODO: remove this.
#[derive(Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum MetaUpdatePermission {
	ItemOwner,
	Admin,
	None,
}

/// Enum holding data used for creation of all three item types.
/// Unified data for create item.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub enum CreateItemData {
	/// Data for create NFT.
	NFT(CreateNftData),
	/// Data for create Fungible item.
	Fungible(CreateFungibleData),
	/// Data for create ReFungible item.
	ReFungible(CreateReFungibleData),
}

/// Extended data for create NFT.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug)]
pub struct CreateNftExData<CrossAccountId> {
	/// Properties that wil be assignet to created item.
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub properties: CollectionPropertiesVec,

	/// Owner of creating item.
	pub owner: CrossAccountId,
}

/// Extended data for create ReFungible item.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug + Ord"))]
pub struct CreateRefungibleExMultipleOwners<CrossAccountId> {
	#[derivative(Debug(format_with = "bounded::map_debug"))]
	pub users: BoundedBTreeMap<CrossAccountId, u128, ConstU32<MAX_ITEMS_PER_BATCH>>,
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub properties: CollectionPropertiesVec,
}

/// Extended data for create ReFungible item.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug"))]
pub struct CreateRefungibleExSingleOwner<CrossAccountId> {
	pub user: CrossAccountId,
	pub pieces: u128,
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub properties: CollectionPropertiesVec,
}

/// Unified extended data for creating item.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative)]
#[derivative(Debug(bound = "CrossAccountId: fmt::Debug + Ord"))]
pub enum CreateItemExData<CrossAccountId> {
	/// Extended data for create NFT.
	NFT(
		#[derivative(Debug(format_with = "bounded::vec_debug"))]
		BoundedVec<CreateNftExData<CrossAccountId>, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),

	/// Extended data for create Fungible item.
	Fungible(
		#[derivative(Debug(format_with = "bounded::map_debug"))]
		BoundedBTreeMap<CrossAccountId, u128, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),

	/// Extended data for create ReFungible item in case of
	/// many tokens, each may have only one owner
	RefungibleMultipleItems(
		#[derivative(Debug(format_with = "bounded::vec_debug"))]
		BoundedVec<CreateRefungibleExSingleOwner<CrossAccountId>, ConstU32<MAX_ITEMS_PER_BATCH>>,
	),

	/// Extended data for create ReFungible item in case of
	/// single token, which may have many owners
	RefungibleMultipleOwners(CreateRefungibleExMultipleOwners<CrossAccountId>),
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

/// Token's address, dictated by its collection and token IDs.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
// todo possibly rename to be used generally as an address pair
pub struct TokenChild {
	/// Token id.
	pub token: TokenId,

	/// Collection id.
	pub collection: CollectionId,
}

/// Collection statistics.
#[derive(Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct CollectionStats {
	/// Number of created items.
	pub created: u32,

	/// Number of burned items.
	pub destroyed: u32,

	/// Number of current items.
	pub alive: u32,
}

/// This type works like [`PhantomData`] but supports generating _scale-info_ descriptions to generate node metadata.
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

/// Bounded vector of bytes.
pub type BoundedBytes<S> = BoundedVec<u8, S>;

/// Extra properties for external collections.
pub type AuxPropertyValue = BoundedBytes<ConstU32<MAX_AUX_PROPERTY_VALUE_LENGTH>>;

/// Property key.
pub type PropertyKey = BoundedBytes<ConstU32<MAX_PROPERTY_KEY_LENGTH>>;

/// Property value.
pub type PropertyValue = BoundedBytes<ConstU32<MAX_PROPERTY_VALUE_LENGTH>>;

/// Property permission.
#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct PropertyPermission {
	/// Permission to change the property and property permission.
	///
	/// If it **false** then you can not change corresponding property even if [`collection_admin`] and [`token_owner`] are **true**.
	pub mutable: bool,

	/// Change permission for the collection administrator.
	pub collection_admin: bool,

	/// Permission to change the property for the owner of the token.
	pub token_owner: bool,
}

impl PropertyPermission {
	/// Creates mutable property permission but changes restricted for collection admin and token owner.
	pub fn none() -> Self {
		Self {
			mutable: true,
			collection_admin: false,
			token_owner: false,
		}
	}
}

/// Property is simpl key-value record.
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct Property {
	/// Property key.
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub key: PropertyKey,

	/// Property value.
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub value: PropertyValue,
}

impl Into<(PropertyKey, PropertyValue)> for Property {
	fn into(self) -> (PropertyKey, PropertyValue) {
		(self.key, self.value)
	}
}

/// Record for proprty key permission.
#[derive(Encode, Decode, TypeInfo, Debug, MaxEncodedLen, PartialEq, Clone)]
#[cfg_attr(feature = "serde1", derive(Serialize, Deserialize))]
pub struct PropertyKeyPermission {
	/// Key.
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub key: PropertyKey,

	/// Permission.
	pub permission: PropertyPermission,
}

impl Into<(PropertyKey, PropertyPermission)> for PropertyKeyPermission {
	fn into(self) -> (PropertyKey, PropertyPermission) {
		(self.key, self.permission)
	}
}

/// Errors for properties actions.
#[derive(Debug)]
pub enum PropertiesError {
	/// The space allocated for properties has run out.
	///
	/// * Limit for colection - [`MAX_COLLECTION_PROPERTIES_SIZE`].
	/// * Limit for token - [`MAX_TOKEN_PROPERTIES_SIZE`].
	NoSpaceForProperty,

	/// The property limit has been reached.
	///
	/// * Limit - [`MAX_PROPERTIES_PER_ITEM`].
	PropertyLimitReached,

	/// Property key contains not allowed character.
	InvalidCharacterInPropertyKey,

	/// Property key length is too long.
	///
	/// * Limit - [`MAX_PROPERTY_KEY_LENGTH`].
	PropertyKeyIsTooLong,

	/// Property key is empty.
	EmptyPropertyKey,
}

/// Marker for scope of property.
///
/// Scoped property can't be changed by user. Used for external collections.
#[derive(Encode, Decode, MaxEncodedLen, TypeInfo, PartialEq, Clone, Copy)]
pub enum PropertyScope {
	None,
	Rmrk,
}

impl PropertyScope {
	/// Apply scope to property key.
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

/// Trait for operate with properties.
pub trait TrySetProperty: Sized {
	type Value;

	/// Try to set property with scope.
	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<(), PropertiesError>;

	/// Try to set property with scope from iterator.
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

	/// Try to set property.
	fn try_set(&mut self, key: PropertyKey, value: Self::Value) -> Result<(), PropertiesError> {
		self.try_scoped_set(PropertyScope::None, key, value)
	}

	/// Try to set property from iterator.
	fn try_set_from_iter<I, KV>(&mut self, iter: I) -> Result<(), PropertiesError>
	where
		I: Iterator<Item = KV>,
		KV: Into<(PropertyKey, Self::Value)>,
	{
		self.try_scoped_set_from_iter(PropertyScope::None, iter)
	}
}

/// Wrapped map for storing properties.
#[derive(Encode, Decode, TypeInfo, Derivative, Clone, PartialEq, MaxEncodedLen)]
#[derivative(Default(bound = ""))]
pub struct PropertiesMap<Value>(
	BoundedBTreeMap<PropertyKey, Value, ConstU32<MAX_PROPERTIES_PER_ITEM>>,
);

impl<Value> PropertiesMap<Value> {
	/// Create new property map.
	pub fn new() -> Self {
		Self(BoundedBTreeMap::new())
	}

	/// Remove property from map.
	pub fn remove(&mut self, key: &PropertyKey) -> Result<Option<Value>, PropertiesError> {
		Self::check_property_key(key)?;

		Ok(self.0.remove(key))
	}

	/// Get property with appropriate key from map.
	pub fn get(&self, key: &PropertyKey) -> Option<&Value> {
		self.0.get(key)
	}

	/// Check if map contains key.
	pub fn contains_key(&self, key: &PropertyKey) -> bool {
		self.0.contains_key(key)
	}

	/// Check if map contains key with key validation.
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

/// Alias for property permissions map.
pub type PropertiesPermissionMap = PropertiesMap<PropertyPermission>;

/// Wrapper for properties map with consumed space control.
#[derive(Encode, Decode, TypeInfo, Clone, PartialEq, MaxEncodedLen)]
pub struct Properties {
	map: PropertiesMap<PropertyValue>,
	consumed_space: u32,
	space_limit: u32,
}

impl Properties {
	/// Create new properies container.
	pub fn new(space_limit: u32) -> Self {
		Self {
			map: PropertiesMap::new(),
			consumed_space: 0,
			space_limit,
		}
	}

	/// Remove propery with appropiate key.
	pub fn remove(&mut self, key: &PropertyKey) -> Result<Option<PropertyValue>, PropertiesError> {
		let value = self.map.remove(key)?;

		if let Some(ref value) = value {
			let value_len = value.len() as u32;
			self.consumed_space -= value_len;
		}

		Ok(value)
	}

	/// Get property with appropriate key.
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

/// Utility struct for using in `StorageMap`.
pub struct CollectionProperties;

impl Get<Properties> for CollectionProperties {
	fn get() -> Properties {
		Properties::new(MAX_COLLECTION_PROPERTIES_SIZE)
	}
}

/// Utility struct for using in `StorageMap`.
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
