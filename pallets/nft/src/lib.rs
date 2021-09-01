//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]
#![allow(
	clippy::too_many_arguments,
	clippy::unnecessary_mut_passed,
	clippy::unused_unit
)]

extern crate alloc;

pub use serde::{Serialize, Deserialize};

pub use frame_support::{
	construct_runtime, decl_event, decl_module, decl_storage, decl_error,
	dispatch::DispatchResult,
	ensure, fail, parameter_types,
	traits::{
		Currency, ExistenceRequirement, Get, Imbalance, KeyOwnerProofSystem, OnUnbalanced,
		Randomness, IsSubType, WithdrawReasons,
	},
	weights::{
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
		DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
		WeightToFeePolynomial, DispatchClass,
	},
	StorageValue, transactional,
};

use frame_system::{self as system, ensure_signed};
use sp_core::H160;
use sp_std::vec;
use sp_runtime::{DispatchError, sp_std::prelude::Vec};
use core::ops::{Deref, DerefMut};
use nft_data_structs::{
	MAX_DECIMAL_POINTS, MAX_SPONSOR_TIMEOUT, MAX_TOKEN_OWNERSHIP, MAX_REFUNGIBLE_PIECES,
	CUSTOM_DATA_LIMIT, COLLECTION_NUMBER_LIMIT, ACCOUNT_TOKEN_OWNERSHIP_LIMIT,
	VARIABLE_ON_CHAIN_SCHEMA_LIMIT, CONST_ON_CHAIN_SCHEMA_LIMIT, COLLECTION_ADMINS_LIMIT,
	OFFCHAIN_SCHEMA_LIMIT, MAX_TOKEN_PREFIX_LENGTH, MAX_COLLECTION_NAME_LENGTH,
	MAX_COLLECTION_DESCRIPTION_LENGTH, AccessMode, Collection, CreateItemData, CollectionLimits,
	CollectionId, CollectionMode, TokenId, SchemaVersion, SponsorshipState, Ownership, NftItemType,
	MetaUpdatePermission, FungibleItemType, ReFungibleItemType,
};

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

mod eth;
mod sponsorship;
pub use sponsorship::NftSponsorshipHandler;
pub use eth::sponsoring::NftEthSponsorshipHandler;

pub use eth::NftErcSupport;
pub use eth::account::*;
use eth::erc::{ERC20Events, ERC721Events};

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;
use weights::WeightInfo;

decl_error! {
	/// Error for non-fungible-token module.
	pub enum Error for Module<T: Config> {
		/// Total collections bound exceeded.
		TotalCollectionsLimitExceeded,
		/// Decimal_points parameter must be lower than MAX_DECIMAL_POINTS constant, currently it is 30.
		CollectionDecimalPointLimitExceeded,
		/// Collection name can not be longer than 63 char.
		CollectionNameLimitExceeded,
		/// Collection description can not be longer than 255 char.
		CollectionDescriptionLimitExceeded,
		/// Token prefix can not be longer than 15 char.
		CollectionTokenPrefixLimitExceeded,
		/// This collection does not exist.
		CollectionNotFound,
		/// Item not exists.
		TokenNotFound,
		/// Admin not found
		AdminNotFound,
		/// Arithmetic calculation overflow.
		NumOverflow,
		/// Account already has admin role.
		AlreadyAdmin,
		/// You do not own this collection.
		NoPermission,
		/// This address is not set as sponsor, use setCollectionSponsor first.
		ConfirmUnsetSponsorFail,
		/// Collection is not in mint mode.
		PublicMintingNotAllowed,
		/// Sender parameter and item owner must be equal.
		MustBeTokenOwner,
		/// Item balance not enough.
		TokenValueTooLow,
		/// Size of item is too large.
		NftSizeLimitExceeded,
		/// No approve found
		ApproveNotFound,
		/// Requested value more than approved.
		TokenValueNotEnough,
		/// Only approved addresses can call this method.
		ApproveRequired,
		/// Address is not in white list.
		AddresNotInWhiteList,
		/// Number of collection admins bound exceeded.
		CollectionAdminsLimitExceeded,
		/// Owned tokens by a single address bound exceeded.
		AddressOwnershipLimitExceeded,
		/// Length of items properties must be greater than 0.
		EmptyArgument,
		/// const_data exceeded data limit.
		TokenConstDataLimitExceeded,
		/// variable_data exceeded data limit.
		TokenVariableDataLimitExceeded,
		/// Not NFT item data used to mint in NFT collection.
		NotNftDataUsedToMintNftCollectionToken,
		/// Not Fungible item data used to mint in Fungible collection.
		NotFungibleDataUsedToMintFungibleCollectionToken,
		/// Not Re Fungible item data used to mint in Re Fungible collection.
		NotReFungibleDataUsedToMintReFungibleCollectionToken,
		/// Unexpected collection type.
		UnexpectedCollectionType,
		/// Can't store metadata in fungible tokens.
		CantStoreMetadataInFungibleTokens,
		/// Collection token limit exceeded
		CollectionTokenLimitExceeded,
		/// Account token limit exceeded per collection
		AccountTokenLimitExceeded,
		/// Collection limit bounds per collection exceeded
		CollectionLimitBoundsExceeded,
		/// Tried to enable permissions which are only permitted to be disabled
		OwnerPermissionsCantBeReverted,
		/// Schema data size limit bound exceeded
		SchemaDataLimitExceeded,
		/// Maximum refungibility exceeded
		WrongRefungiblePieces,
		/// createRefungible should be called with one owner
		BadCreateRefungibleCall,
		/// Gas limit exceeded
		OutOfGas,
		/// Metadata update denied by collection settings
		MetadataUpdateDenied,
		/// Metadata update flag become unmutable with None option
		MetadataFlagFrozen,
		/// Collection settings not allowing items transferring
		TransferNotAllowed,
		/// Can't transfer tokens to ethereum zero address
		AddressIsZero,
	}
}

