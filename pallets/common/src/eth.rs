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

//! The module contains a number of functions for converting and checking ethereum identifiers.

use alloc::format;

use evm_coder::{
	types::{Address, String},
	AbiCoder,
};
pub use pallet_evm::{account::CrossAccountId, Config};
use pallet_evm_coder_substrate::execution::Error;
use sp_core::{H160, U256};
use sp_std::vec;
#[cfg(not(feature = "std"))]
use sp_std::vec::Vec;
use up_data_structs::{CollectionFlags, CollectionId};

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection 1
// TODO: Unhardcode prefix
const ETH_COLLECTION_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

/// Maps the ethereum address of the collection in substrate.
pub fn map_eth_to_id(eth: &Address) -> Option<CollectionId> {
	if eth[0..16] != ETH_COLLECTION_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[16..20]);
	Some(CollectionId(u32::from_be_bytes(id_bytes)))
}

/// Maps the substrate collection id in ethereum.
pub fn collection_id_to_address(id: CollectionId) -> Address {
	let mut out = [0; 20];
	out[0..16].copy_from_slice(&ETH_COLLECTION_PREFIX);
	out[16..20].copy_from_slice(&u32::to_be_bytes(id.0));
	H160(out)
}

/// Check if the ethereum address is a collection.
pub fn is_collection(address: &Address) -> bool {
	address[0..16] == ETH_COLLECTION_PREFIX
}

/// Convert `U256` to `CrossAccountId`.
pub fn convert_uint256_to_cross_account<T: Config>(from: U256) -> T::CrossAccountId
where
	T::AccountId: From<[u8; 32]>,
{
	let mut new_admin_arr = [0_u8; 32];
	from.to_big_endian(&mut new_admin_arr);
	let account_id = T::AccountId::from(new_admin_arr);
	T::CrossAccountId::from_sub(account_id)
}

/// Cross account struct
#[derive(Debug, Default, AbiCoder)]
pub struct CrossAddress {
	pub(crate) eth: Address,
	pub(crate) sub: U256,
}

impl CrossAddress {
	/// Converts `CrossAccountId` to [`CrossAddress`] to be correctly usable with Ethereum.
	pub fn from_sub_cross_account<T>(cross_account_id: &T::CrossAccountId) -> Self
	where
		T: pallet_evm::Config,
		T::AccountId: AsRef<[u8; 32]>,
	{
		if cross_account_id.is_canonical_substrate() {
			Self::from_sub::<T>(cross_account_id.as_sub())
		} else {
			Self::from_eth(*cross_account_id.as_eth())
		}
	}
	/// Creates [`CrossAddress`] from Substrate account.
	pub fn from_sub<T>(account_id: &T::AccountId) -> Self
	where
		T: pallet_evm::Config,
		T::AccountId: AsRef<[u8; 32]>,
	{
		Self {
			eth: Default::default(),
			sub: U256::from_big_endian(account_id.as_ref()),
		}
	}
	/// Creates [`CrossAddress`] from Ethereum account.
	pub fn from_eth(address: Address) -> Self {
		Self {
			eth: address,
			sub: Default::default(),
		}
	}

	/// Converts [`CrossAddress`] to `Option<CrossAccountId>`.
	pub fn into_option_sub_cross_account<T>(&self) -> Result<Option<T::CrossAccountId>, Error>
	where
		T: pallet_evm::Config,
		T::AccountId: From<[u8; 32]>,
	{
		if self.eth == Default::default() && self.sub == Default::default() {
			Ok(None)
		} else if self.eth == Default::default() {
			Ok(Some(convert_uint256_to_cross_account::<T>(self.sub)))
		} else if self.sub == Default::default() {
			Ok(Some(T::CrossAccountId::from_eth(self.eth)))
		} else {
			Err(format!("All fields of cross account is non zeroed {self:?}").into())
		}
	}

