// // Copyright 2019 Parity Technologies (UK) Ltd.
// // This file is part of ink!.
// //
// // ink! is free software: you can redistribute it and/or modify
// // it under the terms of the GNU General Public License as published by
// // the Free Software Foundation, either version 3 of the License, or
// // (at your option) any later version.
// //
// // ink! is distributed in the hope that it will be useful,
// // but WITHOUT ANY WARRANTY; without even the implied warranty of
// // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// // GNU General Public License for more details.
// //
// // You should have received a copy of the GNU General Public License
// // along with ink!.  If not, see <http://www.gnu.org/licenses/>.

// use ink_core::env::EnvTypes;
// use scale::{Codec, Decode, Encode};
// use sp_runtime::traits::Member;
// use crate::{AccountId, Balance, NodeRuntimeTypes};

// /// Default runtime Call type, a subset of the runtime Call module variants
// ///
// /// The codec indices of the  modules *MUST* match those in the concrete runtime.
// #[derive(Encode, Decode)]
// #[cfg_attr(feature = "std", derive(Clone, PartialEq, Eq))]
// pub enum Call {
//     #[codec(index = "5")]
//     Balances(Balances<NodeRuntimeTypes>),
// }

// impl From<Balances<NodeRuntimeTypes>> for Call {
//     fn from(balances_call: Balances<NodeRuntimeTypes>) -> Call {
//         Call::Balances(balances_call)
//     }
// }
// /// Generic Balance Call, could be used with other runtimes
// #[derive(Encode, Decode, Clone, PartialEq, Eq)]
// pub enum Balances<T>
// where
//     T: EnvTypes,
//     T::AccountId: Member + Codec,
// {
//     #[allow(non_camel_case_types)]
//     transfer(T::AccountId, #[codec(compact)] T::Balance),
// }

// /// Construct a `Balances::transfer` call
// pub fn transfer_balance(account: AccountId, balance: Balance) -> Call {
//     Balances::<NodeRuntimeTypes>::transfer(account.into(), balance).into()
// }







// Copyright 2019 Parity Technologies (UK) Ltd.
// This file is part of ink!.
//
// ink! is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// ink! is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with ink!.  If not, see <http://www.gnu.org/licenses/>.

use ink_core::env::EnvTypes;
use scale::{Codec, Decode, Encode};
use sp_runtime::traits::Member;
use ink_prelude::vec::Vec;
use crate::{AccountId, Balance, NodeRuntimeTypes};


/// Default runtime Call type, a subset of the runtime Call module variants
///
/// The codec indices of the  modules *MUST* match those in the concrete runtime.
#[derive(Encode, Decode)]
#[cfg_attr(feature = "std", derive(Clone, PartialEq, Eq))]
pub enum Call {
    #[codec(index = "7")]
    Nft(Nft<NodeRuntimeTypes>),
}

impl From<Nft<NodeRuntimeTypes>> for Call {
    fn from(nft_call: Nft<NodeRuntimeTypes>) -> Call {
        Call::Nft(nft_call)
    }
}
/// Generic Balance Call, could be used with other runtimes
#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub enum Nft<T>
 where
     T: EnvTypes,
     T::AccountId: Member + Codec,
    {
        #[allow(non_camel_case_types)]
        create_collection(Vec<u16>, Vec<u16>, Vec<u8>, u32),

        #[allow(non_camel_case_types)]
        destroy_collection(u64),

        #[allow(non_camel_case_types)]
        change_collection_owner(u64, T::AccountId),

        #[allow(non_camel_case_types)]
        add_collection_admin(u64, T::AccountId),

        #[allow(non_camel_case_types)]
        remove_collection_admin(u64, T::AccountId),

        #[allow(non_camel_case_types)]
        create_item(u64, Vec<u8>),

        #[allow(non_camel_case_types)]
        burn_item(u64, u64),

        #[allow(non_camel_case_types)]
        transfer(u64, u64, T::AccountId),

        #[allow(non_camel_case_types)]
        nft_approve(T::AccountId, u64, u64),

        #[allow(non_camel_case_types)]
        nft_transfer_from(u64, u64, T::AccountId),

        #[allow(non_camel_case_types)]
        nft_safe_transfer(u64, u64, T::AccountId),
    }




pub fn transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::transfer(collection_id, item_id, new_owner.into()).into()
}

pub fn create_collection(collection_name: Vec<u16>, collection_description: Vec<u16>, 
        token_prefix: Vec<u8>, custom_data_sz: u32) -> Call {
    Nft::<NodeRuntimeTypes>::create_collection(collection_name, collection_description, token_prefix, custom_data_sz).into()
}

// pub fn safe_transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
//     Nft::<NodeRuntimeTypes>::nft_safe_transfer(collection_id, item_id, new_owner.into()).into()
// }

pub fn approve(approved: AccountId, collection_id: u64, item_id: u64) -> Call {
    Nft::<NodeRuntimeTypes>::nft_approve(approved.into(), collection_id, item_id).into()
}

//GetApproved

pub fn transfer_from(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::nft_transfer_from(collection_id, item_id, new_owner.into()).into()
}

pub fn create_item(collection_id: u64, properties: Vec<u8>) -> Call {
    Nft::<NodeRuntimeTypes>::create_item(collection_id, properties).into()
}

pub fn burn_item(collection_id: u64, item_id: u64) -> Call {
    Nft::<NodeRuntimeTypes>::burn_item(collection_id, item_id).into()
}

//GetOwner
//BalanceOf