#[must_use = "Should call submit_logs or save, otherwise some data will be lost for evm side"]
pub struct CollectionHandle<T: Config> {
	pub id: CollectionId,
	collection: Collection<T>,
	recorder: pallet_evm_coder_substrate::SubstrateRecorder<T>,
}
impl<T: Config> CollectionHandle<T> {
	pub fn get_with_gas_limit(id: CollectionId, gas_limit: u64) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder: pallet_evm_coder_substrate::SubstrateRecorder::new(
				eth::collection_id_to_address(id),
				gas_limit,
			),
		})
	}
	pub fn get(id: CollectionId) -> Option<Self> {
		Self::get_with_gas_limit(id, u64::MAX)
	}
	pub fn log(&self, log: impl evm_coder::ToLog) -> DispatchResult {
		self.recorder.log_sub(log)
	}
	#[allow(dead_code)]
	fn consume_gas(&self, gas: u64) -> DispatchResult {
		self.recorder.consume_gas_sub(gas)
	}
	fn consume_sload(&self) -> DispatchResult {
		self.recorder.consume_sload_sub()
	}
	fn consume_sstore(&self) -> DispatchResult {
		self.recorder.consume_sstore_sub()
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

pub trait Config: system::Config + pallet_evm_coder_substrate::Config + Sized {
	type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;

	/// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;

	type EvmAddressMapping: pallet_evm::AddressMapping<Self::AccountId>;
	type EvmBackwardsAddressMapping: EvmBackwardsAddressMapping<Self::AccountId>;

	type CrossAccountId: CrossAccountId<Self::AccountId>;
	type Currency: Currency<Self::AccountId>;
	type CollectionCreationPrice: Get<
		<<Self as Config>::Currency as Currency<Self::AccountId>>::Balance,
	>;
	type TreasuryAccountId: Get<Self::AccountId>;
}

type SelfWeightOf<T> = <T as Config>::WeightInfo;

trait WeightInfoHelpers: WeightInfo {
	fn transfer() -> Weight {
		Self::transfer_nft()
			.max(Self::transfer_fungible())
			.max(Self::transfer_refungible())
	}
	fn transfer_from() -> Weight {
		Self::transfer_from_nft()
			.max(Self::transfer_from_fungible())
			.max(Self::transfer_from_refungible())
	}
	fn approve() -> Weight {
		// TODO: refungible, fungible
		Self::approve_nft()
	}
	fn set_variable_meta_data(data: u32) -> Weight {
		// TODO: refungible
		Self::set_variable_meta_data_nft(data)
	}
	fn create_item(data: u32) -> Weight {
		Self::create_item_nft(data)
			.max(Self::create_item_fungible())
			.max(Self::create_item_refungible(data))
	}
	fn create_multiple_items(amount: u32) -> Weight {
		Self::create_multiple_items_nft(amount)
			.max(Self::create_multiple_items_fungible(amount))
			.max(Self::create_multiple_items_refungible(amount))
	}
	fn burn_item() -> Weight {
		// TODO: refungible, fungible
		Self::burn_item_nft()
	}
}
impl<T: WeightInfo> WeightInfoHelpers for T {}

// # Used definitions
//
// ## User control levels
//
// chain-controlled - key is uncontrolled by user
//                    i.e autoincrementing index
//                    can use non-cryptographic hash
// real - key is controlled by user
//        but it is hard to generate enough colliding values, i.e owner of signed txs
//        can use non-cryptographic hash
// controlled - key is completly controlled by users
//              i.e maps with mutable keys
//              should use cryptographic hash
//
// ## User control level downgrade reasons
//
// ?1 - chain-controlled -> controlled
//      collections/tokens can be destroyed, resulting in massive holes
// ?2 - chain-controlled -> controlled
//      same as ?1, but can be only added, resulting in easier exploitation
// ?3 - real -> controlled
//      no confirmation required, so addresses can be easily generated
decl_storage! {
	trait Store for Module<T: Config> as Nft {

		//#region Private members
		/// Id of next collection
		CreatedCollectionCount: u32;
		/// Used for migrations
		ChainVersion: u64;
		/// Id of last collection token
		/// Collection id (controlled?1)
		ItemListIndex: map hasher(blake2_128_concat) CollectionId => TokenId;
		//#endregion

		//#region Bound counters
		/// Amount of collections destroyed, used for total amount tracking with
		/// CreatedCollectionCount
		DestroyedCollectionCount: u32;
		/// Total amount of account owned tokens (NFTs + RFTs + unique fungibles)
		/// Account id (real)
		pub AccountItemCount get(fn account_item_count): map hasher(twox_64_concat) T::AccountId => u32;
		//#endregion

		//#region Basic collections
		/// Collection info
		/// Collection id (controlled?1)
		pub CollectionById get(fn collection_id) config(): map hasher(blake2_128_concat) CollectionId => Option<Collection<T>> = None;
		/// List of collection admins
		/// Collection id (controlled?2)
		pub AdminList get(fn admin_list_collection): map hasher(blake2_128_concat) CollectionId => Vec<T::CrossAccountId>;
		/// Whitelisted collection users
		/// Collection id (controlled?2), user id (controlled?3)
		pub WhiteList get(fn white_list): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) T::AccountId => bool;
		//#endregion

		/// How many of collection items user have
		/// Collection id (controlled?2), account id (real)
		pub Balance get(fn balance_count): double_map hasher(blake2_128_concat) CollectionId, hasher(twox_64_concat) T::AccountId => u128;

		/// Amount of items which spender can transfer out of owners account (via transferFrom)
		/// Collection id (controlled?2), (token id (controlled ?2) + owner account id (real) + spender account id (controlled?3))
		/// TODO: Off chain worker should remove from this map when token gets removed
		pub Allowances get(fn approved): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) (TokenId, T::AccountId, T::AccountId) => u128;

		//#region Item collections
		/// Collection id (controlled?2), token id (controlled?1)
		pub NftItemList get(fn nft_item_id) config(): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<NftItemType<T::CrossAccountId>>;
		/// Collection id (controlled?2), owner (controlled?2)
		pub FungibleItemList get(fn fungible_item_id) config(): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) T::AccountId => FungibleItemType;
		/// Collection id (controlled?2), token id (controlled?1)
		pub ReFungibleItemList get(fn refungible_item_id) config(): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<ReFungibleItemType<T::CrossAccountId>>;
		//#endregion

		//#region Index list
		/// Collection id (controlled?2), tokens owner (controlled?2)
		pub AddressTokens get(fn address_tokens): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) T::AccountId => Vec<TokenId>;
		//#endregion

		//#region Tokens transfer rate limit baskets
		/// (Collection id (controlled?2), who created (real))
		/// TODO: Off chain worker should remove from this map when collection gets removed
		pub CreateItemBasket get(fn create_item_basket): map hasher(blake2_128_concat) (CollectionId, T::AccountId) => T::BlockNumber;
		/// Collection id (controlled?2), token id (controlled?2)
		pub NftTransferBasket get(fn nft_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => T::BlockNumber;
		/// Collection id (controlled?2), owning user (real)
		pub FungibleTransferBasket get(fn fungible_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(twox_64_concat) T::AccountId => T::BlockNumber;
		/// Collection id (controlled?2), token id (controlled?2)
		pub ReFungibleTransferBasket get(fn refungible_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => T::BlockNumber;
		//#endregion

		/// Variable metadata sponsoring
		/// Collection id (controlled?2), token id (controlled?2)
		pub VariableMetaDataBasket get(fn variable_meta_data_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber> = None;
	}
	add_extra_genesis {
		build(|config: &GenesisConfig<T>| {
			// Modification of storage
			for (_num, _c) in &config.collection_id {
				<Module<T>>::init_collection(_c);
			}

			for (_num, _c, _i) in &config.nft_item_id {
				<Module<T>>::init_nft_token(*_c, _i);
			}

			for (collection_id, account_id, fungible_item) in &config.fungible_item_id {
				<Module<T>>::init_fungible_token(*collection_id, &T::CrossAccountId::from_sub(account_id.clone()), fungible_item);
			}

			for (_num, _c, _i) in &config.refungible_item_id {
				<Module<T>>::init_refungible_token(*_c, _i);
			}
		})
	}
}

decl_event!(
	pub enum Event<T>
	where
		AccountId = <T as frame_system::Config>::AccountId,
		CrossAccountId = <T as Config>::CrossAccountId,
	{
		/// New collection was created
		///
		/// # Arguments
		///
		/// * collection_id: Globally unique identifier of newly created collection.
		///
		/// * mode: [CollectionMode] converted into u8.
		///
		/// * account_id: Collection owner.
		CollectionCreated(CollectionId, u8, AccountId),

		/// New item was created.
		///
		/// # Arguments
		///
		/// * collection_id: Id of the collection where item was created.
		///
		/// * item_id: Id of an item. Unique within the collection.
		///
		/// * recipient: Owner of newly created item
		ItemCreated(CollectionId, TokenId, CrossAccountId),

		/// Collection item was burned.
		///
		/// # Arguments
		///
		/// collection_id.
		///
		/// item_id: Identifier of burned NFT.
		ItemDestroyed(CollectionId, TokenId),

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
		Transfer(CollectionId, TokenId, CrossAccountId, CrossAccountId, u128),

		/// * collection_id
		///
		/// * item_id
		///
		/// * sender
		///
		/// * spender
		///
		/// * amount
		Approved(CollectionId, TokenId, CrossAccountId, CrossAccountId, u128),
	}
);

decl_module! {
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin
	{
		fn deposit_event() = default;
		const CollectionAdminsLimit: u64 = COLLECTION_ADMINS_LIMIT;
		type Error = Error<T>;

		fn on_initialize(_now: T::BlockNumber) -> Weight {
			0
		}

		/// This method creates a Collection of NFTs. Each Token may have multiple properties encoded as an array of bytes of certain length. The initial owner and admin of the collection are set to the address that signed the transaction. Both addresses can be changed later.
		///
		/// # Permissions
		///
		/// * Anyone.
		///
		/// # Arguments
		///
		/// * collection_name: UTF-16 string with collection name (limit 64 characters), will be stored as zero-terminated.
		///
		/// * collection_description: UTF-16 string with collection description (limit 256 characters), will be stored as zero-terminated.
		///
		/// * token_prefix: UTF-8 string with token prefix.
		///
		/// * mode: [CollectionMode] collection type and type dependent data.
		// returns collection ID
		#[weight = <SelfWeightOf<T>>::create_collection()]
		#[transactional]
		pub fn create_collection(origin,
								 collection_name: Vec<u16>,
								 collection_description: Vec<u16>,
								 token_prefix: Vec<u8>,
								 mode: CollectionMode) -> DispatchResult {

			// Anyone can create a collection
			let who = ensure_signed(origin)?;

			// Take a (non-refundable) deposit of collection creation
			let mut imbalance = <<<T as Config>::Currency as Currency<T::AccountId>>::PositiveImbalance>::zero();
			imbalance.subsume(<<T as Config>::Currency as Currency<T::AccountId>>::deposit_creating(
				&T::TreasuryAccountId::get(),
				T::CollectionCreationPrice::get(),
			));
			<T as Config>::Currency::settle(
				&who,
				imbalance,
				WithdrawReasons::TRANSFER,
				ExistenceRequirement::KeepAlive,
			).map_err(|_| Error::<T>::NoPermission)?;

			let decimal_points = match mode {
				CollectionMode::Fungible(points) => points,
				_ => 0
			};

			let created_count = CreatedCollectionCount::get();
			let destroyed_count = DestroyedCollectionCount::get();

			// bound Total number of collections
			ensure!(created_count - destroyed_count < COLLECTION_NUMBER_LIMIT, Error::<T>::TotalCollectionsLimitExceeded);

			// check params
			ensure!(decimal_points <= MAX_DECIMAL_POINTS, Error::<T>::CollectionDecimalPointLimitExceeded);
			ensure!(collection_name.len() <= MAX_COLLECTION_NAME_LENGTH, Error::<T>::CollectionNameLimitExceeded);
			ensure!(collection_description.len() <= MAX_COLLECTION_DESCRIPTION_LENGTH, Error::<T>::CollectionDescriptionLimitExceeded);
			ensure!(token_prefix.len() <= MAX_TOKEN_PREFIX_LENGTH, Error::<T>::CollectionTokenPrefixLimitExceeded);

			// Generate next collection ID
			let next_id = created_count
				.checked_add(1)
				.ok_or(Error::<T>::NumOverflow)?;

			CreatedCollectionCount::put(next_id);

			let limits = CollectionLimits {
				sponsored_data_size: CUSTOM_DATA_LIMIT,
				..Default::default()
			};

			// Create new collection
			let new_collection = Collection {
				owner: who.clone(),
				name: collection_name,
				mode: mode.clone(),
				mint_mode: false,
				access: AccessMode::Normal,
				description: collection_description,
				decimal_points,
				token_prefix,
				offchain_schema: Vec::new(),
				schema_version: SchemaVersion::ImageURL,
				sponsorship: SponsorshipState::Disabled,
				variable_on_chain_schema: Vec::new(),
				const_on_chain_schema: Vec::new(),
				limits,
				meta_update_permission: MetaUpdatePermission::default(),
				transfers_enabled: true,
			};

			// Add new collection to map
			<CollectionById<T>>::insert(next_id, new_collection);

			// call event
			Self::deposit_event(RawEvent::CollectionCreated(next_id, mode.id(), who));

			Ok(())
		}

		/// **DANGEROUS**: Destroys collection and all NFTs within this collection. Users irrecoverably lose their assets and may lose real money.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: collection to destroy.
		#[weight = <SelfWeightOf<T>>::destroy_collection()]
		#[transactional]
		pub fn destroy_collection(origin, collection_id: CollectionId) -> DispatchResult {

			let sender = ensure_signed(origin)?;
			let collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&collection, &sender)?;
			if !collection.limits.owner_can_destroy {
				fail!(Error::<T>::NoPermission);
			}

			<AddressTokens<T>>::remove_prefix(collection_id, None);
			<Allowances<T>>::remove_prefix(collection_id, None);
			<Balance<T>>::remove_prefix(collection_id, None);
			<ItemListIndex>::remove(collection_id);
			<AdminList<T>>::remove(collection_id);
			<CollectionById<T>>::remove(collection_id);
			<WhiteList<T>>::remove_prefix(collection_id, None);

			<NftItemList<T>>::remove_prefix(collection_id, None);
			<FungibleItemList<T>>::remove_prefix(collection_id, None);
			<ReFungibleItemList<T>>::remove_prefix(collection_id, None);

			<NftTransferBasket<T>>::remove_prefix(collection_id, None);
			<FungibleTransferBasket<T>>::remove_prefix(collection_id, None);
			<ReFungibleTransferBasket<T>>::remove_prefix(collection_id, None);

			<VariableMetaDataBasket<T>>::remove_prefix(collection_id, None);

			DestroyedCollectionCount::put(DestroyedCollectionCount::get()
				.checked_add(1)
				.ok_or(Error::<T>::NumOverflow)?);

			Ok(())
		}

		/// Add an address to white list.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * address.
		#[weight = <SelfWeightOf<T>>::add_to_white_list()]
		#[transactional]
		pub fn add_to_white_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::toggle_white_list_internal(
				&sender,
				&collection,
				&address,
				true,
			)?;

			Ok(())
		}

		/// Remove an address from white list.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * address.
		#[weight = <SelfWeightOf<T>>::remove_from_white_list()]
		#[transactional]
		pub fn remove_from_white_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::toggle_white_list_internal(
				&sender,
				&collection,
				&address,
				false,
			)?;

			Ok(())
		}

		/// Toggle between normal and white list access for the methods with access for `Anyone`.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * mode: [AccessMode]
		#[weight = <SelfWeightOf<T>>::set_public_access_mode()]
		#[transactional]
		pub fn set_public_access_mode(origin, collection_id: CollectionId, mode: AccessMode) -> DispatchResult
		{
			let sender = ensure_signed(origin)?;

			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, &sender)?;
			target_collection.access = mode;
			target_collection.save()
		}

		/// Allows Anyone to create tokens if:
		/// * White List is enabled, and
		/// * Address is added to white list, and
		/// * This method was called with True parameter
		///
		/// # Permissions
		/// * Collection Owner
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * mint_permission: Boolean parameter. If True, allows minting to Anyone with conditions above.
		#[weight = <SelfWeightOf<T>>::set_mint_permission()]
		#[transactional]
		pub fn set_mint_permission(origin, collection_id: CollectionId, mint_permission: bool) -> DispatchResult
		{
			let sender = ensure_signed(origin)?;

			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, &sender)?;
			target_collection.mint_mode = mint_permission;
			target_collection.save()
		}

		/// Change the owner of the collection.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * new_owner.
		#[weight = <SelfWeightOf<T>>::change_collection_owner()]
		#[transactional]
		pub fn change_collection_owner(origin, collection_id: CollectionId, new_owner: T::AccountId) -> DispatchResult {

			let sender = ensure_signed(origin)?;
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, &sender)?;
			target_collection.owner = new_owner;
			target_collection.save()
		}

		/// Adds an admin of the Collection.
		/// NFT Collection can be controlled by multiple admin addresses (some which can also be servers, for example). Admins can issue and burn NFTs, as well as add and remove other admins, but cannot change NFT or Collection ownership.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the Collection to add admin for.
		///
		/// * new_admin_id: Address of new admin to add.
		#[weight = <SelfWeightOf<T>>::add_collection_admin()]
		#[transactional]
		pub fn add_collection_admin(origin, collection_id: CollectionId, new_admin_id: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&collection, &sender)?;
			let mut admin_arr = <AdminList<T>>::get(collection_id);

			match admin_arr.binary_search(&new_admin_id) {
				Ok(_) => {},
				Err(idx) => {
					ensure!(admin_arr.len() < COLLECTION_ADMINS_LIMIT as usize, Error::<T>::CollectionAdminsLimitExceeded);
					admin_arr.insert(idx, new_admin_id);
					<AdminList<T>>::insert(collection_id, admin_arr);
				}
			}
			Ok(())
		}

		/// Remove admin address of the Collection. An admin address can remove itself. List of admins may become empty, in which case only Collection Owner will be able to add an Admin.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the Collection to remove admin for.
		///
		/// * account_id: Address of admin to remove.
		#[weight = <SelfWeightOf<T>>::remove_collection_admin()]
		#[transactional]
		pub fn remove_collection_admin(origin, collection_id: CollectionId, account_id: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&collection, &sender)?;
			let mut admin_arr = <AdminList<T>>::get(collection_id);

			if let Ok(idx) = admin_arr.binary_search(&account_id) {
				admin_arr.remove(idx);
				<AdminList<T>>::insert(collection_id, admin_arr);
			}
			Ok(())
		}

		/// # Permissions
		///
		/// * Collection Owner
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * new_sponsor.
		#[weight = <SelfWeightOf<T>>::set_collection_sponsor()]
		#[transactional]
		pub fn set_collection_sponsor(origin, collection_id: CollectionId, new_sponsor: T::AccountId) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, &sender)?;

			target_collection.sponsorship = SponsorshipState::Unconfirmed(new_sponsor);
			target_collection.save()
		}

		/// # Permissions
		///
		/// * Sponsor.
		///
		/// # Arguments
		///
		/// * collection_id.
		#[weight = <SelfWeightOf<T>>::confirm_sponsorship()]
		#[transactional]
		pub fn confirm_sponsorship(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let mut target_collection = Self::get_collection(collection_id)?;
			ensure!(
				target_collection.sponsorship.pending_sponsor() == Some(&sender),
				Error::<T>::ConfirmUnsetSponsorFail
			);

			target_collection.sponsorship = SponsorshipState::Confirmed(sender);
			target_collection.save()
		}

		/// Switch back to pay-per-own-transaction model.
		///
		/// # Permissions
		///
		/// * Collection owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		#[weight = <SelfWeightOf<T>>::remove_collection_sponsor()]
		#[transactional]
		pub fn remove_collection_sponsor(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, &sender)?;

			target_collection.sponsorship = SponsorshipState::Disabled;
			target_collection.save()
		}

		/// This method creates a concrete instance of NFT Collection created with CreateCollection method.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Anyone if
		///     * White List is enabled, and
		///     * Address is added to white list, and
		///     * MintPermission is enabled (see SetMintPermission method)
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * owner: Address, initial owner of the NFT.
		///
		/// * data: Token data to store on chain.
		// #[weight =
		// (130_000_000 as Weight)
		// .saturating_add((2135 as Weight).saturating_mul((properties.len() as u64) as Weight))
		// .saturating_add(RocksDbWeight::get().reads(10 as Weight))
		// .saturating_add(RocksDbWeight::get().writes(8 as Weight))]

		#[weight = <SelfWeightOf<T>>::create_item(data.data_size() as u32)]
		#[transactional]
		pub fn create_item(origin, collection_id: CollectionId, owner: T::CrossAccountId, data: CreateItemData) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::create_item_internal(&sender, &collection, &owner, data)?;

			collection.submit_logs()
		}

		/// This method creates multiple items in a collection created with CreateCollection method.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Anyone if
		///     * White List is enabled, and
		///     * Address is added to white list, and
		///     * MintPermission is enabled (see SetMintPermission method)
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * itemsData: Array items properties. Each property is an array of bytes itself, see [create_item].
		///
		/// * owner: Address, initial owner of the NFT.
		#[weight = <SelfWeightOf<T>>::create_multiple_items(items_data.len() as u32)]
		#[transactional]
		pub fn create_multiple_items(origin, collection_id: CollectionId, owner: T::CrossAccountId, items_data: Vec<CreateItemData>) -> DispatchResult {

			ensure!(!items_data.is_empty(), Error::<T>::EmptyArgument);
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::create_multiple_items_internal(&sender, &collection, &owner, items_data)?;

			collection.submit_logs()
		}

		// TODO! transaction weight

		/// Set transfers_enabled value for particular collection
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * value: New flag value.
		#[weight = <SelfWeightOf<T>>::set_transfers_enabled_flag()]
		#[transactional]
		pub fn set_transfers_enabled_flag(origin, collection_id: CollectionId, value: bool) -> DispatchResult {

			let sender = ensure_signed(origin)?;
			let mut target_collection = Self::get_collection(collection_id)?;

			Self::check_owner_permissions(&target_collection, &sender)?;

			target_collection.transfers_enabled = value;
			target_collection.save()
		}

		// TODO! transaction weight
		/// Set meta_update_permission value for particular collection
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * value: New flag value.
		#[weight = <T as Config>::WeightInfo::burn_item()]
		#[transactional]
		pub fn set_meta_update_permission_flag(origin, collection_id: CollectionId, value: MetaUpdatePermission) -> DispatchResult {

			let sender = ensure_signed(origin)?;
			let mut target_collection = Self::get_collection(collection_id)?;

			ensure!(
				target_collection.meta_update_permission != MetaUpdatePermission::None,
				Error::<T>::MetadataFlagFrozen
			);
			Self::check_owner_permissions(&target_collection, &sender)?;

			target_collection.meta_update_permission = value;

			target_collection.save()
		}

		/// Destroys a concrete instance of NFT.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Current NFT Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * item_id: ID of NFT to burn.
		#[weight = <SelfWeightOf<T>>::burn_item()]
		#[transactional]
		pub fn burn_item(origin, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResult {

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let target_collection = Self::get_collection(collection_id)?;

			Self::burn_item_internal(&sender, &target_collection, item_id, value)?;

			target_collection.submit_logs()
		}

		/// Change ownership of the token.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		///
		/// # Arguments
		///
		/// * recipient: Address of token recipient.
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item
		///     * Non-Fungible Mode: Required.
		///     * Fungible Mode: Ignored.
		///     * Re-Fungible Mode: Required.
		///
		/// * value: Amount to transfer.
		///     * Non-Fungible Mode: Ignored
		///     * Fungible Mode: Must specify transferred amount
		///     * Re-Fungible Mode: Must specify transferred portion (between 0 and 1)
		#[weight = <SelfWeightOf<T>>::transfer()]
		#[transactional]
		pub fn transfer(origin, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::transfer_internal(&sender, &recipient, &collection, item_id, value)?;

			collection.submit_logs()
		}

		/// Set, change, or remove approved address to transfer the ownership of the NFT.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		///
		/// # Arguments
		///
		/// * approved: Address that is approved to transfer this NFT or zero (if needed to remove approval).
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item.
		#[weight = <SelfWeightOf<T>>::approve()]
		#[transactional]
		pub fn approve(origin, spender: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, amount: u128) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::approve_internal(&sender, &spender, &collection, item_id, amount)?;

			collection.submit_logs()
		}

		/// Change ownership of a NFT on behalf of the owner. See Approve method for additional information. After this method executes, the approval is removed so that the approved address will not be able to transfer this NFT again from this owner.
		///
		/// # Permissions
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		/// * Address approved by current NFT owner
		///
		/// # Arguments
		///
		/// * from: Address that owns token.
		///
		/// * recipient: Address of token recipient.
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item.
		///
		/// * value: Amount to transfer.
		#[weight = <SelfWeightOf<T>>::transfer_from()]
		#[transactional]
		pub fn transfer_from(origin, from: T::CrossAccountId, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128 ) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = Self::get_collection(collection_id)?;

			Self::transfer_from_internal(&sender, &from, &recipient, &collection, item_id, value)?;

			collection.submit_logs()
		}
		// #[weight = 0]
		//     // let no_perm_mes = "You do not have permissions to modify this collection";
		//     // ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
		//     // let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
		//     // ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

		//     // // on_nft_received  call

		//     // Self::transfer(origin, collection_id, item_id, new_owner)?;

		//     Ok(())
		// }

		/// Set off-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the offchain data schema.
		#[weight = <SelfWeightOf<T>>::set_variable_meta_data(data.len() as u32)]
		#[transactional]
		pub fn set_variable_meta_data (
			origin,
			collection_id: CollectionId,
			item_id: TokenId,
			data: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let collection = Self::get_collection(collection_id)?;

			Self::set_variable_meta_data_internal(&sender, &collection, item_id, data)?;

			Ok(())
		}

		/// Set schema standard
		/// ImageURL
		/// Unique
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: SchemaVersion: enum
		#[weight = <SelfWeightOf<T>>::set_schema_version()]
		#[transactional]
		pub fn set_schema_version(
			origin,
			collection_id: CollectionId,
			version: SchemaVersion
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&target_collection, &sender)?;
			target_collection.schema_version = version;
			target_collection.save()
		}

		/// Set off-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the offchain data schema.
		#[weight = <SelfWeightOf<T>>::set_offchain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_offchain_schema(
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&target_collection, &sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= OFFCHAIN_SCHEMA_LIMIT, "");

			target_collection.offchain_schema = schema;
			target_collection.save()
		}

		/// Set const on-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the const on-chain data schema.
		#[weight = <SelfWeightOf<T>>::set_const_on_chain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_const_on_chain_schema (
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&target_collection, &sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= CONST_ON_CHAIN_SCHEMA_LIMIT, "");

			target_collection.const_on_chain_schema = schema;
			target_collection.save()
		}

		/// Set variable on-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the variable on-chain data schema.
		#[weight = <SelfWeightOf<T>>::set_const_on_chain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_variable_on_chain_schema (
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_or_admin_permissions(&target_collection, &sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= VARIABLE_ON_CHAIN_SCHEMA_LIMIT, "");

			target_collection.variable_on_chain_schema = schema;
			target_collection.save()
		}

		#[weight = <SelfWeightOf<T>>::set_collection_limits()]
		#[transactional]
		pub fn set_collection_limits(
			origin,
			collection_id: u32,
			new_limits: CollectionLimits<T::BlockNumber>,
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = Self::get_collection(collection_id)?;
			Self::check_owner_permissions(&target_collection, sender.as_sub())?;
			let old_limits = &target_collection.limits;

			// collection bounds
			ensure!(new_limits.sponsor_transfer_timeout <= MAX_SPONSOR_TIMEOUT &&
				new_limits.account_token_ownership_limit <= MAX_TOKEN_OWNERSHIP &&
				new_limits.sponsored_data_size <= CUSTOM_DATA_LIMIT,
				Error::<T>::CollectionLimitBoundsExceeded);

			// token_limit   check  prev
			ensure!(old_limits.token_limit >= new_limits.token_limit, Error::<T>::CollectionTokenLimitExceeded);
			ensure!(new_limits.token_limit > 0, Error::<T>::CollectionTokenLimitExceeded);

			ensure!(
				(old_limits.owner_can_transfer || !new_limits.owner_can_transfer) &&
				(old_limits.owner_can_destroy || !new_limits.owner_can_destroy),
				Error::<T>::OwnerPermissionsCantBeReverted,
			);

			target_collection.limits = new_limits;

			target_collection.save()
		}
	}
}

