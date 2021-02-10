//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![recursion_limit = "1024"]

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
        Randomness, IsSubType,
    },
    weights::{
        constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
        DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
        WeightToFeePolynomial, DispatchClass,
    },
    StorageValue,
};

use frame_system::{self as system, ensure_signed, ensure_root};
use sp_runtime::sp_std::prelude::Vec;
use sp_runtime::{
    traits::{
        DispatchInfoOf, Dispatchable, PostDispatchInfoOf, Saturating, SaturatedConversion, SignedExtension, Zero,
    },
    transaction_validity::{
        TransactionPriority, InvalidTransaction, TransactionValidity, TransactionValidityError, ValidTransaction,
    },
    FixedPointOperand, FixedU128,
};
use sp_runtime::traits::StaticLookup;
use pallet_contracts::chain_extension::UncheckedFrom;
use transaction_payment::OnChargeTransaction;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

mod default_weights;

pub const MAX_DECIMAL_POINTS: DecimalPoints = 30;
pub const MAX_REFUNGIBLE_PIECES: u128 = 1_000_000_000_000_000_000_000;
pub const MAX_SPONSOR_TIMEOUT: u32 = 10_368_000;
pub const MAX_TOKEN_OWNERSHIP: u32 = 10_000_000;

// Structs
// #region

pub type CollectionId = u32;
pub type TokenId = u32;
pub type DecimalPoints = u8;

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CollectionMode {
    Invalid,
    NFT,
    // decimal points
    Fungible(DecimalPoints),
    ReFungible,
}

impl Default for CollectionMode {
    fn default() -> Self {
        Self::Invalid
    }
}

