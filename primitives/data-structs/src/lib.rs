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
	fmt,
	ops::{Deref, DerefMut},
};

use bondrewd::Bitfields;
use derivative::Derivative;
use evm_coder::AbiCoderFlags;
use frame_support::{
	storage::{bounded_btree_map::BoundedBTreeMap, bounded_btree_set::BoundedBTreeSet},
	traits::ConstU32,
	BoundedVec,
};
use parity_scale_codec::{
	Compact, CompactLen, Decode, DecodeWithMemTracking, Encode, EncodeLike, MaxEncodedLen,
};
use scale_info::TypeInfo;
use serde::{Deserialize, Serialize};
use sp_core::U256;
use sp_runtime::ArithmeticError;
use sp_std::collections::btree_set::BTreeSet;
#[cfg(not(feature = "std"))]
use sp_std::vec::Vec;

mod bondrewd_codec;
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
	100_000_000
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
	100_000_000
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

/// Maximal length of a collection name.
pub const MAX_COLLECTION_NAME_LENGTH: u32 = 64;

/// Maximal length of a collection description.
pub const MAX_COLLECTION_DESCRIPTION_LENGTH: u32 = 256;

/// Maximal length of a token prefix.
pub const MAX_TOKEN_PREFIX_LENGTH: u32 = 16;

/// Maximal length of a property key.
pub const MAX_PROPERTY_KEY_LENGTH: u32 = 256;

/// Maximal length of an individual property value.
pub const MAX_PROPERTY_VALUE_LENGTH: u32 = 32768;

/// A maximum number of token properties.
pub const MAX_PROPERTIES_PER_ITEM: u32 = 64;

/// Maximal lenght of extended property value.
pub const MAX_AUX_PROPERTY_VALUE_LENGTH: u32 = 2048;

/// Maximum size limit for all collection properties.
pub const MAX_COLLECTION_PROPERTIES_LIMIT: u32 = 40960;

/// Default size limit of all token properties
pub const DEFAULT_TOKEN_PROPERTIES_LIMIT: u32 = 8192;

/// Maximum size limit of all token properties.
pub const MAX_TOKEN_PROPERTIES_LIMIT: u32 = 65536;

/// How much items can be created per single
/// create_many call.
pub const MAX_ITEMS_PER_BATCH: u32 = 120;

/// Used for limit bounded types of token custom data.
pub type CustomDataLimit = ConstU32<CUSTOM_DATA_LIMIT>;

/// Collection id.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
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
	Serialize,
	Deserialize,
)]
pub struct CollectionId(pub u32);
impl EncodeLike<u32> for CollectionId {}
impl EncodeLike<CollectionId> for u32 {}

impl From<u32> for CollectionId {
	fn from(value: u32) -> Self {
		Self(value)
	}
}

impl Deref for CollectionId {
	type Target = u32;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

/// Token id.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
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
	Serialize,
	Deserialize,
)]
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
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Encode, Decode, Clone, PartialEq, TypeInfo, Serialize, Deserialize)]
pub struct TokenData<CrossAccountId> {
	/// Properties of token.
	pub properties: Vec<Property>,

	/// Token owner.
	pub owner: Option<CrossAccountId>,

	/// Token pieces.
	#[version(2.., upper(0))]
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Eq,
	Debug,
	Clone,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Eq,
	Debug,
	Clone,
	Copy,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
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
#[derive(
	Encode, Decode, Eq, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen, Serialize, Deserialize,
)]
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
#[derive(Encode, Decode, Default, Debug, Clone, PartialEq, TypeInfo, Serialize, Deserialize)]
pub struct Ownership<AccountId> {
	pub owner: AccountId,
	pub fraction: u128,
}

/// The state of collection sponsorship.
#[derive(
	Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen, Serialize, Deserialize,
)]
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

#[derive(
	AbiCoderFlags, Bitfields, Clone, Copy, PartialEq, Eq, Debug, DecodeWithMemTracking, Default,
)]
#[bondrewd(enforce_bytes = 1)]
pub struct CollectionFlags {
	/// A collection of foreign assets
	#[bondrewd(bits = "0..1")]
	pub foreign: bool,
	/// Supports ERC721Metadata
	#[bondrewd(bits = "1..2")]
	pub erc721metadata: bool,
	/// External collections can't be managed using `unique` api
	#[bondrewd(bits = "7..8")]
	pub external: bool,
	/// Reserved flags
	#[bondrewd(bits = "2..7")]
	pub reserved: u8,
}
bondrewd_codec!(CollectionFlags);

