#![cfg_attr(not(feature = "std"), no_std)]

use ink_core::env::EnvTypes;
use scale::{Codec, Decode, Encode};
use sp_core::crypto::AccountId32;
use sp_runtime::traits::Member;
use pallet_indices::address::Address;
use core::{array::TryFromSliceError, convert::TryFrom};
use ink_core::env::Clear;

use ink_lang as ink;

/// The default SRML hash type.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Encode, Decode)]
pub struct Hash([u8; 32]);

impl From<[u8; 32]> for Hash {
    fn from(hash: [u8; 32]) -> Hash {
        Hash(hash)
    }
}

impl<'a> TryFrom<&'a [u8]> for Hash {
    type Error = TryFromSliceError;

    fn try_from(bytes: &'a [u8]) -> Result<Hash, TryFromSliceError> {
        let hash = <[u8; 32]>::try_from(bytes)?;
        Ok(Hash(hash))
    }
}

impl AsRef<[u8]> for Hash {
    fn as_ref(&self) -> &[u8] {
        &self.0[..]
    }
}

impl AsMut<[u8]> for Hash {
    fn as_mut(&mut self) -> &mut [u8] {
        &mut self.0[..]
    }
}

impl Clear for Hash {
    fn is_clear(&self) -> bool {
        self.as_ref().iter().all(|&byte| byte == 0x00)
    }

    fn clear() -> Self {
        Self([0x00; 32])
    }
}

/// The default SRML moment type.
pub type Moment = u64;

/// The default SRML blocknumber type.
pub type BlockNumber = u64;

/// The default SRML AccountIndex type.
pub type AccountIndex = u32;

/// The default timestamp type.
pub type Timestamp = u64;

/// The default SRML balance type.
pub type Balance = u128;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Encode, Decode)]
pub struct AccountId (AccountId32);

impl From<AccountId32> for AccountId {
    fn from(account: AccountId32) -> Self {
        AccountId(account)
    }
}

// #[cfg(feature = "ink-generate-abi")]
// impl HasTypeId for AccountId {
//     fn type_id() -> TypeId {
//         TypeIdArray::new(32, MetaType::new::<u8>()).into()
//     }
// }

// #[cfg(feature = "ink-generate-abi")]
// impl HasTypeDef for AccountId {
//     fn type_def() -> TypeDef {
//         TypeDef::builtin()
//     }
// }

/// Contract environment types defined in substrate node-runtime
#[cfg_attr(feature = "ink-generate-abi", derive(Metadata))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum NodeRuntimeTypes {}

impl ink_core::env::EnvTypes for NodeRuntimeTypes {
    type AccountId = AccountId;
    type Balance = Balance;
    type Hash = Hash;
    type Timestamp = Timestamp;
    type BlockNumber = BlockNumber;
    type Call = Call;
}

/// Default runtime Call type, a subset of the runtime Call module variants
///
/// The codec indices of the  modules *MUST* match those in the concrete runtime.
#[derive(Encode, Decode)]
#[cfg_attr(feature = "std", derive(Clone, PartialEq, Eq))]
pub enum Call {
    #[codec(index = "6")]
    Balances(Balances<NodeRuntimeTypes, AccountIndex>),
}

/// Generic Balance Call, could be used with other runtimes
#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub enum Balances<T, AccountIndex>
where
    T: EnvTypes,
    T::AccountId: Member + Codec,
    AccountIndex: Member + Codec,
{
    #[allow(non_camel_case_types)]
    transfer(Address<T::AccountId, AccountIndex>, #[codec(compact)] T::Balance),
    #[allow(non_camel_case_types)]
    set_balance(
        Address<T::AccountId, AccountIndex>,
        #[codec(compact)] T::Balance,
        #[codec(compact)] T::Balance,
    ),
}

#[ink::contract(version = "0.1.0")]
mod nft {
    use ink_core::storage;

    /// Defines the storage of your contract.
    /// Add new fields to the below struct in order
    /// to add new static storage fields to your contract.
    #[ink(storage)]
    struct Nft {
        /// Stores a single `bool` value on the storage.
        value: storage::Value<bool>,
    }

    impl Nft {
        /// Constructor that initializes the `bool` value to the given `init_value`.
        #[ink(constructor)]
        fn new(&mut self, init_value: bool) {
            self.value.set(init_value);
        }

        /// Constructor that initializes the `bool` value to `false`.
        ///
        /// Constructors can delegate to other constructors.
        #[ink(constructor)]
        fn default(&mut self) {
            self.new(false)
        }

        /// A message that can be called on instantiated contracts.
        /// This one flips the value of the stored `bool` from `true`
        /// to `false` and vice versa.
        #[ink(message)]
        fn flip(&mut self) {
            *self.value = !self.get();
        }

        /// Simply returns the current value of our `bool`.
        #[ink(message)]
        fn get(&self) -> bool {
            *self.value
        }
    }
}


#[cfg(test)]
mod tests {
    use crate::{calls, AccountIndex, NodeRuntimeTypes};
    use super::Call;

    use node_runtime::{self, Runtime};
    use pallet_indices::address;
    use scale::{Decode, Encode};

    #[test]
    fn call_balance_transfer() {
        let balance = 10_000;
        let account_index = 0;

        let contract_address = calls::Address::Index(account_index);
        let contract_transfer =
            calls::Balances::<NodeRuntimeTypes, AccountIndex>::transfer(contract_address, balance);
        let contract_call = Call::Balances(contract_transfer);

        let srml_address = address::Address::Index(account_index);
        let srml_transfer = node_runtime::BalancesCall::<Runtime>::transfer(srml_address, balance);
        let srml_call = node_runtime::Call::Balances(srml_transfer);

        let contract_call_encoded = contract_call.encode();
        let srml_call_encoded = srml_call.encode();

        assert_eq!(srml_call_encoded, contract_call_encoded);

        let srml_call_decoded: node_runtime::Call =
            Decode::decode(&mut contract_call_encoded.as_slice())
                .expect("Balances transfer call decodes to srml type");
        let srml_call_encoded = srml_call_decoded.encode();
        let contract_call_decoded: Call = Decode::decode(&mut srml_call_encoded.as_slice())
            .expect("Balances transfer call decodes back to contract type");
        assert!(contract_call == contract_call_decoded);
    }
}