	/// Converts [`CrossAddress`] to `CrossAccountId`.
	pub fn into_sub_cross_account<T>(&self) -> Result<T::CrossAccountId, Error>
	where
		T: pallet_evm::Config,
		T::AccountId: From<[u8; 32]>,
	{
		if self.eth == Default::default() && self.sub == Default::default() {
			Err("All fields of cross account is zeroed".into())
		} else if self.eth == Default::default() {
			Ok(convert_uint256_to_cross_account::<T>(self.sub))
		} else if self.sub == Default::default() {
			Ok(T::CrossAccountId::from_eth(self.eth))
		} else {
			Err("All fields of cross account is non zeroed".into())
		}
	}
}

/// Type of tokens in collection
#[derive(AbiCoder, Copy, Clone, Default, Debug, PartialEq)]
#[repr(u8)]
pub enum CollectionMode {
	/// Nonfungible
	#[default]
	Nonfungible,
	/// Fungible
	Fungible,
	/// Refungible
	Refungible,
}

/// Ethereum representation of collection [`PropertyKey`](up_data_structs::PropertyKey) and [`PropertyValue`](up_data_structs::PropertyValue).
#[derive(Debug, Default, AbiCoder)]
pub struct Property {
	key: evm_coder::types::String,
	value: evm_coder::types::Bytes,
}

impl Property {
	/// Property key.
	pub fn key(&self) -> &str {
		self.key.as_str()
	}

	/// Property value.
	pub fn value(&self) -> &[u8] {
		self.value.0.as_slice()
	}
}

impl TryFrom<up_data_structs::Property> for Property {
	type Error = Error;

	fn try_from(from: up_data_structs::Property) -> Result<Self, Self::Error> {
		let key = evm_coder::types::String::from_utf8(from.key.into())
			.map_err(|e| Self::Error::Revert(format!("utf8 conversion error: {e}")))?;
		let value = evm_coder::types::Bytes(from.value.to_vec());
		Ok(Property { key, value })
	}
}

impl TryInto<up_data_structs::Property> for Property {
	type Error = Error;

	fn try_into(self) -> Result<up_data_structs::Property, Self::Error> {
		let key = <Vec<u8>>::from(self.key)
			.try_into()
			.map_err(|_| "key too large")?;

		let value = self.value.0.try_into().map_err(|_| "value too large")?;

		Ok(up_data_structs::Property { key, value })
	}
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) fields representation for EVM.
#[derive(Debug, Default, Clone, Copy, AbiCoder)]
#[repr(u8)]
pub enum CollectionLimitField {
	/// How many tokens can a user have on one account.
	#[default]
	AccountTokenOwnership,

	/// How many bytes of data are available for sponsorship.
	SponsoredDataSize,

	/// In any case, chain default: [`SponsoringRateLimit::SponsoringDisabled`]
	SponsoredDataRateLimit,

	/// How many tokens can be mined into this collection.
	TokenLimit,

	/// Timeouts for transfer sponsoring.
	SponsorTransferTimeout,

	/// Timeout for sponsoring an approval in passed blocks.
	SponsorApproveTimeout,

	/// Whether the collection owner of the collection can send tokens (which belong to other users).
	OwnerCanTransfer,

	/// Can the collection owner burn other people's tokens.
	OwnerCanDestroy,

	/// Is it possible to send tokens from this collection between users.
	TransferEnabled,
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) field representation for EVM.
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionLimit {
	field: CollectionLimitField,
	value: Option<U256>,
}

impl CollectionLimit {
	/// Create [`CollectionLimit`] from field and value.
	pub fn new(field: CollectionLimitField, value: Option<u32>) -> Self {
		Self {
			field,
			value: value.map(|value| value.into()),
		}
	}
	/// Whether the field contains a value.
	pub fn has_value(&self) -> bool {
		self.value.is_some()
	}

