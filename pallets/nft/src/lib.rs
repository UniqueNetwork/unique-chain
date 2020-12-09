#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
pub use std::*;

#[cfg(feature = "std")]
pub use serde::*;

use codec::{Decode, Encode};
pub use frame_support::{
    construct_runtime, decl_event, decl_module, decl_storage, decl_error,
    dispatch::DispatchResult,
    ensure, fail, parameter_types,
    traits::{
        Currency, ExistenceRequirement, Get, Imbalance, KeyOwnerProofSystem, OnUnbalanced,
        Randomness, WithdrawReason,
    },
    weights::{
        constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
        DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
        WeightToFeePolynomial,
    },
    IsSubType, StorageValue,
};

use frame_system::{self as system, ensure_signed, ensure_root};
use sp_runtime::sp_std::prelude::Vec;
use sp_runtime::{
    traits::{
        DispatchInfoOf, Dispatchable, PostDispatchInfoOf, Saturating, SignedExtension, Zero,
    },
    transaction_validity::{
        InvalidTransaction, TransactionValidity, TransactionValidityError, ValidTransaction,
    },
    FixedPointOperand, FixedU128,
};
use pallet_contracts::ContractAddressFor;
use sp_runtime::traits::StaticLookup;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

mod default_weights;

// Structs
// #region

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CollectionMode {
    Invalid,
    NFT,
    // decimal points
    Fungible(u32),
    // decimal points
    ReFungible(u32),
}

impl Into<u8> for CollectionMode {
    fn into(self) -> u8 {
        match self {
            CollectionMode::Invalid => 0,
            CollectionMode::NFT => 1,
            CollectionMode::Fungible(_) => 2,
            CollectionMode::ReFungible(_) => 3,
        }
    }
}

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum AccessMode {
    Normal,
    WhiteList,
}
impl Default for AccessMode {
    fn default() -> Self {
        Self::Normal
    }
}