// REVIEW: This looks like a footgun because you loose information.
impl Into<u8> for CollectionMode {
    fn into(self) -> u8 {
        match self {
            CollectionMode::Invalid => 0,
            CollectionMode::NFT => 1,
            CollectionMode::Fungible(_) => 2,
            CollectionMode::ReFungible => 3,
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

#[derive(Encode, Decode, Eq, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum SchemaVersion {
    ImageURL,
    Unique,
}
impl Default for SchemaVersion {
    fn default() -> Self {
        Self::ImageURL
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
    pub decimal_points: DecimalPoints,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub mint_mode: bool,
    pub offchain_schema: Vec<u8>,
    pub schema_version: SchemaVersion,
    // REVIEW: You could replace the two sponsor fields with an enum like:
    // enum Sponsor { None, Unconfirmed(AccountId), Confirmed(AccountId) }
    pub sponsor: AccountId, // Who pays fees. If set to default address, the fees are applied to the transaction sender
    pub sponsor_confirmed: bool, // False if sponsor address has not yet confirmed sponsorship. True otherwise.
    pub limits: CollectionLimits, // Collection private restrictions 
    pub variable_on_chain_schema: Vec<u8>, //
    pub const_on_chain_schema: Vec<u8>, //
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct NftItemType<AccountId> {
    pub owner: AccountId,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct FungibleItemType {
    pub value: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ReFungibleItemType<AccountId> {
    pub owner: Vec<Ownership<AccountId>>,
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
}

// #[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
// #[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
// pub struct VestingItem<AccountId, Moment> {
//     pub sender: AccountId,
//     pub recipient: AccountId,
//     pub collection_id: CollectionId,
//     pub item_id: TokenId,
//     pub amount: u64,
//     pub vesting_date: Moment,
// }

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CollectionLimits {
    pub account_token_ownership_limit: u32,
    pub sponsored_data_size: u32,
    pub token_limit: u32,

    // Timeouts for item types in passed blocks
    pub sponsor_transfer_timeout: u32,
    pub owner_can_transfer: bool,
    pub owner_can_destroy: bool,
}

impl Default for CollectionLimits {
    fn default() -> CollectionLimits {
        CollectionLimits { 
            account_token_ownership_limit: 10_000_000, 
            token_limit: u32::max_value(),
            sponsored_data_size: u32::max_value(), 
            sponsor_transfer_timeout: 14400,
            owner_can_transfer: true,
            owner_can_destroy: true
        }
    }
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct ChainLimits {
    pub collection_numbers_limit: u32,
    pub account_token_ownership_limit: u32,
    pub collections_admins_limit: u64,
    pub custom_data_limit: u32,

    // Timeouts for item types in passed blocks
    pub nft_sponsor_transfer_timeout: u32,
    pub fungible_sponsor_transfer_timeout: u32,
    pub refungible_sponsor_transfer_timeout: u32,

    // Schema limits
    pub offchain_schema_limit: u32,
    pub variable_on_chain_schema_limit: u32,
    pub const_on_chain_schema_limit: u32,
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
    fn set_schema_version() -> Weight;
    fn set_chain_limits() -> Weight;
    fn set_contract_sponsoring_rate_limit() -> Weight;
    fn toggle_contract_white_list() -> Weight;
    fn add_to_contract_white_list() -> Weight;
    fn remove_from_contract_white_list() -> Weight;
    fn set_collection_limits() -> Weight;
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
    pub value: u128,
}

#[derive(Encode, Decode, Default, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub struct CreateReFungibleData {
    pub const_data: Vec<u8>,
    pub variable_data: Vec<u8>,
    pub pieces: u128,
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Serialize, Deserialize))]
pub enum CreateItemData {
    NFT(CreateNftData),
    Fungible(CreateFungibleData),
    ReFungible(CreateReFungibleData),
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
        /// Schema data size limit bound exceeded
        SchemaDataLimitExceeded,
        /// Maximum refungibility exceeded
        WrongRefungiblePieces
	}
}

pub trait Config: system::Config + Sized + transaction_payment::Config + pallet_contracts::Config {
    type Event: From<Event<Self>> + Into<<Self as system::Config>::Event>;

    /// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;
}

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

// #endregion

decl_storage! {
    trait Store for Module<T: Config> as Nft {

        // Private members
        NextCollectionID: CollectionId;
        // REVIEW: Consider introducing more type defs for the different number types to improve
        // readability.
        CreatedCollectionCount: u32;
        ChainVersion: u64;
        ItemListIndex: map hasher(identity) CollectionId => TokenId;

        // Chain limits struct
        pub ChainLimit get(fn chain_limit) config(): ChainLimits;

        // Bound counters
        CollectionCount: u32;
        pub AccountItemCount get(fn account_item_count): map hasher(twox_64_concat) T::AccountId => u32;

        // Basic collections
        // REVIEW: Prefer `twox_64_concat` for non-random keys (even if controlled by the chain).
        pub Collection get(fn collection) config(): map hasher(identity) CollectionId => CollectionType<T::AccountId>;
        pub AdminList get(fn admin_list_collection): map hasher(identity) CollectionId => Vec<T::AccountId>;
        pub WhiteList get(fn white_list): double_map hasher(identity) CollectionId, hasher(twox_64_concat) T::AccountId => bool;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): double_map hasher(identity) CollectionId, hasher(twox_64_concat) T::AccountId => u128;

        /// second parameter: item id + owner account id + spender account id
        pub Allowances get(fn approved): double_map hasher(identity) CollectionId, hasher(twox_64_concat) (TokenId, T::AccountId, T::AccountId) => u128;

        /// Item collections
        pub NftItemList get(fn nft_item_id) config(): double_map hasher(identity) CollectionId, hasher(identity) TokenId => NftItemType<T::AccountId>;
        pub FungibleItemList get(fn fungible_item_id) config(): double_map hasher(identity) CollectionId, hasher(twox_64_concat) T::AccountId => FungibleItemType;
        pub ReFungibleItemList get(fn refungible_item_id) config(): double_map hasher(identity) CollectionId, hasher(identity) TokenId => ReFungibleItemType<T::AccountId>;

        /// Index list
        pub AddressTokens get(fn address_tokens): double_map hasher(identity) CollectionId, hasher(twox_64_concat) T::AccountId => Vec<TokenId>;

        /// Tokens transfer baskets
        pub CreateItemBasket get(fn create_item_basket): map hasher(twox_64_concat) (CollectionId, T::AccountId) => T::BlockNumber;
        pub NftTransferBasket get(fn nft_transfer_basket): double_map hasher(identity) CollectionId, hasher(identity) TokenId => T::BlockNumber;
        pub FungibleTransferBasket get(fn fungible_transfer_basket): double_map hasher(identity) CollectionId, hasher(twox_64_concat) T::AccountId => T::BlockNumber;
        pub ReFungibleTransferBasket get(fn refungible_transfer_basket): double_map hasher(identity) CollectionId, hasher(identity) TokenId => T::BlockNumber;

        // Contract Sponsorship and Ownership
        pub ContractOwner get(fn contract_owner): map hasher(twox_64_concat) T::AccountId => T::AccountId;
        pub ContractSelfSponsoring get(fn contract_self_sponsoring): map hasher(twox_64_concat) T::AccountId => bool;
        pub ContractSponsorBasket get(fn contract_sponsor_basket): map hasher(twox_64_concat) (T::AccountId, T::AccountId) => T::BlockNumber;
        pub ContractSponsoringRateLimit get(fn contract_sponsoring_rate_limit): map hasher(twox_64_concat) T::AccountId => T::BlockNumber;
        pub ContractWhiteListEnabled get(fn contract_white_list_enabled): map hasher(twox_64_concat) T::AccountId => bool; 
        pub ContractWhiteList get(fn contract_white_list): double_map hasher(twox_64_concat) T::AccountId, hasher(twox_64_concat) T::AccountId => bool; 
    }
    add_extra_genesis {
        build(|config: &GenesisConfig<T>| {
            // Modification of storage
            for (_num, _c) in &config.collection {
                <Module<T>>::init_collection(_c);
            }

            for (_num, _c, _i) in &config.nft_item_id {
                <Module<T>>::init_nft_token(*_c, _i);
            }

            for (collection_id, account_id, fungible_item) in &config.fungible_item_id {
                <Module<T>>::init_fungible_token(*collection_id, account_id, fungible_item);
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
        AccountId = <T as system::Config>::AccountId,
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
        Created(CollectionId, u8, AccountId),

        /// New item was created.
        /// 
        /// # Arguments
        /// 
        /// * collection_id: Id of the collection where item was created.
        /// 
        /// * item_id: Id of an item. Unique within the collection.
        ItemCreated(CollectionId, TokenId),

        /// Collection item was burned.
        /// 
        /// # Arguments
        /// 
        /// collection_id.
        /// 
        /// item_id: Identifier of burned NFT.
        ItemDestroyed(CollectionId, TokenId),
    }
);

decl_module! {
    pub struct Module<T: Config> for enum Call 
    where 
        origin: T::Origin
    {
        fn deposit_event() = default;
        type Error = Error<T>;

        // REVIEW: (Prefer to) Use `on_runtime_upgrade` for storage migrations. Use genesis config
        // for initialization of chain storage at genesis.
        // REVIEW: Weight is incorrect. `ChainVersion` leads to 1 storage read on every run.
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
        #[weight = <T as Config>::WeightInfo::create_collection()]
        pub fn create_collection(origin,
                                 collection_name: Vec<u16>,
                                 collection_description: Vec<u16>,
                                 token_prefix: Vec<u8>,
                                 mode: CollectionMode) -> DispatchResult {

            // Anyone can create a collection
            let who = ensure_signed(origin)?;

            let decimal_points = match mode {
                CollectionMode::Fungible(points) => points,
                _ => 0
            };

            // bound Total number of collections
            ensure!(CollectionCount::get() < ChainLimit::get().collection_numbers_limit, Error::<T>::TotalCollectionsLimitExceeded);

            // check params
            ensure!(decimal_points <= MAX_DECIMAL_POINTS, Error::<T>::CollectionDecimalPointLimitExceeded);
            ensure!(collection_name.len() <= 64, Error::<T>::CollectionNameLimitExceeded);
            ensure!(collection_description.len() <= 256, Error::<T>::CollectionDescriptionLimitExceeded);
            ensure!(token_prefix.len() <= 16, Error::<T>::CollectionTokenPrefixLimitExceeded);

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
                name: collection_name,
                mode: mode.clone(),
                mint_mode: false,
                access: AccessMode::Normal,
                description: collection_description,
                decimal_points: decimal_points,
                token_prefix: token_prefix,
                offchain_schema: Vec::new(),
                schema_version: SchemaVersion::ImageURL,
                // REVIEW: Use Option<Account> or the suggested enum for this.
                sponsor: T::AccountId::default(),
                sponsor_confirmed: false,
                variable_on_chain_schema: Vec::new(),
                const_on_chain_schema: Vec::new(),
                limits: CollectionLimits::default()
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
        // REVIEW: You probably want to incentivize cleanup by requiring (and refunding) a deposit.
        #[weight = <T as Config>::WeightInfo::destroy_collection()]
        pub fn destroy_collection(origin, collection_id: CollectionId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender)?;

            <AddressTokens<T>>::remove_prefix(collection_id);
            <Allowances<T>>::remove_prefix(collection_id);
            <Balance<T>>::remove_prefix(collection_id);
            <ItemListIndex>::remove(collection_id);
            <AdminList<T>>::remove(collection_id);
            <Collection<T>>::remove(collection_id);
            <WhiteList<T>>::remove_prefix(collection_id);

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
        #[weight = <T as Config>::WeightInfo::add_to_white_list()]
        pub fn add_to_white_list(origin, collection_id: CollectionId, address: T::AccountId) -> DispatchResult{

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;

            <WhiteList<T>>::insert(collection_id, address, true);
            
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
        #[weight = <T as Config>::WeightInfo::remove_from_white_list()]
        pub fn remove_from_white_list(origin, collection_id: CollectionId, address: T::AccountId) -> DispatchResult{

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;

            <WhiteList<T>>::remove(collection_id, address);

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
        #[weight = <T as Config>::WeightInfo::set_public_access_mode()]
        pub fn set_public_access_mode(origin, collection_id: CollectionId, mode: AccessMode) -> DispatchResult
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
        #[weight = <T as Config>::WeightInfo::set_mint_permission()]
        pub fn set_mint_permission(origin, collection_id: CollectionId, mint_permission: bool) -> DispatchResult
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
        #[weight = <T as Config>::WeightInfo::change_collection_owner()]
        pub fn change_collection_owner(origin, collection_id: CollectionId, new_owner: T::AccountId) -> DispatchResult {

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
        #[weight = <T as Config>::WeightInfo::add_collection_admin()]
        pub fn add_collection_admin(origin, collection_id: CollectionId, new_admin_id: T::AccountId) -> DispatchResult {

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
        #[weight = <T as Config>::WeightInfo::remove_collection_admin()]
        pub fn remove_collection_admin(origin, collection_id: CollectionId, account_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;
            ensure!(<AdminList<T>>::contains_key(collection_id), Error::<T>::AdminNotFound);

            let mut admin_arr = <AdminList<T>>::get(collection_id);
            admin_arr.retain(|i| *i != account_id);
            <AdminList<T>>::insert(collection_id, admin_arr);

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
        #[weight = <T as Config>::WeightInfo::set_collection_sponsor()]
        pub fn set_collection_sponsor(origin, collection_id: CollectionId, new_sponsor: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, Error::<T>::NoPermission);

            target_collection.sponsor = new_sponsor;
            target_collection.sponsor_confirmed = false;
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
        #[weight = <T as Config>::WeightInfo::confirm_sponsorship()]
        pub fn confirm_sponsorship(origin, collection_id: CollectionId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.sponsor, Error::<T>::ConfirmUnsetSponsorFail);

            target_collection.sponsor_confirmed = true;
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
        #[weight = <T as Config>::WeightInfo::remove_collection_sponsor()]
        pub fn remove_collection_sponsor(origin, collection_id: CollectionId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), Error::<T>::CollectionNotFound);

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, Error::<T>::NoPermission);

            target_collection.sponsor = T::AccountId::default();
            target_collection.sponsor_confirmed = false;
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

        #[weight = <T as Config>::WeightInfo::create_item(data.len())]
        pub fn create_item(origin, collection_id: CollectionId, owner: T::AccountId, data: CreateItemData) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            Self::collection_exists(collection_id)?;

            let target_collection = <Collection<T>>::get(collection_id);

            Self::can_create_items_in_collection(collection_id, &target_collection, &sender, &owner)?;
            Self::validate_create_item_args(&target_collection, &data)?;
            Self::create_item_no_validation(collection_id, owner, data)?;

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
        #[weight = <T as Config>::WeightInfo::create_item(items_data.into_iter()
                               .map(|data| { data.len() })
                               .sum())]
        pub fn create_multiple_items(origin, collection_id: CollectionId, owner: T::AccountId, items_data: Vec<CreateItemData>) -> DispatchResult {

            ensure!(items_data.len() > 0, Error::<T>::EmptyArgument);
            let sender = ensure_signed(origin)?;

            Self::collection_exists(collection_id)?;
            let target_collection = <Collection<T>>::get(collection_id);

            Self::can_create_items_in_collection(collection_id, &target_collection, &sender, &owner)?;

            for data in &items_data {
                Self::validate_create_item_args(&target_collection, data)?;
            }
            for data in &items_data {
                Self::create_item_no_validation(collection_id, owner.clone(), data.clone())?;
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
        #[weight = <T as Config>::WeightInfo::burn_item()]
        pub fn burn_item(origin, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResult {

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
                CollectionMode::Fungible(_)  => Self::burn_fungible_item(&sender, collection_id, value)?,
                CollectionMode::ReFungible  => Self::burn_refungible_item(collection_id, item_id, &sender)?,
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
        #[weight = <T as Config>::WeightInfo::transfer()]
        pub fn transfer(origin, recipient: T::AccountId, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::transfer_internal(sender, recipient, collection_id, item_id, value)
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
        #[weight = <T as Config>::WeightInfo::approve()]
        pub fn approve(origin, spender: T::AccountId, collection_id: CollectionId, item_id: TokenId, amount: u128) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            Self::collection_exists(collection_id)?;
            Self::token_exists(collection_id, item_id, &sender)?;

            // Transfer permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
                Self::check_white_list(collection_id, &spender)?;
            }

            let allowance_exists = <Allowances<T>>::contains_key(collection_id, (item_id, &sender, &spender));
            let mut allowance: u128 = amount;
            if allowance_exists {
                allowance += <Allowances<T>>::get(collection_id, (item_id, &sender, &spender));
            }
            <Allowances<T>>::insert(collection_id, (item_id, sender.clone(), spender.clone()), allowance);

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
        #[weight = <T as Config>::WeightInfo::transfer_from()]
        pub fn transfer_from(origin, from: T::AccountId, recipient: T::AccountId, collection_id: CollectionId, item_id: TokenId, value: u128 ) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            let mut appoved_transfer = false;

            // Check approval
            let mut approval: u128 = 0;
            if <Allowances<T>>::contains_key(collection_id, (item_id, &from, &sender)) {
                approval = <Allowances<T>>::get(collection_id, (item_id, &from, &sender));
                ensure!(approval >= value, Error::<T>::TokenValueNotEnough);
                appoved_transfer = true;
            }

            let target_collection = <Collection<T>>::get(collection_id);

            // Limits check
            Self::is_correct_transfer(collection_id, &target_collection, &recipient)?;

            // Transfer permissions check         
            ensure!(appoved_transfer || Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            if target_collection.access == AccessMode::WhiteList {
                Self::check_white_list(collection_id, &sender)?;
                Self::check_white_list(collection_id, &recipient)?;
            }

            // Reduce approval by transferred amount or remove if remaining approval drops to 0
            if approval.checked_sub(value).unwrap_or(0) > 0 {
                <Allowances<T>>::insert(collection_id, (item_id, &from, &sender), approval - value);
            }
            else {
                <Allowances<T>>::remove(collection_id, (item_id, &from, &sender));
            }

            match target_collection.mode
            {
                CollectionMode::NFT => Self::transfer_nft(collection_id, item_id, from, recipient)?,
                CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, value, &from, &recipient)?,
                CollectionMode::ReFungible  => Self::transfer_refungible(collection_id, item_id, value, from.clone(), recipient)?,
                _ => ()
            };

            Ok(())
        }

        // #[weight = 0]
        // pub fn safe_transfer_from(origin, collection_id: CollectionId, item_id: TokenId, new_owner: T::AccountId) -> DispatchResult {

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
        #[weight = <T as Config>::WeightInfo::set_variable_meta_data()]
        pub fn set_variable_meta_data (
            origin,
            collection_id: CollectionId,
            item_id: TokenId,
            data: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            
            Self::collection_exists(collection_id)?;
            Self::token_exists(collection_id, item_id, &sender)?;

            ensure!(ChainLimit::get().custom_data_limit >= data.len() as u32, Error::<T>::TokenVariableDataLimitExceeded);

            // Modify permissions check
            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(Self::is_item_owner(sender.clone(), collection_id, item_id) ||
                Self::is_owner_or_admin_permissions(collection_id, sender.clone()),
                Error::<T>::NoPermission);

            match target_collection.mode
            {
                CollectionMode::NFT => Self::set_nft_variable_data(collection_id, item_id, data)?,
                CollectionMode::ReFungible  => Self::set_re_fungible_variable_data(collection_id, item_id, data)?,
                CollectionMode::Fungible(_) => fail!(Error::<T>::CantStoreMetadataInFungibleTokens),
                _ => fail!(Error::<T>::UnexpectedCollectionType)
            };

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
        #[weight = <T as Config>::WeightInfo::set_schema_version()]
        pub fn set_schema_version(
            origin,
            collection_id: CollectionId,
            version: SchemaVersion
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.schema_version = version;
            <Collection<T>>::insert(collection_id, target_collection);

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
        #[weight = <T as Config>::WeightInfo::set_offchain_schema()]
        pub fn set_offchain_schema(
            origin,
            collection_id: CollectionId,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            // check schema limit
            ensure!(schema.len() as u32 > ChainLimit::get().offchain_schema_limit, "");

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
        #[weight = <T as Config>::WeightInfo::set_const_on_chain_schema()]
        pub fn set_const_on_chain_schema (
            origin,
            collection_id: CollectionId,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            // check schema limit
            ensure!(schema.len() as u32 <= ChainLimit::get().const_on_chain_schema_limit, "");

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
        #[weight = <T as Config>::WeightInfo::set_const_on_chain_schema()]
        pub fn set_variable_on_chain_schema (
            origin,
            collection_id: CollectionId,
            schema: Vec<u8>
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender.clone())?;

            // check schema limit
            ensure!(schema.len() as u32 <= ChainLimit::get().variable_on_chain_schema_limit, "");

            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.variable_on_chain_schema = schema;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        // Sudo permissions function
        #[weight = <T as Config>::WeightInfo::set_chain_limits()]
        pub fn set_chain_limits(
            origin,
            limits: ChainLimits
        ) -> DispatchResult {

            #[cfg(not(feature = "runtime-benchmarks"))]
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
        #[weight = <T as Config>::WeightInfo::enable_contract_sponsoring()]
        pub fn enable_contract_sponsoring(
            origin,
            contract_address: T::AccountId,
            enable: bool
        ) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());

            Self::ensure_contract_owned(sender, &contract_address)?;

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
        #[weight = <T as Config>::WeightInfo::set_contract_sponsoring_rate_limit()]
        pub fn set_contract_sponsoring_rate_limit(
            origin,
            contract_address: T::AccountId,
            rate_limit: T::BlockNumber
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());

            Self::ensure_contract_owned(sender, &contract_address)?;
            <ContractSponsoringRateLimit<T>>::insert(contract_address, rate_limit);
            Ok(())
        }

        /// Enable the white list for a contract. Only addresses added to the white list with addToContractWhiteList will be able to call this smart contract.
        /// 
        /// # Permissions
        /// 
        /// * Address that deployed smart contract.
        /// 
        /// # Arguments
        /// 
        /// -`contract_address`: Address of the contract.
        /// 
        /// - `enable`: .  
        #[weight = <T as Config>::WeightInfo::toggle_contract_white_list()]
        pub fn toggle_contract_white_list(
            origin,
            contract_address: T::AccountId,
            enable: bool
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());

            Self::ensure_contract_owned(sender, &contract_address)?;
            <ContractWhiteListEnabled<T>>::insert(contract_address, enable);
            Ok(())
        }
        
        /// Add an address to smart contract white list.
        /// 
        /// # Permissions
        /// 
        /// * Address that deployed smart contract.
        /// 
        /// # Arguments
        /// 
        /// -`contract_address`: Address of the contract.
        ///
        /// -`account_address`: Address to add.
        #[weight = <T as Config>::WeightInfo::add_to_contract_white_list()]
        pub fn add_to_contract_white_list(
            origin,
            contract_address: T::AccountId,
            account_address: T::AccountId
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());
            
            Self::ensure_contract_owned(sender, &contract_address)?;      
            <ContractWhiteList<T>>::insert(contract_address, account_address, true);
            Ok(())
        }

        /// Remove an address from smart contract white list.
        /// 
        /// # Permissions
        /// 
        /// * Address that deployed smart contract.
        /// 
        /// # Arguments
        /// 
        /// -`contract_address`: Address of the contract.
        ///
        /// -`account_address`: Address to remove.
        #[weight = <T as Config>::WeightInfo::remove_from_contract_white_list()]
        pub fn remove_from_contract_white_list(
            origin,
            contract_address: T::AccountId,
            account_address: T::AccountId
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;

            #[cfg(feature = "runtime-benchmarks")]
            <ContractOwner<T>>::insert(contract_address.clone(), sender.clone());

            Self::ensure_contract_owned(sender, &contract_address)?;
            <ContractWhiteList<T>>::remove(contract_address, account_address);
            Ok(())
        }

        #[weight = <T as Config>::WeightInfo::set_collection_limits()]
        pub fn set_collection_limits(
            origin,
            collection_id: u32,
            limits: CollectionLimits,
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender.clone())?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            let chain_limits = ChainLimit::get();
            let climits = target_collection.limits;

            // collection bounds
            ensure!(limits.sponsor_transfer_timeout <= MAX_SPONSOR_TIMEOUT &&
                limits.account_token_ownership_limit <= MAX_TOKEN_OWNERSHIP,  
                Error::<T>::CollectionLimitBoundsExceeded);

            // token_limit   check  prev
            ensure!(climits.token_limit > limits.token_limit && 
                limits.token_limit <= chain_limits.account_token_ownership_limit, 
                Error::<T>::AccountTokenLimitExceeded);

            target_collection.limits = limits;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        } 
    }
}

impl<T: Config> Module<T> {

    pub fn transfer_internal(sender: T::AccountId, recipient: T::AccountId, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResult {

        let target_collection = <Collection<T>>::get(collection_id);

        // Limits check
        Self::is_correct_transfer(collection_id, &target_collection, &recipient)?;

        // Transfer permissions check
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
            CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, value, &sender, &recipient)?,
            CollectionMode::ReFungible  => Self::transfer_refungible(collection_id, item_id, value, sender.clone(), recipient)?,
            _ => ()
        };

        Ok(())
    }


    fn is_correct_transfer(collection_id: CollectionId, collection: &CollectionType<T::AccountId>, recipient: &T::AccountId) -> DispatchResult {

        // check token limit and account token limit
        let account_items: u32 = <AddressTokens<T>>::get(collection_id, recipient).len() as u32;
        ensure!(collection.limits.account_token_ownership_limit > account_items,  Error::<T>::AccountTokenLimitExceeded);
        
        Ok(())
    }

    fn can_create_items_in_collection(collection_id: CollectionId, collection: &CollectionType<T::AccountId>, sender: &T::AccountId, owner: &T::AccountId) -> DispatchResult {

        // check token limit and account token limit
        let total_items: u32 = ItemListIndex::get(collection_id);
        let account_items: u32 = <AddressTokens<T>>::get(collection_id, owner).len() as u32;
        ensure!(collection.limits.token_limit > total_items,  Error::<T>::CollectionTokenLimitExceeded);
        ensure!(collection.limits.account_token_ownership_limit > account_items,  Error::<T>::AccountTokenLimitExceeded);

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
            CollectionMode::ReFungible => {
                if let CreateItemData::ReFungible(data) = data {

                    // check sizes
                    ensure!(ChainLimit::get().custom_data_limit >= data.const_data.len() as u32, Error::<T>::TokenConstDataLimitExceeded);
                    ensure!(ChainLimit::get().custom_data_limit >= data.variable_data.len() as u32, Error::<T>::TokenVariableDataLimitExceeded);

                    // Check refungibility limits
                    ensure!(data.pieces <= MAX_REFUNGIBLE_PIECES, Error::<T>::WrongRefungiblePieces);
                    ensure!(data.pieces > 0, Error::<T>::WrongRefungiblePieces);
                } else {
                    fail!(Error::<T>::NotReFungibleDataUsedToMintReFungibleCollectionToken);
                }
            },
            _ => { fail!(Error::<T>::UnexpectedCollectionType); }
        };

        Ok(())
    }

    fn create_item_no_validation(collection_id: CollectionId, owner: T::AccountId, data: CreateItemData) -> DispatchResult {
        match data
        {
            CreateItemData::NFT(data) => {
                let item = NftItemType {
                    owner,
                    const_data: data.const_data,
                    variable_data: data.variable_data
                };

                Self::add_nft_item(collection_id, item)?;
            },
            CreateItemData::Fungible(data) => {
                Self::add_fungible_item(collection_id, &owner, data.value)?;
            },
            CreateItemData::ReFungible(data) => {
                let mut owner_list = Vec::new();
                owner_list.push(Ownership {owner: owner.clone(), fraction: data.pieces});

                let item = ReFungibleItemType {
                    owner: owner_list,
                    const_data: data.const_data,
                    variable_data: data.variable_data
                };

                Self::add_refungible_item(collection_id, item)?;
            }
        };

        // call event
        Self::deposit_event(RawEvent::ItemCreated(collection_id, <ItemListIndex>::get(collection_id)));

        Ok(())
    }

    fn add_fungible_item(collection_id: CollectionId, owner: &T::AccountId, value: u128) -> DispatchResult {

        // Does new owner already have an account?
        let mut balance: u128 = 0;
        if <FungibleItemList<T>>::contains_key(collection_id, owner) {
            balance = <FungibleItemList<T>>::get(collection_id, owner).value;
        } 

        // Mint 
        let item = FungibleItemType {
            value: balance + value
        };
        <FungibleItemList<T>>::insert(collection_id, (*owner).clone(), item);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, owner)
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, (*owner).clone(), new_balance);

        Ok(())
    }

    fn add_refungible_item(collection_id: CollectionId, item: ReFungibleItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(collection_id)
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        let itemcopy = item.clone();

        let value = item.owner.first().unwrap().fraction;
        let owner = item.owner.first().unwrap().owner.clone();

        Self::add_token_index(collection_id, current_index, &owner)?;

        <ItemListIndex>::insert(collection_id, current_index);
        <ReFungibleItemList<T>>::insert(collection_id, current_index, itemcopy);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, &owner)
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, owner.clone(), new_balance);

        Ok(())
    }

    fn add_nft_item(collection_id: CollectionId, item: NftItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(collection_id)
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;

        let item_owner = item.owner.clone();
        Self::add_token_index(collection_id, current_index, &item.owner)?;

        <ItemListIndex>::insert(collection_id, current_index);
        <NftItemList<T>>::insert(collection_id, current_index, item);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, item_owner.clone())
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item_owner.clone(), new_balance);

        Ok(())
    }

    fn burn_refungible_item(
        collection_id: CollectionId,
        item_id: TokenId,
        owner: &T::AccountId,
    ) -> DispatchResult {
        ensure!(
            <ReFungibleItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );
        let mut token = <ReFungibleItemList<T>>::get(collection_id, item_id);
        let rft_balance = token
            .owner
            .iter()
            .filter(|&i| i.owner == *owner)
            .next()
            .unwrap();
        Self::remove_token_index(collection_id, item_id, owner)?;

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, rft_balance.owner.clone())
            .checked_sub(rft_balance.fraction)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, rft_balance.owner.clone(), new_balance);

        // Re-create owners list with sender removed
        let index = token
            .owner
            .iter()
            .position(|i| i.owner == *owner)
            .unwrap();
        token.owner.remove(index);
        let owner_count = token.owner.len();

        // Burn the token completely if this was the last (only) owner
        if owner_count == 0 {
            <ReFungibleItemList<T>>::remove(collection_id, item_id);
        }
        else {
            <ReFungibleItemList<T>>::insert(collection_id, item_id, token);
        }

        Ok(())
    }