impl<T: Config> Module<T> {
	pub fn create_item_internal(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		owner: &T::CrossAccountId,
		data: CreateItemData,
	) -> DispatchResult {
		ensure!(
			owner != &T::CrossAccountId::from_eth(H160([0; 20])),
			Error::<T>::AddressIsZero
		);

		Self::can_create_items_in_collection(collection, sender, owner, 1)?;
		Self::validate_create_item_args(collection, &data)?;
		Self::create_item_no_validation(collection, owner, data)?;

		Ok(())
	}

	pub fn transfer_internal(
		sender: &T::CrossAccountId,
		recipient: &T::CrossAccountId,
		target_collection: &CollectionHandle<T>,
		item_id: TokenId,
		value: u128,
	) -> DispatchResult {
		ensure!(
			recipient != &T::CrossAccountId::from_eth(H160([0; 20])),
			Error::<T>::AddressIsZero
		);

		// Limits check
		Self::is_correct_transfer(target_collection, recipient)?;

		// Transfer permissions check
		ensure!(
			Self::is_item_owner(sender, target_collection, item_id)?
				|| Self::is_owner_or_admin_permissions(target_collection, sender)?,
			Error::<T>::NoPermission
		);

		if target_collection.access == AccessMode::WhiteList {
			Self::check_white_list(target_collection, sender)?;
			Self::check_white_list(target_collection, recipient)?;
		}

		match target_collection.mode {
			CollectionMode::NFT => Self::transfer_nft(
				target_collection,
				item_id,
				sender.clone(),
				recipient.clone(),
			)?,
			CollectionMode::Fungible(_) => {
				Self::transfer_fungible(target_collection, value, sender, recipient)?
			}
			CollectionMode::ReFungible => Self::transfer_refungible(
				target_collection,
				item_id,
				value,
				sender.clone(),
				recipient.clone(),
			)?,
			_ => (),
		};

		Self::deposit_event(RawEvent::Transfer(
			target_collection.id,
			item_id,
			sender.clone(),
			recipient.clone(),
			value,
		));

		Ok(())
	}

