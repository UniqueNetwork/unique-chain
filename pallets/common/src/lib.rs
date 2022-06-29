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

pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[must_use = "Should call submit_logs or save, otherwise some data will be lost for evm side"]
pub struct CollectionHandle<T: Config> {
	pub id: CollectionId,
	collection: Collection<T::AccountId>,
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
	pub fn new_with_gas_limit(id: CollectionId, gas_limit: u64) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder: SubstrateRecorder::new(gas_limit),
		})
	}

	pub fn new_with_recorder(id: CollectionId, recorder: SubstrateRecorder<T>) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder,
		})
	}

	pub fn new(id: CollectionId) -> Option<Self> {
		Self::new_with_gas_limit(id, u64::MAX)
	}

	pub fn try_get(id: CollectionId) -> Result<Self, DispatchError> {
		Ok(Self::new(id).ok_or(<Error<T>>::CollectionNotFound)?)
	}

	pub fn consume_store_reads(&self, reads: u64) -> evm_coder::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(
				<T as frame_system::Config>::DbWeight::get()
					.read
					.saturating_mul(reads),
			))
	}

	pub fn consume_store_writes(&self, writes: u64) -> evm_coder::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(
				<T as frame_system::Config>::DbWeight::get()
					.write
					.saturating_mul(writes),
			))
	}
	pub fn save(self) -> DispatchResult {
		<CollectionById<T>>::insert(self.id, self.collection);
		Ok(())
	}

	pub fn set_sponsor(&mut self, sponsor: T::AccountId) -> DispatchResult {
		self.collection.sponsorship = SponsorshipState::Unconfirmed(sponsor);
		Ok(())
	}

	pub fn confirm_sponsorship(&mut self, sender: &T::AccountId) -> Result<bool, DispatchError> {
		if self.collection.sponsorship.pending_sponsor() != Some(sender) {
			return Ok(false);
		}

		self.collection.sponsorship = SponsorshipState::Confirmed(sender.clone());
		Ok(true)
	}

	/// Checks that the collection was created with, and must be operated upon through **Unique API**.
	/// Now check only the `external_collection` flag and if it's **true**, then return `CollectionIsExternal` error.
	pub fn check_is_internal(&self) -> DispatchResult {
		if self.external_collection {
			return Err(<Error<T>>::CollectionIsExternal)?;
		}

		Ok(())
	}

	/// Checks that the collection was created with, and must be operated upon through an **assimilated API**.
	/// Now check only the `external_collection` flag and if it's **false**, then return `CollectionIsInternal` error.
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
	pub fn check_is_owner(&self, subject: &T::CrossAccountId) -> DispatchResult {
		ensure!(*subject.as_sub() == self.owner, <Error<T>>::NoPermission);
		Ok(())
	}
	pub fn is_owner_or_admin(&self, subject: &T::CrossAccountId) -> bool {
		*subject.as_sub() == self.owner || <IsAdmin<T>>::get((self.id, subject))
	}
	pub fn check_is_owner_or_admin(&self, subject: &T::CrossAccountId) -> DispatchResult {
		ensure!(self.is_owner_or_admin(subject), <Error<T>>::NoPermission);
		Ok(())
	}
	pub fn ignores_allowance(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}
	pub fn ignores_owned_amount(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}
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
		type WeightInfo: WeightInfo;
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		type Currency: Currency<Self::AccountId>;

		#[pallet::constant]
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
		>;
		type CollectionDispatch: CollectionDispatch<Self>;

		type TreasuryAccountId: Get<Self::AccountId>;
		type ContractAddress: Get<H160>;

		type EvmTokenAddressMapping: TokenAddressMapping<H160>;
		type CrossTokenAddressMapping: TokenAddressMapping<Self::CrossAccountId>;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::extra_constants]
	impl<T: Config> Pallet<T> {
		pub fn collection_admins_limit() -> u32 {
			COLLECTION_ADMINS_LIMIT
		}
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub fn deposit_event)]
	pub enum Event<T: Config> {
		/// New collection was created
		///
		/// # Arguments
		///
		/// * collection_id: Globally unique identifier of newly created collection.
		///
		/// * mode: [CollectionMode] converted into u8.
		///
		/// * account_id: Collection owner.
		CollectionCreated(CollectionId, u8, T::AccountId),

		/// New collection was destroyed
		///
		/// # Arguments
		///
		/// * collection_id: Globally unique identifier of collection.
		CollectionDestroyed(CollectionId),

		/// New item was created.
		///
		/// # Arguments
		///
		/// * collection_id: Id of the collection where item was created.
		///
		/// * item_id: Id of an item. Unique within the collection.
		///
		/// * recipient: Owner of newly created item
		///
		/// * amount: Always 1 for NFT
		ItemCreated(CollectionId, TokenId, T::CrossAccountId, u128),

		/// Collection item was burned.
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * item_id: Identifier of burned NFT.
		///
		/// * owner: which user has destroyed its tokens
		///
		/// * amount: Always 1 for NFT
		ItemDestroyed(CollectionId, TokenId, T::CrossAccountId, u128),

		/// Item was transferred
		///
		/// * collection_id: Id of collection to which item is belong
		///
		/// * item_id: Id of an item
		///
		/// * sender: Original owner of item
		///
		/// * recipient: New owner of item
		///
		/// * amount: Always 1 for NFT
		Transfer(
			CollectionId,
			TokenId,
			T::CrossAccountId,
			T::CrossAccountId,
			u128,
		),

		/// * collection_id
		///
		/// * item_id
		///
		/// * sender
		///
		/// * spender
		///
		/// * amount
		Approved(
			CollectionId,
			TokenId,
			T::CrossAccountId,
			T::CrossAccountId,
			u128,
		),

		CollectionPropertySet(CollectionId, PropertyKey),

		CollectionPropertyDeleted(CollectionId, PropertyKey),

		TokenPropertySet(CollectionId, TokenId, PropertyKey),

		TokenPropertyDeleted(CollectionId, TokenId, PropertyKey),

		PropertyPermissionSet(CollectionId, PropertyKey),
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

	#[pallet::storage]
	pub type CreatedCollectionCount<T> = StorageValue<Value = CollectionId, QueryKind = ValueQuery>;
	#[pallet::storage]
	pub type DestroyedCollectionCount<T> =
		StorageValue<Value = CollectionId, QueryKind = ValueQuery>;

	/// Collection info
	#[pallet::storage]
	pub type CollectionById<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Collection<<T as frame_system::Config>::AccountId>,
		QueryKind = OptionQuery,
	>;

	/// Collection properties
	#[pallet::storage]
	#[pallet::getter(fn collection_properties)]
	pub type CollectionProperties<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::CollectionProperties,
	>;

	#[pallet::storage]
	#[pallet::getter(fn property_permissions)]
	pub type CollectionPropertyPermissions<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = PropertiesPermissionMap,
		QueryKind = ValueQuery,
	>;

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

	/// Not used by code, exists only to provide some types to metadata
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
	/// Ethereum receiver 0x0000000000000000000000000000000000000000 is reserved, and shouldn't own tokens
	pub fn ensure_correct_receiver(receiver: &T::CrossAccountId) -> DispatchResult {
		ensure!(
			&T::CrossAccountId::from_eth(H160([0; 20])) != receiver,
			<Error<T>>::AddressIsZero
		);
		Ok(())
	}
	pub fn adminlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<IsAdmin<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}
	pub fn allowlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<Allowlist<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}
	pub fn allowed(collection: CollectionId, user: T::CrossAccountId) -> bool {
		<Allowlist<T>>::get((collection, user))
	}
	pub fn collection_stats() -> CollectionStats {
		let created = <CreatedCollectionCount<T>>::get();
		let destroyed = <DestroyedCollectionCount<T>>::get();
		CollectionStats {
			created: created.0,
			destroyed: destroyed.0,
			alive: created.0 - destroyed.0,
		}
	}

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
				owner.as_sub(),
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

	// For migrations
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

	pub fn get_collection_property(
		collection_id: CollectionId,
		key: &PropertyKey,
	) -> Option<PropertyValue> {
		Self::collection_properties(collection_id).get(key).cloned()
	}

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

	pub fn clamp_permissions(
		_mode: CollectionMode,
		old_limit: &CollectionPermissions,
		mut new_limit: CollectionPermissions,
	) -> Result<CollectionPermissions, DispatchError> {
		limit_default_clone!(old_limit, new_limit,
			access => {},
			mint_mode => {},
			nesting => { /* todo check for permissive, if only it gets out of benchmarks */ },
		);
		Ok(new_limit)
	}
}

