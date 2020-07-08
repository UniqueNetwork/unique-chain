#![cfg_attr(not(feature = "std"), no_std)]

/// A FRAME pallet template with necessary imports

/// Feel free to remove or edit this file as needed.
/// If you change the name of this file, make sure to update its references in runtime/src/lib.rs
/// If you remove this file, you can remove those references

/// For more guidance on Substrate FRAME, see the example pallet
/// https://github.com/paritytech/substrate/blob/master/frame/example/src/lib.rs

use codec::{Decode, Encode};

use frame_support::{decl_module, decl_storage, decl_event, decl_error, dispatch::DispatchResult, ensure};
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
    pub name: Vec<u16>, // 64 include null escape char
    pub description: Vec<u16>, // 256 include null escape char
    pub token_prefix: Vec<u8>, // 16 include null escape char
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
        pub AdminList get(fn admin_list_collection): map hasher(identity) u64 => Vec<T::AccountId>;

        /// Balance owner per collection map
        pub Balance get(fn balance_count): map hasher(blake2_128_concat) (u64, T::AccountId) => u64;
        pub ApprovedList get(fn approved): map hasher(blake2_128_concat) (u64, u64) => Vec<T::AccountId>;

        pub ItemList get(fn item_id): map hasher(blake2_128_concat) (u64, u64) => NftItemType<T::AccountId>;
        pub ItemListIndex get(fn item_index): map hasher(blake2_128_concat) u64 => u64;

        pub AddressTokens get(fn address_tokens): map hasher(blake2_128_concat) (u64, T::AccountId) => Vec<u64>;

    }
}

// The pallet's events
decl_event!(
    pub enum Event<T>
    where
        AccountId = <T as system::Trait>::AccountId,
    {
        Created(u64, AccountId),
        ItemCreated(u64),
        ItemDestroyed(u64, u64),
    }
);

// The pallet's errors
decl_error! {
	pub enum Error for Module<T: Trait> {
		/// Value was None
		NoneValue,
		/// Value reached maximum and cannot be incremented further
		StorageOverflow,
	}
}

// The pallet's dispatchable functions.
decl_module! {
    /// The module declaration.
    pub struct Module<T: Trait> for enum Call where origin: T::Origin {

        // Initializing events
        // this is needed only if you are using events in your pallet
        fn deposit_event() = default;

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID

        // Create collection of NFT with given parameters
        //
        // @param customDataSz size of custom data in each collection item
        // returns collection ID
        // TODO: later versions use "#[weight = 0]"
        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
        pub fn create_collection(   origin, 
                                    collection_name: Vec<u16>, 
                                    collection_description: Vec<u16>, 
                                    token_prefix: Vec<u8>, 
                                    custom_data_sz: u32) -> DispatchResult {

            // Anyone can create a collection
            let who = ensure_signed(origin)?;

            // check params 
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
            let next_id = NextCollectionID::get()
                .checked_add(1)
                .expect("collection id error");

            NextCollectionID::put(next_id);

            // Create new collection
            let new_collection = CollectionType {
                owner: who.clone(),
                name: name,
                description: description,
                token_prefix: prefix,
                next_item_id: next_id,
                custom_data_size: custom_data_sz,
            };

            // Add new collection to map
            <Collection<T>>::insert(next_id, new_collection);

            // call event
            Self::deposit_event(RawEvent::Created(next_id, who.clone()));

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
        pub fn destroy_collection(origin, collection_id: u64) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let owner = <Collection<T>>::get(collection_id).owner;
            ensure!(sender == owner, "You do not own this collection");
            <Collection<T>>::remove(collection_id);

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
        pub fn change_collection_owner(origin, collection_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let sender = ensure_signed(origin)?;
            ensure!(<Collection<T>>::contains_key(collection_id), "This collection does not exist");

            let mut target_collection = <Collection<T>>::get(collection_id);
            ensure!(sender == target_collection.owner, "You do not own this collection");

            target_collection.owner = new_owner;
            <Collection<T>>::insert(collection_id, target_collection);

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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


            let current_index = <ItemListIndex>::get(collection_id)
                .checked_add(1)
                .expect("Item list index id error");

            Self::add_token_index(collection_id, current_index, new_item.owner.clone())?;

            <ItemListIndex>::insert(collection_id, current_index);
            <ItemList<T>>::insert((collection_id, current_index), new_item);

            // call event
            Self::deposit_event(RawEvent::ItemCreated(collection_id));

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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

            Self::remove_token_index(collection_id, item_id, item.owner.clone())?;

            // update balance
            let new_balance = <Balance<T>>::get((collection_id, item.owner.clone())) - 1;
            <Balance<T>>::insert((collection_id, item.owner.clone()), new_balance);

            // call event
            Self::deposit_event(RawEvent::ItemDestroyed(collection_id, item_id));

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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
            let old_owner = item.owner.clone();
            item.owner = new_owner.clone();
            <ItemList<T>>::insert((collection_id, item_id), item);

            // update index collection
            Self::move_token_index(collection_id, item_id, old_owner, new_owner.clone())?;

            // reset approved list
            let itm: Vec<T::AccountId> = Vec::new();
            <ApprovedList<T>>::insert((collection_id, item_id), itm);

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
        pub fn transfer_from(origin, collection_id: u64, item_id: u64, new_owner: T::AccountId) -> DispatchResult {

            let no_perm_mes = "You do not have permissions to modify this collection";
            ensure!(<ApprovedList<T>>::contains_key((collection_id, item_id)), no_perm_mes);
            let list_itm = <ApprovedList<T>>::get((collection_id, item_id));
            ensure!(list_itm.contains(&new_owner.clone()), no_perm_mes);

            Self::transfer(origin, collection_id, item_id, new_owner)?;

            Ok(())
        }

        #[weight = frame_support::weights::SimpleDispatchInfo::default()]
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

impl<T: Trait> Module<T> {
    fn add_token_index(collection_id: u64, item_index: u64, owner: T::AccountId) -> DispatchResult {
        
        let list_exists = <AddressTokens<T>>::contains_key((collection_id, owner.clone()));
        if list_exists {

            let mut list = <AddressTokens<T>>::get((collection_id, owner.clone()));
            let item_contains = list.contains(&item_index.clone());

            if !item_contains {
                list.push(item_index.clone());
            }

            <AddressTokens<T>>::insert((collection_id, owner.clone()), list);

        } else {

            let mut itm = Vec::new();
            itm.push(item_index.clone());
            <AddressTokens<T>>::insert((collection_id, owner), itm);
        }

        Ok(())
    }

    fn remove_token_index(collection_id: u64, item_index: u64, owner: T::AccountId) -> DispatchResult {
        
        let list_exists = <AddressTokens<T>>::contains_key((collection_id, owner.clone()));
        if list_exists {

            let mut list = <AddressTokens<T>>::get((collection_id, owner.clone()));
            let item_contains = list.contains(&item_index.clone());

            if item_contains {
                list.retain(|&item| item != item_index);
                <AddressTokens<T>>::insert((collection_id, owner), list);
            }
        }

        Ok(())
    }

    fn move_token_index(collection_id: u64, item_index: u64, old_owner: T::AccountId, new_owner: T::AccountId) -> DispatchResult {
        
        Self::remove_token_index(collection_id, item_index, old_owner)?;
        Self::add_token_index(collection_id, item_index, new_owner)?;
        
        Ok(())
    }
}