	pub fn approve_internal(
		sender: &T::CrossAccountId,
		spender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		amount: u128,
	) -> DispatchResult {
		Self::token_exists(collection, item_id)?;

		// Transfer permissions check
		let bypasses_limits = collection.limits.owner_can_transfer
			&& Self::is_owner_or_admin_permissions(collection, sender)?;

		let allowance_limit = if bypasses_limits {
			None
		} else if let Some(amount) = Self::owned_amount(sender, collection, item_id)? {
			Some(amount)
		} else {
			fail!(Error::<T>::NoPermission);
		};

		if collection.access == AccessMode::WhiteList {
			Self::check_white_list(collection, sender)?;
			Self::check_white_list(collection, spender)?;
		}

		collection.consume_sload()?;
		let allowance: u128 = amount
			.checked_add(<Allowances<T>>::get(
				collection.id,
				(item_id, sender.as_sub(), spender.as_sub()),
			))
			.ok_or(Error::<T>::NumOverflow)?;
		if let Some(limit) = allowance_limit {
			ensure!(limit >= allowance, Error::<T>::TokenValueTooLow);
		}
		collection.consume_sstore()?;
		<Allowances<T>>::insert(
			collection.id,
			(item_id, sender.as_sub(), spender.as_sub()),
			allowance,
		);

		if matches!(collection.mode, CollectionMode::NFT) {
			// TODO: NFT: only one owner may exist for token in ERC721
			collection.log(ERC721Events::Approval {
				owner: *sender.as_eth(),
				approved: *spender.as_eth(),
				token_id: item_id.into(),
			})?;
		}

		if matches!(collection.mode, CollectionMode::Fungible(_)) {
			// TODO: NFT: only one owner may exist for token in ERC20
			collection.log(ERC20Events::Approval {
				owner: *sender.as_eth(),
				spender: *spender.as_eth(),
				value: allowance.into(),
			})?;
		}

		Self::deposit_event(RawEvent::Approved(
			collection.id,
			item_id,
			sender.clone(),
			spender.clone(),
			allowance,
		));
		Ok(())
	}