#[macro_export]
macro_rules! unsupported {
	() => {
		Err(<Error<T>>::UnsupportedOperation.into())
	};
}

/// Worst cases
pub trait CommonWeightInfo<CrossAccountId> {
	fn create_item() -> Weight;
	fn create_multiple_items(amount: &[CreateItemData]) -> Weight;
	fn create_multiple_items_ex(cost: &CreateItemExData<CrossAccountId>) -> Weight;
	fn burn_item() -> Weight;
	fn set_collection_properties(amount: u32) -> Weight;
	fn delete_collection_properties(amount: u32) -> Weight;
	fn set_token_properties(amount: u32) -> Weight;
	fn delete_token_properties(amount: u32) -> Weight;
	fn set_token_property_permissions(amount: u32) -> Weight;
	fn transfer() -> Weight;
	fn approve() -> Weight;
	fn transfer_from() -> Weight;
	fn burn_from() -> Weight;

	/// Differs from burn_item in case of Fungible and Refungible, as it should burn
	/// whole users's balance
	///
	/// This method shouldn't be used directly, as it doesn't count breadth price, use `burn_recursively` instead
	fn burn_recursively_self_raw() -> Weight;
	/// Cost of iterating over `amount` children while burning, without counting child burning itself
	///
	/// This method shouldn't be used directly, as it doesn't count depth price, use `burn_recursively` instead
	fn burn_recursively_breadth_raw(amount: u32) -> Weight;