impl Default for CollectionMode {
    fn default() -> Self {
        Self::Invalid
    }
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct Ownership<AccountId> {
    pub owner: AccountId,
    pub fraction: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CollectionType<AccountId> {
    pub owner: AccountId,
    pub mode: CollectionMode,
    pub access: AccessMode,
    pub decimal_points: u32,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub mint_mode: bool,
    pub offchain_schema: Vec<u8>,
    pub sponsor: AccountId, // Who pays fees. If set to default address, the fees are applied to the transaction sender
    pub unconfirmed_sponsor: AccountId, // Sponsor address that has not yet confirmed sponsorship
    pub variable_on_chain_schema: Vec<u8>, //
    pub const_on_chain_schema: Vec<u8>, //
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct FungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub value: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: Vec<Ownership<AccountId>>,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ApprovePermissions<AccountId> {
    pub approved: AccountId,
    pub amount: u64,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct VestingItem<AccountId, Moment> {
    pub sender: AccountId,
    pub recipient: AccountId,
    pub collection_id: u64,
    pub item_id: u64,
    pub amount: u64,
    pub vesting_date: Moment,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct BasketItem<AccountId, BlockNumber> {
    pub address: AccountId,
    pub start_block: BlockNumber,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ChainLimits {
    pub collection_numbers_limit: u64,
    pub account_token_ownership_limit: u64,
    pub collections_admins_limit: u64,
    pub custom_data_limit: u32,

    // Timeouts for item types in passed blocks
    pub nft_sponsor_transfer_timeout: u32,
    pub fungible_sponsor_transfer_timeout: u32,
    pub refungible_sponsor_transfer_timeout: u32,
}

pub trait WeightInfo {
	fn create_collection() -> Weight;
	fn destroy_collection() -> Weight;
	fn add_to_white_list() -> Weight;
	fn remove_from_white_list() -> Weight;
    fn set_public_access_mode() -> Weight;
    fn set_mint_permission() -> Weight;
    fn change_collection_owner() -> Weight;
    fn add_collection_admin() -> Weight;
    fn remove_collection_admin() -> Weight;
    fn set_collection_sponsor() -> Weight;
    fn confirm_sponsorship() -> Weight;
    fn remove_collection_sponsor() -> Weight;
    fn create_item(s: usize) -> Weight;
    fn burn_item() -> Weight;
    fn transfer() -> Weight;
    fn approve() -> Weight;
    fn transfer_from() -> Weight;
    fn set_offchain_schema() -> Weight;
    fn set_const_on_chain_schema() -> Weight;
    fn set_variable_on_chain_schema() -> Weight;
    fn set_variable_meta_data() -> Weight;
    fn enable_contract_sponsoring() -> Weight;
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateNftData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateFungibleData {
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateReFungibleData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CreateItemData {
    NFT(CreateNftData),
    Fungible(CreateFungibleData),
    ReFungible(CreateReFungibleData)
}

impl CreateItemData {
    pub fn len(&self) -> usize {
        let len = match self {
            CreateItemData::NFT(data) => data.variable_data.len() + data.const_data.len(),
            CreateItemData::ReFungible(data) => data.variable_data.len() + data.const_data.len(),
            _ => 0
        };
        
        return len;
    }
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


decl_error! {
	/// Error for non-fungible-token module.
	pub enum Error for Module<T: Trait> {
        /// Total collections bound exceeded.
        TotalCollectionsLimitExceeded,
		/// Decimal_points parameter must be lower than 4.
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
        CantStoreMetadataInFungibleTokens
	}
}

pub trait Trait: system::Trait + Sized + transaction_payment::Trait + pallet_contracts::Trait {
    type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;

    /// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;
}

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

// #endregion

decl_storage! {
    trait Store for Module<T: Trait> as Nft {

        // Private members
        NextCollectionID: u64;
        CreatedCollectionCount: u64;
        ChainVersion: u64;
        ItemListIndex: map hasher(blake2_128_concat) u64 => u64;

        // Chain limits struct
        pub ChainLimit get(fn chain_limit) config(): ChainLimits;

        // Bound counters
        CollectionCount: u64;
        pub AccountItemCount get(fn account_item_count): map hasher(identity) T::AccountId => u64;

        // Basic collections
        pub Collection get(fn collection) config(): map hasher(identity) u64 => CollectionType<T::AccountId>;
        pub AdminList get(fn admin_list_collection): map hasher(identity) u64 => Vec<T::AccountId>;
        pub WhiteList get(fn white_list): map hasher(identity) u64 => Vec<T::AccountId>;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) T::AccountId => u64;

        /// second parameter: item id + owner account id
        pub ApprovedList get(fn approved): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) (u64, T::AccountId) => Vec<ApprovePermissions<T::AccountId>>;

        /// Item collections
        pub NftItemList get(fn nft_item_id) config(): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => NftItemType<T::AccountId>;
        pub FungibleItemList get(fn fungible_item_id) config(): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => FungibleItemType<T::AccountId>;
        pub ReFungibleItemList get(fn refungible_item_id) config(): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => ReFungibleItemType<T::AccountId>;

        /// Index list
        pub AddressTokens get(fn address_tokens): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) T::AccountId => Vec<u64>;

        /// Tokens transfer baskets
        pub NftTransferBasket get(fn nft_transfer_basket): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => T::BlockNumber;
        pub FungibleTransferBasket get(fn fungible_transfer_basket): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => Vec<BasketItem<T::AccountId, T::BlockNumber>>;
        pub ReFungibleTransferBasket get(fn refungible_transfer_basket): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => T::BlockNumber;

        // Contract Sponsorship and Ownership
        pub ContractOwner get(fn contract_owner): map hasher(twox_64_concat) T::AccountId => T::AccountId;
        pub ContractSelfSponsoring get(fn contract_self_sponsoring): map hasher(twox_64_concat) T::AccountId => bool;
        pub ContractSponsorBasket get(fn contract_sponsor_basket): map hasher(twox_64_concat) T::AccountId => T::BlockNumber;
        pub ContractSponsoringRateLimit get(fn contract_sponsoring_rate_limit): map hasher(twox_64_concat) T::AccountId => T::BlockNumber;
    }
    add_extra_genesis {
        build(|config: &GenesisConfig<T>| {
            // Modification of storage
            for (_num, _c) in &config.collection {
                <Module<T>>::init_collection(_c);
            }

            for (_num, _q, _i) in &config.nft_item_id {
                <Module<T>>::init_nft_token(_i);
            }

            for (_num, _q, _i) in &config.fungible_item_id {
                <Module<T>>::init_fungible_token(_i);
            }

            for (_num, _q, _i) in &config.refungible_item_id {
                <Module<T>>::init_refungible_token(_i);
            }
        })
    }
}

decl_event!(
    pub enum Event<T>
    where
        AccountId = <T as system::Trait>::AccountId,
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
        Created(u64, u8, AccountId),

        /// New item was created.
        /// 
        /// # Arguments
        /// 
        /// * collection_id: Id of the collection where item was created.
        /// 
        /// * item_id: Id of an item. Unique within the collection.
        ItemCreated(u64, u64),

        /// Collection item was burned.
        /// 
        /// # Arguments
        /// 
        /// collection_id.
        /// 
        /// item_id: Identifier of burned NFT.
        ItemDestroyed(u64, u64),
    }
);

decl_module! {
    pub struct Module<T: Trait> for enum Call where origin: T::Origin {

        fn deposit_event() = default;
        type Error = Error<T>;

        fn on_initialize(now: T::BlockNumber) -> Weight {

            if ChainVersion::get() < 2
            {
                let value = NextCollectionID::get();
                CreatedCollectionCount::put(value);
                ChainVersion::put(2);
            }

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
        #[weight = T::WeightInfo::create_collection()]
        pub fn create_collection(origin,
                                 collection_name: Vec<u16>,
                                 collection_description: Vec<u16>,
                                 token_prefix: Vec<u8>,
                                 mode: CollectionMode) -> DispatchResult {

            // Anyone can create a collection
            let who = ensure_signed(origin)?;

            let decimal_points = match mode {
                CollectionMode::Fungible(points) => points,
                CollectionMode::ReFungible(points) => points,
                _ => 0
            };

            // bound Total number of collections
            ensure!(CollectionCount::get() < ChainLimit::get().collection_numbers_limit, Error::<T>::TotalCollectionsLimitExceeded);

            // check params
            ensure!(decimal_points <= 4, Error::<T>::CollectionDecimalPointLimitExceeded);

            let mut name = collection_name.to_vec();
            name.push(0);
            ensure!(name.len() <= 64, Error::<T>::CollectionNameLimitExceeded);

            let mut description = collection_description.to_vec();
            description.push(0);
            ensure!(name.len() <= 256, Error::<T>::CollectionDescriptionLimitExceeded);

            let mut prefix = token_prefix.to_vec();
            prefix.push(0);
            ensure!(prefix.len() <= 16, Error::<T>::CollectionTokenPrefixLimitExceeded);

            // Generate next collection ID
            let next_id = CreatedCollectionCount::get()
                .checked_add(1)
                .ok_or(Error::<T>::NumOverflow)?;

            // bound counter
            let total = CollectionCount::get()
                .checked_add(1)
                .ok_or(Error::<T>::NumOverflow)?;

            CreatedCollectionCount::put(next_id);
            CollectionCount::put(total);

            // Create new collection
            let new_collection = CollectionType {
                owner: who.clone(),
                name: name,
                mode: mode.clone(),
                mint_mode: false,
                access: AccessMode::Normal,
                description: description,
                decimal_points: decimal_points,
                token_prefix: prefix,
                offchain_schema: Vec::new(),
                sponsor: T::AccountId::default(),
                unconfirmed_sponsor: T::AccountId::default(),
                variable_on_chain_schema: Vec::new(),
                const_on_chain_schema: Vec::new(),
            };

            // Add new collection to map
            <Collection<T>>::insert(next_id, new_collection);

            // call event
            Self::deposit_event(RawEvent::Created(next_id, mode.into(), who.clone()));

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
        #[weight = T::WeightInfo::destroy_collection()]
        pub fn destroy_collection(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender)?;

            <AddressTokens<T>>::remove_prefix(collection_id);
            <ApprovedList<T>>::remove_prefix(collection_id);
            <Balance<T>>::remove_prefix(collection_id);
            <ItemListIndex>::remove(collection_id);
            <AdminList<T>>::remove(collection_id);
            <Collection<T>>::remove(collection_id);
            <WhiteList<T>>::remove(collection_id);

            <NftItemList<T>>::remove_prefix(collection_id);
            <FungibleItemList<T>>::remove_prefix(collection_id);
            <ReFungibleItemList<T>>::remove_prefix(collection_id);

            <NftTransferBasket<T>>::remove_prefix(collection_id);
            <FungibleTransferBasket<T>>::remove_prefix(collection_id);
            <ReFungibleTransferBasket<T>>::remove_prefix(collection_id);

            if CollectionCount::get() > 0
            {
                // bound couter
                let total = CollectionCount::get()
                    .checked_sub(1)
                    .ok_or(Error::<T>::NumOverflow)?;

                CollectionCount::put(total);
            }

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
        #[weight = T::WeightInfo::add_to_white_list()]
        pub fn add_to_white_list(origin, collection_id: u64, address: T::AccountId) -> DispatchResult{

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;

            let mut white_list_collection: Vec<T::AccountId>;
            if <WhiteList<T>>::contains_key(collection_id) {
                white_list_collection = <WhiteList<T>>::get(collection_id);
                if !white_list_collection.contains(&address.clone())
                {
                    white_list_collection.push(address.clone());
                }
            }
            else {
                white_list_collection = Vec::new();
                white_list_collection.push(address.clone());
            }

            <WhiteList<T>>::insert(collection_id, white_list_collection);
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
        #[weight = T::WeightInfo::remove_from_white_list()]
        pub fn remove_from_white_list(origin, collection_id: u64, address: T::AccountId) -> DispatchResult{

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;

            if <WhiteList<T>>::contains_key(collection_id) {
                let mut white_list_collection = <WhiteList<T>>::get(collection_id);
                if white_list_collection.contains(&address.clone())
                {
                    white_list_collection.retain(|i| *i != address.clone());
                    <WhiteList<T>>::insert(collection_id, white_list_collection);
                }
            }

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
        #[weight = T::WeightInfo::set_public_access_mode()]
        pub fn set_public_access_mode(origin, collection_id: u64, mode: AccessMode) -> DispatchResult
        {
            let sender = ensure_signed(origin)?;

            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.access = mode;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::set_mint_permission()]
        pub fn set_mint_permission(origin, collection_id: u64, mint_permission: bool) -> DispatchResult
        {
            let sender = ensure_signed(origin)?;

            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.mint_mode = mint_permission;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::change_collection_owner()]
        pub fn change_collection_owner(origin, collection_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.owner = new_owner;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::add_collection_admin()]
        pub fn add_collection_admin(origin, collection_id: u64, new_admin_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;
            let mut admin_arr: Vec<T::AccountId> = Vec::new();

            if <AdminList<T>>::contains_key(collection_id)
            {
                admin_arr = <AdminList<T>>::get(collection_id);
                ensure!(!admin_arr.contains(&new_admin_id), Error::<T>::AlreadyAdmin);
            }

            // Number of collection admins
            ensure!((admin_arr.len() as u64) < ChainLimit::get().collections_admins_limit, Error::<T>::CollectionAdminsLimitExceeded);

            admin_arr.push(new_admin_id);
            <AdminList<T>>::insert(collection_id, admin_arr);

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
        #[weight = T::WeightInfo::remove_collection_admin()]
        pub fn remove_collection_admin(origin, collection_id: u64, account_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;

            if <AdminList<T>>::contains_key(collection_id)
            {
                let mut admin_arr = <AdminList<T>>::get(collection_id);
                admin_arr.retain(|i| *i != account_id);
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
        #[weight = T::WeightInfo::set_collection_sponsor()]
        pub fn set_collection_sponsor(origin, collection_id: u64, new_sponsor: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, Error::<T>::NoPermission);

            target_collection.unconfirmed_sponsor = new_sponsor;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        /// # Permissions
        /// 
        /// * Sponsor.
        /// 
        /// # Arguments
        /// 
        /// * collection_id.
        #[weight = T::WeightInfo::confirm_sponsorship()]
        pub fn confirm_sponsorship(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.unconfirmed_sponsor, Error::<T>::ConfirmUnsetSponsorFail);

            target_collection.sponsor = target_collection.unconfirmed_sponsor;
            target_collection.unconfirmed_sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::remove_collection_sponsor()]
        pub fn remove_collection_sponsor(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, Error::<T>::NoPermission);

            target_collection.sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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

        #[weight = T::WeightInfo::create_item(data.len())]
        pub fn create_item(origin, collection_id: u64, owner: T::AccountId, data: CreateItemData) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            Self::collection_exists(collection_id)?;

            let target_collection = <Collection<T>>::get(collection_id);

            Self::can_create_items_in_collection(collection_id, &target_collection, &sender, &owner)?;
            Self::validate_create_item_args(&target_collection, &data)?;
            Self::create_item_no_validation(collection_id, &target_collection, owner, data)?;

            Ok(())
        }

        /// This method creates multiple instances of NFT Collection created with CreateCollection method.
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
        #[weight = T::WeightInfo::create_item(items_data.into_iter()
                               .map(|data| { data.len() })
                               .sum())]
        pub fn create_multiple_items(origin, collection_id: u64, owner: T::AccountId, items_data: Vec<CreateItemData>) -> DispatchResult {

            ensure!(items_data.len() > 0, Error::<T>::EmptyArgument);
            let sender = ensure_signed(origin)?;

            Self::collection_exists(collection_id)?;
            let target_collection = <Collection<T>>::get(collection_id);

            Self::can_create_items_in_collection(collection_id, &target_collection, &sender, &owner)?;

            for data in &items_data {
                Self::validate_create_item_args(&target_collection, data)?;
            }
            for data in &items_data {
                Self::create_item_no_validation(collection_id, &target_collection, owner.clone(), data.clone())?;
            }

            Ok(())
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
        #[weight = T::WeightInfo::burn_item()]
        pub fn burn_item(origin, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::collection_exists(collection_id)?;

            // Transfer permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
            }

            match target_collection.mode
            {
                CollectionMode::NFT => Self::burn_nft_item(collection_id, item_id)?,
                CollectionMode::Fungible(_)  => Self::burn_fungible_item(collection_id, item_id)?,
                CollectionMode::ReFungible(_)  => Self::burn_refungible_item(collection_id, item_id, sender.clone())?,
                _ => ()
            };

            // call event
            Self::deposit_event(RawEvent::ItemDestroyed(collection_id, item_id));

            Ok(())
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
        #[weight = T::WeightInfo::transfer()]
        pub fn transfer(origin, recipient: T::AccountId, collection_id: u64, item_id: u64, value: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            // Transfer permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
                Self::check_white_list(collection_id, &recipient)?;
            }

            match target_collection.mode
            {
                CollectionMode::NFT => Self::transfer_nft(collection_id, item_id, sender.clone(), recipient)?,
                CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, item_id, value, sender.clone(), recipient)?,
                CollectionMode::ReFungible(_)  => Self::transfer_refungible(collection_id, item_id, value, sender.clone(), recipient)?,
                _ => ()
            };

            Ok(())
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
        #[weight = T::WeightInfo::approve()]
        pub fn approve(origin, approved: T::AccountId, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            // Transfer permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
                Self::check_white_list(collection_id, &approved)?;
            }

            // amount param stub
            let amount = 100000000;

            let list_exists = <ApprovedList<T>>::contains_key(collection_id, (item_id, sender.clone()));
            if list_exists {

                let mut list = <ApprovedList<T>>::get(collection_id, (item_id, sender.clone()));
                let item_contains = list.iter().any(|i| i.approved == approved);

                if !item_contains {
                    list.push(ApprovePermissions { approved: approved.clone(), amount: amount });
                    <ApprovedList<T>>::insert(collection_id, (item_id, sender.clone()), list);
                }
            } else {

                let mut list = Vec::new();
                list.push(ApprovePermissions { approved: approved.clone(), amount: amount });
                <ApprovedList<T>>::insert(collection_id, (item_id, sender.clone()), list);
            }

            Ok(())
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
        #[weight = T::WeightInfo::transfer_from()]
        pub fn transfer_from(origin, from: T::AccountId, recipient: T::AccountId, collection_id: u64, item_id: u64, value: u64 ) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            let mut appoved_transfer = false;

            // Check approve
            if <ApprovedList<T>>::contains_key(collection_id, (item_id, from.clone())) {
                let list_itm = <ApprovedList<T>>::get(collection_id, (item_id, from.clone()));
                let opt_item = list_itm.iter().find(|i| i.approved == sender.clone());
                if opt_item.is_some()
                {
                    appoved_transfer = true;
                    ensure!(opt_item.unwrap().amount >= value, Error::<T>::TokenValueNotEnough);
                }
            }

            // Transfer permissions check
            let target_collection = <Collection<T>>::get(collection_id);
                ensure!(appoved_transfer || Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
                Self::check_white_list(collection_id, &recipient)?;
            }

            // remove approve
            let approve_list: Vec<ApprovePermissions<T::AccountId>> = <ApprovedList<T>>::get(collection_id, (item_id, from.clone()))
                .into_iter().filter(|i| i.approved != sender.clone()).collect();
            <ApprovedList<T>>::insert(collection_id, (item_id, from.clone()), approve_list);


            match target_collection.mode
            {
                CollectionMode::NFT => Self::transfer_nft(collection_id, item_id, from, recipient)?,
                CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, item_id, value, from.clone(), recipient)?,
                CollectionMode::ReFungible(_)  => Self::transfer_refungible(collection_id, item_id, value, from.clone(), recipient)?,
                _ => ()
            };

            Ok(())
        }

        ///
        #[weight = 0]
        pub fn safe_transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            // let no_perm_mes = "You do not have permissions to modify this collection";
            // ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            // let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            // ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            // // on_nft_received  call

            // Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
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
        #[weight = T::WeightInfo::set_variable_meta_data()]
        pub fn set_variable_meta_data (
            origin,
            collection_id: u64,
            item_id: u64,
            data: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            
            Self::collection_exists(collection_id)?;
            
            ensure!(ChainLimit::get().custom_data_limit >= data.len() as u32, Error::<T>::TokenVariableDataLimitExceeded);

            // Modify permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            Self::item_exists(collection_id, item_id, &target_collection.mode)?;

            match target_collection.mode
            {
                CollectionMode::NFT => Self::set_nft_variable_data(collection_id, item_id, data)?,
                CollectionMode::ReFungible(_)  => Self::set_re_fungible_variable_data(collection_id, item_id, data)?,
                CollectionMode::Fungible(_) => fail!(Error::<T>::CantStoreMetadataInFungibleTokens),
                _ => fail!(Error::<T>::UnexpectedCollectionType)
            };

            Ok(())
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
        #[weight = T::WeightInfo::set_offchain_schema()]
        pub fn set_offchain_schema(
            origin,
            collection_id: u64,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.offchain_schema = schema;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::set_const_on_chain_schema()]
        pub fn set_const_on_chain_schema (
            origin,
            collection_id: u64,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.const_on_chain_schema = schema;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
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
        #[weight = T::WeightInfo::set_const_on_chain_schema()]
        pub fn set_variable_on_chain_schema (
            origin,
            collection_id: u64,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.variable_on_chain_schema = schema;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        // Sudo permissions function
        #[weight = 0]
        pub fn set_chain_limits(
            origin,
            limits: ChainLimits
        ) -> DispatchResult {
            ensure_root(origin)?;
            <ChainLimit>::put(limits);
            Ok(())
        }

        /// Enable smart contract self-sponsoring.
        /// 
        /// # Permissions
        /// 
        /// * Contract Owner
        /// 
        /// # Arguments
        /// 
        /// * contract address
        /// * enable flag
        /// 
        #[weight = T::WeightInfo::enable_contract_sponsoring()]
        pub fn enable_contract_sponsoring(
            origin,
            contract_address: T::AccountId,
            enable: bool
        ) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());

            let mut is_owner = false;
            if <ContractOwner<T>>::contains_key(contract_address.clone()) {
                let owner = <ContractOwner<T>>::get(&contract_address);
                is_owner = sender == owner;
            }
            ensure!(is_owner, Error::<T>::NoPermission);

            <ContractSelfSponsoring<T>>::insert(contract_address, enable);
            Ok(())
        }

        /// Set the rate limit for contract sponsoring to specified number of blocks.
        /// 
        /// If not set (has the default value of 0 blocks), the sponsoring will be disabled. 
        /// If set to the number B (for blocks), the transactions will be sponsored with a rate 
        /// limit of B, i.e. fees for every transaction sent to this smart contract will be paid 
        /// from contract endowment if there are at least B blocks between such transactions. 
        /// Nonetheless, if transactions are sent more frequently, the fees are paid by the sender.
        /// 
        /// # Permissions
        /// 
        /// * Contract Owner
        /// 
        /// # Arguments
        /// 
        /// -`contract_address`: Address of the contract to sponsor
        /// -`rate_limit`: Number of blocks to wait until the next sponsored transaction is allowed
        /// 
        #[weight = 0]
        pub fn set_contract_sponsoring_rate_limit(
            origin,
            contract_address: T::AccountId,
            rate_limit: T::BlockNumber
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            let mut is_owner = false;
            if <ContractOwner<T>>::contains_key(contract_address.clone()) {
                let owner = <ContractOwner<T>>::get(&contract_address);
                is_owner = sender == owner;
            }
            ensure!(is_owner, Error::<T>::NoPermission);

            <ContractSponsoringRateLimit<T>>::insert(contract_address, rate_limit);
            Ok(())
        }

        // #[cfg(feature = "runtime-benchmarks")]
        // #[weight = 0]
        // pub fn add_contract_sponsoring_debug(
        //     origin,
        //     contract_address: T::AccountId, 
        //     owner: T::AccountId) -> DispatchResult {
        //     let sender = ensure_signed(origin)?;
        //     <ContractOwner<T>>::insert(contract_address.clone(), owner);
        //     Ok(())
        // }
    
    }
}

impl<T: Trait> Module<T> {

    fn can_create_items_in_collection(collection_id: u64, collection: &CollectionType<T::AccountId>, sender: &T::AccountId, owner: &T::AccountId) -> DispatchResult {

        if !Self::is_owner_or_admin_permissions(collection_id, sender.clone()) {
            ensure!(collection.mint_mode == true, Error::<T>::PublicMintingNotAllowed);
            Self::check_white_list(collection_id, owner)?;
            Self::check_white_list(collection_id, sender)?;
        }

        Ok(())
    }

    fn validate_create_item_args(target_collection: &CollectionType<T::AccountId>, data: &CreateItemData) -> DispatchResult {
        match target_collection.mode
        {
            CollectionMode::NFT => {
                if let CreateItemData::NFT(data) = data {
                    // check sizes
                    ensure!(ChainLimit::get().custom_data_limit >= data.const_data.len() as u32, Error::<T>::TokenConstDataLimitExceeded);
                    ensure!(ChainLimit::get().custom_data_limit >= data.variable_data.len() as u32, Error::<T>::TokenVariableDataLimitExceeded);
                } else {
                    fail!(Error::<T>::NotNftDataUsedToMintNftCollectionToken);
                }
            },
            CollectionMode::Fungible(_) => {
                if let CreateItemData::Fungible(_) = data {
                } else {
                    fail!(Error::<T>::NotFungibleDataUsedToMintFungibleCollectionToken);
                }
            },
            CollectionMode::ReFungible(_) => {
                if let CreateItemData::ReFungible(data) = data {

                    // check sizes
                    ensure!(ChainLimit::get().custom_data_limit >= data.const_data.len() as u32, Error::<T>::TokenConstDataLimitExceeded);
                    ensure!(ChainLimit::get().custom_data_limit >= data.variable_data.len() as u32, Error::<T>::TokenVariableDataLimitExceeded);
                } else {
                    fail!(Error::<T>::NotReFungibleDataUsedToMintReFungibleCollectionToken);
                }
            },
            _ => { fail!(Error::<T>::UnexpectedCollectionType); }
        };

        Ok(())
    }

    fn create_item_no_validation(collection_id: u64, collection: &CollectionType<T::AccountId>, owner: T::AccountId, data: CreateItemData) -> DispatchResult {
        match data
        {
            CreateItemData::NFT(data) => {
                let item = NftItemType {
                    collection: collection_id,
                    owner,
                    const_data: data.const_data,
                    variable_data: data.variable_data
                };

                Self::add_nft_item(item)?;
            },
            CreateItemData::Fungible(_) => {
                let item = FungibleItemType {
                    collection: collection_id,
                    owner,
                    value: (10 as u128).pow(collection.decimal_points)
                };

                Self::add_fungible_item(item)?;
            },
            CreateItemData::ReFungible(data) => {
                let mut owner_list = Vec::new();
                let value = (10 as u128).pow(collection.decimal_points);
                owner_list.push(Ownership {owner: owner.clone(), fraction: value});

                let item = ReFungibleItemType {
                    collection: collection_id,
                    owner: owner_list,
                    const_data: data.const_data,
                    variable_data: data.variable_data
                };

                Self::add_refungible_item(item)?;
            }
        };


        // call event
        Self::deposit_event(RawEvent::ItemCreated(collection_id, <ItemListIndex>::get(collection_id)));

        Ok(())
    }

    fn add_fungible_item(item: FungibleItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        let itemcopy = item.clone();
        let owner = item.owner.clone();
        let value = item.value as u64;

        Self::add_token_index(item.collection, current_index, owner.clone())?;

        <ItemListIndex>::insert(item.collection, current_index);
        <FungibleItemList<T>>::insert(item.collection, current_index, itemcopy);

        // Add current block
        let v: Vec<BasketItem<T::AccountId, T::BlockNumber>> = Vec::new();
        <FungibleTransferBasket<T>>::insert(item.collection, current_index, v);
        
        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);

        Ok(())
    }

    fn add_refungible_item(item: ReFungibleItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        let itemcopy = item.clone();

        let value = item.owner.first().unwrap().fraction as u64;
        let owner = item.owner.first().unwrap().owner.clone();

        Self::add_token_index(item.collection, current_index, owner.clone())?;

        <ItemListIndex>::insert(item.collection, current_index);
        <ReFungibleItemList<T>>::insert(item.collection, current_index, itemcopy);

        // Add current block
        let block_number: T::BlockNumber = 0.into();
        <ReFungibleTransferBasket<T>>::insert(item.collection, current_index, block_number);

        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);

        Ok(())
    }

    fn add_nft_item(item: NftItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;

        let item_owner = item.owner.clone();
        let collection_id = item.collection.clone();
        Self::add_token_index(collection_id, current_index, item.owner.clone())?;

        <ItemListIndex>::insert(collection_id, current_index);
        <NftItemList<T>>::insert(collection_id, current_index, item);

        // Add current block
        let block_number: T::BlockNumber = 0.into();
        <NftTransferBasket<T>>::insert(collection_id, current_index, block_number);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, item_owner.clone())
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item_owner.clone(), new_balance);

        Ok(())
    }

    fn burn_refungible_item(
        collection_id: u64,
        item_id: u64,
        owner: T::AccountId,
    ) -> DispatchResult {
        ensure!(
            <ReFungibleItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );
        let collection = <ReFungibleItemList<T>>::get(collection_id, item_id);
        let item = collection
            .owner
            .iter()
            .filter(|&i| i.owner == owner)
            .next()
            .unwrap();
        Self::remove_token_index(collection_id, item_id, owner.clone())?;

        // remove approve list
        <ApprovedList<T>>::remove(collection_id, (item_id, owner.clone()));

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(item.fraction as u64)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);

        <ReFungibleItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn burn_nft_item(collection_id: u64, item_id: u64) -> DispatchResult {
        ensure!(
            <NftItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );
        let item = <NftItemList<T>>::get(collection_id, item_id);
        Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

        // remove approve list
        <ApprovedList<T>>::remove(collection_id, (item_id, item.owner.clone()));

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);
        <NftItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn burn_fungible_item(collection_id: u64, item_id: u64) -> DispatchResult {
        ensure!(
            <FungibleItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );
        let item = <FungibleItemList<T>>::get(collection_id, item_id);
        Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

        // remove approve list
        <ApprovedList<T>>::remove(collection_id, (item_id, item.owner.clone()));

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(item.value as u64)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);

        <FungibleItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn collection_exists(collection_id: u64) -> DispatchResult {
        ensure!(
            <Collection<T>>::contains_key(collection_id),
            Error::<T>::CollectionNotFound
        );
        Ok(())
    }

    fn check_owner_permissions(collection_id: u64, subject: T::AccountId) -> DispatchResult {
        Self::collection_exists(collection_id)?;

        let target_collection = <Collection<T>>::get(collection_id);
        ensure!(
            subject == target_collection.owner,
            Error::<T>::NoPermission
        );

        Ok(())
    }

    fn is_owner_or_admin_permissions(collection_id: u64, subject: T::AccountId) -> bool {
        let target_collection = <Collection<T>>::get(collection_id);
        let mut result: bool = subject == target_collection.owner;
        let exists = <AdminList<T>>::contains_key(collection_id);

        if !result & exists {
            if <AdminList<T>>::get(collection_id).contains(&subject) {
                result = true
            }
        }

        result
    }

    fn check_owner_or_admin_permissions(
        collection_id: u64,
        subject: T::AccountId,
    ) -> DispatchResult {
        Self::collection_exists(collection_id)?;
        let result = Self::is_owner_or_admin_permissions(collection_id, subject.clone());

        ensure!(
            result,
            Error::<T>::NoPermission
        );
        Ok(())
    }

    fn is_item_owner(subject: T::AccountId, collection_id: u64, item_id: u64) -> bool {
        let target_collection = <Collection<T>>::get(collection_id);

        match target_collection.mode {
            CollectionMode::NFT => {
                <NftItemList<T>>::get(collection_id, item_id).owner == subject
            }
            CollectionMode::Fungible(_) => {
                <FungibleItemList<T>>::get(collection_id, item_id).owner == subject
            }
            CollectionMode::ReFungible(_) => {
                <ReFungibleItemList<T>>::get(collection_id, item_id)
                    .owner
                    .iter()
                    .any(|i| i.owner == subject)
            }
            CollectionMode::Invalid => false,
        }
    }

    fn check_white_list(collection_id: u64, address: &T::AccountId) -> DispatchResult {
        let mes = Error::<T>::AddresNotInWhiteList;
        ensure!(<WhiteList<T>>::contains_key(collection_id), mes);
        let wl = <WhiteList<T>>::get(collection_id);
        ensure!(wl.contains(address), mes);

        Ok(())
    }

    fn transfer_fungible(
        collection_id: u64,
        item_id: u64,
        value: u64,
        owner: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        ensure!(
            <FungibleItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );

        let full_item = <FungibleItemList<T>>::get(collection_id, item_id);
        let amount = full_item.value;

        ensure!(amount >= value.into(), Error::<T>::TokenValueTooLow);

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, owner.clone())
            .checked_sub(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, owner.clone(), balance_old_owner);

        let mut new_owner_account_id = 0;
        let new_owner_items = <AddressTokens<T>>::get(collection_id, new_owner.clone());
        if new_owner_items.len() > 0 {
            new_owner_account_id = new_owner_items[0];
        }

        let val64 = value.into();

        // transfer
        if amount == val64 && new_owner_account_id == 0 {
            // change owner
            // new owner do not have account
            let mut new_full_item = full_item.clone();
            new_full_item.owner = new_owner.clone();
            <FungibleItemList<T>>::insert(collection_id, item_id, new_full_item);

            // update balance
            let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
                .checked_add(value)
                .ok_or(Error::<T>::NumOverflow)?;
            <Balance<T>>::insert(collection_id, new_owner.clone(), balance_new_owner);

            // update index collection
            Self::move_token_index(collection_id, item_id, owner.clone(), new_owner.clone())?;
        } else {
            let mut new_full_item = full_item.clone();
            new_full_item.value -= val64;

            // separate amount
            if new_owner_account_id > 0 {
                // new owner has account
                let mut item = <FungibleItemList<T>>::get(collection_id, new_owner_account_id);
                item.value += val64;

                // update balance
                let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
                    .checked_add(value)
                    .ok_or(Error::<T>::NumOverflow)?;
                <Balance<T>>::insert(collection_id, new_owner.clone(), balance_new_owner);

                <FungibleItemList<T>>::insert(collection_id, new_owner_account_id, item);
            } else {
                // new owner do not have account
                let item = FungibleItemType {
                    collection: collection_id,
                    owner: new_owner.clone(),
                    value: val64,
                };

                Self::add_fungible_item(item)?;
            }

            if amount == val64 {
                Self::remove_token_index(collection_id, item_id, full_item.owner.clone())?;

                // remove approve list
                <ApprovedList<T>>::remove(collection_id, (item_id, full_item.owner.clone()));
                <FungibleItemList<T>>::remove(collection_id, item_id);
            }

            <FungibleItemList<T>>::insert(collection_id, item_id, new_full_item);
        }

        Ok(())
    }

    fn transfer_refungible(
        collection_id: u64,
        item_id: u64,
        value: u64,
        owner: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        ensure!(
            <ReFungibleItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );

        let full_item = <ReFungibleItemList<T>>::get(collection_id, item_id);
        let item = full_item
            .owner
            .iter()
            .filter(|i| i.owner == owner)
            .next()
            .ok_or(Error::<T>::NumOverflow)?;
        let amount = item.fraction;

        ensure!(amount >= value.into(), Error::<T>::TokenValueTooLow);

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), balance_old_owner);

        let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, new_owner.clone(), balance_new_owner);

