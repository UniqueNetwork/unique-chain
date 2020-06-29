#![cfg_attr(not(feature = "std"), no_std)]

use codec::{Decode, Encode};
/// A FRAME pallet template with necessary imports

/// Feel free to remove or edit this file as needed.
/// If you change the name of this file, make sure to update its references in runtime/src/lib.rs
/// If you remove this file, you can remove those references

/// For more guidance on Substrate FRAME, see the example pallet
/// https://github.com/paritytech/substrate/blob/master/frame/example/src/lib.rs
use frame_support::{decl_event, decl_module, decl_storage, dispatch::DispatchResult, ensure};
use frame_system::{self as system, ensure_signed};
use sp_runtime::sp_std::prelude::Vec;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[derive(Encode, Decode, Default, Clone, PartialEq)]
#[cfg_attr(feature = "std", derive(Debug))]
pub struct CollectionType<AccountId> {
    pub owner: AccountId,
    pub next_item_id: u64,
    pub custom_data_size: u32,
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

/// The pallet's configuration trait.
pub trait Trait: system::Trait {
    // Add other types and constants required to configure this pallet.

    /// The overarching event type.
    type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

// This pallet's storage items.
decl_storage! {
    // It is important to update your storage name so that your pallet's
    // storage items are isolated from other pallets.
    trait Store for Module<T: Trait> as Nft {

        /// Next available collection ID
        pub NextCollectionID get(fn next_collection_id): u64;

        pub Collection get(fn collection): map hasher(identity) u64 => CollectionType<T::AccountId>;
        //pub Collection get(collection): map hasher(identity) u64 => CollectionType<T::AccountId>;

        pub AdminList get(fn admin_list_collection): map hasher(identity) u64 => Vec<T::AccountId>;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): map hasher(blake2_128_concat) (u64, T::AccountId) => u64;
        pub ApprovedList get(fn approved): map hasher(blake2_128_concat) (u64, u64) => Vec<T::AccountId>;

        pub ItemList get(fn item_id): map hasher(blake2_128_concat) (u64, u64) => NftItemType<T::AccountId>;
        // pub ItemList get(item_id): map hasher(blake2_128_concat) (u64, u64) => NftItemType<T::AccountId>;

        pub ItemListIndex get(fn item_index): map hasher(blake2_128_concat) u64 => u64;
        // pub ItemListIndex get(item_index): map hasher(blake2_128_concat) u64 => u64;
    }
}

// The pallet's events
decl_event!(
    pub enum Event<T>
    where
        AccountId = <T as system::Trait>::AccountId,
    {
        Created(u32, AccountId),
    }
);

// The pallet's dispatchable functions.
decl_module! {
    /// The module declaration.
    pub struct Module<T: Trait> for enum Call where origin: T::Origin {

        // Initializing events
        // this is needed only if you are using events in your pallet
        fn deposit_event() = default;

        // Initializing events
        // this is needed only if you are using events in your module
        // fn deposit_event<T>() = default;

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID
        #[weight = 0]
        pub fn create_collection(origin, custom_data_sz: u32) -> DispatchResult {
            // Anyone can create a collection
            let who = ensure_signed(origin)?;

            // Generate next collection ID
            let next_id = NextCollectionID::get();

            NextCollectionID::put(next_id);

            // Create new collection
            let new_collection = CollectionType {
                owner: who,
                next_item_id: next_id,
                custom_data_size: custom_data_sz,
            };

            // Add new collection to map
            <Collection<T>>::insert(next_id, new_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn destroy_collection(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let owner = <Collection<T>>::get(collection_id).owner;
            ensure!(sender == owner, "You do not own this collection");
            <Collection<T>>::remove(collection_id);

            Ok(())
        }

        #[weight = 0]
        pub fn change_collection_owner(origin, collection_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.owner = new_owner;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = 0]
        pub fn add_collection_admin(origin, collection_id: u64, new_admin_id: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                 ensure!(exists, no_perm_mes);
                 ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            let mut admin_arr: Vec<T::AccountId> = Vec::new();
            if exists
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
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                ensure!(exists, no_perm_mes);
                ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            if exists
            {
                let mut admin_arr = <AdminList<T>>::get(collection_id);
                admin_arr.retain(|i| *i != account_id);
                <AdminList<T>>::insert(collection_id, admin_arr);
            }

            Ok(())
        }

        #[weight = 0]
        pub fn create_item(origin, collection_id: u64, properties: Vec<u8>) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            ensure!(target_collection.custom_data_size >= properties.len() as u32, "Size of item is too large");
            let is_owner = sender == target_collection.owner;

            let no_perm_mes = "You do not have permissions to modify this collection";
            let exists = <AdminList<T>>::contains_key(collection_id);

            if !is_owner
            {
                ensure!(exists, no_perm_mes);
                ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
            }

            let new_balance = <Balance<T>>::get((collection_id, sender.clone())) + 1;
            <Balance<T>>::insert((collection_id, sender.clone()), new_balance);

            // Create new item
            let new_item = NftItemType {
                collection: collection_id,
                owner: sender,
                data: properties,
            };

            let current_index = <ItemListIndex>::get(collection_id);
            <ItemListIndex>::insert(collection_id, current_index);
            <ItemList<T>>::insert((collection_id, current_index), new_item);

            Ok(())
        }

        #[weight = 0]
        pub fn burn_item(origin, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }
            <ItemList<T>>::remove((collection_id, item_id));

            // update balance
            let new_balance = <Balance<T>>::get((collection_id, item.owner.clone())) - 1;
            <Balance<T>>::insert((collection_id, item.owner.clone()), new_balance);

            Ok(())
        }

        #[weight = 0]
        pub fn transfer(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let mut item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }
            <ItemList<T>>::remove((collection_id, item_id));

            // update balance
            let balance_old_owner = <Balance<T>>::get((collection_id, item.owner.clone())) - 1;
            <Balance<T>>::insert((collection_id, item.owner.clone()), balance_old_owner);

            let balance_new_owner = <Balance<T>>::get((collection_id, new_owner.clone())) + 1;
            <Balance<T>>::insert((collection_id, new_owner.clone()), balance_new_owner);

            // change owner
            item.owner = new_owner;
            <ItemList<T>>::insert((collection_id, item_id), item);

            // reset approved list
            let itm: Vec<T::AccountId> = Vec::new();
            <ApprovedList<T>>::insert((collection_id, item_id), itm);

            Ok(())
        }

        #[weight = 0]
        pub fn approve(origin, approved: T::AccountId, collection_id: u64, item_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let target_collection = <Collection<T>>::get(collection_id);
            let is_owner = sender == target_collection.owner;

            ensure!(<ItemList<T>>::contains_key((collection_id, item_id)), "Item does not exists");
            let item = <ItemList<T>>::get((collection_id, item_id));

            if !is_owner
            {
                // check if item owner
                if item.owner != sender
                {
                    let no_perm_mes = "You do not have permissions to modify this collection";

                    ensure!(<AdminList<T>>::contains_key(collection_id), no_perm_mes);
                    ensure!(<AdminList<T>>::get(collection_id).contains(&sender), no_perm_mes);
                }
            }

            let list_exists = <ApprovedList<T>>::contains_key((collection_id, item_id));
            if list_exists {

                let mut list = <ApprovedList<T>>::get((collection_id, item_id));
                let item_contains = list.contains(&approved.clone());

                if !item_contains {
                    list.push(approved.clone());
                }
            } else {

                let mut itm = Vec::new();
                itm.push(approved.clone());
                <ApprovedList<T>>::insert((collection_id, item_id), itm);
            }

            Ok(())
        }

        #[weight = 0]
        pub fn transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let no_perm_mes = "You do not have permissions to modify this collection";
            ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
        }

        #[weight = 0]
        pub fn safe_transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let no_perm_mes = "You do not have permissions to modify this collection";
            ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            // on_nft_received  call

            Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
        }
    }
}