	pub fn transfer_from_internal(
		sender: &T::CrossAccountId,
		from: &T::CrossAccountId,
		recipient: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		amount: u128,
	) -> DispatchResult {
		if sender == from {
			// Transfer by `from`, because it is either equal to sender, or derived from him
			return Self::transfer_internal(from, recipient, collection, item_id, amount);
		}

		// Check approval
		collection.consume_sload()?;
		let approval: u128 =
			<Allowances<T>>::get(collection.id, (item_id, from.as_sub(), sender.as_sub()));

		// Limits check
		Self::is_correct_transfer(collection, recipient)?;

		// Transfer permissions check
		ensure!(
			approval >= amount
				|| (collection.limits.owner_can_transfer
					&& Self::is_owner_or_admin_permissions(collection, sender)?),
			Error::<T>::NoPermission
		);

		if collection.access == AccessMode::WhiteList {
			Self::check_white_list(collection, sender)?;
			Self::check_white_list(collection, recipient)?;
		}

		// Reduce approval by transferred amount or remove if remaining approval drops to 0
		let allowance = approval.saturating_sub(amount);
		collection.consume_sstore()?;
		if allowance > 0 {
			<Allowances<T>>::insert(
				collection.id,
				(item_id, from.as_sub(), sender.as_sub()),
				allowance,
			);
		} else {
			<Allowances<T>>::remove(collection.id, (item_id, from.as_sub(), sender.as_sub()));
		}

		match collection.mode {
			CollectionMode::NFT => {
				Self::transfer_nft(collection, item_id, from.clone(), recipient.clone())?
			}
			CollectionMode::Fungible(_) => {
				Self::transfer_fungible(collection, amount, from, recipient)?
			}
			CollectionMode::ReFungible => Self::transfer_refungible(
				collection,
				item_id,
				amount,
				from.clone(),
				recipient.clone(),
			)?,
			_ => (),
		};

		if matches!(collection.mode, CollectionMode::Fungible(_)) {
			collection.log(ERC20Events::Approval {
				owner: *from.as_eth(),
				spender: *sender.as_eth(),
				value: allowance.into(),
			})?;
		}

		Ok(())
	}

	pub fn set_variable_meta_data_internal(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		data: Vec<u8>,
	) -> DispatchResult {
		Self::token_exists(collection, item_id)?;

		ensure!(
			CUSTOM_DATA_LIMIT >= data.len() as u32,
			Error::<T>::TokenVariableDataLimitExceeded
		);

		// Modify permissions check
		ensure!(
			Self::is_item_owner(sender, collection, item_id)?
				|| Self::is_owner_or_admin_permissions(collection, sender)?,
			Error::<T>::NoPermission
		);

		match collection.mode {
			CollectionMode::NFT => Self::set_nft_variable_data(collection, item_id, data)?,
			CollectionMode::ReFungible => {
				Self::set_re_fungible_variable_data(collection, item_id, data)?
			}
			CollectionMode::Fungible(_) => fail!(Error::<T>::CantStoreMetadataInFungibleTokens),
			_ => fail!(Error::<T>::UnexpectedCollectionType),
		};

		Ok(())
	}

	pub fn meta_update_check(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
	) -> DispatchResult {
		match collection.meta_update_permission {
			MetaUpdatePermission::ItemOwner => ensure!(
				Self::is_item_owner(sender, collection, item_id)?,
				Error::<T>::NoPermission
			),
			MetaUpdatePermission::Admin => ensure!(
				Self::is_owner_or_admin_permissions(collection, sender)?,
				Error::<T>::NoPermission
			),
			MetaUpdatePermission::None => fail!(Error::<T>::MetadataUpdateDenied),
		}

		Ok(())
	}

	pub fn get_variable_metadata(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
	) -> Result<Vec<u8>, DispatchError> {
		Ok(match collection.mode {
			CollectionMode::NFT => {
				<NftItemList<T>>::get(collection.id, item_id)
					.ok_or(Error::<T>::TokenNotFound)?
					.variable_data
			}
			CollectionMode::ReFungible => {
				<ReFungibleItemList<T>>::get(collection.id, item_id)
					.ok_or(Error::<T>::TokenNotFound)?
					.variable_data
			}
			_ => fail!(Error::<T>::UnexpectedCollectionType),
		})
	}

	pub fn create_multiple_items_internal(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		owner: &T::CrossAccountId,
		items_data: Vec<CreateItemData>,
	) -> DispatchResult {
		Self::can_create_items_in_collection(collection, sender, owner, items_data.len() as u32)?;

		for data in &items_data {
			Self::validate_create_item_args(collection, data)?;
		}
		for data in &items_data {
			Self::create_item_no_validation(collection, owner, data.clone())?;
		}

		Ok(())
	}

	pub fn burn_item_internal(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		value: u128,
	) -> DispatchResult {
		ensure!(
			Self::is_item_owner(sender, collection, item_id)?
				|| (collection.limits.owner_can_transfer
					&& Self::is_owner_or_admin_permissions(collection, sender)?),
			Error::<T>::NoPermission
		);

		if collection.access == AccessMode::WhiteList {
			Self::check_white_list(collection, sender)?;
		}

		match collection.mode {
			CollectionMode::NFT => Self::burn_nft_item(collection, item_id)?,
			CollectionMode::Fungible(_) => Self::burn_fungible_item(sender, collection, value)?,
			CollectionMode::ReFungible => Self::burn_refungible_item(collection, item_id, sender)?,
			_ => (),
		};

		Ok(())
	}

	pub fn toggle_white_list_internal(
		sender: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		address: &T::CrossAccountId,
		whitelisted: bool,
	) -> DispatchResult {
		Self::check_owner_or_admin_permissions(collection, sender)?;

		if whitelisted {
			<WhiteList<T>>::insert(collection.id, address.as_sub(), true);
		} else {
			<WhiteList<T>>::remove(collection.id, address.as_sub());
		}

		Ok(())
	}

	fn is_correct_transfer(
		collection: &CollectionHandle<T>,
		recipient: &T::CrossAccountId,
	) -> DispatchResult {
		let collection_id = collection.id;

		// check token limit and account token limit
		collection.consume_sload()?;
		let account_items: u32 =
			<AddressTokens<T>>::get(collection_id, recipient.as_sub()).len() as u32;
		ensure!(
			collection.limits.account_token_ownership_limit > account_items,
			Error::<T>::AccountTokenLimitExceeded
		);

		// preliminary transfer check
		ensure!(collection.transfers_enabled, Error::<T>::TransferNotAllowed);

		Ok(())
	}