        let old_owner = item.owner.clone();
        let new_owner_has_account = full_item.owner.iter().any(|i| i.owner == new_owner);
        let val64 = value.into();

        // transfer
        if amount == val64 && !new_owner_has_account {
            // change owner
            // new owner do not have account
            let mut new_full_item = full_item.clone();
            new_full_item
                .owner
                .iter_mut()
                .find(|i| i.owner == owner)
                .unwrap()
                .owner = new_owner.clone();
            <ReFungibleItemList<T>>::insert(collection_id, item_id, new_full_item);

            // update index collection
            Self::move_token_index(collection_id, item_id, old_owner.clone(), new_owner.clone())?;
        } else {
            let mut new_full_item = full_item.clone();
            new_full_item
                .owner
                .iter_mut()
                .find(|i| i.owner == owner)
                .unwrap()
                .fraction -= val64;

            // separate amount
            if new_owner_has_account {
                // new owner has account
                new_full_item
                    .owner
                    .iter_mut()
                    .find(|i| i.owner == new_owner)
                    .unwrap()
                    .fraction += val64;
            } else {
                // new owner do not have account
                new_full_item.owner.push(Ownership {
                    owner: new_owner.clone(),
                    fraction: val64,
                });
                Self::add_token_index(collection_id, item_id, new_owner.clone())?;
            }

            <ReFungibleItemList<T>>::insert(collection_id, item_id, new_full_item);
        }