impl CollectionFlags {
	pub fn is_allowed_for_user(self) -> bool {
		!self.foreign && !self.external && self.reserved == 0
	}
}

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

	#[version(2.., upper(Default::default()))]
	pub flags: CollectionFlags,

	#[version(..2)]
	pub variable_on_chain_schema: BoundedVec<u8, ConstU32<VARIABLE_ON_CHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub const_on_chain_schema: BoundedVec<u8, ConstU32<CONST_ON_CHAIN_SCHEMA_LIMIT>>,

	#[version(..2)]
	pub meta_update_permission: MetaUpdatePermission,
}

#[derive(Debug, Encode, Decode, Clone, PartialEq, TypeInfo, Serialize, Deserialize)]
pub struct RpcCollectionFlags {
	/// Is collection is foreign.
	pub foreign: bool,
	/// Collection supports ERC721Metadata.
	pub erc721metadata: bool,
}

/// Collection parameters, used in RPC calls (see [`Collection`] for the storage version).
#[struct_versioning::versioned(version = 2, upper)]
#[derive(Debug, Encode, Decode, Clone, PartialEq, TypeInfo, Serialize, Deserialize)]
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

	/// Extra collection flags
	#[version(2.., upper(RpcCollectionFlags {foreign: false, erc721metadata: false}))]
	pub flags: RpcCollectionFlags,
}

impl<AccountId> From<CollectionVersion1<AccountId>> for RpcCollection<AccountId> {
	fn from(value: CollectionVersion1<AccountId>) -> Self {
		let CollectionVersion1 {
			name,
			description,
			owner,
			mode,
			access,
			token_prefix,
			mint_mode,
			sponsorship,
			limits,
			..
		} = value;

		RpcCollection {
			name: name.into_inner(),
			description: description.into_inner(),
			owner,
			mode,
			token_prefix: token_prefix.into_inner(),
			sponsorship,
			limits,
			permissions: CollectionPermissions {
				access: Some(access),
				mint_mode: Some(mint_mode),
				nesting: None,
			},
			token_property_permissions: Vec::default(),
			properties: Vec::default(),
			read_only: true,

			flags: RpcCollectionFlags {
				foreign: false,
				erc721metadata: false,
			},
		}
	}
}

pub struct RawEncoded(Vec<u8>);

impl parity_scale_codec::Decode for RawEncoded {
	fn decode<I: parity_scale_codec::Input>(
		input: &mut I,
	) -> Result<Self, parity_scale_codec::Error> {
		let mut out = Vec::new();
		while let Ok(v) = input.read_byte() {
			out.push(v);
		}
		Ok(Self(out))
	}
}

impl Deref for RawEncoded {
	type Target = Vec<u8>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

/// Data used for create collection.
///
/// All fields are wrapped in [`Option`], where `None` means chain default.
#[derive(
	Encode, Decode, DecodeWithMemTracking, Clone, PartialEq, TypeInfo, Derivative, MaxEncodedLen,
)]
#[derivative(Debug, Default(bound = ""))]
pub struct CreateCollectionData<CrossAccountId> {
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

	/// Collection limits.
	pub limits: Option<CollectionLimits>,

	/// Collection permissions.
	pub permissions: Option<CollectionPermissions>,

	/// Token property permissions.
	pub token_property_permissions: CollectionPropertiesPermissionsVec,

	/// Collection properties.
	pub properties: CollectionPropertiesVec,

	pub admin_list: Vec<CrossAccountId>,

	/// Pending collection sponsor.
	pub pending_sponsor: Option<CrossAccountId>,