	fn can_create_items_in_collection(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		owner: &T::CrossAccountId,
		amount: u32,
	) -> DispatchResult {
		let collection_id = collection.id;

		// check token limit and account token limit
		let total_items: u32 = ItemListIndex::get(collection_id)
			.checked_add(amount)
			.ok_or(Error::<T>::CollectionTokenLimitExceeded)?;
		let account_items: u32 = (<AddressTokens<T>>::get(collection_id, owner.as_sub()).len()
			as u32)
			.checked_add(amount)
			.ok_or(Error::<T>::AccountTokenLimitExceeded)?;
		ensure!(
			collection.limits.token_limit >= total_items,
			Error::<T>::CollectionTokenLimitExceeded
		);
		ensure!(
			collection.limits.account_token_ownership_limit >= account_items,
			Error::<T>::AccountTokenLimitExceeded
		);

		if !Self::is_owner_or_admin_permissions(collection, sender)? {
			ensure!(collection.mint_mode, Error::<T>::PublicMintingNotAllowed);
			Self::check_white_list(collection, owner)?;
			Self::check_white_list(collection, sender)?;
		}

		Ok(())
	}

	fn validate_create_item_args(
		target_collection: &CollectionHandle<T>,
		data: &CreateItemData,
	) -> DispatchResult {
		match target_collection.mode {
			CollectionMode::NFT => {
				if !matches!(data, CreateItemData::NFT(_)) {
					fail!(Error::<T>::NotNftDataUsedToMintNftCollectionToken);
				}
			}
			CollectionMode::Fungible(_) => {
				if !matches!(data, CreateItemData::Fungible(_)) {
					fail!(Error::<T>::NotFungibleDataUsedToMintFungibleCollectionToken);
				}
			}
			CollectionMode::ReFungible => {
				if let CreateItemData::ReFungible(data) = data {
					// Check refungibility limits
					ensure!(
						data.pieces <= MAX_REFUNGIBLE_PIECES,
						Error::<T>::WrongRefungiblePieces
					);
					ensure!(data.pieces > 0, Error::<T>::WrongRefungiblePieces);
				} else {
					fail!(Error::<T>::NotReFungibleDataUsedToMintReFungibleCollectionToken);
				}
			}
			_ => {
				fail!(Error::<T>::UnexpectedCollectionType);
			}
		};

		Ok(())
	}

	fn create_item_no_validation(
		collection: &CollectionHandle<T>,
		owner: &T::CrossAccountId,
		data: CreateItemData,
	) -> DispatchResult {
		match data {
			CreateItemData::NFT(data) => {
				let item = NftItemType {
					owner: owner.clone(),
					const_data: data.const_data.into_inner(),
					variable_data: data.variable_data.into_inner(),
				};

				Self::add_nft_item(collection, item)?;
			}
			CreateItemData::Fungible(data) => {
				Self::add_fungible_item(collection, owner, data.value)?;
			}
			CreateItemData::ReFungible(data) => {
				let owner_list = vec![Ownership {
					owner: owner.clone(),
					fraction: data.pieces,
				}];

				let item = ReFungibleItemType {
					owner: owner_list,
					const_data: data.const_data.into_inner(),
					variable_data: data.variable_data.into_inner(),
				};

				Self::add_refungible_item(collection, item)?;
			}
		};

		Ok(())
	}

	fn add_fungible_item(
		collection: &CollectionHandle<T>,
		owner: &T::CrossAccountId,
		value: u128,
	) -> DispatchResult {
		let collection_id = collection.id;

		// Does new owner already have an account?
		collection.consume_sload()?;
		let balance: u128 = <FungibleItemList<T>>::get(collection_id, owner.as_sub()).value;

		// Mint
		let item = FungibleItemType {
			value: balance.checked_add(value).ok_or(Error::<T>::NumOverflow)?,
		};
		collection.consume_sstore()?;
		<FungibleItemList<T>>::insert(collection_id, owner.as_sub(), item);

		// Update balance
		collection.consume_sload()?;
		let new_balance = <Balance<T>>::get(collection_id, owner.as_sub())
			.checked_add(value)
			.ok_or(Error::<T>::NumOverflow)?;
		collection.consume_sstore()?;
		<Balance<T>>::insert(collection_id, owner.as_sub(), new_balance);

		collection.log(ERC20Events::Transfer {
			from: H160::default(),
			to: *owner.as_eth(),
			value: value.into(),
		})?;
		Self::deposit_event(RawEvent::ItemCreated(collection_id, 0, owner.clone()));
		Ok(())
	}

	fn add_refungible_item(
		collection: &CollectionHandle<T>,
		item: ReFungibleItemType<T::CrossAccountId>,
	) -> DispatchResult {
		let collection_id = collection.id;

		let current_index = <ItemListIndex>::get(collection_id)
			.checked_add(1)
			.ok_or(Error::<T>::NumOverflow)?;
		let itemcopy = item.clone();

		ensure!(item.owner.len() == 1, Error::<T>::BadCreateRefungibleCall,);
		let item_owner = item.owner.first().expect("only one owner is defined");

		let value = item_owner.fraction;
		let owner = item_owner.owner.clone();

		Self::add_token_index(collection, current_index, &owner)?;

		<ItemListIndex>::insert(collection_id, current_index);
		<ReFungibleItemList<T>>::insert(collection_id, current_index, itemcopy);

		// Update balance
		let new_balance = <Balance<T>>::get(collection_id, owner.as_sub())
			.checked_add(value)
			.ok_or(Error::<T>::NumOverflow)?;
		<Balance<T>>::insert(collection_id, owner.as_sub(), new_balance);

		Self::deposit_event(RawEvent::ItemCreated(collection_id, current_index, owner));
		Ok(())
	}

	fn add_nft_item(
		collection: &CollectionHandle<T>,
		item: NftItemType<T::CrossAccountId>,
	) -> DispatchResult {
		let collection_id = collection.id;

		let current_index = <ItemListIndex>::get(collection_id)
			.checked_add(1)
			.ok_or(Error::<T>::NumOverflow)?;

		let item_owner = item.owner.clone();
		Self::add_token_index(collection, current_index, &item.owner)?;

		<ItemListIndex>::insert(collection_id, current_index);
		<NftItemList<T>>::insert(collection_id, current_index, item);

		// Update balance
		let new_balance = <Balance<T>>::get(collection_id, item_owner.as_sub())
			.checked_add(1)
			.ok_or(Error::<T>::NumOverflow)?;
		<Balance<T>>::insert(collection_id, item_owner.as_sub(), new_balance);

		collection.log(ERC721Events::Transfer {
			from: H160::default(),
			to: *item_owner.as_eth(),
			token_id: current_index.into(),
		})?;
		Self::deposit_event(RawEvent::ItemCreated(
			collection_id,
			current_index,
			item_owner,
		));
		Ok(())
	}

	fn burn_refungible_item(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		owner: &T::CrossAccountId,
	) -> DispatchResult {
		let collection_id = collection.id;

		let mut token = <ReFungibleItemList<T>>::get(collection_id, item_id)
			.ok_or(Error::<T>::TokenNotFound)?;
		let rft_balance = token
			.owner
			.iter()
			.find(|&i| i.owner == *owner)
			.ok_or(Error::<T>::TokenNotFound)?;
		Self::remove_token_index(collection, item_id, owner)?;

		// update balance
		let new_balance = <Balance<T>>::get(collection_id, rft_balance.owner.as_sub())
			.checked_sub(rft_balance.fraction)
			.ok_or(Error::<T>::NumOverflow)?;
		<Balance<T>>::insert(collection_id, rft_balance.owner.as_sub(), new_balance);

		// Re-create owners list with sender removed
		let index = token
			.owner
			.iter()
			.position(|i| i.owner == *owner)
			.expect("owned item is exists");
		token.owner.remove(index);
		let owner_count = token.owner.len();

		// Burn the token completely if this was the last (only) owner
		if owner_count == 0 {
			<ReFungibleItemList<T>>::remove(collection_id, item_id);
			<VariableMetaDataBasket<T>>::remove(collection_id, item_id);
		} else {
			<ReFungibleItemList<T>>::insert(collection_id, item_id, token);
		}

		Ok(())
	}

	fn burn_nft_item(collection: &CollectionHandle<T>, item_id: TokenId) -> DispatchResult {
		let collection_id = collection.id;

		let item =
			<NftItemList<T>>::get(collection_id, item_id).ok_or(Error::<T>::TokenNotFound)?;
		Self::remove_token_index(collection, item_id, &item.owner)?;

		// update balance
		let new_balance = <Balance<T>>::get(collection_id, item.owner.as_sub())
			.checked_sub(1)
			.ok_or(Error::<T>::NumOverflow)?;
		<Balance<T>>::insert(collection_id, item.owner.as_sub(), new_balance);
		<NftItemList<T>>::remove(collection_id, item_id);
		<VariableMetaDataBasket<T>>::remove(collection_id, item_id);

		collection.log(ERC721Events::Transfer {
			from: *item.owner.as_eth(),
			to: H160::default(),
			token_id: item_id.into(),
		})?;
		Self::deposit_event(RawEvent::ItemDestroyed(collection.id, item_id));
		Ok(())
	}

