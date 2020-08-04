#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract(version = "0.1.0", env = NodeRuntimeTypes)]
mod calls {
    use ink_core::env;
    use ink_prelude::vec::Vec;
    use ink_prelude::*;
    use ink_types_node_runtime::{calls as runtime_calls, NodeRuntimeTypes, RawData, AccountList };
    use scale::{
        Decode,
        Encode,
    };

    #[derive(Encode, Decode)]
    pub struct NftItemType {
        pub collection: u64,
        pub owner: AccountId,
        pub data: Vec<u8>,
    }

    /// This simple dummy contract dispatches substrate runtime calls
    #[ink(storage)]
    struct Calls {}

    impl Calls {
        #[ink(constructor)]
        fn new(&mut self) {}

        #[ink(message)]
        fn transfer(&self, new_owner: AccountId, collection_id: u64, item_id: u64, value: u64) {
            env::println(&format!(
                "transfer invoke_runtime params {:?}, {:?}, {:?}, {:?} ",
                new_owner, collection_id, item_id, value
            ));

            let transfer_call = runtime_calls::transfer(new_owner, collection_id, item_id, value);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&transfer_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("transfer invoke_runtime result {:?}", result));
        }

        // SafeTransfer

        #[ink(message)]
        fn approve(&self, approved: AccountId, collection_id: u64, item_id: u64) {
            env::println(&format!(
                "approve invoke_runtime params {:?}, {:?}, {:?} ",
                approved, collection_id, item_id
            ));

            let approve_call = runtime_calls::approve(approved, collection_id, item_id);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&approve_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("approve invoke_runtime result {:?}", result));
        }

        #[ink(message)]
        fn get_approved(&self, collection_id: u64, item_id: u64) -> AccountList {
            let mut key = vec![
                // Precomputed: Twox128("Nft")
                244, 63, 251, 230, 30, 244, 104, 116, 157, 54, 23, 172, 26, 99, 196, 183,
                // Precomputed: Twox128("ApprovedList")
                86, 163, 236, 207, 221, 111, 252, 227, 254, 40, 142, 38, 40, 224, 192, 18,
            ];

            let key_ext = vec![
                146, 214, 40, 117, 20, 27, 72, 25, 232, 204, 175, 194, 112, 244, 140, 100,
            ];
            key.extend_from_slice(&key_ext);

            // collection id 
            let mut collection_bytes: Vec<u8> =  collection_id.to_be_bytes().iter().cloned().collect();
            collection_bytes.reverse();
            key.extend_from_slice(&collection_bytes.as_slice());

             // item id 
             let mut item_bytes: Vec<u8> =  item_id.to_be_bytes().iter().cloned().collect();
             item_bytes.reverse();
             key.extend_from_slice(&item_bytes.as_slice());           

            // fetch from runtime storage
            let result = self.env().get_runtime_storage::<Vec<AccountId>>(&key[..]);
 
            match result {
                Some(Ok(accounts)) => { 
                    env::println(&format!("get_approved result {:?}", accounts));
                    AccountList(accounts) 
                },
                Some(Err(err)) => {
                    env::println(&format!("Error reading {:?}", err));
                    AccountList(vec![])
                }
                None => {
                    env::println(&format!("No data at key {:?}", key));
                    AccountList(vec![])
                }
            }
        }

        #[ink(message)]
        fn transfer_from(&self, new_owner: AccountId, collection_id: u64, item_id: u64, value: u64) {
            env::println(&format!(
                "transfer_from invoke_runtime params {:?}, {:?}, {:?}, {:?} ",
                new_owner, collection_id, item_id, value
            ));

            let transfer_from_call =
                runtime_calls::transfer_from(new_owner, collection_id, item_id, value);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&transfer_from_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("transfer_from invoke_runtime result {:?}", result));
        }

        // SafeTransferFrom
        #[ink(message)]
        fn create_item(&self, collection_id: u64, properties: RawData, owner: AccountId) {
            env::println(&format!(
                "create_item invoke_runtime params {:?}, {:?}, {:?} ",
                collection_id, properties, owner
            ));

            let create_item_call = runtime_calls::create_item(collection_id, properties.into(), owner);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&create_item_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("create_item invoke_runtime result {:?}", result));
        }

        #[ink(message)]
        fn burn_item(&self, collection_id: u64, item_id: u64) {
            env::println(&format!(
                "burn_item invoke_runtime params {:?}, {:?}",
                collection_id, item_id
            ));

            let burn_item_call = runtime_calls::burn_item(collection_id, item_id);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&burn_item_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("burn_item invoke_runtime result {:?}", result));
        }

        // GetOwner
        #[ink(message)]
        fn get_owner(&self, collection_id: u64, token_id: u64) -> AccountId {
            let mut key = vec![
                // Precomputed: Twox128("Nft")
                244, 63, 251, 230, 30, 244, 104, 116, 157, 54, 23, 172, 26, 99, 196, 183,
                // Precomputed: Twox128("ItemList")
                116, 232, 175, 181, 237, 113, 149, 125, 139, 77, 55, 251, 115, 253, 29, 240,
            ];

            let key_ext = vec![
                146, 214, 40, 117, 20, 27, 72, 25, 232, 204, 175, 194, 112, 244, 140, 100,
            ];
            key.extend_from_slice(&key_ext);

            // collection id 
            let mut collection_bytes: Vec<u8> =  collection_id.to_be_bytes().iter().cloned().collect();
            collection_bytes.reverse();
            key.extend_from_slice(&collection_bytes.as_slice());

             // token id 
             let mut token_bytes: Vec<u8> =  token_id.to_be_bytes().iter().cloned().collect();
             token_bytes.reverse();
             key.extend_from_slice(&token_bytes.as_slice());           

            // fetch from runtime storage        
            let result = self.env().get_runtime_storage::<NftItemType>(&key[..]);
 
            match result {
                Some(Ok(item)) => { 
                    env::println(&format!("get_owner result {:?}", item.owner));
                    item.owner
                },
                Some(Err(err)) => {
                    env::println(&format!("Error reading {:?}", err));
                    AccountId::from([0u8; 32])
                }
                None => {
                    env::println(&format!("No data at key {:?}", key));
                    AccountId::from([0u8; 32])
                }
            }
        }

        #[ink(message)]
        fn get_balance_of(&self, collection_id: u64, owner: AccountId) -> u64 {
            let mut key = vec![
                // Precomputed: Twox128("Nft")
                244, 63, 251, 230, 30, 244, 104, 116, 157, 54, 23, 172, 26, 99, 196, 183,
                // Precomputed: Twox128("Balance")
                78, 168, 234, 12, 1, 250, 164, 43, 110, 179, 68, 168, 92, 71, 179, 135,
            ];

            let key_ext = vec![
                15, 97, 136, 0, 76, 187, 168, 28, 239, 85, 170, 23, 77, 81, 248, 159,
            ];
            key.extend_from_slice(&key_ext);

            // collection id 
            let mut collection_bytes: Vec<u8> =  collection_id.to_be_bytes().iter().cloned().collect();
            collection_bytes.reverse();
            key.extend_from_slice(&collection_bytes.as_slice());

             // owner
             key.extend_from_slice(&owner.encode());           

            // fetch from runtime storage
            let result = self.env().get_runtime_storage::<u64>(&key[..]);
 
            match result {
                Some(Ok(balance)) => { 
                    env::println(&format!("get_balance_of result {:?}", balance));
                    balance
                },
                Some(Err(err)) => {
                    env::println(&format!("Error reading {:?}", err));
                    0
                }
                None => {
                    env::println(&format!("No data at key {:?}", key));
                    0
                }
            }
        }
    }
}