	/// Set corresponding property in CollectionLimits struct
	pub fn apply_limit(&self, limits: &mut up_data_structs::CollectionLimits) -> Result<(), Error> {
		let value = self
			.value
			.ok_or::<Error>("can't convert `None` value to boolean".into())?;
		let value = Some(value.try_into().map_err(|error| {
			Error::Revert(format!(
				"can't convert value to u32 \"{value}\" because: \"{error}\""
			))
		})?);

		let convert_value_to_bool = || match value {
			Some(value) => match value {
				0 => Ok(Some(false)),
				1 => Ok(Some(true)),
				_ => Err(Error::Revert(format!(
					"can't convert value to boolean \"{value}\""
				))),
			},
			None => Ok(None),
		};

		match self.field {
			CollectionLimitField::AccountTokenOwnership => {
				limits.account_token_ownership_limit = value;
			}
			CollectionLimitField::SponsoredDataSize => {
				limits.sponsored_data_size = value;
			}
			CollectionLimitField::SponsoredDataRateLimit => {
				limits.sponsored_data_rate_limit =
					value.map(up_data_structs::SponsoringRateLimit::Blocks);
			}
			CollectionLimitField::TokenLimit => {
				limits.token_limit = value;
			}
			CollectionLimitField::SponsorTransferTimeout => {
				limits.sponsor_transfer_timeout = value;
			}
			CollectionLimitField::SponsorApproveTimeout => {
				limits.sponsor_approve_timeout = value;
			}
			CollectionLimitField::OwnerCanTransfer => {
				limits.owner_can_transfer = convert_value_to_bool()?;
			}
			CollectionLimitField::OwnerCanDestroy => {
				limits.owner_can_destroy = convert_value_to_bool()?;
			}
			CollectionLimitField::TransferEnabled => {
				limits.transfers_enabled = convert_value_to_bool()?;
			}
		};
		Ok(())
	}
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) field representation for EVM.
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionLimitValue {
	field: CollectionLimitField,
	value: U256,
}

impl CollectionLimitValue {
	/// Create [`CollectionLimitValue`] from field and value.
	pub fn new(field: CollectionLimitField, value: u32) -> Self {
		Self {
			field,
			value: value.into(),
		}
	}

	/// Set corresponding property in CollectionLimits struct
	pub fn apply_limit(&self, limits: &mut up_data_structs::CollectionLimits) -> Result<(), Error> {
		let value = self.value;
		let value: u32 = value.try_into().map_err(|error| {
			Error::Revert(format!(
				"can't convert value to u32 \"{value}\" because: \"{error}\""
			))
		})?;

		let convert_value_to_bool = || match value {
			0 => Ok(Some(false)),
			1 => Ok(Some(true)),
			_ => Err(Error::Revert(format!(
				"can't convert value to boolean \"{value}\""
			))),
		};

		match self.field {
			CollectionLimitField::AccountTokenOwnership => {
				limits.account_token_ownership_limit = Some(value);
			}
			CollectionLimitField::SponsoredDataSize => {
				limits.sponsored_data_size = Some(value);
			}
			CollectionLimitField::SponsoredDataRateLimit => {
				limits.sponsored_data_rate_limit =
					Some(up_data_structs::SponsoringRateLimit::Blocks(value));
			}
			CollectionLimitField::TokenLimit => {
				limits.token_limit = Some(value);
			}
			CollectionLimitField::SponsorTransferTimeout => {
				limits.sponsor_transfer_timeout = Some(value);
			}
			CollectionLimitField::SponsorApproveTimeout => {
				limits.sponsor_approve_timeout = Some(value);
			}
			CollectionLimitField::OwnerCanTransfer => {
				limits.owner_can_transfer = convert_value_to_bool()?;
			}
			CollectionLimitField::OwnerCanDestroy => {
				limits.owner_can_destroy = convert_value_to_bool()?;
			}
			CollectionLimitField::TransferEnabled => {
				limits.transfers_enabled = convert_value_to_bool()?;
			}
		};
		Ok(())
	}
}

impl TryInto<up_data_structs::CollectionLimits> for CollectionLimit {
	type Error = Error;

	fn try_into(self) -> Result<up_data_structs::CollectionLimits, Self::Error> {
		let mut limits = up_data_structs::CollectionLimits::default();
		self.apply_limit(&mut limits)?;
		Ok(limits)
	}
}