        Ok(())
    }

    fn transfer_nft(
        collection_id: u64,
        item_id: u64,
        sender: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        ensure!(
            <NftItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );

        let mut item = <NftItemList<T>>::get(collection_id, item_id);

        ensure!(
            sender == item.owner,
            Error::<T>::MustBeTokenOwner
        );

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), balance_old_owner);

        let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, new_owner.clone(), balance_new_owner);

        // change owner
        let old_owner = item.owner.clone();
        item.owner = new_owner.clone();
        <NftItemList<T>>::insert(collection_id, item_id, item);

        // update index collection
        Self::move_token_index(collection_id, item_id, old_owner.clone(), new_owner.clone())?;

        // reset approved list
        <ApprovedList<T>>::remove(collection_id, (item_id, old_owner));
        Ok(())
    }
    
    fn item_exists(
        collection_id: u64,
        item_id: u64,
        mode: &CollectionMode
    ) -> DispatchResult {
        match mode {
            CollectionMode::NFT => ensure!(<NftItemList<T>>::contains_key(collection_id, item_id), Error::<T>::TokenNotFound),
            CollectionMode::ReFungible(_) => ensure!(<ReFungibleItemList<T>>::contains_key(collection_id, item_id), Error::<T>::TokenNotFound),
            CollectionMode::Fungible(_) => ensure!(<FungibleItemList<T>>::contains_key(collection_id, item_id), Error::<T>::TokenNotFound),
            _ => ()
        };
        
        Ok(())
    }

    fn set_re_fungible_variable_data(
        collection_id: u64,
        item_id: u64,
        data: Vec<u8>
    ) -> DispatchResult {
        let mut item = <ReFungibleItemList<T>>::get(collection_id, item_id);

        item.variable_data = data;

        <ReFungibleItemList<T>>::insert(collection_id, item_id, item);

        Ok(())
    }

    fn set_nft_variable_data(
        collection_id: u64,
        item_id: u64,
        data: Vec<u8>
    ) -> DispatchResult {
        let mut item = <NftItemList<T>>::get(collection_id, item_id);
        
        item.variable_data = data;

        <NftItemList<T>>::insert(collection_id, item_id, item);
        
        Ok(())
    }

    fn init_collection(item: &CollectionType<T::AccountId>) {
        // check params
        assert!(
            item.decimal_points <= 4,
            "decimal_points parameter must be lower than 4"
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
        let next_id = CreatedCollectionCount::get()
            .checked_add(1)
            .unwrap();

        CreatedCollectionCount::put(next_id);
    }

    fn init_nft_token(item: &NftItemType<T::AccountId>) {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .unwrap();

        let item_owner = item.owner.clone();
        let collection_id = item.collection.clone();
        Self::add_token_index(collection_id, current_index, item.owner.clone()).unwrap();

        <ItemListIndex>::insert(collection_id, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, item_owner.clone())
            .checked_add(1)
            .unwrap();
        <Balance<T>>::insert(collection_id, item_owner.clone(), new_balance);
    }

    fn init_fungible_token(item: &FungibleItemType<T::AccountId>) {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .unwrap();
        let owner = item.owner.clone();
        let value = item.value as u64;

        Self::add_token_index(item.collection, current_index, owner.clone()).unwrap();

        <ItemListIndex>::insert(item.collection, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .unwrap();
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);
    }

    fn init_refungible_token(item: &ReFungibleItemType<T::AccountId>) {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .unwrap();

        let value = item.owner.first().unwrap().fraction as u64;
        let owner = item.owner.first().unwrap().owner.clone();

        Self::add_token_index(item.collection, current_index, owner.clone()).unwrap();

        <ItemListIndex>::insert(item.collection, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .unwrap();
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);
    }

    fn add_token_index(collection_id: u64, item_index: u64, owner: T::AccountId) -> DispatchResult {

        // add to account limit
        if <AccountItemCount<T>>::contains_key(owner.clone()) {

            // bound Owned tokens by a single address
            let count = <AccountItemCount<T>>::get(owner.clone());
            ensure!(count < ChainLimit::get().account_token_ownership_limit, Error::<T>::AddressOwnershipLimitExceeded);

            <AccountItemCount<T>>::insert(owner.clone(), count
                .checked_add(1)
                .ok_or(Error::<T>::NumOverflow)?);
        }
        else {
            <AccountItemCount<T>>::insert(owner.clone(), 1);
        }

        let list_exists = <AddressTokens<T>>::contains_key(collection_id, owner.clone());
        if list_exists {
            let mut list = <AddressTokens<T>>::get(collection_id, owner.clone());
            let item_contains = list.contains(&item_index.clone());

            if !item_contains {
                list.push(item_index.clone());
            }

            <AddressTokens<T>>::insert(collection_id, owner.clone(), list);
        } else {
            let mut itm = Vec::new();
            itm.push(item_index.clone());
            <AddressTokens<T>>::insert(collection_id, owner, itm);
            
        }

        Ok(())
    }

    fn remove_token_index(
        collection_id: u64,
        item_index: u64,
        owner: T::AccountId,
    ) -> DispatchResult {

        // update counter
        <AccountItemCount<T>>::insert(owner.clone(), 
            <AccountItemCount<T>>::get(owner.clone())
            .checked_sub(1)
            .ok_or(Error::<T>::NumOverflow)?);


        let list_exists = <AddressTokens<T>>::contains_key(collection_id, owner.clone());
        if list_exists {
            let mut list = <AddressTokens<T>>::get(collection_id, owner.clone());
            let item_contains = list.contains(&item_index.clone());

            if item_contains {
                list.retain(|&item| item != item_index);
                <AddressTokens<T>>::insert(collection_id, owner, list);
            }
        }

        Ok(())
    }

    fn move_token_index(
        collection_id: u64,
        item_index: u64,
        old_owner: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        Self::remove_token_index(collection_id, item_index, old_owner)?;
        Self::add_token_index(collection_id, item_index, new_owner)?;

        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Economic models
// #region

/// Fee multiplier.
pub type Multiplier = FixedU128;

type BalanceOf<T> = <<T as transaction_payment::Trait>::Currency as Currency<
    <T as system::Trait>::AccountId,
>>::Balance;
type NegativeImbalanceOf<T> = <<T as transaction_payment::Trait>::Currency as Currency<
    <T as system::Trait>::AccountId,
>>::NegativeImbalance;

/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, Clone, Eq, PartialEq)]
pub struct ChargeTransactionPayment<T: Trait + Send + Sync>(
    #[codec(compact)] BalanceOf<T>
);