	pub flags: CollectionFlags,
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Debug,
	Default,
	Clone,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
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
	pub fn with_default_limits(collection_type: CollectionMode) -> Self {
		CollectionLimits {
			account_token_ownership_limit: Some(ACCOUNT_TOKEN_OWNERSHIP_LIMIT),
			sponsored_data_size: Some(CUSTOM_DATA_LIMIT),
			sponsored_data_rate_limit: Some(SponsoringRateLimit::SponsoringDisabled),
			token_limit: Some(COLLECTION_TOKEN_LIMIT),
			sponsor_transfer_timeout: match collection_type {
				CollectionMode::NFT => Some(NFT_SPONSOR_TRANSFER_TIMEOUT),
				CollectionMode::ReFungible => Some(REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT),
				CollectionMode::Fungible(_) => Some(FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT),
			},
			sponsor_approve_timeout: Some(SPONSOR_APPROVE_TIMEOUT),
			owner_can_transfer: Some(false),
			owner_can_destroy: Some(true),
			transfers_enabled: Some(true),
		}
	}

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
		self.token_limit.unwrap_or(COLLECTION_TOKEN_LIMIT)
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Debug,
	Default,
	Clone,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
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
#[derive(
	Encode, Decode, Clone, PartialEq, TypeInfo, MaxEncodedLen, Derivative, Serialize, Deserialize,
)]
#[derivative(Debug)]
pub struct OwnerRestrictedSet(
	#[serde(with = "bounded::set_serde")]
	#[derivative(Debug(format_with = "bounded::set_debug"))]
	pub OwnerRestrictedSetInner,
);

impl DecodeWithMemTracking for OwnerRestrictedSet {}

impl OwnerRestrictedSet {
	/// Create new set.
	pub fn new() -> Self {
		Self(Default::default())
	}
}
impl Default for OwnerRestrictedSet {
	fn default() -> Self {
		Self::new()
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

impl TryFrom<BTreeSet<CollectionId>> for OwnerRestrictedSet {
	type Error = ();

	fn try_from(value: BTreeSet<CollectionId>) -> Result<Self, Self::Error> {
		Ok(Self(value.try_into()?))
	}
}

/// Part of collection permissions, if set, defines who is able to nest tokens into other tokens.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Clone,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Derivative,
	Serialize,
	Deserialize,
)]
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Debug,
	Clone,
	Copy,
	PartialEq,
	TypeInfo,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
pub enum SponsoringRateLimit {
	/// Sponsoring is disabled, and the collection sponsor will not pay for transactions
	SponsoringDisabled,
	/// Once per how many blocks can sponsorship of a transaction type occur
	Blocks(u32),
}

/// Data used to describe an NFT at creation.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	MaxEncodedLen,
	Default,
	PartialEq,
	Clone,
	Derivative,
	TypeInfo,
	Serialize,
	Deserialize,
)]
#[derivative(Debug)]
pub struct CreateNftData {
	/// Key-value pairs used to describe the token as metadata
	#[serde(with = "bounded::vec_serde")]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	/// Properties that wil be assignet to created item.
	pub properties: CollectionPropertiesVec,
}

/// Data used to describe a Fungible token at creation.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	MaxEncodedLen,
	Default,
	Debug,
	Clone,
	PartialEq,
	TypeInfo,
	Serialize,
	Deserialize,
)]
pub struct CreateFungibleData {
	/// Number of fungible coins minted
	pub value: u128,
}

/// Data used to describe a Refungible token at creation.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	MaxEncodedLen,
	Default,
	PartialEq,
	Clone,
	Derivative,
	TypeInfo,
	Serialize,
	Deserialize,
)]
#[derivative(Debug)]
pub struct CreateReFungibleData {
	/// Number of pieces the RFT is split into
	pub pieces: u128,

	/// Key-value pairs used to describe the token as metadata
	#[serde(with = "bounded::vec_serde")]
	#[derivative(Debug(format_with = "bounded::vec_debug"))]
	pub properties: CollectionPropertiesVec,
}

// TODO: remove this.
#[derive(
	Encode, Decode, Debug, Clone, PartialEq, TypeInfo, MaxEncodedLen, Serialize, Deserialize,
)]
pub enum MetaUpdatePermission {
	ItemOwner,
	Admin,
	None,
}

/// Enum holding data used for creation of all three item types.
/// Unified data for create item.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	MaxEncodedLen,
	PartialEq,
	Clone,
	Debug,
	TypeInfo,
	Serialize,
	Deserialize,
)]
pub enum CreateItemData {
	/// Data for create NFT.
	NFT(CreateNftData),
	/// Data for create Fungible item.
	Fungible(CreateFungibleData),
	/// Data for create ReFungible item.
	ReFungible(CreateReFungibleData),
}