impl FromIterator<CollectionLimitValue> for Result<up_data_structs::CollectionLimits, Error> {
	fn from_iter<T: IntoIterator<Item = CollectionLimitValue>>(
		iter: T,
	) -> Result<up_data_structs::CollectionLimits, Error> {
		let mut limits = up_data_structs::CollectionLimits::default();
		for value in iter.into_iter() {
			value.apply_limit(&mut limits)?;
		}
		Ok(limits)
	}
}

/// Ethereum representation of `NestingPermissions` (see [`up_data_structs::NestingPermissions`]) fields as an enumeration.
#[derive(Default, Debug, Clone, Copy, AbiCoder)]
#[repr(u8)]
pub enum CollectionPermissionField {
	/// Owner of token can nest tokens under it.
	#[default]
	TokenOwner,

	/// Admin of token collection can nest tokens under token.
	CollectionAdmin,
}

/// Ethereum representation of TokenPermissions (see [`up_data_structs::PropertyPermission`]) fields as an enumeration.
#[derive(AbiCoder, Copy, Clone, Default, Debug)]
#[repr(u8)]
pub enum TokenPermissionField {
	/// Permission to change the property and property permission. See [`up_data_structs::PropertyPermission::mutable`]
	#[default]
	Mutable,

	/// Change permission for the collection administrator. See [`up_data_structs::PropertyPermission::token_owner`]
	TokenOwner,

	/// Permission to change the property for the owner of the token. See [`up_data_structs::PropertyPermission::collection_admin`]
	CollectionAdmin,
}

/// Ethereum representation of TokenPermissions (see [`up_data_structs::PropertyPermission`]) as an key and value.
#[derive(Debug, Default, AbiCoder)]
pub struct PropertyPermission {
	/// TokenPermission field.
	code: TokenPermissionField,
	/// TokenPermission value.
	value: bool,
}

impl PropertyPermission {
	/// Make vector of [`PropertyPermission`] from [`up_data_structs::PropertyPermission`].
	pub fn into_vec(pp: up_data_structs::PropertyPermission) -> Vec<Self> {
		vec![
			PropertyPermission {
				code: TokenPermissionField::Mutable,
				value: pp.mutable,
			},
			PropertyPermission {
				code: TokenPermissionField::TokenOwner,
				value: pp.token_owner,
			},
			PropertyPermission {
				code: TokenPermissionField::CollectionAdmin,
				value: pp.collection_admin,
			},
		]
	}

	/// Make [`up_data_structs::PropertyPermission`] from vector of [`PropertyPermission`].
	pub fn from_vec(permission: Vec<Self>) -> up_data_structs::PropertyPermission {
		let mut token_permission = up_data_structs::PropertyPermission::default();

		for PropertyPermission { code, value } in permission {
			match code {
				TokenPermissionField::Mutable => token_permission.mutable = value,
				TokenPermissionField::TokenOwner => token_permission.token_owner = value,
				TokenPermissionField::CollectionAdmin => token_permission.collection_admin = value,
			}
		}
		token_permission
	}
}

/// Ethereum representation of Token Property Permissions.
#[derive(Debug, Default, AbiCoder)]
pub struct TokenPropertyPermission {
	/// Token property key.
	key: evm_coder::types::String,
	/// Token property permissions.
	permissions: Vec<PropertyPermission>,
}

impl
	From<(
		up_data_structs::PropertyKey,
		up_data_structs::PropertyPermission,
	)> for TokenPropertyPermission
{
	fn from(
		value: (
			up_data_structs::PropertyKey,
			up_data_structs::PropertyPermission,
		),
	) -> Self {
		let (key, permission) = value;
		let key = evm_coder::types::String::from_utf8(key.into_inner())
			.expect("Stored key must be valid");
		let permissions = PropertyPermission::into_vec(permission);
		Self { key, permissions }
	}
}

