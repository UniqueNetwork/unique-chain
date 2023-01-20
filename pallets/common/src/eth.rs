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
use sp_std::{vec, vec::Vec};
use evm_coder::{
	AbiCoder,
	types::{uint256, address},
};
pub use pallet_evm::{Config, account::CrossAccountId};
use sp_core::H160;
use up_data_structs::CollectionId;

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection 1
// TODO: Unhardcode prefix
const ETH_COLLECTION_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

/// Maps the ethereum address of the collection in substrate.
pub fn map_eth_to_id(eth: &H160) -> Option<CollectionId> {
	if eth[0..16] != ETH_COLLECTION_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[16..20]);
	Some(CollectionId(u32::from_be_bytes(id_bytes)))
}

/// Maps the substrate collection id in ethereum.
pub fn collection_id_to_address(id: CollectionId) -> H160 {
	let mut out = [0; 20];
	out[0..16].copy_from_slice(&ETH_COLLECTION_PREFIX);
	out[16..20].copy_from_slice(&u32::to_be_bytes(id.0));
	H160(out)
}

/// Check if the ethereum address is a collection.
pub fn is_collection(address: &H160) -> bool {
	address[0..16] == ETH_COLLECTION_PREFIX
}

/// Convert `uint256` to `CrossAccountId`.
pub fn convert_uint256_to_cross_account<T: Config>(from: uint256) -> T::CrossAccountId
where
	T::AccountId: From<[u8; 32]>,
{
	let mut new_admin_arr = [0_u8; 32];
	from.to_big_endian(&mut new_admin_arr);
	let account_id = T::AccountId::from(new_admin_arr);
	T::CrossAccountId::from_sub(account_id)
}

/// Ethereum representation of Optional value with CrossAddress.
#[derive(Debug, Default, AbiCoder)]
pub struct OptionCrossAddress {
	/// Whether or not this CrossAdress is valid and has meaning.
	pub status: bool,
	/// The underlying CrossAddress value. If the status is false, can be set to whatever.
	pub value: CrossAddress,
}

/// Cross account struct
#[derive(Debug, Default, AbiCoder)]
pub struct CrossAddress {
	pub(crate) eth: address,
	pub(crate) sub: uint256,
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
			Self {
				eth: *cross_account_id.as_eth(),
				sub: Default::default(),
			}
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
			sub: uint256::from_big_endian(account_id.as_ref()),
		}
	}
	/// Converts [`CrossAddress`] to `CrossAccountId`.
	pub fn into_sub_cross_account<T>(&self) -> evm_coder::execution::Result<T::CrossAccountId>
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

/// Ethereum representation of collection [`PropertyKey`](up_data_structs::PropertyKey) and [`PropertyValue`](up_data_structs::PropertyValue).
#[derive(Debug, Default, AbiCoder)]
pub struct Property {
	key: evm_coder::types::string,
	value: evm_coder::types::bytes,
}

impl TryFrom<up_data_structs::Property> for Property {
	type Error = evm_coder::execution::Error;

	fn try_from(from: up_data_structs::Property) -> Result<Self, Self::Error> {
		let key = evm_coder::types::string::from_utf8(from.key.into())
			.map_err(|e| Self::Error::Revert(format!("utf8 conversion error: {}", e)))?;
		let value = evm_coder::types::bytes(from.value.to_vec());
		Ok(Property { key, value })
	}
}

impl TryInto<up_data_structs::Property> for Property {
	type Error = evm_coder::execution::Error;

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
	value: Option<uint256>,
}

impl CollectionLimit {
	/// Create [`CollectionLimit`] from field and value.
	pub fn new(field: CollectionLimitField, value: Option<u32>) -> Self {
		Self {
			field,
			value: match value {
				Some(value) => Some(value.into()),
				None => None,
			},
		}
	}
	/// Whether the field contains a value.
	pub fn has_value(&self) -> bool {
		self.value.is_some()
	}
}

impl TryInto<up_data_structs::CollectionLimits> for CollectionLimit {
	type Error = evm_coder::execution::Error;

	fn try_into(self) -> Result<up_data_structs::CollectionLimits, Self::Error> {
		let value = self
			.value
			.ok_or::<Self::Error>("can't convert `None` value to boolean".into())?;
		let value = Some(value.try_into().map_err(|error| {
			Self::Error::Revert(format!(
				"can't convert value to u32 \"{}\" because: \"{error}\"",
				value
			))
		})?);

		let convert_value_to_bool = || match value {
			Some(value) => match value {
				0 => Ok(Some(false)),
				1 => Ok(Some(true)),
				_ => {
					return Err(Self::Error::Revert(format!(
						"can't convert value to boolean \"{value}\""
					)))
				}
			},
			None => Ok(None),
		};

		let mut limits = up_data_structs::CollectionLimits::default();
		match self.field {
			CollectionLimitField::AccountTokenOwnership => {
				limits.account_token_ownership_limit = value;
			}
			CollectionLimitField::SponsoredDataSize => {
				limits.sponsored_data_size = value;
			}
			CollectionLimitField::SponsoredDataRateLimit => {
				limits.sponsored_data_rate_limit = match value {
					Some(value) => Some(up_data_structs::SponsoringRateLimit::Blocks(value)),
					None => None,
				};
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
	key: evm_coder::types::string,
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
		let key = evm_coder::types::string::from_utf8(key.into_inner())
			.expect("Stored key must be valid");
		let permissions = PropertyPermission::into_vec(permission);
		Self { key, permissions }
	}
}

impl TokenPropertyPermission {
	/// Convert vector of [`TokenPropertyPermission`] into vector of [`up_data_structs::PropertyKeyPermission`].
	pub fn into_property_key_permissions(
		permissions: Vec<TokenPropertyPermission>,
	) -> evm_coder::execution::Result<Vec<up_data_structs::PropertyKeyPermission>> {
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

/// Nested collections.
#[derive(Debug, Default, AbiCoder)]
pub struct CollectionNesting {
	token_owner: bool,
	ids: Vec<uint256>,
}

impl CollectionNesting {
	/// Create [`CollectionNesting`].
	pub fn new(token_owner: bool, ids: Vec<uint256>) -> Self {
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
