#![cfg_attr(not(feature = "std"), no_std)]

/// For more guidance on Substrate FRAME, see the example pallet
/// https://github.com/paritytech/substrate/blob/master/frame/example/src/lib.rs
use codec::{Decode, Encode};
pub use frame_support::{
    construct_runtime, decl_event, decl_module, decl_storage,
    dispatch::DispatchResult,
    ensure, parameter_types,
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

use frame_system::{self as system, ensure_signed};
use sp_runtime::sp_std::prelude::Vec;
use sp_runtime::{
    traits::{
        DispatchInfoOf, Dispatchable, PostDispatchInfoOf, SaturatedConversion, Saturating,
        SignedExtension, Zero,
    },
    transaction_validity::{
        InvalidTransaction, TransactionPriority, TransactionValidity, TransactionValidityError,
        ValidTransaction,
    },
    FixedPointOperand, FixedU128,
};
use sp_std::prelude::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[derive(Encode, Decode, Debug, Eq, Clone, PartialEq)]
pub enum CollectionMode {
    Invalid,
    // custom data size
    NFT(u32),
    // decimal points
    Fungible(u32),
    // custom data size and decimal points
    ReFungible(u32, u32),
}

impl Into<u8> for CollectionMode {
    fn into(self) -> u8 {
        match self {
            CollectionMode::Invalid => 0,
            CollectionMode::NFT(_) => 1,
            CollectionMode::Fungible(_) => 2,
            CollectionMode::ReFungible(_, _) => 3,
        }
    }
}

#[derive(Encode, Decode, Debug, Clone, PartialEq)]
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

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct Ownership<AccountId> {
    pub owner: AccountId,
    pub fraction: u128,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CollectionType<AccountId> {
    pub owner: AccountId,
    pub mode: CollectionMode,
    pub access: AccessMode,
    pub decimal_points: u32,
    pub name: Vec<u16>,        // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
    pub custom_data_size: u32,
    pub mint_mode: bool,
    pub offchain_schema: Vec<u8>,
    pub sponsor: AccountId, // Who pays fees. If set to default address, the fees are applied to the transaction sender
    pub unconfirmed_sponsor: AccountId, // Sponsor address that has not yet confirmed sponsorship
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CollectionAdminsType<AccountId> {
    pub admin: AccountId,
    pub collection_id: u64,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct NftItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct FungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: AccountId,
    pub value: u128,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct ReFungibleItemType<AccountId> {
    pub collection: u64,
    pub owner: Vec<Ownership<AccountId>>,
    pub data: Vec<u8>,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct ApprovePermissions<AccountId> {
    pub approved: AccountId,
    pub amount: u64,
}

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct VestingItem<AccountId, Moment> {
    pub sender: AccountId,
    pub recipient: AccountId,
    pub collection_id: u64,
    pub item_id: u64,
    pub amount: u64,
    pub vesting_date: Moment,
}

pub trait Trait: system::Trait {
    type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

decl_storage! {
    trait Store for Module<T: Trait> as Nft {

        // Private members
        NextCollectionID: u64;
        CreatedCollectionCount: u64;
        ChainVersion: u64;
        ItemListIndex: map hasher(blake2_128_concat) u64 => u64;

        pub Collection get(fn collection): map hasher(identity) u64 => CollectionType<T::AccountId>;
        pub AdminList get(fn admin_list_collection): map hasher(identity) u64 => Vec<T::AccountId>;
        pub WhiteList get(fn white_list): map hasher(identity) u64 => Vec<T::AccountId>;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) T::AccountId => u64;

        /// second parameter: item id + owner account id
        pub ApprovedList get(fn approved): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) (u64, T::AccountId) => Vec<ApprovePermissions<T::AccountId>>;

        /// Item collections
        pub NftItemList get(fn nft_item_id): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => NftItemType<T::AccountId>;
        pub FungibleItemList get(fn fungible_item_id): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => FungibleItemType<T::AccountId>;
        pub ReFungibleItemList get(fn refungible_item_id): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) u64 => ReFungibleItemType<T::AccountId>;

        /// Index list
        pub AddressTokens get(fn address_tokens): double_map hasher(blake2_128_concat) u64, hasher(blake2_128_concat) T::AccountId => Vec<u64>;

        // Sponsorship
        pub ContractSponsor get(fn contract_sponsor): map hasher(identity) T::AccountId => T::AccountId;
        pub UnconfirmedContractSponsor get(fn unconfirmed_contract_sponsor): map hasher(identity) T::AccountId => T::AccountId;
    }
}

decl_event!(
    pub enum Event<T>
    where
        AccountId = <T as system::Trait>::AccountId,
    {
        Created(u64, u8, AccountId),
        ItemCreated(u64, u64),
        ItemDestroyed(u64, u64),
    }
);

decl_module! {
    pub struct Module<T: Trait> for enum Call where origin: T::Origin {

        fn deposit_event() = default;

        fn on_initialize(now: T::BlockNumber) -> Weight {

            if ChainVersion::get() < 2
            {
                let value = NextCollectionID::get();
                CreatedCollectionCount::put(value);
                ChainVersion::put(2);
            }

            0
        }

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID
        #[weight = 0]
        pub fn create_collection(origin,
                                 collection_name: Vec<u16>,
                                 collection_description: Vec<u16>,
                                 token_prefix: Vec<u8>,
                                 mode: CollectionMode) -> DispatchResult {

            // Anyone can create a collection
            let who = ensure_signed(origin)?;
            let custom_data_size = match mode {
                CollectionMode::NFT(size) => size,
                CollectionMode::ReFungible(size, _) => size,
                _ => 0
            };

            let decimal_points = match mode {
                CollectionMode::Fungible(points) => points,
                CollectionMode::ReFungible(_, points) => points,
                _ => 0
            };

            // check params
            ensure!(decimal_points <= 4, "decimal_points parameter must be lower than 4");

            let mut name = collection_name.to_vec();
            name.push(0);
            ensure!(name.len() <= 64, "Collection name can not be longer than 63 char");

            let mut description = collection_description.to_vec();
            description.push(0);
            ensure!(name.len() <= 256, "Collection description can not be longer than 255 char");

            let mut prefix = token_prefix.to_vec();
            prefix.push(0);
            ensure!(prefix.len() <= 16, "Token prefix can not be longer than 15 char");

            // Generate next collection ID
            let next_id = CreatedCollectionCount::get()
                .checked_add(1)
                .expect("collection id error");

            CreatedCollectionCount::put(next_id);

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
                custom_data_size: custom_data_size,
                sponsor: T::AccountId::default(),
                unconfirmed_sponsor: T::AccountId::default(),
            };

            // Add new collection to map
            <Collection<T>>::insert(next_id, new_collection);

            // call event
            Self::deposit_event(RawEvent::Created(next_id, mode.into(), who.clone()));

            Ok(())
        }

        #[weight = 0]
        pub fn destroy_collection(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender)?;

            // TODO Items remove
            <AddressTokens<T>>::remove_prefix(collection_id);
            <ApprovedList<T>>::remove_prefix(collection_id);
            <Balance<T>>::remove_prefix(collection_id);
            <ItemListIndex>::remove(collection_id);
            <AdminList<T>>::remove(collection_id);
            <Collection<T>>::remove(collection_id);
            <WhiteList<T>>::remove(collection_id);

            Ok(())
        }

        #[weight = 0]
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

        #[weight = 0]
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

        #[weight = 0]
        pub fn set_public_access_mode(origin, collection_id: u64, mode: AccessMode) -> DispatchResult
        {
            let sender = ensure_signed(origin)?;

            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.access = mode;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn set_mint_permission(origin, collection_id: u64, mint_permission: bool) -> DispatchResult
        {
            let sender = ensure_signed(origin)?;

            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.mint_mode = mint_permission;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn change_collection_owner(origin, collection_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_permissions(collection_id, sender)?;
            let mut target_collection = <Collection<T>>::get(collection_id);
            target_collection.owner = new_owner;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn add_collection_admin(origin, collection_id: u64, new_admin_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::check_owner_or_admin_permissions(collection_id, sender)?;
            let mut admin_arr: Vec<T::AccountId> = Vec::new();

            if <AdminList<T>>::contains_key(collection_id)
            {
                admin_arr = <AdminList<T>>::get(collection_id);
                ensure!(!admin_arr.contains(&new_admin_id), "Account already has admin role");
            }

            admin_arr.push(new_admin_id);
            <AdminList<T>>::insert(collection_id, admin_arr);

            Ok(())
        }

        #[weight = 0]
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

        #[weight = 0]
        pub fn set_collection_sponsor(origin, collection_id: u64, new_sponsor: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.unconfirmed_sponsor = new_sponsor;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn confirm_sponsorship(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.unconfirmed_sponsor, "This address is not set as sponsor, use setCollectionSponsor first");

            target_collection.sponsor = target_collection.unconfirmed_sponsor;
            target_collection.unconfirmed_sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn remove_collection_sponsor(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.sponsor = T::AccountId::default();
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn create_item(origin, collection_id: u64, properties: Vec<u8>, owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::collection_exists(collection_id)?;
            let target_collection = <Collection<T>>::get(collection_id);

            if !Self::is_owner_or_admin_permissions(collection_id, sender.clone()) {
                if target_collection.mint_mode == false {
                    panic!("Collection is not in mint mode");
                }

                Self::check_white_list(collection_id, owner.clone())?;
            }

            match target_collection.mode
            {
                CollectionMode::NFT(_) => {

                    // check size
                    ensure!(target_collection.custom_data_size >= properties.len() as u32, "Size of item is too large");

                    // Create nft item
                    let item = NftItemType {
                        collection: collection_id,
                        owner: owner,
                        data: properties,
                    };

                    Self::add_nft_item(item)?;

                },
                CollectionMode::Fungible(_) => {

                    // check size
                    ensure!(properties.len() as u32 == 0, "Size of item must be 0 with fungible type");

                    let item = FungibleItemType {
                        collection: collection_id,
                        owner: owner,
                        value: (10 as u128).pow(target_collection.decimal_points)
                    };

                    Self::add_fungible_item(item)?;
                },
                CollectionMode::ReFungible(_, _) => {

                    // check size
                    ensure!(target_collection.custom_data_size >= properties.len() as u32, "Size of item is too large");

                    let mut owner_list = Vec::new();
                    let value = (10 as u128).pow(target_collection.decimal_points);
                    owner_list.push(Ownership {owner: owner, fraction: value});

                    let item = ReFungibleItemType {
                        collection: collection_id,
                        owner: owner_list,
                        data: properties
                    };

                    Self::add_refungible_item(item)?;
                },
                _ => ()
            };

            // call event
            Self::deposit_event(RawEvent::ItemCreated(collection_id, <ItemListIndex>::get(collection_id)));

            Ok(())
        }

        #[weight = 0]
        pub fn burn_item(origin, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            Self::collection_exists(collection_id)?;
            let item_owner = Self::is_item_owner(sender.clone(), collection_id, item_id);
            if !item_owner
            {
                if !Self::is_owner_or_admin_permissions(collection_id, sender.clone()) {  
                    Self::check_white_list(collection_id, sender.clone())?;
                }
            }
            let target_collection = <Collection<T>>::get(collection_id);

            match target_collection.mode
            {
                CollectionMode::NFT(_) => Self::burn_nft_item(collection_id, item_id)?,
                CollectionMode::Fungible(_)  => Self::burn_fungible_item(collection_id, item_id)?,
                CollectionMode::ReFungible(_, _)  => Self::burn_refungible_item(collection_id, item_id, sender.clone())?,
                _ => ()
            };

            // call event
            Self::deposit_event(RawEvent::ItemDestroyed(collection_id, item_id));

            Ok(())
        }

        #[weight = 0]
        pub fn transfer(origin, recipient: T::AccountId, collection_id: u64, item_id: u64, value: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            let item_owner = Self::is_item_owner(sender.clone(), collection_id, item_id);
            if !item_owner {
                Self::check_white_list(collection_id, sender.clone())?;
                Self::check_white_list(collection_id, recipient.clone())?;
            }

            let target_collection = <Collection<T>>::get(collection_id);

            match target_collection.mode
            {
                CollectionMode::NFT(_) => Self::transfer_nft(collection_id, item_id, sender.clone(), recipient)?,
                CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, item_id, value, sender.clone(), recipient)?,
                CollectionMode::ReFungible(_, _)  => Self::transfer_refungible(collection_id, item_id, value, sender.clone(), recipient)?,
                _ => ()
            };

            Ok(())
        }

        #[weight = 0]
        pub fn approve(origin, approved: T::AccountId, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;

            // amount param stub
            let amount = 100000000;

            let item_owner = Self::is_item_owner(sender.clone(), collection_id, item_id);
            if !item_owner {
                Self::check_white_list(collection_id, approved.clone())?;
            }

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

        #[weight = 0]
        pub fn transfer_from(origin, from: T::AccountId, recipient: T::AccountId, collection_id: u64, item_id: u64, value: u64 ) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            let approved_list_exists = <ApprovedList<T>>::contains_key(collection_id, (item_id, from.clone()));
            if approved_list_exists
            {
                Self::check_white_list(collection_id, from.clone())?;
                Self::check_white_list(collection_id, recipient.clone())?;

                let list_itm = <ApprovedList<T>>::get(collection_id, (item_id, from.clone()));
                let opt_item = list_itm.iter().find(|i| i.approved == sender.clone());
                ensure!(opt_item.is_some(), "No approve found");
                ensure!(opt_item.unwrap().amount >= value, "Requested value more than approved");

                // remove approve
                let approve_list: Vec<ApprovePermissions<T::AccountId>> = <ApprovedList<T>>::get(collection_id, (item_id, from.clone()))
                    .into_iter().filter(|i| i.approved != sender.clone()).collect();
                <ApprovedList<T>>::insert(collection_id, (item_id, from.clone()), approve_list);
            }
            else
            {
                panic!("Only approved addresses can call this method");
            }

            let target_collection = <Collection<T>>::get(collection_id);

            match target_collection.mode
            {
                CollectionMode::NFT(_) => Self::transfer_nft(collection_id, item_id, from, recipient)?,
                CollectionMode::Fungible(_)  => Self::transfer_fungible(collection_id, item_id, value, from.clone(), recipient)?,
                CollectionMode::ReFungible(_, _)  => Self::transfer_refungible(collection_id, item_id, value, from.clone(), recipient)?,
                _ => ()
            };

            Ok(())
        }

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

        #[weight = 0]
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
    }
}

impl<T: Trait> Module<T> {
    fn add_fungible_item(item: FungibleItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .expect("Item list index id error");
        let itemcopy = item.clone();
        let owner = item.owner.clone();
        let value = item.value as u64;

        Self::add_token_index(item.collection, current_index, owner.clone())?;

        <ItemListIndex>::insert(item.collection, current_index);
        <FungibleItemList<T>>::insert(item.collection, current_index, itemcopy);

        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .unwrap();
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);

        Ok(())
    }

    fn add_refungible_item(item: ReFungibleItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .expect("Item list index id error");
        let itemcopy = item.clone();

        let value = item.owner.first().unwrap().fraction as u64;
        let owner = item.owner.first().unwrap().owner.clone();

        Self::add_token_index(item.collection, current_index, owner.clone())?;

        <ItemListIndex>::insert(item.collection, current_index);
        <ReFungibleItemList<T>>::insert(item.collection, current_index, itemcopy);

        // Update balance
        let new_balance = <Balance<T>>::get(item.collection, owner.clone())
            .checked_add(value)
            .unwrap();
        <Balance<T>>::insert(item.collection, owner.clone(), new_balance);

        Ok(())
    }

    fn add_nft_item(item: NftItemType<T::AccountId>) -> DispatchResult {
        let current_index = <ItemListIndex>::get(item.collection)
            .checked_add(1)
            .expect("Item list index id error");

        let item_owner = item.owner.clone();
        let collection_id = item.collection.clone();
        Self::add_token_index(collection_id, current_index, item.owner.clone())?;

        <ItemListIndex>::insert(collection_id, current_index);
        <NftItemList<T>>::insert(collection_id, current_index, item);

        // Update balance
        let new_balance = <Balance<T>>::get(collection_id, item_owner.clone())
            .checked_add(1)
            .unwrap();
        <Balance<T>>::insert(collection_id, item_owner.clone(), new_balance);

        Ok(())
    }

    fn burn_refungible_item(collection_id: u64, item_id: u64, owner: T::AccountId) -> DispatchResult {
        ensure!(
            <ReFungibleItemList<T>>::contains_key(collection_id, item_id),
            "Item does not exists"
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
            .unwrap();
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);

        <ReFungibleItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn burn_nft_item(collection_id: u64, item_id: u64) -> DispatchResult {
        ensure!(
            <NftItemList<T>>::contains_key(collection_id, item_id),
            "Item does not exists"
        );
        let item = <NftItemList<T>>::get(collection_id, item_id);
        Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

        // remove approve list
        <ApprovedList<T>>::remove(collection_id, (item_id, item.owner.clone()));

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(1)
            .unwrap();
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);
        <NftItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn burn_fungible_item(collection_id: u64, item_id: u64) -> DispatchResult {
        ensure!(
            <FungibleItemList<T>>::contains_key(collection_id, item_id),
            "Item does not exists"
        );
        let item = <FungibleItemList<T>>::get(collection_id, item_id);
        Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

        // remove approve list
        <ApprovedList<T>>::remove(collection_id, (item_id, item.owner.clone()));

        // update balance
        let new_balance = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(item.value as u64)
            .unwrap();
        <Balance<T>>::insert(collection_id, item.owner.clone(), new_balance);

        <FungibleItemList<T>>::remove(collection_id, item_id);

        Ok(())
    }

    fn collection_exists(collection_id: u64) -> DispatchResult {
        ensure!(
            <Collection<T>>::contains_key(collection_id),
            "This collection does not exist"
        );
        Ok(())
    }

    fn check_owner_permissions(collection_id: u64, subject: T::AccountId) -> DispatchResult {
        Self::collection_exists(collection_id)?;

        let target_collection = <Collection<T>>::get(collection_id);
        ensure!(
            subject == target_collection.owner,
            "You do not own this collection"
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

    fn check_owner_or_admin_permissions(collection_id: u64, subject: T::AccountId) -> DispatchResult {
        
        Self::collection_exists(collection_id)?;
        let result = Self::is_owner_or_admin_permissions(collection_id, subject.clone());

        if result == true {
            Ok(())
        } else {
            panic!("You do not have permissions to modify this collection")
        }
    }

    fn is_item_owner(subject: T::AccountId, collection_id: u64, item_id: u64) -> bool {
        let target_collection = <Collection<T>>::get(collection_id);

        match target_collection.mode {
            CollectionMode::NFT(_) => {
                <NftItemList<T>>::get(collection_id, item_id).owner == subject
            }
            CollectionMode::Fungible(_) => {
                <FungibleItemList<T>>::get(collection_id, item_id).owner == subject
            }
            CollectionMode::ReFungible(_, _) => {
                <ReFungibleItemList<T>>::get(collection_id, item_id)
                    .owner
                    .iter()
                    .any(|i| i.owner == subject)
            }
            CollectionMode::Invalid => false,
        }
    }

    fn check_white_list(collection_id: u64, address: T::AccountId) -> DispatchResult {

        let mes = "Address is not in white list";
        if <WhiteList<T>>::contains_key(collection_id){
            let wl = <WhiteList<T>>::get(collection_id);
            if !wl.contains(&address.clone()) {
                panic!(mes);
            }
        }
        else {
            panic!(mes);
        }
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
            "Item not exists"
        );

        let full_item = <FungibleItemList<T>>::get(collection_id, item_id);
        let amount = full_item.value;

        ensure!(amount >= value.into(), "Item balance not enouth");

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, owner.clone())
            .checked_sub(value)
            .unwrap();
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
                .unwrap();
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
                    .unwrap();
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
            "Item not exists"
        );

        let full_item = <ReFungibleItemList<T>>::get(collection_id, item_id);
        let item = full_item
            .owner
            .iter()
            .filter(|i| i.owner == owner)
            .next()
            .unwrap();
        let amount = item.fraction;

        ensure!(amount >= value.into(), "Item balance not enouth");

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(value)
            .unwrap();
        <Balance<T>>::insert(collection_id, item.owner.clone(), balance_old_owner);

        let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(value)
            .unwrap();
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
            "Item not exists"
        );

        let mut item = <NftItemList<T>>::get(collection_id, item_id);

        ensure!(
            sender == item.owner,
            "sender parameter and item owner must be equal"
        );

        // update balance
        let balance_old_owner = <Balance<T>>::get(collection_id, item.owner.clone())
            .checked_sub(1)
            .unwrap();
        <Balance<T>>::insert(collection_id, item.owner.clone(), balance_old_owner);

        let balance_new_owner = <Balance<T>>::get(collection_id, new_owner.clone())
            .checked_add(1)
            .unwrap();
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

    fn add_token_index(collection_id: u64, item_index: u64, owner: T::AccountId) -> DispatchResult {
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
pub struct ChargeTransactionPayment<T: transaction_payment::Trait + Send + Sync>(
    #[codec(compact)] BalanceOf<T>,
);

impl<T: Trait + transaction_payment::Trait + Send + Sync> sp_std::fmt::Debug
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

impl<T: Trait + transaction_payment::Trait + Send + Sync> ChargeTransactionPayment<T>
where
    T::Call:
        Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo> + IsSubType<Module<T>, T>,
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
        let fee = match call.is_sub_type() {
            Some(Call::create_collection(..)) => <BalanceOf<T>>::from(1_000_000_000),
            _ => Self::traditional_fee(len, info, tip), // Flat fee model, use only for testing purposes
                                                        // _ => <BalanceOf<T>>::from(100)
        };

        // Determine who is paying transaction fee based on ecnomic model
        // Parse call to extract collection ID and access collection sponsor
        let sponsor: T::AccountId = match call.is_sub_type() {
            Some(Call::create_item(collection_id, _properties, _owner)) => {
                <Collection<T>>::get(collection_id).sponsor
            }
            Some(Call::transfer(_new_owner, collection_id, _item_id, _value)) => {
                <Collection<T>>::get(collection_id).sponsor
            }

            _ => T::AccountId::default(),
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

impl<T: Trait + transaction_payment::Trait + Send + Sync> SignedExtension
    for ChargeTransactionPayment<T>
where
    BalanceOf<T>: Send + Sync + From<u64> + FixedPointOperand,
    T::Call:
        Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo> + IsSubType<Module<T>, T>,
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
        who: &Self::AccountId,
        call: &Self::Call,
        info: &DispatchInfoOf<Self::Call>,
        len: usize,
    ) -> TransactionValidity {
        let (fee, _) = self.withdraw_fee(who, call, info, len)?;

        let mut r = ValidTransaction::default();
        // NOTE: we probably want to maximize the _fee (of any type) per weight unit_ here, which
        // will be a bit more than setting the priority to tip. For now, this is enough.
        r.priority = fee.saturated_into::<TransactionPriority>();
        Ok(r)
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
