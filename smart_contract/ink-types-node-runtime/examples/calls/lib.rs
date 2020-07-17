#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract(version = "0.1.0", env = NodeRuntimeTypes)]
mod calls {
    use ink_core::env;
    use ink_prelude::*;
    use ink_types_node_runtime::{calls as runtime_calls, NodeRuntimeTypes};
    use ink_prelude::vec::Vec;

    /// This simple dummy contract dispatches substrate runtime calls
    #[ink(storage)]
    struct Calls {}

    impl Calls {
        #[ink(constructor)]
        fn new(&mut self) {}

        #[ink(message)]
        fn transfer(&self, collection_id: u64, item_id: u64, new_owner: AccountId) {

            env::println(&format!(
                "transfer invoke_runtime params {:?}, {:?}, {:?} ",
                collection_id,
                item_id, 
                new_owner
            ));

            let transfer_call = runtime_calls::transfer(collection_id, item_id, new_owner);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&transfer_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "transfer invoke_runtime result {:?}",
                result
            ));
        }

        // SafeTransfer

        #[ink(message)]
        fn approve(&self, approved: AccountId, collection_id: u64, item_id: u64) {

            env::println(&format!(
                "approve invoke_runtime params {:?}, {:?}, {:?} ",
                approved,
                collection_id, 
                item_id 
            ));

            let approve_call = runtime_calls::approve(approved, collection_id, item_id);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&approve_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "approve invoke_runtime result {:?}",
                result
            ));
        }

        ////////////////////////////////////////// GetApproved
        /// 
        /// Returns an account's free balance, read directly from runtime storage
        ///
        /// # Key Scheme
        ///
        /// A key for the [substrate storage map]
        /// (https://github.com/paritytech/substrate/blob/dd97b1478b31a4715df7e88a5ebc6664425fb6c6/frame/support/src/storage/generator/map.rs#L28)
        /// is constructed with:
        ///
        /// ```nocompile
        /// Twox128(module_prefix) ++ Twox128(storage_prefix) ++ Hasher(encode(key))
        /// ```
        ///
        /// For the `System` module's `Account` map, the [hasher implementation]
        /// (https://github.com/paritytech/substrate/blob/2c87fe171bc341755a43a3b32d67560469f8daac/frame/system/src/lib.rs#L349)
        /// is `blake2_128_concat`.
        // #[ink(message)]
        // fn get_balance(&self, account: AccountId) -> Balance {
        //     let mut key = vec![
        //         // Precomputed: Twox128("System")
        //         38, 170, 57, 78, 234, 86, 48, 224, 124, 72, 174, 12, 149, 88, 206, 247,
        //         // Precomputed: Twox128("Account")
        //         185, 157, 136, 14, 198, 129, 121, 156, 12, 243, 14, 136, 134, 55, 29, 169,
        //     ];

        //     let encoded_account = account.encode();
        //     let hashed_account = <Blake2x128>::hash_bytes(&encoded_account);

        //     // The hasher is `Blake2_128Concat` which appends the unhashed account to the hashed account
        //     key.extend_from_slice(&hashed_account);
        //     key.extend_from_slice(&encoded_account);

        //     // fetch from runtime storage
        //     let result = self.env().get_runtime_storage::<AccountInfo>(&key[..]);
        //     match result {
        //         Some(Ok(account_info)) => account_info.data.free,
        //         Some(Err(err)) => {
        //             env::println(&format!("Error reading AccountInfo {:?}", err));
        //             0
        //         }
        //         None => {
        //             env::println(&format!("No data at key {:?}", key));
        //             0
        //         }
        //     }
        // }

        #[ink(message)]
        fn transfer_from(&self, collection_id: u64, item_id: u64, new_owner: AccountId) {

            env::println(&format!(
                "transfer_from invoke_runtime params {:?}, {:?}, {:?} ",
                collection_id,
                item_id, 
                new_owner 
            ));

            let transfer_from_call = runtime_calls::transfer_from(collection_id, item_id, new_owner);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&transfer_from_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "transfer_from invoke_runtime result {:?}",
                result
            ));
        }

        // SafeTransferFrom

        #[ink(message)]
        fn create_item(&self, collection_id: u64, properties: Vec<u8>) {

            env::println(&format!(
                "create_item invoke_runtime params {:?}, {:?} ",
                collection_id,
                properties 
            ));

            let create_item_call = runtime_calls::create_item(collection_id, properties);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&create_item_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "create_item invoke_runtime result {:?}",
                result
            ));
        }

        #[ink(message)]
        fn burn_item(&self, collection_id: u64, item_id: u64) {

            env::println(&format!(
                "burn_item invoke_runtime params {:?}, {:?}",
                collection_id,
                item_id 
            ));

            let burn_item_call = runtime_calls::burn_item(collection_id, item_id);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&burn_item_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "burn_item invoke_runtime result {:?}",
                result
            ));
        }

        // GetOwner
        // BalanceOf
    }
}
