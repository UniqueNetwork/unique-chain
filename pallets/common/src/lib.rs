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

use core::ops::{Deref, DerefMut};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_std::{vec::Vec, collections::btree_map::BTreeMap};
use pallet_evm::account::CrossAccountId;
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo, Weight, PostDispatchInfo},
	ensure, fail,
	traits::{Imbalance, Get, Currency, WithdrawReasons, ExistenceRequirement},
	BoundedVec,
	weights::Pays,
};
use pallet_evm::GasWeightMapping;
use up_data_structs::{
	COLLECTION_NUMBER_LIMIT, Collection, RpcCollection, CollectionId, CreateItemData,
	MAX_TOKEN_PREFIX_LENGTH, COLLECTION_ADMINS_LIMIT, MetaUpdatePermission, TokenId,
	CollectionStats, MAX_TOKEN_OWNERSHIP, CollectionMode, NFT_SPONSOR_TRANSFER_TIMEOUT,
	FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, MAX_SPONSOR_TIMEOUT,
	CUSTOM_DATA_LIMIT, CollectionLimits, CustomDataLimit, CreateCollectionData, SponsorshipState,
	CreateItemExData, SponsoringRateLimit, budget::Budget, COLLECTION_FIELD_LIMIT, CollectionField,
	PhantomType, Property, Properties, PropertiesPermissionMap, PropertyKey, PropertyPermission,
	PropertiesError, PropertyKeyPermission,
};
pub use pallet::*;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod dispatch;
pub mod erc;
pub mod eth;

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
			recorder: SubstrateRecorder::new(eth::collection_id_to_address(id), gas_limit),
		})
	}
	pub fn new(id: CollectionId) -> Option<Self> {
		Self::new_with_gas_limit(id, u64::MAX)
	}
	pub fn try_get(id: CollectionId) -> Result<Self, DispatchError> {
		Ok(Self::new(id).ok_or(<Error<T>>::CollectionNotFound)?)
	}
	pub fn log_mirrored(&self, log: impl evm_coder::ToLog) {
		self.recorder.log_mirrored(log)
	}
	pub fn log_direct(&self, log: impl evm_coder::ToLog) {
		self.recorder.log_direct(log)
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
	pub fn submit_logs(self) {
		self.recorder.submit_logs()
	}
	pub fn save(self) -> DispatchResult {
		self.recorder.submit_logs();
		<CollectionById<T>>::insert(self.id, self.collection);
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

	pub fn check_can_update_meta(
		&self,
		subject: &T::CrossAccountId,
		item_owner: &T::CrossAccountId,
	) -> DispatchResult {
		match self.meta_update_permission {
			MetaUpdatePermission::ItemOwner => {
				ensure!(subject == item_owner, <Error<T>>::NoPermission);
				Ok(())
			}
			MetaUpdatePermission::Admin => self.check_is_owner_or_admin(subject),
			MetaUpdatePermission::None => fail!(<Error<T>>::NoPermission),
		}
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

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + TypeInfo + account::Config
	{
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		type Currency: Currency<Self::AccountId>;

		#[pallet::constant]
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
		>;
		type CollectionDispatch: CollectionDispatch<Self>;

		type TreasuryAccountId: Get<Self::AccountId>;

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

		CollectionPropertySet(CollectionId, Property),

		CollectionPropertyDeleted(CollectionId, PropertyKey),

		TokenPropertySet(CollectionId, TokenId, Property),

		TokenPropertyDeleted(CollectionId, TokenId, PropertyKey),

		PropertyPermissionSet(CollectionId, PropertyKeyPermission),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This collection does not exist.
		CollectionNotFound,
		/// Sender parameter and item owner must be equal.
		MustBeTokenOwner,
		/// No permission to perform action
		NoPermission,
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
		/// variable_data exceeded data limit.
		TokenVariableDataLimitExceeded,
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

		/// Not sufficient founds to perform action
		NotSufficientFounds,

		/// Collection has nesting disabled
		NestingIsDisabled,
		/// Only owner may nest tokens under this collection
		OnlyOwnerAllowedToNest,
		/// Only tokens from specific collections may nest tokens under this
		SourceCollectionIsNotAllowedToNest,

		/// Tried to store more data than allowed in collection field
		CollectionFieldSizeExceeded,
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
	pub type CollectionProperties<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Properties,
		QueryKind = ValueQuery,
		OnEmpty = up_data_structs::CollectionProperties,
	>;

	#[pallet::storage]
	#[pallet::getter(fn property_permission)]
	pub type CollectionPropertyPermissions<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = PropertiesPermissionMap,
		QueryKind = ValueQuery,
	>;

	/// Large variable-size collection fields are extracted here
	#[pallet::storage]
	pub type CollectionData<T> = StorageNMap<
		Key = (
			Key<Twox64Concat, CollectionId>,
			Key<Twox64Concat, CollectionField>,
		),
		Value = BoundedVec<u8, ConstU32<COLLECTION_FIELD_LIMIT>>,
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
			PhantomType<RpcCollection<T::AccountId>>,
		),
		QueryKind = OptionQuery,
	>;

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			if StorageVersion::get::<Pallet<T>>() < StorageVersion::new(1) {
				use up_data_structs::{CollectionVersion1, CollectionVersion2};
				<CollectionById<T>>::translate::<CollectionVersion1<T::AccountId>, _>(|id, v| {
					Self::set_field_raw(
						id,
						CollectionField::OffchainSchema,
						v.offchain_schema.clone().into_inner(),
					)
					.expect("data has lower bounds than field");
					Self::set_field_raw(
						id,
						CollectionField::VariableOnChainSchema,
						v.variable_on_chain_schema.clone().into_inner(),
					)
					.expect("data has lower bounds than field");
					Self::set_field_raw(
						id,
						CollectionField::ConstOnChainSchema,
						v.const_on_chain_schema.clone().into_inner(),
					)
					.expect("data has lower bounds than field");

					Some(CollectionVersion2::from(v))
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
			nesting_rule: Some(limits.nesting_rule().clone()),
		};

		Some(effective_limits)
	}

	pub fn rpc_collection(collection: CollectionId) -> Option<RpcCollection<T::AccountId>> {
		let Collection {
			name,
			description,
			owner,
			mode,
			access,
			token_prefix,
			mint_mode,
			schema_version,
			sponsorship,
			limits,
			meta_update_permission,
			..
		} = <CollectionById<T>>::get(collection)?;
		Some(RpcCollection {
			name: name.into_inner(),
			description: description.into_inner(),
			owner,
			mode,
			access,
			token_prefix: token_prefix.into_inner(),
			mint_mode,
			schema_version,
			sponsorship,
			limits,
			meta_update_permission,
			offchain_schema: <CollectionData<T>>::get((
				collection,
				CollectionField::OffchainSchema,
			))
			.into_inner(),
			const_on_chain_schema: <CollectionData<T>>::get((
				collection,
				CollectionField::ConstOnChainSchema,
			))
			.into_inner(),
			variable_on_chain_schema: <CollectionData<T>>::get((
				collection,
				CollectionField::VariableOnChainSchema,
			))
			.into_inner(),
		})
	}
}

impl<T: Config> Pallet<T> {
	pub fn init_collection(
		owner: T::AccountId,
		data: CreateCollectionData<T::AccountId>,
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
			owner: owner.clone(),
			name: data.name,
			mode: data.mode.clone(),
			mint_mode: false,
			access: data.access.unwrap_or_default(),
			description: data.description,
			token_prefix: data.token_prefix,
			schema_version: data.schema_version.unwrap_or_default(),
			sponsorship: data
				.pending_sponsor
				.map(SponsorshipState::Unconfirmed)
				.unwrap_or_default(),
			limits: data
				.limits
				.map(|limits| Self::clamp_limits(data.mode.clone(), &Default::default(), limits))
				.unwrap_or_else(|| Ok(CollectionLimits::default()))?,
			meta_update_permission: data.meta_update_permission.unwrap_or_default(),
			// token_property_permissions: data.token_property_permissions.unwrap_or_default(),
			// properties: Properties::from_collection_props_vec(data.properties)?
		};

		CollectionProperties::<T>::insert(
			id,
			Properties::from_collection_props_vec(data.properties)?,
		);

		let token_props_permissions: PropertiesPermissionMap = data
			.token_property_permissions
			.into_iter()
			.map(|property| (property.key, property.permission))
			.collect::<BTreeMap<_, _>>()
			.try_into()
			.map_err(|_| PropertiesError::PropertyLimitReached)?;

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
				&owner,
				imbalance,
				WithdrawReasons::TRANSFER,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::NotSufficientFounds)?;
		}

		<CreatedCollectionCount<T>>::put(created_count);
		<Pallet<T>>::deposit_event(Event::CollectionCreated(id, data.mode.id(), owner.clone()));
		<CollectionById<T>>::insert(id, collection);
		Self::set_field_raw(
			id,
			CollectionField::OffchainSchema,
			data.offchain_schema.into_inner(),
		)
		.expect("data has lower bounds than field");
		Self::set_field_raw(
			id,
			CollectionField::VariableOnChainSchema,
			data.variable_on_chain_schema.into_inner(),
		)
		.expect("data has lower bounds than field");
		Self::set_field_raw(
			id,
			CollectionField::ConstOnChainSchema,
			data.const_on_chain_schema.into_inner(),
		)
		.expect("data has lower bounds than field");
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
		<CollectionData<T>>::remove_prefix((collection.id,), None);
		<AdminAmount<T>>::remove(collection.id);
		<IsAdmin<T>>::remove_prefix((collection.id,), None);
		<Allowlist<T>>::remove_prefix((collection.id,), None);

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
			properties.try_set_property(property.clone())
		})?;

		Self::deposit_event(Event::CollectionPropertySet(collection.id, property));

		Ok(())
	}

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

		CollectionProperties::<T>::mutate(collection.id, |properties| {
			properties.remove_property(&property_key);
		});

		Self::deposit_event(Event::CollectionPropertyDeleted(collection.id, property_key));

		Ok(())
	}

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
			Some(PropertyPermission::AdminConst | PropertyPermission::ItemOwnerConst)
		] {
			return Err(<Error<T>>::NoPermission.into());
		}

		CollectionPropertyPermissions::<T>::try_mutate(collection.id, |permissions| {
			let property_permission = property_permission.clone();
			permissions.try_insert(property_permission.key, property_permission.permission)
		})
		.map_err(|_| PropertiesError::PropertyLimitReached)?;

		Self::deposit_event(Event::PropertyPermissionSet(
			collection.id,
			property_permission,
		));

		Ok(())
	}

	pub fn set_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		for prop_pemission in property_permissions {
			Self::set_property_permission(collection, sender, prop_pemission)?;
		}

		Ok(())
	}

	fn set_field_raw(
		collection_id: CollectionId,
		field: CollectionField,
		value: Vec<u8>,
	) -> DispatchResult {
		if !value.is_empty() {
			<CollectionData<T>>::insert(
				(collection_id, field),
				BoundedVec::try_from(value).map_err(|_| <Error<T>>::CollectionFieldSizeExceeded)?,
			)
		} else {
			<CollectionData<T>>::remove((collection_id, field));
		}
		Ok(())
	}

	pub fn set_field(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		field: CollectionField,
		value: Vec<u8>,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		// =========

		Self::set_field_raw(collection.id, field, value)
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
		collection.check_is_owner_or_admin(sender)?;

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

		limit_default!(old_limit, new_limit,
			account_token_ownership_limit => ensure!(
				new_limit <= MAX_TOKEN_OWNERSHIP,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsor_transfer_timeout(match mode {
				CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			}) => ensure!(
				new_limit <= MAX_SPONSOR_TIMEOUT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsored_data_size => ensure!(
				new_limit <= CUSTOM_DATA_LIMIT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			token_limit => ensure!(
				old_limit >= new_limit && new_limit > 0,
				<Error<T>>::CollectionTokenLimitExceeded
			),
			owner_can_transfer => ensure!(
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			owner_can_destroy => ensure!(
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			sponsored_data_rate_limit => {},
			transfers_enabled => {},
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
	fn create_multiple_items(amount: u32) -> Weight;
	fn create_multiple_items_ex(cost: &CreateItemExData<CrossAccountId>) -> Weight;
	fn burn_item() -> Weight;
	fn set_collection_properties(amount: u32) -> Weight;
	fn delete_collection_properties(amount: u32) -> Weight;
	fn set_token_properties(amount: u32) -> Weight;
	fn delete_token_properties(amount: u32) -> Weight;
	fn set_property_permissions(amount: u32) -> Weight;
	fn transfer() -> Weight;
	fn approve() -> Weight;
	fn transfer_from() -> Weight;
	fn burn_from() -> Weight;
	fn set_variable_metadata(bytes: u32) -> Weight;
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
	) -> DispatchResultWithPostInfo;
	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo;
	fn set_property_permissions(
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

	fn set_variable_metadata(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		data: BoundedVec<u8, CustomDataLimit>,
	) -> DispatchResultWithPostInfo;

	fn check_nesting(
		&self,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		budget: &dyn Budget,
	) -> DispatchResult;

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId>;
	fn collection_tokens(&self) -> Vec<TokenId>;
	fn token_exists(&self, token: TokenId) -> bool;
	fn last_token_id(&self) -> TokenId;

	fn token_owner(&self, token: TokenId) -> Option<T::CrossAccountId>;
	fn const_metadata(&self, token: TokenId) -> Vec<u8>;
	fn variable_metadata(&self, token: TokenId) -> Vec<u8>;

	/// Amount of unique collection tokens
	fn total_supply(&self) -> u32;
	/// Amount of different tokens account has (Applicable to nonfungible/refungible)
	fn account_balance(&self, account: T::CrossAccountId) -> u32;
	/// Amount of specific token account have (Applicable to fungible/refungible)
	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128;
	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128;
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