    fn burn_nft_item(collection_id: CollectionId, item_id: TokenId) -> DispatchResult {
        ensure!(
            <NftItemList<T>>::contains_key(collection_id, item_id),
            Error::<T>::TokenNotFound
        );
        let item = <NftItemList<T>>::get(collection_id, item_id);
        Self::remove_token_index(collection_id, item_id, &item.owner)?;

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, &item.owner)
            .checked_sub(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);
        <NftItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn burn_fungible_item(owner: &T::AccountId, collection_id: CollectionId, value: u128) -> DispatchResult {
        ensure!(
            <FungibleItemList<T>>::contains_key(collection_id, owner),
            Error::<T>::TokenNotFound
        );
        let mut balance = <FungibleItemList<T>>::get(collection_id, owner);
        ensure!(balance.value >= value, Error::<T>::TokenValueNotEnough);

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, owner)
            .checked_sub(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, (*owner).clone(), new_balance);

        if balance.value - value > 0 {
            balance.value -= value;
            <FungibleItemList<T>>::insert(collection_id, (*owner).clone(), balance);
        }
        else {
            <FungibleItemList<T>>::remove(collection_id, owner);
        }

        Ok(())
    }

    fn collection_exists(collection_id: CollectionId) -> DispatchResult {
        ensure!(
            <Collection<T>>::contains_key(collection_id),
            Error::<T>::CollectionNotFound
        );
        Ok(())
    }

    fn check_owner_permissions(collection_id: CollectionId, subject: T::AccountId) -> DispatchResult {
        Self::collection_exists(collection_id)?;

        let target_collection = <Collection<T>>::get(collection_id);
        ensure!(
            subject == target_collection.owner,
            Error::<T>::NoPermission
        );

        Ok(())
    }

    fn is_owner_or_admin_permissions(collection_id: CollectionId, subject: T::AccountId) -> bool {
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
        collection_id: CollectionId,
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

    fn is_item_owner(subject: T::AccountId, collection_id: CollectionId, item_id: TokenId) -> bool {
        let target_collection = <Collection<T>>::get(collection_id);

        match target_collection.mode {
            CollectionMode::NFT => {
                <NftItemList<T>>::get(collection_id, item_id).owner == subject
            }
            CollectionMode::Fungible(_) => {
                <FungibleItemList<T>>::contains_key(collection_id, &subject)
            }
            CollectionMode::ReFungible => {
                <ReFungibleItemList<T>>::get(collection_id, item_id)
                    .owner
                    .iter()
                    .any(|i| i.owner == subject)
            }
            CollectionMode::Invalid => false,
        }
    }

    fn check_white_list(collection_id: CollectionId, address: &T::AccountId) -> DispatchResult {
        let mes = Error::<T>::AddresNotInWhiteList;
        ensure!(<WhiteList<T>>::contains_key(collection_id, address), mes);

        Ok(())
    }

    /// Check if token exists. In case of Fungible, check if there is an entry for 
    /// the owner in fungible balances double map
    fn token_exists(
        collection_id: CollectionId,
        item_id: TokenId,
        owner: &T::AccountId
    ) -> DispatchResult {
        let target_collection = <Collection<T>>::get(collection_id);
        let exists = match target_collection.mode
        {
            CollectionMode::NFT => <NftItemList<T>>::contains_key(collection_id, item_id),
            CollectionMode::Fungible(_)  => <FungibleItemList<T>>::contains_key(collection_id, owner),
            CollectionMode::ReFungible  => <ReFungibleItemList<T>>::contains_key(collection_id, item_id),
            _ => false
        };

        ensure!(exists == true, Error::<T>::TokenNotFound);
        Ok(())
    }

    fn transfer_fungible(
        collection_id: CollectionId,
        value: u128,
        owner: &T::AccountId,
        recipient: &T::AccountId,
    ) -> DispatchResult {
        Self::token_exists(collection_id, 0, owner)?;

        let mut balance = <FungibleItemList<T>>::get(collection_id, owner);
        ensure!(balance.value >= value, Error::<T>::TokenValueTooLow);

        // Send balance to recipient (updates balanceOf of recipient)
        Self::add_fungible_item(collection_id, recipient, value)?;

        // update balanceOf of sender
        <Balance<T>>::insert(collection_id, (*owner).clone(), balance.value - value);

        // Reduce or remove sender
        if balance.value == value {
            <FungibleItemList<T>>::remove(collection_id, owner);
        }
        else {
            balance.value -= value;
            <FungibleItemList<T>>::insert(collection_id, (*owner).clone(), balance);
        }

        Ok(())
    }

    fn transfer_refungible(
        collection_id: CollectionId,
        item_id: TokenId,
        value: u128,
        owner: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        Self::token_exists(collection_id, item_id, &owner)?;

        let full_item = <ReFungibleItemList<T>>::get(collection_id, item_id);
        let item = full_item
            .owner
            .iter()
            .filter(|i| i.owner == owner)
            .next()
            .ok_or(Error::<T>::NumOverflow)?;
        let amount = item.fraction;

        ensure!(amount >= value, Error::<T>::TokenValueTooLow);

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, item.owner.clone(), balance_old_owner);

        let balancenew_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(value)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, new_owner.clone(), balancenew_owner);

        let old_owner = item.owner.clone();
        let new_owner_has_account = full_item.owner.iter().any(|i| i.owner == new_owner);

        // transfer
        if amount == value && !new_owner_has_account {
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
            Self::move_token_index(collection_id, item_id, &old_owner, &new_owner)?;
        } else {
            let mut new_full_item = full_item.clone();
            new_full_item
                .owner
                .iter_mut()
                .find(|i| i.owner == owner)
                .unwrap()
                .fraction -= value;

            // separate amount
            if new_owner_has_account {
                // new owner has account
                new_full_item
                    .owner
                    .iter_mut()
                    .find(|i| i.owner == new_owner)
                    .unwrap()
                    .fraction += value;
            } else {
                // new owner do not have account
                new_full_item.owner.push(Ownership {
                    owner: new_owner.clone(),
                    fraction: value,
                });
                Self::add_token_index(collection_id, item_id, &new_owner)?;
            }

            <ReFungibleItemList<T>>::insert(collection_id, item_id, new_full_item);
        }

        Ok(())
    }

    fn transfer_nft(
        collection_id: CollectionId,
        item_id: TokenId,
        sender: T::AccountId,
        new_owner: T::AccountId,
    ) -> DispatchResult {
        Self::token_exists(collection_id, item_id, &sender)?;

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

        let balancenew_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(1)
            .ok_or(Error::<T>::NumOverflow)?;
        <Balance<T>>::insert(collection_id, new_owner.clone(), balancenew_owner);

        // change owner
        let old_owner = item.owner.clone();
        item.owner = new_owner.clone();
        <NftItemList<T>>::insert(collection_id, item_id, item);

        // update index collection
        Self::move_token_index(collection_id, item_id, &old_owner, &new_owner)?;

        Ok(())
    }
    
    fn set_re_fungible_variable_data(
        collection_id: CollectionId,
        item_id: TokenId,
        data: Vec<u8>
    ) -> DispatchResult {
        let mut item = <ReFungibleItemList<T>>::get(collection_id, item_id);

        item.variable_data = data;

        <ReFungibleItemList<T>>::insert(collection_id, item_id, item);

        Ok(())
    }

    fn set_nft_variable_data(
        collection_id: CollectionId,
        item_id: TokenId,
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
        let next_id = CreatedCollectionCount::get()
            .checked_add(1)
            .unwrap();

        CreatedCollectionCount::put(next_id);
    }

    fn init_nft_token(collection_id: CollectionId, item: &NftItemType<T::AccountId>) {
        let current_index = <ItemListIndex>::get(collection_id)
            .checked_add(1)
            .unwrap();

        let item_owner = item.owner.clone();
        Self::add_token_index(collection_id, current_index, &item.owner).unwrap();

        <ItemListIndex>::insert(collection_id, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, &item_owner)
            .checked_add(1)
            .unwrap();
        <Balance<T>>::insert(collection_id, item_owner.clone(), new_balance);
    }

    fn init_fungible_token(collection_id: CollectionId, owner: &T::AccountId, item: &FungibleItemType) {
        let current_index = <ItemListIndex>::get(collection_id)
            .checked_add(1)
            .unwrap();

        Self::add_token_index(collection_id, current_index, owner).unwrap();

        <ItemListIndex>::insert(collection_id, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, owner)
            .checked_add(item.value)
            .unwrap();
        <Balance<T>>::insert(collection_id, (*owner).clone(), new_balance);
    }

    fn init_refungible_token(collection_id: CollectionId, item: &ReFungibleItemType<T::AccountId>) {
        let current_index = <ItemListIndex>::get(collection_id)
            .checked_add(1)
            .unwrap();

        let value = item.owner.first().unwrap().fraction;
        let owner = item.owner.first().unwrap().owner.clone();

        Self::add_token_index(collection_id, current_index, &owner).unwrap();

        <ItemListIndex>::insert(collection_id, current_index);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, &owner)
            .checked_add(value)
            .unwrap();
        <Balance<T>>::insert(collection_id, owner.clone(), new_balance);
    }

    fn add_token_index(collection_id: CollectionId, item_index: TokenId, owner: &T::AccountId) -> DispatchResult {

        // add to account limit
        if <AccountItemCount<T>>::contains_key(owner) {

            // bound Owned tokens by a single address
            let count = <AccountItemCount<T>>::get(owner);
            ensure!(count < ChainLimit::get().account_token_ownership_limit, Error::<T>::AddressOwnershipLimitExceeded);

            <AccountItemCount<T>>::insert(owner.clone(), count
                .checked_add(1)
                .ok_or(Error::<T>::NumOverflow)?);
        }
        else {
            <AccountItemCount<T>>::insert(owner.clone(), 1);
        }

        let list_exists = <AddressTokens<T>>::contains_key(collection_id, owner);
        if list_exists {
            let mut list = <AddressTokens<T>>::get(collection_id, owner);
            let item_contains = list.contains(&item_index.clone());

            if !item_contains {
                list.push(item_index.clone());
            }

            <AddressTokens<T>>::insert(collection_id, owner.clone(), list);
        } else {
            let mut itm = Vec::new();
            itm.push(item_index.clone());
            <AddressTokens<T>>::insert(collection_id, owner.clone(), itm);
        }

        Ok(())
    }

    fn remove_token_index(
        collection_id: CollectionId,
        item_index: TokenId,
        owner: &T::AccountId,
    ) -> DispatchResult {

        // update counter
        <AccountItemCount<T>>::insert(owner.clone(), 
            <AccountItemCount<T>>::get(owner)
            .checked_sub(1)
            .ok_or(Error::<T>::NumOverflow)?);


        let list_exists = <AddressTokens<T>>::contains_key(collection_id, owner);
        if list_exists {
            let mut list = <AddressTokens<T>>::get(collection_id, owner);
            let item_contains = list.contains(&item_index.clone());

            if item_contains {
                list.retain(|&item| item != item_index);
                <AddressTokens<T>>::insert(collection_id, owner.clone(), list);
            }
        }

        Ok(())
    }

    fn move_token_index(
        collection_id: CollectionId,
        item_index: TokenId,
        old_owner: &T::AccountId,
        new_owner: &T::AccountId,
    ) -> DispatchResult {
        Self::remove_token_index(collection_id, item_index, old_owner)?;
        Self::add_token_index(collection_id, item_index, new_owner)?;

        Ok(())
    }
    
    fn ensure_contract_owned(account: T::AccountId, contract: &T::AccountId) -> DispatchResult {
        if <ContractOwner<T>>::contains_key(contract.clone()) {
            let owner = <ContractOwner<T>>::get(contract);
            ensure!(account == owner, Error::<T>::NoPermission);
        } else {
            fail!(Error::<T>::NoPermission);
        }

        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Economic models
// #region

/// Fee multiplier.
pub type Multiplier = FixedU128;

type BalanceOf<T> = <<T as transaction_payment::Config>::OnChargeTransaction as transaction_payment::OnChargeTransaction<T>>::Balance;

/// Require the transactor pay for themselves and maybe include a tip to gain additional priority
/// in the queue.
#[derive(Encode, Decode, Clone, Eq, PartialEq)]
pub struct ChargeTransactionPayment<T: Config>(#[codec(compact)] BalanceOf<T>);

impl<T: Config + Send + Sync> sp_std::fmt::Debug 
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

impl<T: Config> ChargeTransactionPayment<T>
where
    T::Call: Dispatchable<Info=DispatchInfo, PostInfo=PostDispatchInfo> + IsSubType<Call<T>> + IsSubType<pallet_contracts::Call<T>>,
    BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
    T::AccountId: AsRef<[u8]>,
    T::AccountId: UncheckedFrom<T::Hash>,
{
    fn traditional_fee(
        len: usize,
        info: &DispatchInfoOf<T::Call>,
        tip: BalanceOf<T>,
    ) -> BalanceOf<T>
    where
        T::Call: Dispatchable<Info = DispatchInfo>,
    {
        <transaction_payment::Module<T>>::compute_fee(len as u32, info, tip)
    }

	fn get_priority(len: usize, info: &DispatchInfoOf<T::Call>, final_fee: BalanceOf<T>) -> TransactionPriority {
        let weight_saturation = T::BlockWeights::get().max_block / info.weight.max(1);
        let max_block_length = *T::BlockLength::get().max.get(DispatchClass::Normal);
        let len_saturation = max_block_length as u64 / (len as u64).max(1);
        let coefficient: BalanceOf<T> = weight_saturation
            .min(len_saturation)
            .saturated_into::<BalanceOf<T>>();
        final_fee
            .saturating_mul(coefficient)
            .saturated_into::<TransactionPriority>()
    }

    fn withdraw_fee(
        &self,
        who: &T::AccountId,
        call: &T::Call,
        info: &DispatchInfoOf<T::Call>,
        len: usize,
	) -> Result<
		(
			BalanceOf<T>,
			<<T as transaction_payment::Config>::OnChargeTransaction as transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
		),
		TransactionValidityError,
	> {
        let tip = self.0;

        // Set fee based on call type. Creating collection costs 1 Unique.
        // All other transactions have traditional fees so far
        // let fee = match call.is_sub_type() {
        //     Some(Call::create_collection(..)) => <BalanceOf<T>>::from(1_000_000_000),
        //     _ => Self::traditional_fee(len, info, tip), // Flat fee model, use only for testing purposes
        //                                                 // _ => <BalanceOf<T>>::from(100)
        // };
        let fee = Self::traditional_fee(len, info, tip);

        // Only mess with balances if fee is not zero.
        if fee.is_zero() {
            return <<T as transaction_payment::Config>::OnChargeTransaction as transaction_payment::OnChargeTransaction<T>>::withdraw_fee(who, call, info, fee, tip)
			.map(|i| (fee, i));
        }

        // Determine who is paying transaction fee based on ecnomic model
        // Parse call to extract collection ID and access collection sponsor
        let mut sponsor: T::AccountId = match IsSubType::<Call<T>>::is_sub_type(call) {
            Some(Call::create_item(collection_id, _owner, _properties)) => {

                // sponsor timeout
                let block_number = <system::Module<T>>::block_number() as T::BlockNumber;

                let limit = <Collection<T>>::get(collection_id).limits.sponsor_transfer_timeout;
                let mut sponsored = true;
                if <CreateItemBasket<T>>::contains_key((collection_id, &who)) {
                    let last_tx_block = <CreateItemBasket<T>>::get((collection_id, &who));
                    let limit_time = last_tx_block + limit.into();
                    if block_number <= limit_time {
                        sponsored = false;
                    }
                }
                if sponsored {
                    <CreateItemBasket<T>>::insert((collection_id, who.clone()), block_number);
                }

                // check free create limit
                if (<Collection<T>>::get(collection_id).limits.sponsored_data_size >= (_properties.len() as u32)) &&
                   (<Collection<T>>::get(collection_id).sponsor_confirmed) &&
                   (sponsored)
                {
                    <Collection<T>>::get(collection_id).sponsor
                } else {
                    T::AccountId::default()
                }
            }
            Some(Call::transfer(_new_owner, collection_id, item_id, _value)) => {
                
                let mut sponsor_transfer = false;
                if <Collection<T>>::get(collection_id).sponsor_confirmed {

                    let collection_limits = <Collection<T>>::get(collection_id).limits;
                    let collection_mode = <Collection<T>>::get(collection_id).mode;
    
                    // sponsor timeout
                    let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                    sponsor_transfer = match collection_mode {
                        CollectionMode::NFT => {
    
                            // get correct limit
                            let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
                                collection_limits.sponsor_transfer_timeout
                            } else {
                                ChainLimit::get().nft_sponsor_transfer_timeout
                            };
    
                            let mut sponsored = true;
                            if <NftTransferBasket<T>>::contains_key(collection_id, item_id) {
                                let last_tx_block = <NftTransferBasket<T>>::get(collection_id, item_id);
                                let limit_time = last_tx_block + limit.into();
                                if block_number <= limit_time {
                                    sponsored = false;
                                }
                            }
                            if sponsored {
                                <NftTransferBasket<T>>::insert(collection_id, item_id, block_number);
                            }

                            sponsored
                        }
                        CollectionMode::Fungible(_) => {
    
                            // get correct limit
                            let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
                                collection_limits.sponsor_transfer_timeout
                            } else {
                                ChainLimit::get().fungible_sponsor_transfer_timeout
                            };
    
                            let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                            let mut sponsored = true;
                            if <FungibleTransferBasket<T>>::contains_key(collection_id, who) {
                                let last_tx_block = <FungibleTransferBasket<T>>::get(collection_id, who);
                                let limit_time = last_tx_block + limit.into();
                                if block_number <= limit_time {
                                    sponsored = false;
                                }
                            }
                            if sponsored {
                                <FungibleTransferBasket<T>>::insert(collection_id, who, block_number);
                            }

                            sponsored
                        }
                        CollectionMode::ReFungible => {
    
                            // get correct limit
                            let limit: u32 = if collection_limits.sponsor_transfer_timeout > 0 {
                                collection_limits.sponsor_transfer_timeout
                            } else {
                                ChainLimit::get().refungible_sponsor_transfer_timeout
                            };
    
                            let mut sponsored = true;
                            if <ReFungibleTransferBasket<T>>::contains_key(collection_id, item_id) {
                                let last_tx_block = <ReFungibleTransferBasket<T>>::get(collection_id, item_id);
                                let limit_time = last_tx_block + limit.into();
                                if block_number <= limit_time {
                                    sponsored = false;
                                }
                            }
                            if sponsored {
                                <ReFungibleTransferBasket<T>>::insert(collection_id, item_id, block_number);
                            }

                            sponsored
                        }
                        _ => {
                            false
                        },
                    };
                }

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
            Some(pallet_contracts::Call::instantiate(_endowment, _gas_limit, code_hash, _data, salt)) => {

                let new_contract_address = <pallet_contracts::Module<T>>::contract_address(
                    &who,
                    code_hash,
                    salt,
                );
                <ContractOwner<T>>::insert(new_contract_address.clone(), who.clone());

                T::AccountId::default()
            },

            // When the contract is called, check if the sponsoring is enabled and pay fees from contract endowment if it is
            Some(pallet_contracts::Call::call(dest, _value, _gas_limit, _data)) => {

                let called_contract: T::AccountId = T::Lookup::lookup((*dest).clone()).unwrap_or(T::AccountId::default());

                let owned_contract = <ContractOwner<T>>::contains_key(called_contract.clone())
                  && <ContractOwner<T>>::get(called_contract.clone()) == *who;
                let white_list_enabled = <ContractWhiteListEnabled<T>>::contains_key(called_contract.clone()) && <ContractWhiteListEnabled<T>>::get(called_contract.clone());
                  
                if !owned_contract && white_list_enabled {
                    if !<ContractWhiteList<T>>::contains_key(called_contract.clone(), who) {
                        return Err(InvalidTransaction::Call.into());
                    }
                }

                let mut sponsor_transfer = false;
                if <ContractSponsoringRateLimit<T>>::contains_key(called_contract.clone()) {
                    let last_tx_block = <ContractSponsorBasket<T>>::get((&called_contract, &who));
                    let block_number = <system::Module<T>>::block_number() as T::BlockNumber;
                    let rate_limit = <ContractSponsoringRateLimit<T>>::get(&called_contract);
                    let limit_time = last_tx_block + rate_limit;

                    if block_number >= limit_time {
                        <ContractSponsorBasket<T>>::insert((called_contract.clone(), who.clone()), block_number);
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

		<<T as transaction_payment::Config>::OnChargeTransaction as transaction_payment::OnChargeTransaction<T>>::withdraw_fee(&who_pays_fee, call, info, fee, tip)
			.map(|i| (fee, i))
    }
}


impl<T: Config + Send + Sync> SignedExtension
    for ChargeTransactionPayment<T>
where
    BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
    T::Call: Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo> + IsSubType<Call<T>> + IsSubType<pallet_contracts::Call<T>>,
    T::AccountId: AsRef<[u8]>,
    T::AccountId: UncheckedFrom<T::Hash>,
{
    const IDENTIFIER: &'static str = "ChargeTransactionPayment";
    type AccountId = T::AccountId;
    type Call = T::Call;
    type AdditionalSigned = ();
    type Pre = (
        // tip
        BalanceOf<T>,
        // who pays fee
        Self::AccountId,
		// imbalance resulting from withdrawing the fee
		<<T as transaction_payment::Config>::OnChargeTransaction as transaction_payment::OnChargeTransaction<T>>::LiquidityInfo,
    );
    fn additional_signed(&self) -> sp_std::result::Result<(), TransactionValidityError> {
        Ok(())
    }

    fn validate(
        &self,
        who: &Self::AccountId,
        call: &Self::Call,
        info: &DispatchInfoOf<Self::Call>,
        len: usize,
    ) -> TransactionValidity {
		let (fee, _) = self.withdraw_fee(who, call, info, len)?;
		Ok(ValidTransaction {
			priority: Self::get_priority(len, info, fee),
			..Default::default()
		})
    }

    fn pre_dispatch(
        self,
        who: &Self::AccountId,
        call: &Self::Call,
        info: &DispatchInfoOf<Self::Call>,
        len: usize,
    ) -> Result<Self::Pre, TransactionValidityError> {
        let (_fee, imbalance) = self.withdraw_fee(who, call, info, len)?;
        Ok((self.0, who.clone(), imbalance))
    }

    fn post_dispatch(
        pre: Self::Pre,
        info: &DispatchInfoOf<Self::Call>,
        post_info: &PostDispatchInfoOf<Self::Call>,
        len: usize,
        _result: &DispatchResult,
    ) -> Result<(), TransactionValidityError> {
		let (tip, who, imbalance) = pre;
		let actual_fee = transaction_payment::Module::<T>::compute_actual_fee(
			len as u32,
			info,
			post_info,
			tip,
		);
		<T as transaction_payment::Config>::OnChargeTransaction::correct_and_deposit_fee(&who, info, post_info, actual_fee, tip, imbalance)?;
		Ok(())
    }
}

// #endregion