	fn burn_fungible_item(
		owner: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		value: u128,
	) -> DispatchResult {
		let collection_id = collection.id;

		let mut balance = <FungibleItemList<T>>::get(collection_id, owner.as_sub());
		ensure!(balance.value >= value, Error::<T>::TokenValueNotEnough);

		// update balance
		let new_balance = <Balance<T>>::get(collection_id, owner.as_sub())
			.checked_sub(value)
			.ok_or(Error::<T>::NumOverflow)?;
		<Balance<T>>::insert(collection_id, owner.as_sub(), new_balance);

		if balance.value - value > 0 {
			balance.value -= value;
			<FungibleItemList<T>>::insert(collection_id, owner.as_sub(), balance);
		} else {
			<FungibleItemList<T>>::remove(collection_id, owner.as_sub());
		}

		collection.log(ERC20Events::Transfer {
			from: *owner.as_eth(),
			to: H160::default(),
			value: value.into(),
		})?;
		Ok(())
	}

	pub fn get_collection(
		collection_id: CollectionId,
	) -> Result<CollectionHandle<T>, sp_runtime::DispatchError> {
		Ok(<CollectionHandle<T>>::get(collection_id).ok_or(Error::<T>::CollectionNotFound)?)
	}

	fn check_owner_permissions(
		target_collection: &CollectionHandle<T>,
		subject: &T::AccountId,
	) -> DispatchResult {
		ensure!(
			*subject == target_collection.owner,
			Error::<T>::NoPermission
		);

		Ok(())
	}

	fn is_owner_or_admin_permissions(
		collection: &CollectionHandle<T>,
		subject: &T::CrossAccountId,
	) -> Result<bool, DispatchError> {
		collection.consume_sload()?;
		Ok(*subject.as_sub() == collection.owner
			|| <AdminList<T>>::get(collection.id).contains(subject))
	}

	fn check_owner_or_admin_permissions(
		collection: &CollectionHandle<T>,
		subject: &T::CrossAccountId,
	) -> DispatchResult {
		ensure!(
			Self::is_owner_or_admin_permissions(collection, subject)?,
			Error::<T>::NoPermission
		);

		Ok(())
	}

	fn owned_amount(
		subject: &T::CrossAccountId,
		collection: &CollectionHandle<T>,
		item_id: TokenId,
	) -> Result<Option<u128>, DispatchError> {
		collection.consume_sload()?;
		Ok(Self::owned_amount_unchecked(subject, collection, item_id))
	}

	fn owned_amount_unchecked(
		subject: &T::CrossAccountId,
		target_collection: &CollectionHandle<T>,
		item_id: TokenId,
	) -> Option<u128> {
		let collection_id = target_collection.id;

		match target_collection.mode {
			CollectionMode::NFT => {
				(<NftItemList<T>>::get(collection_id, item_id)?.owner == *subject).then(|| 1)
			}
			CollectionMode::Fungible(_) => {
				Some(<FungibleItemList<T>>::get(collection_id, &subject.as_sub()).value)
			}
			CollectionMode::ReFungible => <ReFungibleItemList<T>>::get(collection_id, item_id)?
				.owner
				.iter()
				.find(|i| i.owner == *subject)
				.map(|i| i.fraction),
			CollectionMode::Invalid => None,
		}
	}

	fn is_item_owner(
		subject: &T::CrossAccountId,
		target_collection: &CollectionHandle<T>,
		item_id: TokenId,
	) -> Result<bool, DispatchError> {
		Ok(match target_collection.mode {
			CollectionMode::Fungible(_) => true,
			_ => Self::owned_amount(subject, target_collection, item_id)?.is_some(),
		})
	}

	fn check_white_list(
		collection: &CollectionHandle<T>,
		address: &T::CrossAccountId,
	) -> DispatchResult {
		collection.consume_sload()?;
		ensure!(
			<WhiteList<T>>::contains_key(collection.id, address.as_sub()),
			Error::<T>::AddresNotInWhiteList,
		);
		Ok(())
	}

	/// Check if token exists. In case of Fungible, check if there is an entry for
	/// the owner in fungible balances double map
	fn token_exists(target_collection: &CollectionHandle<T>, item_id: TokenId) -> DispatchResult {
		let collection_id = target_collection.id;
		let exists = match target_collection.mode {
			CollectionMode::NFT => <NftItemList<T>>::contains_key(collection_id, item_id),
			CollectionMode::Fungible(_) => true,
			CollectionMode::ReFungible => {
				<ReFungibleItemList<T>>::contains_key(collection_id, item_id)
			}
			_ => false,
		};

		ensure!(exists, Error::<T>::TokenNotFound);
		Ok(())
	}

	fn transfer_fungible(
		collection: &CollectionHandle<T>,
		value: u128,
		owner: &T::CrossAccountId,
		recipient: &T::CrossAccountId,
	) -> DispatchResult {
		let collection_id = collection.id;

		collection.consume_sload()?;
		collection.consume_sload()?;
		let mut recipient_balance = <FungibleItemList<T>>::get(collection_id, recipient.as_sub());
		let mut balance = <FungibleItemList<T>>::get(collection_id, owner.as_sub());

		recipient_balance.value = recipient_balance
			.value
			.checked_add(value)
			.ok_or(Error::<T>::NumOverflow)?;
		balance.value = balance
			.value
			.checked_sub(value)
			.ok_or(Error::<T>::TokenValueTooLow)?;

		// update balanceOf
		collection.consume_sstore()?;
		collection.consume_sstore()?;
		if balance.value != 0 {
			<Balance<T>>::insert(collection_id, owner.as_sub(), balance.value);
		} else {
			<Balance<T>>::remove(collection_id, owner.as_sub());
		}
		<Balance<T>>::insert(collection_id, recipient.as_sub(), recipient_balance.value);

		// Reduce or remove sender
		collection.consume_sstore()?;
		collection.consume_sstore()?;
		if balance.value != 0 {
			<FungibleItemList<T>>::insert(collection_id, owner.as_sub(), balance);
		} else {
			<FungibleItemList<T>>::remove(collection_id, owner.as_sub());
		}
		<FungibleItemList<T>>::insert(collection_id, recipient.as_sub(), recipient_balance);

		collection.log(ERC20Events::Transfer {
			from: *owner.as_eth(),
			to: *recipient.as_eth(),
			value: value.into(),
		})?;
		Self::deposit_event(RawEvent::Transfer(
			collection.id,
			1,
			owner.clone(),
			recipient.clone(),
			value,
		));

		Ok(())
	}

	fn transfer_refungible(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		value: u128,
		owner: T::CrossAccountId,
		new_owner: T::CrossAccountId,
	) -> DispatchResult {
		let collection_id = collection.id;
		collection.consume_sload()?;
		let full_item = <ReFungibleItemList<T>>::get(collection_id, item_id)
			.ok_or(Error::<T>::TokenNotFound)?;

		let item = full_item
			.owner
			.iter()
			.find(|i| i.owner == owner)
			.ok_or(Error::<T>::TokenNotFound)?;
		let amount = item.fraction;

		ensure!(amount >= value, Error::<T>::TokenValueTooLow);

		collection.consume_sload()?;
		// update balance
		let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.as_sub())
			.checked_sub(value)
			.ok_or(Error::<T>::NumOverflow)?;
		collection.consume_sstore()?;
		<Balance<T>>::insert(collection_id, item.owner.as_sub(), balance_old_owner);

