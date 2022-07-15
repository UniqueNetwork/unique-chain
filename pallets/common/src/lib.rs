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

//! # Common pallet
//!
//! The Common pallet provides functionality for handling collections.
//!
//! ## Overview
//!
//! The Common pallet provides functions for:
//!
//! - Setting and approving collection soponsor.
//! - Get\set\delete allow list.
//! - Get\set\delete collection properties.
//! - Get\set\delete collection property permissions.
//! - Get\set\delete token property permissions.
//! - Get\set\delete collection administrators.
//! - Checking access permissions.
//! - Provides an interface for common collection operations for different collection types.
//! - Provides dispatching for implementations of common collection operations, see [dispatch] module.
//! - Provides functionality of collection into evm, see [erc] and [eth] module.
//!
//! ### Terminology
//! **Collection sponsor** - For the collection, you can set a sponsor, at whose expense it will
//! be possible to mint tokens.
//!
//! **Allow list** - List of users who have the right to minting tokens.
//!
//! **Collection properties** - Collection properties are simply key-value stores where various
//! metadata can be placed.
//!
//! **Collection property permissions** - For each property in the collection can be set permission
//! to change, see [PropertyPermission].
//!
//! **Permissions on token properties** - Similar to _permissions on collection properties_,
//! only restrictions apply to token properties.
//!
//! **Collection administrator** - For a collection, you can set administrators who have the right
//! to most actions on the collection.

#![warn(missing_docs)]
#![cfg_attr(not(feature = "std"), no_std)]
extern crate alloc;

use core::ops::{Deref, DerefMut};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_std::vec::Vec;
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use evm_coder::ToLog;
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo, Weight, PostDispatchInfo},
	ensure,
	traits::{Imbalance, Get, Currency, WithdrawReasons, ExistenceRequirement},
	weights::Pays,
	transactional,
};
use pallet_evm::GasWeightMapping;
use up_data_structs::{
	COLLECTION_NUMBER_LIMIT,
	Collection,
	RpcCollection,
	CollectionId,
	CreateItemData,
	MAX_TOKEN_PREFIX_LENGTH,
	COLLECTION_ADMINS_LIMIT,
	TokenId,
	TokenChild,
	CollectionStats,
	MAX_TOKEN_OWNERSHIP,
	CollectionMode,
	NFT_SPONSOR_TRANSFER_TIMEOUT,
	FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	MAX_SPONSOR_TIMEOUT,
	CUSTOM_DATA_LIMIT,
	CollectionLimits,
	CreateCollectionData,
	SponsorshipState,
	CreateItemExData,
	SponsoringRateLimit,
	budget::Budget,
	PhantomType,
	Property,
	Properties,
	PropertiesPermissionMap,
	PropertyKey,
	PropertyValue,
	PropertyPermission,
	PropertiesError,
	PropertyKeyPermission,
	TokenData,
	TrySetProperty,
	PropertyScope,
	// RMRK
	RmrkCollectionInfo,
	RmrkInstanceInfo,
	RmrkResourceInfo,
	RmrkPropertyInfo,
	RmrkBaseInfo,
	RmrkPartType,
	RmrkBoundedTheme,
	RmrkNftChild,
	CollectionPermissions,
	SchemaVersion,
};

pub use pallet::*;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod dispatch;
pub mod erc;
pub mod eth;
pub mod weights;

/// Weight info.
pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

/// Collection handle contains information about collection data and id.
/// Also provides functionality to count consumed gas.
/// CollectionHandle is used as a generic wrapper for collections of all types.
/// It allows to perform common operations and queries on any collection type,
/// both completely general for all, as well as their respective implementations of [CommonCollectionOperations].
#[must_use = "Should call submit_logs or save, otherwise some data will be lost for evm side"]
pub struct CollectionHandle<T: Config> {
	/// Collection id
	pub id: CollectionId,
	collection: Collection<T::AccountId>,
	/// Substrate recorder for counting consumed gas
	pub recorder: SubstrateRecorder<T>,
}

impl<T: Config> WithRecorder<T> for CollectionHandle<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.recorder
	}
	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.recorder
	}
}

impl<T: Config> CollectionHandle<T> {
	/// Same as [CollectionHandle::new] but with an explicit gas limit.
	pub fn new_with_gas_limit(id: CollectionId, gas_limit: u64) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder: SubstrateRecorder::new(gas_limit),
		})
	}

	/// Same as [CollectionHandle::new] but with an existed [SubstrateRecorder].
	pub fn new_with_recorder(id: CollectionId, recorder: SubstrateRecorder<T>) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder,
		})
	}

	/// Retrives collection data from storage and creates collection handle with default parameters.
	/// If collection not found return `None`
	pub fn new(id: CollectionId) -> Option<Self> {
		Self::new_with_gas_limit(id, u64::MAX)
	}

	/// Same as [CollectionHandle::new] but if collection not found [Error::CollectionNotFound] returned.
	pub fn try_get(id: CollectionId) -> Result<Self, DispatchError> {
		Ok(Self::new(id).ok_or(<Error<T>>::CollectionNotFound)?)
	}

	/// Consume gas for reading.
	pub fn consume_store_reads(&self, reads: u64) -> evm_coder::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(
				<T as frame_system::Config>::DbWeight::get()
					.read
					.saturating_mul(reads),
			))
	}

	/// Consume gas for writing.
	pub fn consume_store_writes(&self, writes: u64) -> evm_coder::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(
				<T as frame_system::Config>::DbWeight::get()
					.write
					.saturating_mul(writes),
			))
	}

	/// Save collection to storage.
	pub fn save(self) -> DispatchResult {
		<CollectionById<T>>::insert(self.id, self.collection);
		Ok(())
	}

	/// Set collection sponsor.
	///
	/// Unique collections allows sponsoring for certain actions.
	/// This method allows you to set the sponsor of the collection.
	/// In order for sponsorship to become active, it must be confirmed through [Self::confirm_sponsorship].
	pub fn set_sponsor(&mut self, sponsor: T::AccountId) -> DispatchResult {
		self.collection.sponsorship = SponsorshipState::Unconfirmed(sponsor);
		Ok(())
	}

	/// Confirm sponsorship
	///
	/// In order for the sponsorship to become active, the user set as the sponsor must confirm their participation.
	/// Before confirming sponsorship, the user must be specified as the sponsor of the collection via [Self::set_sponsor].
	pub fn confirm_sponsorship(&mut self, sender: &T::AccountId) -> Result<bool, DispatchError> {
		if self.collection.sponsorship.pending_sponsor() != Some(sender) {
			return Ok(false);
		}

		self.collection.sponsorship = SponsorshipState::Confirmed(sender.clone());
		Ok(true)
	}

	/// Checks that the collection was created with, and must be operated upon through **Unique API**.
	/// Now check only the `external_collection` flag and if it's **true**, then return [Error::CollectionIsExternal] error.
	pub fn check_is_internal(&self) -> DispatchResult {
		if self.external_collection {
			return Err(<Error<T>>::CollectionIsExternal)?;
		}

		Ok(())
	}

	/// Checks that the collection was created with, and must be operated upon through an **assimilated API**.
	/// Now check only the `external_collection` flag and if it's **false**, then return [Error::CollectionIsInternal] error.
	pub fn check_is_external(&self) -> DispatchResult {
		if !self.external_collection {
			return Err(<Error<T>>::CollectionIsInternal)?;
		}

		Ok(())
	}
}

