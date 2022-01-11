#![cfg_attr(not(feature = "std"), no_std)]

use core::ops::{Deref, DerefMut};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_std::vec::Vec;
use account::CrossAccountId;
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo},
	ensure, fail,
	traits::{Imbalance, Get, Currency},
};
use pallet_evm::GasWeightMapping;
use up_data_structs::{
	COLLECTION_NUMBER_LIMIT, Collection, CollectionId, CreateItemData, ExistenceRequirement,
	MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_COLLECTION_NAME_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	COLLECTION_ADMINS_LIMIT, MetaUpdatePermission, Pays, PostDispatchInfo, TokenId, Weight,
	WithdrawReasons, CollectionStats, MAX_TOKEN_OWNERSHIP, CollectionMode,
	NFT_SPONSOR_TRANSFER_TIMEOUT, FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, MAX_SPONSOR_TIMEOUT, CUSTOM_DATA_LIMIT, CollectionLimits,
	CreateCollectionData, SponsorshipState,
};
pub use pallet::*;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult};
pub mod account;
#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
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
	pub fn log(&self, log: impl evm_coder::ToLog) {
		self.recorder.log(log)
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
	use frame_support::{Blake2_128Concat, pallet_prelude::*, storage::Key};
	use account::CrossAccountId;
	use frame_support::traits::Currency;
	use up_data_structs::TokenId;
	use scale_info::TypeInfo;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config + TypeInfo {
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		type CrossAccountId: CrossAccountId<Self::AccountId>;

		type EvmAddressMapping: pallet_evm::AddressMapping<Self::AccountId>;
		type EvmBackwardsAddressMapping: up_evm_mapping::EvmBackwardsAddressMapping<Self::AccountId>;

		type Currency: Currency<Self::AccountId>;
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
		>;
		type TreasuryAccountId: Get<Self::AccountId>;
	}

	#[pallet::pallet]
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
		TokenValueNotEnough,
		/// Tried to approve more than owned
		CantApproveMoreThanOwned,

		/// Can't transfer tokens to ethereum zero address
		AddressIsZero,
		/// Target collection doesn't supports this operation
		UnsupportedOperation,
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
	pub type DummyStorageValue<T> =
		StorageValue<Value = (CollectionStats, CollectionId, TokenId), QueryKind = OptionQuery>;
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
}

impl<T: Config> Pallet<T> {
	pub fn init_collection(
		owner: T::AccountId,
		data: CreateCollectionData<T::AccountId>,
	) -> Result<CollectionId, DispatchError> {
		{
			ensure!(
				data.name.len() <= MAX_COLLECTION_NAME_LENGTH,
				Error::<T>::CollectionNameLimitExceeded
			);
			ensure!(
				data.description.len() <= MAX_COLLECTION_DESCRIPTION_LENGTH,
				Error::<T>::CollectionDescriptionLimitExceeded
			);
			ensure!(
				data.token_prefix.len() <= MAX_TOKEN_PREFIX_LENGTH,
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
			offchain_schema: data.offchain_schema,
			schema_version: data.schema_version.unwrap_or_default(),
			sponsorship: data
				.pending_sponsor
				.map(SponsorshipState::Unconfirmed)
				.unwrap_or_default(),
			variable_on_chain_schema: data.variable_on_chain_schema,
			const_on_chain_schema: data.const_on_chain_schema,
			limits: data
				.limits
				.map(|limits| Self::clamp_limits(data.mode.clone(), &Default::default(), limits))
				.unwrap_or_else(|| Ok(CollectionLimits::default()))?,
			meta_update_permission: data.meta_update_permission.unwrap_or_default(),
		};

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
			.map_err(|_| Error::<T>::NoPermission)?;
		}

		<CreatedCollectionCount<T>>::put(created_count);
		<Pallet<T>>::deposit_event(Event::CollectionCreated(id, data.mode.id(), owner.clone()));
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

		<Pallet<T>>::deposit_event(Event::CollectionDestroyed(collection.id));
		Ok(())
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
pub trait CommonWeightInfo {
	fn create_item() -> Weight;
	fn create_multiple_items(amount: u32) -> Weight;
	fn burn_item() -> Weight;
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
	) -> DispatchResultWithPostInfo;
	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<CreateItemData>,
	) -> DispatchResultWithPostInfo;
	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	fn transfer(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
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
	) -> DispatchResultWithPostInfo;
	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	fn set_variable_metadata(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		data: Vec<u8>,
	) -> DispatchResultWithPostInfo;

	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId>;
	fn token_exists(&self, token: TokenId) -> bool;
	fn last_token_id(&self) -> TokenId;

	fn token_owner(&self, token: TokenId) -> T::CrossAccountId;
	fn const_metadata(&self, token: TokenId) -> Vec<u8>;
	fn variable_metadata(&self, token: TokenId) -> Vec<u8>;

	/// How many tokens collection contains (Applicable to nonfungible/refungible)
	fn collection_tokens(&self) -> u32;
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