impl<T: Trait + Send + Sync> sp_std::fmt::Debug
    for ChargeTransactionPayment<T>
{
    #[cfg(feature = "std")]
    fn fmt(&self, f: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
        write!(f, "ChargeTransactionPayment<{:?}>", self.0)
    }
    #[cfg(not(feature = "std"))]
    fn fmt(&self, _: &mut sp_std::fmt::Formatter) -> sp_std::fmt::Result {
        Ok(())
    }
}

impl<T: Trait + Send + Sync> ChargeTransactionPayment<T>
where
    T::Call: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo> + IsSubType<Call<T>> + IsSubType<pallet_contracts::Call<T>>,
    BalanceOf<T>: Send + Sync + FixedPointOperand,
{
    /// utility constructor. Used only in client/factory code.
    pub fn from(fee: BalanceOf<T>) -> Self {
        Self(fee)
    }

    pub fn traditional_fee(
        len: usize,
        info: &DispatchInfoOf<T::Call>,
        tip: BalanceOf<T>,
    ) -> BalanceOf<T>
    where
        T::Call: Dispatchable<Info = DispatchInfo>,
    {
        <transaction_payment::Module<T>>::compute_fee(len as u32, info, tip)
    }

    fn withdraw_fee(
        &self,
        who: &T::AccountId,
        call: &T::Call,
        info: &DispatchInfoOf<T::Call>,
        len: usize,
    ) -> Result<(BalanceOf<T>, Option<NegativeImbalanceOf<T>>), TransactionValidityError> {
        let tip = self.0;

        // Set fee based on call type. Creating collection costs 1 Unique.
        // All other transactions have traditional fees so far
        // let fee = match call.is_sub_type() {
        //     Some(Call::create_collection(..)) => <BalanceOf<T>>::from(1_000_000_000),
        //     _ => Self::traditional_fee(len, info, tip), // Flat fee model, use only for testing purposes
        //                                                 // _ => <BalanceOf<T>>::from(100)
        // };
        let fee = Self::traditional_fee(len, info, tip);

        // Determine who is paying transaction fee based on ecnomic model
        // Parse call to extract collection ID and access collection sponsor
        let mut sponsor: T::AccountId = match IsSubType::<Call<T>>::is_sub_type(call) {
            Some(Call::create_item(collection_id, _properties, _owner)) => {
                <Collection<T>>::get(collection_id).sponsor
            }
            Some(Call::transfer(_new_owner, collection_id, _item_id, _value)) => {
                let _collection_mode = <Collection<T>>::get(collection_id).mode;

                // sponsor timeout
                let sponsor_transfer = match _collection_mode {
                    CollectionMode::NFT => {
                        let basket = <NftTransferBasket<T>>::get(collection_id, _item_id);
                        let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                        let limit_time = basket + ChainLimit::get().nft_sponsor_transfer_timeout.into();
                        if block_number >= limit_time {
                            <NftTransferBasket<T>>::insert(collection_id, _item_id, block_number);
                            true
                        }
                        else {
                            false
                        }
                    }
                    CollectionMode::Fungible(_) => {
                        let mut basket = <FungibleTransferBasket<T>>::get(collection_id, _item_id);
                        let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                        if basket.iter().any(|i| i.address == _new_owner.clone())
                        {
                            let item = basket.iter_mut().find(|i| i.address == _new_owner.clone()).unwrap().clone();
                            let limit_time = item.start_block + ChainLimit::get().fungible_sponsor_transfer_timeout.into();
                            if block_number >= limit_time {
                                basket.retain(|x| x.address == item.address);
                                basket.push(BasketItem { start_block: block_number, address: _new_owner.clone() });
                                <FungibleTransferBasket<T>>::insert(collection_id, _item_id, basket);
                                true
                            }
                            else {
                                false
                            }
                        }
                        else {
                            basket.push(BasketItem { start_block: block_number, address: _new_owner.clone()});
                            true
                        }
                    }
                    CollectionMode::ReFungible(_) => {
                        let basket = <ReFungibleTransferBasket<T>>::get(collection_id, _item_id);
                        let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                        let limit_time = basket + ChainLimit::get().nft_sponsor_transfer_timeout.into();
                        if block_number >= limit_time {
                            <ReFungibleTransferBasket<T>>::insert(collection_id, _item_id, block_number);
                            true
                        } else {
                            false
                        }
                    }
                    _ => {
                        false
                    },
                };

                if !sponsor_transfer {
                    T::AccountId::default()
                } else {
                    <Collection<T>>::get(collection_id).sponsor
                }
            }

            _ => T::AccountId::default(),
        };

        // Sponsor smart contracts
        sponsor = match IsSubType::<pallet_contracts::Call<T>>::is_sub_type(call) {

            // On instantiation: set the contract owner
            Some(pallet_contracts::Call::instantiate(_endowment, _gas_limit, code_hash, data)) => {

                let new_contract_address = <T as pallet_contracts::Trait>::DetermineContractAddress::contract_address_for(
                    code_hash,
                    &data,
                    &who,
                );
                <ContractOwner<T>>::insert(new_contract_address.clone(), who.clone());

                T::AccountId::default()
            },

            // When the contract is called, check if the sponsoring is enabled and pay fees from contract endowment if it is
            Some(pallet_contracts::Call::call(dest, _value, _gas_limit, _data)) => {

                let called_contract: T::AccountId = T::Lookup::lookup((*dest).clone()).unwrap_or(T::AccountId::default());

                let mut sponsor_transfer = false;
                if <ContractSponsoringRateLimit<T>>::contains_key(called_contract.clone()) {
                    let last_tx_block = <ContractSponsorBasket<T>>::get(&called_contract);
                    let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                    let rate_limit = <ContractSponsoringRateLimit<T>>::get(&called_contract);
                    let limit_time = last_tx_block + rate_limit;

                    if block_number >= limit_time {
                        <ContractSponsorBasket<T>>::insert(called_contract.clone(), block_number);
                        sponsor_transfer = true;
                    }
                } else {
                    sponsor_transfer = false;
                }
               
                
                let mut sp = T::AccountId::default();
                if sponsor_transfer {
                    if <ContractSelfSponsoring<T>>::contains_key(called_contract.clone()) {
                        if <ContractSelfSponsoring<T>>::get(called_contract.clone()) {
                            sp = called_contract;
                        }
                    }
                }

                sp
            },

            _ => sponsor,
        };

        let mut who_pays_fee: T::AccountId = sponsor.clone();
        if sponsor == T::AccountId::default() {
            who_pays_fee = who.clone();
        }

        // Only mess with balances if fee is not zero.
        if fee.is_zero() {
            return Ok((fee, None));
        }

        match <T as transaction_payment::Trait>::Currency::withdraw(
            &who_pays_fee,
            fee,
            if tip.is_zero() {
                WithdrawReason::TransactionPayment.into()
            } else {
                WithdrawReason::TransactionPayment | WithdrawReason::Tip
            },
            ExistenceRequirement::KeepAlive,
        ) {
            Ok(imbalance) => Ok((fee, Some(imbalance))),
            Err(_) => Err(InvalidTransaction::Payment.into()),
        }
    }
}


