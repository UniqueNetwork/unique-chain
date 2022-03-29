// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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

            // report result to console
            // NOTE: println should only be used on a development chain)
            env::println(&format!("Balance transfer invoke_runtime result {:?}", result));
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