impl<T: Config> Deref for CollectionHandle<T> {
	type Target = Collection<T::AccountId>;

	fn deref(&self) -> &Self::Target {
		&self.collection
	}
}

impl<T: Config> DerefMut for CollectionHandle<T> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.collection
	}
}

impl<T: Config> CollectionHandle<T> {
	/// Checks if the `user` is the owner of the collection.
	pub fn check_is_owner(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(*user.as_sub() == self.owner, <Error<T>>::NoPermission);
		Ok(())
	}

	/// Returns **true** if the `user` is the owner or administrator of the collection.
	pub fn is_owner_or_admin(&self, user: &T::CrossAccountId) -> bool {
		*user.as_sub() == self.owner || <IsAdmin<T>>::get((self.id, user))
	}

	/// Checks if the `user` is the owner or administrator of the collection.
	pub fn check_is_owner_or_admin(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(self.is_owner_or_admin(user), <Error<T>>::NoPermission);
		Ok(())
	}

	/// Return **true** if `user` was not allowed to have tokens, and he can ignore such restrictions.
	pub fn ignores_allowance(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}

	/// Return **true** if `user` does not have enough token parts, and he can ignore such restrictions.
	pub fn ignores_owned_amount(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}

	/// Checks if the user is in the allow list. If not [Error::AddressNotInAllowlist] returns.
	pub fn check_allowlist(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(
			<Allowlist<T>>::get((self.id, user)),
			<Error<T>>::AddressNotInAllowlist
		);
		Ok(())
	}
}

#[frame_support::pallet]
pub mod pallet {
	use super::*;
	use pallet_evm::account;
	use dispatch::CollectionDispatch;
	use frame_support::{Blake2_128Concat, pallet_prelude::*, storage::Key, traits::StorageVersion};
	use frame_system::pallet_prelude::*;
	use frame_support::traits::Currency;
	use up_data_structs::{TokenId, mapping::TokenAddressMapping};
	use scale_info::TypeInfo;
	use weights::WeightInfo;

	#[pallet::config]
	pub trait Config:
		frame_system::Config
		+ pallet_evm_coder_substrate::Config
		+ pallet_evm::Config
		+ TypeInfo
		+ account::Config
	{
		/// Weight info.
		type WeightInfo: WeightInfo;

		/// Events compatible with [frame_system::Config::Event].
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		/// Currency.
		type Currency: Currency<Self::AccountId>;

		/// Price getter to create the collection.
		#[pallet::constant]
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
		>;

		/// Collection dispatcher.
		type CollectionDispatch: CollectionDispatch<Self>;

		/// Treasury account id getter.
		type TreasuryAccountId: Get<Self::AccountId>;

		/// Contract address getter.
		type ContractAddress: Get<H160>;

		/// Mapper for tokens to Etherium addresses.
		type EvmTokenAddressMapping: TokenAddressMapping<H160>;

		/// Mapper for tokens to [CrossAccountId].
		type CrossTokenAddressMapping: TokenAddressMapping<Self::CrossAccountId>;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::extra_constants]
	impl<T: Config> Pallet<T> {
		/// Maximum admins per collection.
		pub fn collection_admins_limit() -> u32 {
			COLLECTION_ADMINS_LIMIT
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub fn deposit_event)]
	pub enum Event<T: Config> {
		/// New collection was created
		CollectionCreated(
			/// Globally unique identifier of newly created collection.
			CollectionId,
			/// [CollectionMode] converted into _u8_.
			u8,
			/// Collection owner.
			T::AccountId,
		),

		/// New collection was destroyed
		CollectionDestroyed(
			/// Globally unique identifier of collection.
			CollectionId,
		),

		/// New item was created.
		ItemCreated(
			/// Id of the collection where item was created.
			CollectionId,
			/// Id of an item. Unique within the collection.
			TokenId,
			/// Owner of newly created item
			T::CrossAccountId,
			/// Always 1 for NFT
			u128,
		),

		/// Collection item was burned.
		ItemDestroyed(
			/// Id of the collection where item was destroyed.
			CollectionId,
			/// Identifier of burned NFT.
			TokenId,
			/// Which user has destroyed its tokens.
			T::CrossAccountId,
			/// Amount of token pieces destroed. Always 1 for NFT.
			u128,
		),

		/// Item was transferred
		Transfer(
			/// Id of collection to which item is belong.
			CollectionId,
			/// Id of an item.
			TokenId,
			/// Original owner of item.
			T::CrossAccountId,
			/// New owner of item.
			T::CrossAccountId,
			/// Amount of token pieces transfered. Always 1 for NFT.
			u128,
		),