impl<T: Trait + Send + Sync> SignedExtension
    for ChargeTransactionPayment<T>
where
    BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
    T::Call: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo> + IsSubType<Call<T>> + IsSubType<pallet_contracts::Call<T>>,
{
    const IDENTIFIER: &'static str = "ChargeTransactionPayment";
    type AccountId = T::AccountId;
    type Call = T::Call;
    type AdditionalSigned = ();
    type Pre = (
        BalanceOf<T>,
        Self::AccountId,
        Option<NegativeImbalanceOf<T>>,
        BalanceOf<T>,
    );
    fn additional_signed(&self) -> sp_std::result::Result<(), TransactionValidityError> {
        Ok(())
    }

    fn validate(
        &self,
        _who: &Self::AccountId,
        _call: &Self::Call,
        _info: &DispatchInfoOf<Self::Call>,
        _len: usize,
    ) -> TransactionValidity {
        Ok(ValidTransaction::default())
    }

    fn pre_dispatch(
        self,
        who: &Self::AccountId,
        call: &Self::Call,
        info: &DispatchInfoOf<Self::Call>,
        len: usize,
    ) -> Result<Self::Pre, TransactionValidityError> {
        let (fee, imbalance) = self.withdraw_fee(who, call, info, len)?;
        Ok((self.0, who.clone(), imbalance, fee))
    }

    fn post_dispatch(
        pre: Self::Pre,
        info: &DispatchInfoOf<Self::Call>,
        post_info: &PostDispatchInfoOf<Self::Call>,
        len: usize,
        _result: &DispatchResult,
    ) -> Result<(), TransactionValidityError> {
        let (tip, who, imbalance, fee) = pre;
        if let Some(payed) = imbalance {
            let actual_fee = <transaction_payment::Module<T>>::compute_actual_fee(
                len as u32, info, post_info, tip,
            );
            let refund = fee.saturating_sub(actual_fee);
            let actual_payment =
                match <T as transaction_payment::Trait>::Currency::deposit_into_existing(
                    &who, refund,
                ) {
                    Ok(refund_imbalance) => {
                        // The refund cannot be larger than the up front payed max weight.
                        // `PostDispatchInfo::calc_unspent` guards against such a case.
                        match payed.offset(refund_imbalance) {
                            Ok(actual_payment) => actual_payment,
                            Err(_) => return Err(InvalidTransaction::Payment.into()),
                        }
                    }
                    // We do not recreate the account using the refund. The up front payment
                    // is gone in that case.
                    Err(_) => payed,
                };
            let imbalances = actual_payment.split(tip);
            <T as transaction_payment::Trait>::OnTransactionPayment::on_unbalanceds(
                Some(imbalances.0).into_iter().chain(Some(imbalances.1)),
            );
        }
        Ok(())
    }
}

// #endregion