/// Extended data for create NFT.
#[derive(
	Encode, Decode, DecodeWithMemTracking, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative,
)]
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

impl<CrossAccountId: DecodeWithMemTracking> DecodeWithMemTracking
	for CreateRefungibleExMultipleOwners<CrossAccountId>
where
	Self: Decode,
{
}

/// Extended data for create ReFungible item.
#[derive(
	Encode, Decode, DecodeWithMemTracking, MaxEncodedLen, PartialEq, Clone, TypeInfo, Derivative,
)]
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

impl<CrossAccountId: DecodeWithMemTracking> DecodeWithMemTracking
	for CreateItemExData<CrossAccountId>
where
	Self: Decode,
{
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
#[derive(
	Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo, Serialize, Deserialize,
)]
// todo possibly rename to be used generally as an address pair
pub struct TokenChild {
	/// Token id.
	pub token: TokenId,

	/// Collection id.
	pub collection: CollectionId,
}

/// Collection statistics.
#[derive(
	Encode, Decode, MaxEncodedLen, PartialEq, Clone, Debug, TypeInfo, Serialize, Deserialize,
)]
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
			build::{FieldsBuilder, UnnamedFields},
			form::MetaForm,
			type_params, Path, Type,
		};
		Type::builder()
			.path(Path::new("up_data_structs", "PhantomType"))
			.type_params(type_params!(T))
			.composite(
				<FieldsBuilder<MetaForm, UnnamedFields>>::default().field(|b| b.ty::<[T; 0]>()),
			)
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	TypeInfo,
	Debug,
	MaxEncodedLen,
	PartialEq,
	Clone,
	Default,
	Serialize,
	Deserialize,
)]
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
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Debug,
	TypeInfo,
	Clone,
	PartialEq,
	MaxEncodedLen,
	Serialize,
	Deserialize,
)]
pub struct Property {
	/// Property key.
	#[serde(with = "bounded::vec_serde")]
	pub key: PropertyKey,

	/// Property value.
	#[serde(with = "bounded::vec_serde")]
	pub value: PropertyValue,
}

impl From<Property> for (PropertyKey, PropertyValue) {
	fn from(value: Property) -> Self {
		(value.key, value.value)
	}
}

/// Record for proprty key permission.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	TypeInfo,
	Debug,
	MaxEncodedLen,
	PartialEq,
	Clone,
	Serialize,
	Deserialize,
)]
pub struct PropertyKeyPermission {
	/// Key.
	#[cfg_attr(feature = "serde1", serde(with = "bounded::vec_serde"))]
	pub key: PropertyKey,

	/// Permission.
	pub permission: PropertyPermission,
}