		/// Amount pieces of token owned by `sender` was approved for `spender`.
		Approved(
			/// Id of collection to which item is belong.
			CollectionId,
			/// Id of an item.
			TokenId,
			/// Original owner of item.
			T::CrossAccountId,
			/// Id for which the approval was granted.
			T::CrossAccountId,
			/// Amount of token pieces transfered. Always 1 for NFT.
			u128,
		),

		/// The colletion property has been set.
		CollectionPropertySet(
			/// Id of collection to which property has been set.
			CollectionId,
			/// The property that was set.
			PropertyKey,
		),

		/// The property has been deleted.
		CollectionPropertyDeleted(
			/// Id of collection to which property has been deleted.
			CollectionId,
			/// The property that was deleted.
			PropertyKey,
		),

		/// The token property has been set.
		TokenPropertySet(
			/// Identifier of the collection whose token has the property set.
			CollectionId,
			/// The token for which the property was set.
			TokenId,
			/// The property that was set.
			PropertyKey,
		),

		/// The token property has been deleted.
		TokenPropertyDeleted(
			/// Identifier of the collection whose token has the property deleted.
			CollectionId,
			/// The token for which the property was deleted.
			TokenId,
			/// The property that was deleted.
			PropertyKey,
		),

		/// The colletion property permission has been set.
		PropertyPermissionSet(
			/// Id of collection to which property permission has been set.
			CollectionId,
			/// The property permission that was set.
			PropertyKey,
		),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This collection does not exist.
		CollectionNotFound,
		/// Sender parameter and item owner must be equal.
		MustBeTokenOwner,
		/// No permission to perform action
		NoPermission,
		/// Destroying only empty collections is allowed
		CantDestroyNotEmptyCollection,
		/// Collection is not in mint mode.
		PublicMintingNotAllowed,
		/// Address is not in allow list.
		AddressNotInAllowlist,

		/// Collection name can not be longer than 63 char.
		CollectionNameLimitExceeded,
		/// Collection description can not be longer than 255 char.
		CollectionDescriptionLimitExceeded,
		/// Token prefix can not be longer than 15 char.
		CollectionTokenPrefixLimitExceeded,
		/// Total collections bound exceeded.
		TotalCollectionsLimitExceeded,
		/// Exceeded max admin count
		CollectionAdminCountExceeded,
		/// Collection limit bounds per collection exceeded
		CollectionLimitBoundsExceeded,
		/// Tried to enable permissions which are only permitted to be disabled
		OwnerPermissionsCantBeReverted,
		/// Collection settings not allowing items transferring
		TransferNotAllowed,
		/// Account token limit exceeded per collection
		AccountTokenLimitExceeded,
		/// Collection token limit exceeded
		CollectionTokenLimitExceeded,
		/// Metadata flag frozen
		MetadataFlagFrozen,

		/// Item not exists.
		TokenNotFound,
		/// Item balance not enough.
		TokenValueTooLow,
		/// Requested value more than approved.
		ApprovedValueTooLow,
		/// Tried to approve more than owned
		CantApproveMoreThanOwned,

		/// Can't transfer tokens to ethereum zero address
		AddressIsZero,
		/// Target collection doesn't supports this operation
		UnsupportedOperation,

		/// Not sufficient funds to perform action
		NotSufficientFounds,

		/// User not passed nesting rule
		UserIsNotAllowedToNest,
		/// Only tokens from specific collections may nest tokens under this
		SourceCollectionIsNotAllowedToNest,

		/// Tried to store more data than allowed in collection field
		CollectionFieldSizeExceeded,

		/// Tried to store more property data than allowed
		NoSpaceForProperty,

		/// Tried to store more property keys than allowed
		PropertyLimitReached,

		/// Property key is too long
		PropertyKeyIsTooLong,

		/// Only ASCII letters, digits, and '_', '-' are allowed
		InvalidCharacterInPropertyKey,

		/// Empty property keys are forbidden
		EmptyPropertyKey,

		/// Tried to access an external collection with an internal API
		CollectionIsExternal,

		/// Tried to access an internal collection with an external API
		CollectionIsInternal,
	}

	/// Storage of the count of created collections.
	#[pallet::storage]
	pub type CreatedCollectionCount<T> = StorageValue<Value = CollectionId, QueryKind = ValueQuery>;

	/// Storage of the count of deleted collections.
	#[pallet::storage]
	pub type DestroyedCollectionCount<T> =
		StorageValue<Value = CollectionId, QueryKind = ValueQuery>;

	/// Storage of collection info.
	#[pallet::storage]
	pub type CollectionById<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Collection<<T as frame_system::Config>::AccountId>,
		QueryKind = OptionQuery,
	>;

	/// Storage of collection properties.
	#[pallet::storage]
	#[pallet::getter(fn collection_properties)]
	pub type CollectionProperties<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::CollectionProperties,
	>;

	/// Storage of collection properties permissions.
	#[pallet::storage]
	#[pallet::getter(fn property_permissions)]
	pub type CollectionPropertyPermissions<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = PropertiesPermissionMap,
		QueryKind = ValueQuery,
	>;

	/// Storage of collection admins count.
	#[pallet::storage]
	pub type AdminAmount<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = u32,
		QueryKind = ValueQuery,
	>;

