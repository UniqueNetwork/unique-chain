#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract(version = "0.1.0", env = NodeRuntimeTypes)]
mod calls {
    use ink_core::env;
    use ink_prelude::*;
    use ink_types_node_runtime::{calls as runtime_calls, NodeRuntimeTypes};

    /// This simple dummy contract dispatches substrate runtime calls
    #[ink(storage)]
    struct Calls {}

    impl Calls {
        #[ink(constructor)]
        fn new(&mut self) {}

        /// Dispatches a `transfer` call to the Balances srml module
        #[ink(message)]
        fn balance_transfer(&self, dest: AccountId, value: Balance) {
            // create the Balances::transfer Call
            let transfer_call = runtime_calls::transfer_balance(dest, value);
            // dispatch the call to the runtime
            let result = self.env().invoke_runtime(&transfer_call);
            // let _ = self.env().invoke_runtime(&transfer_call);

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!(
                "Balance transfer invoke_runtime result {:?}",
                result
            ));
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use sp_keyring::AccountKeyring;

        #[test]
        fn dispatches_balances_call() {
            let calls = Calls::new();
            let alice = AccountId::from(AccountKeyring::Alice.to_account_id());
            // assert_eq!(calls.env().dispatched_calls().into_iter().count(), 0);
            calls.balance_transfer(alice, 10000);
            // assert_eq!(calls.env().dispatched_calls().into_iter().count(), 1);
        }
    }
}
