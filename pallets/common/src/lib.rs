#![cfg_attr(not(feature = "std"), no_std)]

use core::ops::{Deref, DerefMut};
use sp_std::vec::Vec;
use account::CrossAccountId;
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo},
	ensure, fail,
	traits::{Imbalance, Get, Currency},
};
use nft_data_structs::{
	COLLECTION_NUMBER_LIMIT, Collection, CollectionId, CreateItemData, ExistenceRequirement,
	MAX_COLLECTION_DESCRIPTION_LENGTH, MAX_COLLECTION_NAME_LENGTH, MAX_TOKEN_PREFIX_LENGTH,
	MetaUpdatePermission, Pays, PostDispatchInfo, TokenId, Weight, WithdrawReasons,
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
	collection: Collection<T>,
	pub recorder: pallet_evm_coder_substrate::SubstrateRecorder<T>,
}
impl<T: Config> CollectionHandle<T> {
	pub fn new_with_gas_limit(id: CollectionId, gas_limit: u64) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder: pallet_evm_coder_substrate::SubstrateRecorder::new(
				eth::collection_id_to_address(id),
				gas_limit,
			),
		})
	}
	pub fn new(id: CollectionId) -> Option<Self> {
		Self::new_with_gas_limit(id, u64::MAX)
	}
	pub fn try_get(id: CollectionId) -> Result<Self, DispatchError> {
		Ok(Self::new(id).ok_or_else(|| <Error<T>>::CollectionNotFound)?)
	}
	pub fn log(&self, log: impl evm_coder::ToLog) -> DispatchResult {
		self.recorder.log_sub(log)
	}
	pub fn log_infallible(&self, log: impl evm_coder::ToLog) {
		self.recorder.log_infallible(log)
	}
	#[allow(dead_code)]
	fn consume_gas(&self, gas: u64) -> DispatchResult {
		self.recorder.consume_gas_sub(gas)
	}
	pub fn consume_sload(&self) -> DispatchResult {
		self.recorder.consume_sload_sub()
	}
	pub fn consume_sstores(&self, amount: usize) -> DispatchResult {
		self.recorder.consume_sstores_sub(amount)
	}
	pub fn consume_sstore(&self) -> DispatchResult {
		self.recorder.consume_sstore_sub()
	}
	pub fn consume_log(&self, topics: usize, data: usize) -> DispatchResult {
		self.recorder.consume_log_sub(topics, data)
	}
	pub fn submit_logs(self) -> DispatchResult {
		self.recorder.submit_logs()
	}
	pub fn save(self) -> DispatchResult {
		self.recorder.submit_logs()?;
		<CollectionById<T>>::insert(self.id, self.collection);
		Ok(())
	}
}
impl<T: Config> Deref for CollectionHandle<T> {
	type Target = Collection<T>;

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
	pub fn is_owner_or_admin(&self, subject: &T::CrossAccountId) -> Result<bool, DispatchError> {
		self.consume_sload()?;

		Ok(*subject.as_sub() == self.owner || <IsAdmin<T>>::get((self.id, subject.as_sub())))
	}
	pub fn check_is_owner_or_admin(&self, subject: &T::CrossAccountId) -> DispatchResult {
		ensure!(self.is_owner_or_admin(subject)?, <Error<T>>::NoPermission);
		Ok(())
	}
	pub fn ignores_allowance(&self, user: &T::CrossAccountId) -> Result<bool, DispatchError> {
		Ok(self.limits.owner_can_transfer && self.is_owner_or_admin(user)?)
	}
	pub fn ignores_owned_amount(&self, user: &T::CrossAccountId) -> Result<bool, DispatchError> {
		Ok(self.limits.owner_can_transfer && self.is_owner_or_admin(user)?)
	}
	pub fn check_allowlist(&self, user: &T::CrossAccountId) -> DispatchResult {
		self.consume_sload()?;

		ensure!(
			<Allowlist<T>>::get((self.id, user.as_sub())),
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
	use frame_support::{pallet_prelude::*};
	use frame_support::{Blake2_128Concat, storage::Key};
	use account::{EvmBackwardsAddressMapping, CrossAccountId};
	use frame_support::traits::Currency;
	use nft_data_structs::TokenId;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config {
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;

		type CrossAccountId: CrossAccountId<Self::AccountId>;

		type EvmAddressMapping: pallet_evm::AddressMapping<Self::AccountId>;
		type EvmBackwardsAddressMapping: EvmBackwardsAddressMapping<Self::AccountId>;

		type Currency: Currency<Self::AccountId>;
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
		>;
		type TreasuryAccountId: Get<Self::AccountId>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

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
		/// Address is not in white list.
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
		Value = Collection<T>,
		QueryKind = OptionQuery,
	>;

	/// List of collection admins
	#[pallet::storage]
	pub type IsAdmin<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::AccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Allowlisted collection users
	#[pallet::storage]
	pub type Allowlist<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::AccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;
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
}

impl<T: Config> Pallet<T> {
	pub fn init_collection(data: Collection<T>) -> Result<CollectionId, DispatchError> {
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
			created_count - destroyed_count < COLLECTION_NUMBER_LIMIT,
			<Error<T>>::TotalCollectionsLimitExceeded
		);

		// =========

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
				&data.owner,
				imbalance,
				WithdrawReasons::TRANSFER,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::NoPermission)?;
		}

		<CreatedCollectionCount<T>>::put(created_count);
		<Pallet<T>>::deposit_event(Event::CollectionCreated(
			id,
			data.mode.id(),
			data.owner.clone(),
		));
		<CollectionById<T>>::insert(id, data);
		Ok(id)
	}

	pub fn destroy_collection(
		collection: CollectionHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		if !collection.limits.owner_can_destroy {
			fail!(Error::<T>::NoPermission);
		}
		collection.check_is_owner(&sender)?;

		let destroyed_collections = <DestroyedCollectionCount<T>>::get()
			.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		<DestroyedCollectionCount<T>>::put(destroyed_collections);
		<CollectionById<T>>::remove(collection.id);
		<IsAdmin<T>>::remove_prefix((collection.id,), None);
		<Allowlist<T>>::remove_prefix((collection.id,), None);
		Ok(())
	}

	pub fn toggle_allowlist(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		user: &T::CrossAccountId,
		allowed: bool,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(&sender)?;

		// =========

		if allowed {
			<Allowlist<T>>::insert((collection.id, user.as_sub()), true);
		} else {
			<Allowlist<T>>::remove((collection.id, user.as_sub()));
		}

		Ok(())
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