	/// List of collection admins
	#[pallet::storage]
	pub type IsAdmin<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Allowlisted collection users
	#[pallet::storage]
	pub type Allowlist<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Not used by code, exists only to provide some types to metadata.
	#[pallet::storage]
	pub type DummyStorageValue<T: Config> = StorageValue<
		Value = (
			CollectionStats,
			CollectionId,
			TokenId,
			TokenChild,
			PhantomType<(
				TokenData<T::CrossAccountId>,
				RpcCollection<T::AccountId>,
				// RMRK
				RmrkCollectionInfo<T::AccountId>,
				RmrkInstanceInfo<T::AccountId>,
				RmrkResourceInfo,
				RmrkPropertyInfo,
				RmrkBaseInfo<T::AccountId>,
				RmrkPartType,
				RmrkBoundedTheme,
				RmrkNftChild,
			)>,
		),
		QueryKind = OptionQuery,
	>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			if StorageVersion::get::<Pallet<T>>() < StorageVersion::new(1) {
				use up_data_structs::{CollectionVersion1, CollectionVersion2};
				<CollectionById<T>>::translate::<CollectionVersion1<T::AccountId>, _>(|id, v| {
					let mut props = Vec::new();
					if !v.offchain_schema.is_empty() {
						props.push(Property {
							key: b"_old_offchainSchema".to_vec().try_into().unwrap(),
							value: v
								.offchain_schema
								.clone()
								.into_inner()
								.try_into()
								.expect("offchain schema too big"),
						});
					}
					if !v.variable_on_chain_schema.is_empty() {
						props.push(Property {
							key: b"_old_variableOnChainSchema".to_vec().try_into().unwrap(),
							value: v
								.variable_on_chain_schema
								.clone()
								.into_inner()
								.try_into()
								.expect("offchain schema too big"),
						});
					}
					if !v.const_on_chain_schema.is_empty() {
						props.push(Property {
							key: b"_old_constOnChainSchema".to_vec().try_into().unwrap(),
							value: v
								.const_on_chain_schema
								.clone()
								.into_inner()
								.try_into()
								.expect("offchain schema too big"),
						});
					}
					props.push(Property {
						key: b"_old_schemaVersion".to_vec().try_into().unwrap(),
						value: match v.schema_version {
							SchemaVersion::ImageURL => b"ImageUrl".as_slice(),
							SchemaVersion::Unique => b"Unique".as_slice(),
						}
						.to_vec()
						.try_into()
						.unwrap(),
					});
					Self::set_scoped_collection_properties(
						id,
						PropertyScope::None,
						props.into_iter(),
					)
					.expect("existing data larger than properties");
					let mut new = CollectionVersion2::from(v.clone());
					new.permissions.access = Some(v.access);
					new.permissions.mint_mode = Some(v.mint_mode);
					Some(new)
				});
			}

			0
		}
	}
}

impl<T: Config> Pallet<T> {
	/// Enshure that receiver address is correct.
	///
	/// Ethereum receiver 0x0000000000000000000000000000000000000000 is reserved, and shouldn't own tokens.
	pub fn ensure_correct_receiver(receiver: &T::CrossAccountId) -> DispatchResult {
		ensure!(
			&T::CrossAccountId::from_eth(H160([0; 20])) != receiver,
			<Error<T>>::AddressIsZero
		);
		Ok(())
	}

	/// Get a vector of collection admins.
	pub fn adminlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<IsAdmin<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}

	/// Get a vector of users allowed to mint tokens.
	pub fn allowlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<Allowlist<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}

	/// Is `user` allowed to mint token in `collection`.
	pub fn allowed(collection: CollectionId, user: T::CrossAccountId) -> bool {
		<Allowlist<T>>::get((collection, user))
	}

	/// Get statistics of collections.
	pub fn collection_stats() -> CollectionStats {
		let created = <CreatedCollectionCount<T>>::get();
		let destroyed = <DestroyedCollectionCount<T>>::get();
		CollectionStats {
			created: created.0,
			destroyed: destroyed.0,
			alive: created.0 - destroyed.0,
		}
	}

	/// Get the effective limits for the collection.
	pub fn effective_collection_limits(collection: CollectionId) -> Option<CollectionLimits> {
		let collection = <CollectionById<T>>::get(collection);
		if collection.is_none() {
			return None;
		}

		let collection = collection.unwrap();
		let limits = collection.limits;
		let effective_limits = CollectionLimits {
			account_token_ownership_limit: Some(limits.account_token_ownership_limit()),
			sponsored_data_size: Some(limits.sponsored_data_size()),
			sponsored_data_rate_limit: Some(
				limits
					.sponsored_data_rate_limit
					.unwrap_or(SponsoringRateLimit::SponsoringDisabled),
			),
			token_limit: Some(limits.token_limit()),
			sponsor_transfer_timeout: Some(limits.sponsor_transfer_timeout(
				match collection.mode {
					CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				},
			)),
			sponsor_approve_timeout: Some(limits.sponsor_approve_timeout()),
			owner_can_transfer: Some(limits.owner_can_transfer()),
			owner_can_destroy: Some(limits.owner_can_destroy()),
			transfers_enabled: Some(limits.transfers_enabled()),
		};

		Some(effective_limits)
	}

	/// Returns information about the `collection` adapted for rpc.
	pub fn rpc_collection(collection: CollectionId) -> Option<RpcCollection<T::AccountId>> {
		let Collection {
			name,
			description,
			owner,
			mode,
			token_prefix,
			sponsorship,
			limits,
			permissions,
			external_collection,
		} = <CollectionById<T>>::get(collection)?;

		let token_property_permissions = <CollectionPropertyPermissions<T>>::get(collection)
			.into_iter()
			.map(|(key, permission)| PropertyKeyPermission { key, permission })
			.collect();

		let properties = <CollectionProperties<T>>::get(collection)
			.into_iter()
			.map(|(key, value)| Property { key, value })
			.collect();

		let permissions = CollectionPermissions {
			access: Some(permissions.access()),
			mint_mode: Some(permissions.mint_mode()),
			nesting: Some(permissions.nesting().clone()),
		};

		Some(RpcCollection {
			name: name.into_inner(),
			description: description.into_inner(),
			owner,
			mode,
			token_prefix: token_prefix.into_inner(),
			sponsorship,
			limits,
			permissions,
			token_property_permissions,
			properties,
			read_only: external_collection,
		})
	}
}