		collection.consume_sload()?;
		let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.as_sub())
			.checked_add(value)
			.ok_or(Error::<T>::NumOverflow)?;
		collection.consume_sstore()?;
		<Balance<T>>::insert(collection_id, new_owner.as_sub(), balance_new_owner);

		let old_owner = item.owner.clone();
		let new_owner_has_account = full_item.owner.iter().any(|i| i.owner == new_owner);

		let mut new_full_item = full_item.clone();
		// transfer
		if amount == value && !new_owner_has_account {
			// change owner
			// new owner do not have account
			new_full_item
				.owner
				.iter_mut()
				.find(|i| i.owner == owner)
				.expect("old owner does present in refungible")
				.owner = new_owner.clone();
			collection.consume_sstore()?;
			<ReFungibleItemList<T>>::insert(collection_id, item_id, new_full_item);

			// update index collection
			Self::move_token_index(collection, item_id, &old_owner, &new_owner)?;
		} else {
			new_full_item
				.owner
				.iter_mut()
				.find(|i| i.owner == owner)
				.expect("old owner does present in refungible")
				.fraction -= value;

			// separate amount
			if new_owner_has_account {
				// new owner has account
				new_full_item
					.owner
					.iter_mut()
					.find(|i| i.owner == new_owner)
					.expect("new owner has account")
					.fraction += value;
			} else {
				// new owner do not have account
				new_full_item.owner.push(Ownership {
					owner: new_owner.clone(),
					fraction: value,
				});
				Self::add_token_index(collection, item_id, &new_owner)?;
			}

			collection.consume_sstore()?;
			<ReFungibleItemList<T>>::insert(collection_id, item_id, new_full_item);
		}

		Self::deposit_event(RawEvent::Transfer(
			collection.id,
			item_id,
			owner,
			new_owner,
			amount,
		));

		Ok(())
	}

	fn transfer_nft(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		sender: T::CrossAccountId,
		new_owner: T::CrossAccountId,
	) -> DispatchResult {
		let collection_id = collection.id;
		collection.consume_sload()?;
		let mut item =
			<NftItemList<T>>::get(collection_id, item_id).ok_or(Error::<T>::TokenNotFound)?;

		ensure!(sender == item.owner, Error::<T>::MustBeTokenOwner);

		collection.consume_sload()?;
		// update balance
		let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.as_sub())
			.checked_sub(1)
			.ok_or(Error::<T>::NumOverflow)?;
		collection.consume_sstore()?;
		<Balance<T>>::insert(collection_id, item.owner.as_sub(), balance_old_owner);

		collection.consume_sload()?;
		let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.as_sub())
			.checked_add(1)
			.ok_or(Error::<T>::NumOverflow)?;
		collection.consume_sstore()?;
		<Balance<T>>::insert(collection_id, new_owner.as_sub(), balance_new_owner);

		// change owner
		let old_owner = item.owner.clone();
		item.owner = new_owner.clone();
		collection.consume_sstore()?;
		<NftItemList<T>>::insert(collection_id, item_id, item);

		// update index collection
		Self::move_token_index(collection, item_id, &old_owner, &new_owner)?;

		collection.log(ERC721Events::Transfer {
			from: *sender.as_eth(),
			to: *new_owner.as_eth(),
			token_id: item_id.into(),
		})?;
		Self::deposit_event(RawEvent::Transfer(
			collection.id,
			item_id,
			sender,
			new_owner,
			1,
		));

		Ok(())
	}

	fn set_re_fungible_variable_data(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		data: Vec<u8>,
	) -> DispatchResult {
		let collection_id = collection.id;
		let mut item = <ReFungibleItemList<T>>::get(collection_id, item_id)
			.ok_or(Error::<T>::TokenNotFound)?;

		item.variable_data = data;

		<ReFungibleItemList<T>>::insert(collection_id, item_id, item);

		Ok(())
	}

	fn set_nft_variable_data(
		collection: &CollectionHandle<T>,
		item_id: TokenId,
		data: Vec<u8>,
	) -> DispatchResult {
		let collection_id = collection.id;
		let mut item =
			<NftItemList<T>>::get(collection_id, item_id).ok_or(Error::<T>::TokenNotFound)?;

		item.variable_data = data;

		<NftItemList<T>>::insert(collection_id, item_id, item);

		Ok(())
	}

	#[allow(dead_code)]
	fn init_collection(item: &Collection<T>) {
		// check params
		assert!(
			item.decimal_points <= MAX_DECIMAL_POINTS,
			"decimal_points parameter must be lower than MAX_DECIMAL_POINTS"
		);
		assert!(
			item.name.len() <= 64,
			"Collection name can not be longer than 63 char"
		);
		assert!(
			item.name.len() <= 256,
			"Collection description can not be longer than 255 char"
		);
		assert!(
			item.token_prefix.len() <= 16,
			"Token prefix can not be longer than 15 char"
		);

		// Generate next collection ID
		let next_id = CreatedCollectionCount::get().checked_add(1).unwrap();

		CreatedCollectionCount::put(next_id);
	}

	#[allow(dead_code)]
	fn init_nft_token(collection_id: CollectionId, item: &NftItemType<T::CrossAccountId>) {
		let current_index = <ItemListIndex>::get(collection_id).checked_add(1).unwrap();

		Self::add_token_index(
			&CollectionHandle::get(collection_id).unwrap(),
			current_index,
			&item.owner,
		)
		.unwrap();

		<ItemListIndex>::insert(collection_id, current_index);

		// Update balance
		let new_balance = <Balance<T>>::get(collection_id, item.owner.as_sub())
			.checked_add(1)
			.unwrap();
		<Balance<T>>::insert(collection_id, item.owner.as_sub(), new_balance);
	}

	#[allow(dead_code)]
	fn init_fungible_token(
		collection_id: CollectionId,
		owner: &T::CrossAccountId,
		item: &FungibleItemType,
	) {
		let current_index = <ItemListIndex>::get(collection_id).checked_add(1).unwrap();

		Self::add_token_index(
			&CollectionHandle::get(collection_id).unwrap(),
			current_index,
			owner,
		)
		.unwrap();

		<ItemListIndex>::insert(collection_id, current_index);

		// Update balance
		let new_balance = <Balance<T>>::get(collection_id, owner.as_sub())
			.checked_add(item.value)
			.unwrap();
		<Balance<T>>::insert(collection_id, owner.as_sub(), new_balance);
	}

	#[allow(dead_code)]
	fn init_refungible_token(
		collection_id: CollectionId,
		item: &ReFungibleItemType<T::CrossAccountId>,
	) {
		let current_index = <ItemListIndex>::get(collection_id).checked_add(1).unwrap();

		let value = item.owner.first().unwrap().fraction;
		let owner = item.owner.first().unwrap().owner.clone();

		Self::add_token_index(
			&CollectionHandle::get(collection_id).unwrap(),
			current_index,
			&owner,
		)
		.unwrap();

		<ItemListIndex>::insert(collection_id, current_index);

		// Update balance
		let new_balance = <Balance<T>>::get(collection_id, &owner.as_sub())
			.checked_add(value)
			.unwrap();
		<Balance<T>>::insert(collection_id, owner.as_sub(), new_balance);
	}

	fn add_token_index(
		collection: &CollectionHandle<T>,
		item_index: TokenId,
		owner: &T::CrossAccountId,
	) -> DispatchResult {
		// add to account limit
		collection.consume_sload()?;
		if <AccountItemCount<T>>::contains_key(owner.as_sub()) {
			// bound Owned tokens by a single address
			collection.consume_sload()?;
			let count = <AccountItemCount<T>>::get(owner.as_sub());
			ensure!(
				count < ACCOUNT_TOKEN_OWNERSHIP_LIMIT,
				Error::<T>::AddressOwnershipLimitExceeded
			);

			collection.consume_sstore()?;
			<AccountItemCount<T>>::insert(
				owner.as_sub(),
				count.checked_add(1).ok_or(Error::<T>::NumOverflow)?,
			);
		} else {
			collection.consume_sstore()?;
			<AccountItemCount<T>>::insert(owner.as_sub(), 1);
		}

		collection.consume_sload()?;
		let list_exists = <AddressTokens<T>>::contains_key(collection.id, owner.as_sub());
		if list_exists {
			collection.consume_sload()?;
			let mut list = <AddressTokens<T>>::get(collection.id, owner.as_sub());
			let item_contains = list.contains(&item_index.clone());

			if !item_contains {
				list.push(item_index);
			}

			collection.consume_sstore()?;
			<AddressTokens<T>>::insert(collection.id, owner.as_sub(), list);
		} else {
			let itm = vec![item_index];
			collection.consume_sstore()?;
			<AddressTokens<T>>::insert(collection.id, owner.as_sub(), itm);
		}

		Ok(())
	}

	fn remove_token_index(
		collection: &CollectionHandle<T>,
		item_index: TokenId,
		owner: &T::CrossAccountId,
	) -> DispatchResult {
		// update counter
		collection.consume_sload()?;
		collection.consume_sstore()?;
		<AccountItemCount<T>>::insert(
			owner.as_sub(),
			<AccountItemCount<T>>::get(owner.as_sub())
				.checked_sub(1)
				.ok_or(Error::<T>::NumOverflow)?,
		);

		collection.consume_sload()?;
		let list_exists = <AddressTokens<T>>::contains_key(collection.id, owner.as_sub());
		if list_exists {
			collection.consume_sload()?;
			let mut list = <AddressTokens<T>>::get(collection.id, owner.as_sub());
			let item_contains = list.contains(&item_index.clone());

			if item_contains {
				list.retain(|&item| item != item_index);
				collection.consume_sstore()?;
				<AddressTokens<T>>::insert(collection.id, owner.as_sub(), list);
			}
		}

		Ok(())
	}

	fn move_token_index(
		collection: &CollectionHandle<T>,
		item_index: TokenId,
		old_owner: &T::CrossAccountId,
		new_owner: &T::CrossAccountId,
	) -> DispatchResult {
		Self::remove_token_index(collection, item_index, old_owner)?;
		Self::add_token_index(collection, item_index, new_owner)?;

		Ok(())
	}
}

sp_api::decl_runtime_apis! {
	pub trait NftApi {
		/// Used for ethereum integration
		fn eth_contract_code(account: H160) -> Option<Vec<u8>>;
	}
}