impl TokenPropertyPermission {
	/// Convert vector of [`TokenPropertyPermission`] into vector of [`up_data_structs::PropertyKeyPermission`].
	pub fn into_property_key_permissions(
		permissions: Vec<TokenPropertyPermission>,
	) -> Result<Vec<up_data_structs::PropertyKeyPermission>, Error> {
		let mut perms = Vec::new();

		for TokenPropertyPermission { key, permissions } in permissions {
			let token_permission = PropertyPermission::from_vec(permissions);

			perms.push(up_data_structs::PropertyKeyPermission {
				key: key.into_bytes().try_into().map_err(|_| "too long key")?,
				permission: token_permission,
			});
		}
		Ok(perms)
	}
}

/// Data for creation token with uri.
#[derive(Debug, AbiCoder)]
pub struct TokenUri {
	/// Id of new token.
	pub id: U256,

	/// Uri of new token.
	pub uri: String,
}

/// Nested collections and permissions
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionNestingAndPermission {
	/// Owner of token can nest tokens under it.
	pub token_owner: bool,
	/// Admin of token collection can nest tokens under token.
	pub collection_admin: bool,
	/// If set - only tokens from specified collections can be nested.
	pub restricted: Vec<Address>,
}

impl CollectionNestingAndPermission {
	/// Create [`CollectionNesting`].
	pub fn new(token_owner: bool, collection_admin: bool, restricted: Vec<Address>) -> Self {
		Self {
			token_owner,
			collection_admin,
			restricted,
		}
	}
}

/// Collection properties
#[derive(Debug, Default, AbiCoder)]
pub struct CreateCollectionData {
	/// Collection name
	pub name: String,
	/// Collection description
	pub description: String,
	/// Token prefix
	pub token_prefix: String,
	/// Token type (NFT, FT or RFT)
	pub mode: CollectionMode,
	/// Fungible token precision
	pub decimals: u8,
	/// Custom Properties
	pub properties: Vec<Property>,
	/// Permissions for token properties
	pub token_property_permissions: Vec<TokenPropertyPermission>,
	/// Collection admins
	pub admin_list: Vec<CrossAddress>,
	/// Nesting settings
	pub nesting_settings: CollectionNestingAndPermission,
	/// Collection limits
	pub limits: Vec<CollectionLimitValue>,
	/// Collection sponsor
	pub pending_sponsor: CrossAddress,
	/// Extra collection flags
	pub flags: CollectionFlags,
}

/// Nested collections.
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionNesting {
	token_owner: bool,
	ids: Vec<U256>,
}

impl CollectionNesting {
	/// Create [`CollectionNesting`].
	pub fn new(token_owner: bool, ids: Vec<U256>) -> Self {
		Self { token_owner, ids }
	}
}

/// Ethereum representation of `NestingPermissions` (see [`up_data_structs::NestingPermissions`]) field.
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionNestingPermission {
	field: CollectionPermissionField,
	value: bool,
}

impl CollectionNestingPermission {
	/// Create [`CollectionNestingPermission`].
	pub fn new(field: CollectionPermissionField, value: bool) -> Self {
		Self { field, value }
	}
}

/// Ethereum representation of `AccessMode` (see [`up_data_structs::AccessMode`]).
#[derive(AbiCoder, Copy, Clone, Default, Debug)]
#[repr(u8)]
pub enum AccessMode {
	/// Access grant for owner and admins. Used as default.
	#[default]
	Normal,
	/// Like a [`Normal`](AccessMode::Normal) but also users in allow list.
	AllowList,
}

impl From<up_data_structs::AccessMode> for AccessMode {
	fn from(value: up_data_structs::AccessMode) -> Self {
		match value {
			up_data_structs::AccessMode::Normal => AccessMode::Normal,
			up_data_structs::AccessMode::AllowList => AccessMode::AllowList,
		}
	}
}

impl From<AccessMode> for up_data_structs::AccessMode {
	fn from(value: AccessMode) -> Self {
		match value {
			AccessMode::Normal => up_data_structs::AccessMode::Normal,
			AccessMode::AllowList => up_data_structs::AccessMode::AllowList,
		}
	}
}