macro_rules! limit_default {
	($old:ident, $new:ident, $($field:ident $(($arg:expr))? => $check:expr),* $(,)?) => {{
		$(
			if let Some($new) = $new.$field {
				let $old = $old.$field($($arg)?);
				let _ = $new;
				let _ = $old;
				$check
			} else {
				$new.$field = $old.$field
			}
		)*
	}};
}
macro_rules! limit_default_clone {
	($old:ident, $new:ident, $($field:ident $(($arg:expr))? => $check:expr),* $(,)?) => {{
		$(
			if let Some($new) = $new.$field.clone() {
				let $old = $old.$field($($arg)?);
				let _ = $new;
				let _ = $old;
				$check
			} else {
				$new.$field = $old.$field.clone()
			}
		)*
	}};
}

impl<T: Config> Pallet<T> {
	/// Create new collection.
	///
	/// * `owner` - The owner of the collection.
	/// * `data` - Description of the created collection.
	/// * `is_external` - Marks that collection managet by not "Unique network".
	pub fn init_collection(
		owner: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
		is_external: bool,
	) -> Result<CollectionId, DispatchError> {
		{
			ensure!(
				data.token_prefix.len() <= MAX_TOKEN_PREFIX_LENGTH as usize,
				Error::<T>::CollectionTokenPrefixLimitExceeded
			);
		}

		let created_count = <CreatedCollectionCount<T>>::get()
			.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;
		let destroyed_count = <DestroyedCollectionCount<T>>::get().0;
		let id = CollectionId(created_count);

		// bound Total number of collections
		ensure!(
			created_count - destroyed_count <= COLLECTION_NUMBER_LIMIT,
			<Error<T>>::TotalCollectionsLimitExceeded
		);

		// =========

		let collection = Collection {
			owner: owner.as_sub().clone(),
			name: data.name,
			mode: data.mode.clone(),
			description: data.description,
			token_prefix: data.token_prefix,
			sponsorship: data
				.pending_sponsor
				.map(SponsorshipState::Unconfirmed)
				.unwrap_or_default(),
			limits: data
				.limits
				.map(|limits| Self::clamp_limits(data.mode.clone(), &Default::default(), limits))
				.unwrap_or_else(|| Ok(CollectionLimits::default()))?,
			permissions: data
				.permissions
				.map(|permissions| {
					Self::clamp_permissions(data.mode.clone(), &Default::default(), permissions)
				})
				.unwrap_or_else(|| Ok(CollectionPermissions::default()))?,
			external_collection: is_external,
		};

		let mut collection_properties = up_data_structs::CollectionProperties::get();
		collection_properties
			.try_set_from_iter(data.properties.into_iter())
			.map_err(<Error<T>>::from)?;

		CollectionProperties::<T>::insert(id, collection_properties);

		let mut token_props_permissions = PropertiesPermissionMap::new();
		token_props_permissions
			.try_set_from_iter(data.token_property_permissions.into_iter())
			.map_err(<Error<T>>::from)?;

		CollectionPropertyPermissions::<T>::insert(id, token_props_permissions);

		// Take a (non-refundable) deposit of collection creation
		{
			let mut imbalance =
				<<<T as Config>::Currency as Currency<T::AccountId>>::PositiveImbalance>::zero();
			imbalance.subsume(
				<<T as Config>::Currency as Currency<T::AccountId>>::deposit_creating(
					&T::TreasuryAccountId::get(),
					T::CollectionCreationPrice::get(),
				),
			);
			<T as Config>::Currency::settle(
				&owner.as_sub(),
				imbalance,
				WithdrawReasons::TRANSFER,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::NotSufficientFounds)?;
		}

		<CreatedCollectionCount<T>>::put(created_count);
		<Pallet<T>>::deposit_event(Event::CollectionCreated(
			id,
			data.mode.id(),
			owner.as_sub().clone(),
		));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionCreated {
				owner: *owner.as_eth(),
				collection_id: eth::collection_id_to_address(id),
			}
			.to_log(T::ContractAddress::get()),
		);
		<CollectionById<T>>::insert(id, collection);
		Ok(id)
	}

	/// Destroy collection.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	pub fn destroy_collection(
		collection: CollectionHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		ensure!(
			collection.limits.owner_can_destroy(),
			<Error<T>>::NoPermission,
		);
		collection.check_is_owner(sender)?;

		let destroyed_collections = <DestroyedCollectionCount<T>>::get()
			.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		<DestroyedCollectionCount<T>>::put(destroyed_collections);
		<CollectionById<T>>::remove(collection.id);
		<AdminAmount<T>>::remove(collection.id);
		<IsAdmin<T>>::remove_prefix((collection.id,), None);
		<Allowlist<T>>::remove_prefix((collection.id,), None);
		<CollectionProperties<T>>::remove(collection.id);

		<Pallet<T>>::deposit_event(Event::CollectionDestroyed(collection.id));
		Ok(())
	}

	/// Set collection property.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property` - The property to set.
	pub fn set_collection_property(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property: Property,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		CollectionProperties::<T>::try_mutate(collection.id, |properties| {
			let property = property.clone();
			properties.try_set(property.key, property.value)
		})
		.map_err(<Error<T>>::from)?;

		Self::deposit_event(Event::CollectionPropertySet(collection.id, property.key));

		Ok(())
	}

	/// Set scouped collection property.
	///
	/// * `collection_id` - ID of the collection for which the property is being set.
	/// * `scope` - Property scope.
	/// * `property` - The property to set.
	pub fn set_scoped_collection_property(
		collection_id: CollectionId,
		scope: PropertyScope,
		property: Property,
	) -> DispatchResult {
		CollectionProperties::<T>::try_mutate(collection_id, |properties| {
			properties.try_scoped_set(scope, property.key, property.value)
		})
		.map_err(<Error<T>>::from)?;

		Ok(())
	}

	/// Set scouped collection properties.
	///
	/// * `collection_id` - ID of the collection for which the properties is being set.
	/// * `scope` - Property scope.
	/// * `properties` - The properties to set.
	pub fn set_scoped_collection_properties(
		collection_id: CollectionId,
		scope: PropertyScope,
		properties: impl Iterator<Item = Property>,
	) -> DispatchResult {
		CollectionProperties::<T>::try_mutate(collection_id, |stored_properties| {
			stored_properties.try_scoped_set_from_iter(scope, properties)
		})
		.map_err(<Error<T>>::from)?;

		Ok(())
	}

	/// Set collection properties.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `properties` - The properties to set.
	#[transactional]
	pub fn set_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResult {
		for property in properties {
			Self::set_collection_property(collection, sender, property)?;
		}

		Ok(())
	}

	/// Delete collection property.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property` - The property to delete.
	pub fn delete_collection_property(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_key: PropertyKey,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		CollectionProperties::<T>::try_mutate(collection.id, |properties| {
			properties.remove(&property_key)
		})
		.map_err(<Error<T>>::from)?;

		Self::deposit_event(Event::CollectionPropertyDeleted(
			collection.id,
			property_key,
		));

		Ok(())
	}

	/// Delete collection properties.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `properties` - The properties to delete.
	#[transactional]
	pub fn delete_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResult {
		for key in property_keys {
			Self::delete_collection_property(collection, sender, key)?;
		}

		Ok(())
	}

	/// Set collection propetry permission without any checks.
	///
	/// Used for migrations.
	///
	/// * `collection` - Collection handler.
	/// * `property_permissions` - Property permissions.
	pub fn set_property_permission_unchecked(
		collection: CollectionId,
		property_permission: PropertyKeyPermission,
	) -> DispatchResult {
		<CollectionPropertyPermissions<T>>::try_mutate(collection, |permissions| {
			permissions.try_set(property_permission.key, property_permission.permission)
		})
		.map_err(<Error<T>>::from)?;
		Ok(())
	}

	/// Set collection property permission.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property_permission` - Property permission.
	pub fn set_property_permission(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permission: PropertyKeyPermission,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		let all_permissions = CollectionPropertyPermissions::<T>::get(collection.id);
		let current_permission = all_permissions.get(&property_permission.key);
		if matches![
			current_permission,
			Some(PropertyPermission { mutable: false, .. })
		] {
			return Err(<Error<T>>::NoPermission.into());
		}

		CollectionPropertyPermissions::<T>::try_mutate(collection.id, |permissions| {
			let property_permission = property_permission.clone();
			permissions.try_set(property_permission.key, property_permission.permission)
		})
		.map_err(<Error<T>>::from)?;

		Self::deposit_event(Event::PropertyPermissionSet(
			collection.id,
			property_permission.key,
		));

		Ok(())
	}

	/// Set token property permission.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property_permissions` - Property permissions.
	#[transactional]
	pub fn set_token_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		for prop_pemission in property_permissions {
			Self::set_property_permission(collection, sender, prop_pemission)?;
		}

		Ok(())
	}

	/// Get collection property.
	pub fn get_collection_property(
		collection_id: CollectionId,
		key: &PropertyKey,
	) -> Option<PropertyValue> {
		Self::collection_properties(collection_id).get(key).cloned()
	}

	/// Convert byte vector to property key vector.
	pub fn bytes_keys_to_property_keys(
		keys: Vec<Vec<u8>>,
	) -> Result<Vec<PropertyKey>, DispatchError> {
		keys.into_iter()
			.map(|key| -> Result<PropertyKey, DispatchError> {
				key.try_into()
					.map_err(|_| <Error<T>>::PropertyKeyIsTooLong.into())
			})
			.collect::<Result<Vec<PropertyKey>, DispatchError>>()
	}

	/// Get properties according to given keys.
	pub fn filter_collection_properties(
		collection_id: CollectionId,
		keys: Option<Vec<PropertyKey>>,
	) -> Result<Vec<Property>, DispatchError> {
		let properties = Self::collection_properties(collection_id);

		let properties = keys
			.map(|keys| {
				keys.into_iter()
					.filter_map(|key| {
						properties.get(&key).map(|value| Property {
							key,
							value: value.clone(),
						})
					})
					.collect()
			})
			.unwrap_or_else(|| {
				properties
					.into_iter()
					.map(|(key, value)| Property { key, value })
					.collect()
			});

		Ok(properties)
	}

	/// Get property permissions according to given keys.
	pub fn filter_property_permissions(
		collection_id: CollectionId,
		keys: Option<Vec<PropertyKey>>,
	) -> Result<Vec<PropertyKeyPermission>, DispatchError> {
		let permissions = Self::property_permissions(collection_id);

		let key_permissions = keys
			.map(|keys| {
				keys.into_iter()
					.filter_map(|key| {
						permissions
							.get(&key)
							.map(|permission| PropertyKeyPermission {
								key,
								permission: permission.clone(),
							})
					})
					.collect()
			})
			.unwrap_or_else(|| {
				permissions
					.into_iter()
					.map(|(key, permission)| PropertyKeyPermission { key, permission })
					.collect()
			});

		Ok(key_permissions)
	}

	/// Toggle `user` participation in the `collection`'s allow list.
	pub fn toggle_allowlist(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		user: &T::CrossAccountId,
		allowed: bool,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		// =========

		if allowed {
			<Allowlist<T>>::insert((collection.id, user), true);
		} else {
			<Allowlist<T>>::remove((collection.id, user));
		}

		Ok(())
	}

	/// Toggle `user` participation in the `collection`'s admin list.
	pub fn toggle_admin(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		user: &T::CrossAccountId,
		admin: bool,
	) -> DispatchResult {
		collection.check_is_owner(sender)?;

		let was_admin = <IsAdmin<T>>::get((collection.id, user));
		if was_admin == admin {
			return Ok(());
		}
		let amount = <AdminAmount<T>>::get(collection.id);

		if admin {
			let amount = amount
				.checked_add(1)
				.ok_or(<Error<T>>::CollectionAdminCountExceeded)?;
			ensure!(
				amount <= Self::collection_admins_limit(),
				<Error<T>>::CollectionAdminCountExceeded,
			);

			// =========

			<AdminAmount<T>>::insert(collection.id, amount);
			<IsAdmin<T>>::insert((collection.id, user), true);
		} else {
			<AdminAmount<T>>::insert(collection.id, amount.saturating_sub(1));
			<IsAdmin<T>>::remove((collection.id, user));
		}

		Ok(())
	}

	/// Merge set fields from `new_limit` to `old_limit`.
	pub fn clamp_limits(
		mode: CollectionMode,
		old_limit: &CollectionLimits,
		mut new_limit: CollectionLimits,
	) -> Result<CollectionLimits, DispatchError> {
		let limits = old_limit;
		limit_default!(old_limit, new_limit,
			account_token_ownership_limit => ensure!(
				new_limit <= MAX_TOKEN_OWNERSHIP,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsored_data_size => ensure!(
				new_limit <= CUSTOM_DATA_LIMIT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),

			sponsored_data_rate_limit => {},
			token_limit => ensure!(
				old_limit >= new_limit && new_limit > 0,
				<Error<T>>::CollectionTokenLimitExceeded
			),

			sponsor_transfer_timeout(match mode {
				CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			}) => ensure!(
				new_limit <= MAX_SPONSOR_TIMEOUT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsor_approve_timeout => {},
			owner_can_transfer => ensure!(
				!limits.owner_can_transfer_instaled() ||
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			owner_can_destroy => ensure!(
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			transfers_enabled => {},
		);
		Ok(new_limit)
	}

	/// Merge set fields from `new_permission` to `old_permission`.
	pub fn clamp_permissions(
		_mode: CollectionMode,
		old_permission: &CollectionPermissions,
		mut new_permission: CollectionPermissions,
	) -> Result<CollectionPermissions, DispatchError> {
		limit_default_clone!(old_permission, new_permission,
			access => {},
			mint_mode => {},
			nesting => { /* todo check for permissive, if only it gets out of benchmarks */ },
		);
		Ok(new_permission)
	}
}

/// Indicates unsupported methods by returning [Error::UnsupportedOperation].
#[macro_export]
macro_rules! unsupported {
	() => {
		Err(<Error<T>>::UnsupportedOperation.into())
	};
}

/// Return weights for various worst-case operations.
pub trait CommonWeightInfo<CrossAccountId> {
	/// Weight of item creation.
	fn create_item() -> Weight;

	/// Weight of items creation.
	fn create_multiple_items(amount: &[CreateItemData]) -> Weight;

	/// Weight of items creation.
	fn create_multiple_items_ex(cost: &CreateItemExData<CrossAccountId>) -> Weight;

	/// The weight of the burning item.
	fn burn_item() -> Weight;

	/// Property setting weight.
	///
	/// * `amount`- The number of properties to set.
	fn set_collection_properties(amount: u32) -> Weight;

	/// Collection property deletion weight.
	///
	/// * `amount`- The number of properties to set.
	fn delete_collection_properties(amount: u32) -> Weight;

	/// Token property setting weight.
	///
	/// * `amount`- The number of properties to set.
	fn set_token_properties(amount: u32) -> Weight;

	/// Token property deletion weight.
	///
	/// * `amount`- The number of properties to delete.
	fn delete_token_properties(amount: u32) -> Weight;

	/// Token property permissions set weight.
	///
	/// * `amount`- The number of property permissions to set.
	fn set_token_property_permissions(amount: u32) -> Weight;

	/// Transfer price of the token or its parts.
	fn transfer() -> Weight;

	/// The price of setting the permission of the operation from another user.
	fn approve() -> Weight;

	/// Transfer price from another user.
	fn transfer_from() -> Weight;

	/// The price of burning a token from another user.
	fn burn_from() -> Weight;

	/// Differs from burn_item in case of Fungible and Refungible, as it should burn
	/// whole users's balance
	///
	/// This method shouldn't be used directly, as it doesn't count breadth price, use [burn_recursively](CommonWeightInfo::burn_recursively) instead
	fn burn_recursively_self_raw() -> Weight;

	/// Cost of iterating over `amount` children while burning, without counting child burning itself
	///
	/// This method shouldn't be used directly, as it doesn't count depth price, use [burn_recursively](CommonWeightInfo::burn_recursively) instead
	fn burn_recursively_breadth_raw(amount: u32) -> Weight;

	/// The price of recursive burning a token.
	///
	/// `max_selfs` -
	fn burn_recursively(max_selfs: u32, max_breadth: u32) -> Weight {
		Self::burn_recursively_self_raw()
			.saturating_mul(max_selfs.max(1) as u64)
			.saturating_add(Self::burn_recursively_breadth_raw(max_breadth))
	}
}

/// Weight info extension trait for refungible pallet.
pub trait RefungibleExtensionsWeightInfo {
	/// Weight of token repartition.
	fn repartition() -> Weight;
}

/// Common collection operations.
///
/// It wraps methods in Fungible, Nonfungible and Refungible pallets
/// and adds weight info.
pub trait CommonCollectionOperations<T: Config> {
	/// Create token.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Create multiple tokens.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<CreateItemData>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Create multiple tokens.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_multiple_items_ex(
		&self,
		sender: T::CrossAccountId,
		data: CreateItemExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Burn token.
	///
	/// * `sender` - The user who owns the token.
	/// * `token` - Token id that will burned.
	/// * `amount` - The number of parts of the token that will be burned.
	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	/// Burn token and all nested tokens recursievly.
	///
	/// * `sender` - The user who owns the token.
	/// * `token` - Token id that will burned.
	/// * `self_budget` - The budget that can be spent on burning tokens.
	/// * `breadth_budget` - The budget that can be spent on burning nested tokens.
	fn burn_item_recursively(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Set collection properties.
	///
	/// * `sender` - Must be either the owner of the collection or its admin.
	/// * `properties` - Properties to be set.
	fn set_collection_properties(
		&self,
		sender: T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResultWithPostInfo;

	/// Delete collection properties.
	///
	/// * `sender` - Must be either the owner of the collection or its admin.
	/// * `properties` - The properties to be removed.
	fn delete_collection_properties(
		&self,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo;

	/// Set token properties.
	///
	/// The appropriate [PropertyPermission] for the token property
	/// must be set with [Self::set_token_property_permissions].
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being set.
	/// * `properties` - Properties to be set.
	/// * `budget` - Budget for setting properties.
	fn set_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		properties: Vec<Property>,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Remove token properties.
	///
	/// The appropriate [PropertyPermission] for the token property
	/// must be set with [Self::set_token_property_permissions].
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being remove.
	/// * `property_keys` - Keys to remove corresponding properties.
	/// * `budget` - Budget for removing properties.
	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Set token property permissions.
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being set.
	/// * `properties` - Properties to be set.
	/// * `budget` - Budget for setting properties.
	fn set_token_property_permissions(
		&self,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo;

	/// Transfer amount of token pieces.
	///
	/// * `sender` - Donor user.
	/// * `to` - Recepient user.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the transfer.
	fn transfer(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Grant access to another account to transfer parts of the token owned by the calling user via [Self::transfer_from].
	///
	/// * `sender` - The user who grants access to the token.
	/// * `spender` - The user to whom the rights are granted.
	/// * `token` - The token to which access is granted.
	/// * `amount` - The amount of pieces that another user can dispose of.
	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	/// Send parts of a token owned by another user.
	///
	/// Before calling this method, you must grant rights to the calling user via [Self::approve].
	///
	/// * `sender` - The user who has access to the token.
	/// * `from` - The user who owns the token.
	/// * `to` - Recepient user.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the transfer.
	fn transfer_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Burn parts of a token owned by another user.
	///
	/// Before calling this method, you must grant rights to the calling user via [Self::approve].
	///
	/// * `sender` - The user who has access to the token.
	/// * `from` - The user who owns the token.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the burn.
	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Check permission to nest token.
	///
	/// * `sender` - The user who initiated the check.
	/// * `from` - The token that is checked for embedding.
	/// * `under` - Token under which to check.
	/// * `budget` - The maximum budget that can be spent on the check.
	fn check_nesting(
		&self,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		budget: &dyn Budget,
	) -> DispatchResult;

	/// Nest one token into another.
	///
	/// * `under` - Token holder.
	/// * `to_nest` - Nested token.
	fn nest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	/// Unnest token.
	///
	/// * `under` - Token holder.
	/// * `to_nest` - Token to unnest.
	fn unnest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	/// Get all user tokens.
	///
	/// * `account` - Account for which you need to get tokens.
	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId>;

	/// Get all the tokens in the collection.
	fn collection_tokens(&self) -> Vec<TokenId>;

	/// Check if the token exists.
	///
	/// * `token` - Id token to check.
	fn token_exists(&self, token: TokenId) -> bool;

	/// Get the id of the last minted token.
	fn last_token_id(&self) -> TokenId;

	/// Get the owner of the token.
	///
	/// * `token` - The token for which you need to find out the owner.
	fn token_owner(&self, token: TokenId) -> Option<T::CrossAccountId>;

	/// Get the value of the token property by key.
	///
	/// * `token` - Token property to get.
	/// * `key` - Property name.
	fn token_property(&self, token_id: TokenId, key: &PropertyKey) -> Option<PropertyValue>;

	/// Get a set of token properties by key vector.
	///
	/// * `token` - Token property to get.
	/// * `keys` - Vector of keys. If this parameter is [None](sp_std::result::Result),
	/// then all properties are returned.
	fn token_properties(&self, token: TokenId, keys: Option<Vec<PropertyKey>>) -> Vec<Property>;

	/// Amount of unique collection tokens
	fn total_supply(&self) -> u32;

	/// Amount of different tokens account has.
	///
	/// * `account` - The account for which need to get the balance.
	fn account_balance(&self, account: T::CrossAccountId) -> u32;

	/// Amount of specific token account have.
	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128;

	/// Amount of token pieces
	fn total_pieces(&self, token: TokenId) -> Option<u128>;

	/// Get the number of parts of the token that a trusted user can manage.
	///
	/// * `sender` - Trusted user.
	/// * `spender` - Owner of the token.
	/// * `token` - The token for which to get the value.
	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128;

	/// Get extension for RFT collection.
	fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>>;
}

/// Extension for RFT collection.
pub trait RefungibleExtensions<T>
where
	T: Config,
{
	/// Change the number of parts of the token.
	///
	/// When the value changes down, this function is equivalent to burning parts of the token.
	///
	/// * `sender` - The user calling the repartition operation. Must be the owner of the token.
	/// * `token` - The token for which you want to change the number of parts.
	/// * `amount` - The new value of the parts of the token.
	fn repartition(
		&self,
		sender: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;
}

/// Merge [DispatchResult] with [Weight] into [DispatchResultWithPostInfo].
///
/// Used for [CommonCollectionOperations] implementations and flexible enough to do so.
pub fn with_weight(res: DispatchResult, weight: Weight) -> DispatchResultWithPostInfo {
	let post_info = PostDispatchInfo {
		actual_weight: Some(weight),
		pays_fee: Pays::Yes,
	};
	match res {
		Ok(()) => Ok(post_info),
		Err(error) => Err(DispatchErrorWithPostInfo { post_info, error }),
	}
}

impl<T: Config> From<PropertiesError> for Error<T> {
	fn from(error: PropertiesError) -> Self {
		match error {
			PropertiesError::NoSpaceForProperty => Self::NoSpaceForProperty,
			PropertiesError::PropertyLimitReached => Self::PropertyLimitReached,
			PropertiesError::InvalidCharacterInPropertyKey => Self::InvalidCharacterInPropertyKey,
			PropertiesError::PropertyKeyIsTooLong => Self::PropertyKeyIsTooLong,
			PropertiesError::EmptyPropertyKey => Self::EmptyPropertyKey,
		}
	}
}