	fn burn_recursively(max_selfs: u32, max_breadth: u32) -> Weight {
		Self::burn_recursively_self_raw()
			.saturating_mul(max_selfs.max(1) as u64)
			.saturating_add(Self::burn_recursively_breadth_raw(max_breadth))
	}
}

pub trait RefungibleExtensionsWeightInfo {
	fn repartition() -> Weight;
}

pub trait CommonCollectionOperations<T: Config> {
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<CreateItemData>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn create_multiple_items_ex(
		&self,
		sender: T::CrossAccountId,
		data: CreateItemExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;
	fn burn_item_recursively(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn set_collection_properties(
		&self,
		sender: T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResultWithPostInfo;
	fn delete_collection_properties(
		&self,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo;
	fn set_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property: Vec<Property>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn set_token_property_permissions(
		&self,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo;
	fn transfer(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;
	fn transfer_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;
	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	fn check_nesting(
		&self,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult;

	fn nest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	fn unnest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId>;
	fn collection_tokens(&self) -> Vec<TokenId>;
	fn token_exists(&self, token: TokenId) -> bool;
	fn last_token_id(&self) -> TokenId;

	fn token_owner(&self, token: TokenId) -> Option<T::CrossAccountId>;
	fn token_property(&self, token_id: TokenId, key: &PropertyKey) -> Option<PropertyValue>;
	fn token_properties(&self, token_id: TokenId, keys: Option<Vec<PropertyKey>>) -> Vec<Property>;
	/// Amount of unique collection tokens
	fn total_supply(&self) -> u32;
	/// Amount of different tokens account has (Applicable to nonfungible/refungible)
	fn account_balance(&self, account: T::CrossAccountId) -> u32;
	/// Amount of specific token account have (Applicable to fungible/refungible)
	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128;
	/// Amount of token pieces
	fn total_pieces(&self, token: TokenId) -> Option<u128>;
	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128;
	fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>>;
}

pub trait RefungibleExtensions<T>
where
	T: Config,
{
	fn repartition(
		&self,
		owner: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;
}

// Flexible enough for implementing CommonCollectionOperations
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