impl From<PropertyKeyPermission> for (PropertyKey, PropertyPermission) {
	fn from(value: PropertyKeyPermission) -> Self {
		(value.key, value.permission)
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

/// Token owner error: it could be either `NotFound` ot `MultipleOwners`.
#[derive(Debug)]
pub enum TokenOwnerError {
	NotFound,
	MultipleOwners,
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
	pub fn prefix(&self) -> &'static [u8] {
		match self {
			Self::None => b"",
			Self::Rmrk => b"rmrk:",
		}
	}
	/// Apply scope to property key.
	pub fn apply(self, key: PropertyKey) -> Result<PropertyKey, PropertiesError> {
		let prefix = self.prefix();
		if prefix == b"" {
			return Ok(key);
		}
		[prefix, key.as_slice()]
			.concat()
			.try_into()
			.map_err(|_| PropertiesError::PropertyKeyIsTooLong)
	}
}

#[derive(Encode, Decode, MaxEncodedLen, TypeInfo, PartialEq, Clone, Copy)]
pub enum PropertySizeLimit {
	Default,
	Extended,
	Max,
}

// We don't use explicit enum discriminants because this enum must be encodable as it is used as an extrinsic parameter.
// The max encodable discriminant value is 255, while the corresponding limits are much bigger.
// Thus, we need a conversion function to get the corresponding values.
impl From<PropertySizeLimit> for u32 {
	fn from(limit: PropertySizeLimit) -> Self {
		match limit {
			PropertySizeLimit::Default => DEFAULT_TOKEN_PROPERTIES_LIMIT,
			PropertySizeLimit::Extended => MAX_TOKEN_PROPERTIES_LIMIT / 2,
			PropertySizeLimit::Max => MAX_TOKEN_PROPERTIES_LIMIT,
		}
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
	) -> Result<Option<Self::Value>, PropertiesError>;

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
	fn try_set(
		&mut self,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<Option<Self::Value>, PropertiesError> {
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

	pub fn values(&self) -> impl Iterator<Item = &Value> {
		self.0.values()
	}

	pub fn iter(&self) -> impl Iterator<Item = (&PropertyKey, &Value)> {
		self.0.iter()
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
	) -> Result<Option<Self::Value>, PropertiesError> {
		Self::check_property_key(&key)?;

		let key = scope.apply(key)?;
		self.0
			.try_insert(key, value)
			.map_err(|_| PropertiesError::PropertyLimitReached)
	}
}

/// Alias for property permissions map.
pub type PropertiesPermissionMap = PropertiesMap<PropertyPermission>;

fn slice_size(data: &[u8]) -> u32 {
	scoped_slice_size(PropertyScope::None, data)
}
fn scoped_slice_size(scope: PropertyScope, data: &[u8]) -> u32 {
	use parity_scale_codec::Compact;
	let prefix = scope.prefix();
	<Compact<u32>>::compact_len(&(data.len() as u32 + prefix.len() as u32)) as u32
		+ data.len() as u32
		+ prefix.len() as u32
}

/// Wrapper for properties map with consumed space control.
#[derive(Encode, Decode, TypeInfo, Clone, PartialEq)]
pub struct SpaceMeteredProperties<const MAX_SPACE_LIMIT: u32> {
	map: PropertiesMap<PropertyValue>,
	consumed_space: u32,
	// May be not zero, previously served as a current S generic
	_reserved: u32,
}

impl<const MAX_SPACE_LIMIT: u32> MaxEncodedLen for SpaceMeteredProperties<MAX_SPACE_LIMIT> {
	fn max_encoded_len() -> usize {
		// This follows the implementation of Encode for BTreeMap
		// The encoding is `LEN ++ DATA` where LEN is encoded as Compact<u32>.
		// `MAX_SPACE_LIMIT` limits the overall data size (enforced in `SpaceLimitedProperties`)
		let map_max_len =
			<Compact<u32>>::compact_len(&MAX_PROPERTIES_PER_ITEM) + MAX_SPACE_LIMIT as usize;

		let consumed_space_len = u32::max_encoded_len();
		let reserved_len = u32::max_encoded_len();

		map_max_len + consumed_space_len + reserved_len
	}
}

impl<const MAX_SPACE_LIMIT: u32> Default for SpaceMeteredProperties<MAX_SPACE_LIMIT> {
	fn default() -> Self {
		Self::new()
	}
}

impl<const MAX_SPACE_LIMIT: u32> SpaceMeteredProperties<MAX_SPACE_LIMIT> {
	/// Create new properies container.
	pub fn new() -> Self {
		Self {
			map: PropertiesMap::new(),
			consumed_space: 0,
			_reserved: 0,
		}
	}

	// TODO docs
	pub fn with_space_limit(self, space_limit: u32) -> SpaceLimitedProperties<Self> {
		SpaceLimitedProperties {
			properties: self,
			space_limit: space_limit.min(MAX_SPACE_LIMIT),
		}
	}

	pub fn with_space_limit_ref(&mut self, space_limit: u32) -> SpaceLimitedProperties<&mut Self> {
		SpaceLimitedProperties {
			properties: self,
			space_limit,
		}
	}

	pub fn with_max_space_limit(self) -> SpaceLimitedProperties<Self> {
		self.with_space_limit(MAX_SPACE_LIMIT)
	}

	pub fn with_max_space_limit_ref(&mut self) -> SpaceLimitedProperties<&mut Self> {
		self.with_space_limit_ref(MAX_SPACE_LIMIT)
	}

	/// Remove propery with appropiate key.
	pub fn remove(&mut self, key: &PropertyKey) -> Result<Option<PropertyValue>, PropertiesError> {
		let value = self.map.remove(key)?;

		if let Some(ref value) = value {
			let kv_len = slice_size(key) + slice_size(value);
			self.consumed_space = self.consumed_space.saturating_sub(kv_len);
		}

		Ok(value)
	}

	/// Get property with appropriate key.
	pub fn get(&self, key: &PropertyKey) -> Option<&PropertyValue> {
		self.map.get(key)
	}

	/// Recomputes the consumed space for the current properties state.
	/// Needed to repair a token due to a bug fixed in the [PR #733](https://github.com/UniqueNetwork/unique-chain/pull/773).
	pub fn recompute_consumed_space(&mut self) {
		self.consumed_space = self
			.map
			.iter()
			.map(|(key, value)| slice_size(key) + slice_size(value))
			.sum();
	}
}

impl<const MAX_SPACE_LIMIT: u32> IntoIterator for SpaceMeteredProperties<MAX_SPACE_LIMIT> {
	type Item = (PropertyKey, PropertyValue);
	type IntoIter = <PropertiesMap<PropertyValue> as IntoIterator>::IntoIter;

	fn into_iter(self) -> Self::IntoIter {
		self.map.into_iter()
	}
}

pub struct SpaceLimitedProperties<Properties> {
	properties: Properties,
	space_limit: u32,
}
impl<Properties> SpaceLimitedProperties<Properties> {
	pub fn into_inner(self) -> Properties {
		self.properties
	}
}
impl<Properties> Deref for SpaceLimitedProperties<Properties> {
	type Target = Properties;

	fn deref(&self) -> &Self::Target {
		&self.properties
	}
}
impl<Properties> DerefMut for SpaceLimitedProperties<Properties> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.properties
	}
}
impl<'a, const MAX_SPACE_LIMIT: u32> TrySetProperty
	for SpaceLimitedProperties<&'a mut SpaceMeteredProperties<MAX_SPACE_LIMIT>>
{
	type Value = PropertyValue;

	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<Option<Self::Value>, PropertiesError> {
		let key_size = scoped_slice_size(scope, &key);
		let value_size = slice_size(&value);

		if self.properties.consumed_space + value_size + key_size > self.space_limit
			&& !cfg!(feature = "runtime-benchmarks")
		{
			return Err(PropertiesError::NoSpaceForProperty);
		}

		let old_value = self.properties.map.try_scoped_set(scope, key, value)?;

		if let Some(old_value) = old_value.as_ref() {
			let old_value_size = slice_size(old_value);
			self.properties.consumed_space = self
				.properties
				.consumed_space
				.saturating_sub(old_value_size)
				+ value_size;
		} else {
			self.properties.consumed_space += key_size + value_size;
		}

		Ok(old_value)
	}
}
impl<const MAX_SPACE_LIMIT: u32> TrySetProperty
	for SpaceLimitedProperties<SpaceMeteredProperties<MAX_SPACE_LIMIT>>
{
	type Value = PropertyValue;

	fn try_scoped_set(
		&mut self,
		scope: PropertyScope,
		key: PropertyKey,
		value: Self::Value,
	) -> Result<Option<Self::Value>, PropertiesError> {
		let space_limit = self.space_limit;
		self.with_space_limit_ref(space_limit)
			.try_scoped_set(scope, key, value)
	}
}

pub type CollectionProperties = SpaceMeteredProperties<MAX_COLLECTION_PROPERTIES_LIMIT>;
pub type TokenProperties = SpaceMeteredProperties<MAX_TOKEN_PROPERTIES_LIMIT>;

#[derive(Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct CollectionTokensPropertiesLimit(u32);
impl Default for CollectionTokensPropertiesLimit {
	fn default() -> Self {
		Self(DEFAULT_TOKEN_PROPERTIES_LIMIT)
	}
}
impl From<PropertySizeLimit> for CollectionTokensPropertiesLimit {
	fn from(value: PropertySizeLimit) -> Self {
		Self(value.into())
	}
}
impl From<CollectionTokensPropertiesLimit> for u32 {
	fn from(value: CollectionTokensPropertiesLimit) -> Self {
		value.0
	}
}
