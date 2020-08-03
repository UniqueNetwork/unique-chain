use crate::{AccountId, NodeRuntimeTypes};
use ink_core::env::EnvTypes;
use ink_prelude::vec::Vec;
use scale::{Codec, Decode, Encode};
use sp_runtime::traits::Member;

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
    create_collection(Vec<u16>, Vec<u16>, Vec<u8>, u8, u32, u32),

    #[allow(non_camel_case_types)]
    destroy_collection(u64),

    #[allow(non_camel_case_types)]
    change_collection_owner(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    add_collection_admin(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    remove_collection_admin(u64, T::AccountId),

    #[allow(non_camel_case_types)]
    create_item(u64, Vec<u8>, T::AccountId),

    #[allow(non_camel_case_types)]
    burn_item(u64, u64),

    #[allow(non_camel_case_types)]
    transfer(T::AccountId, u64, u64),

    #[allow(non_camel_case_types)]
    nft_approve(T::AccountId, u64, u64),

    #[allow(non_camel_case_types)]
    nft_transfer_from(T::AccountId, u64, u64),

    #[allow(non_camel_case_types)]
    nft_safe_transfer(u64, u64, T::AccountId),
}

pub fn transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::transfer(collection_id, item_id, new_owner.into()).into()
}

pub fn create_collection(
    collection_name: Vec<u16>,
    collection_description: Vec<u16>,
    token_prefix: Vec<u8>,
    mode: u8,
    decimal_points: u32,
    custom_data_size: u32,
) -> Call {
    Nft::<NodeRuntimeTypes>::create_collection(
        collection_name,
        collection_description,
        token_prefix,
        mode,
        decimal_points,
        custom_data_size,
    )
    .into()
}

// pub fn safe_transfer(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
//     Nft::<NodeRuntimeTypes>::nft_safe_transfer(collection_id, item_id, new_owner.into()).into()
// }

pub fn approve(approved: AccountId, collection_id: u64, item_id: u64) -> Call {
    Nft::<NodeRuntimeTypes>::nft_approve(approved.into(), collection_id, item_id).into()
}

pub fn transfer_from(collection_id: u64, item_id: u64, new_owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::nft_transfer_from(collection_id, item_id, new_owner.into()).into()
}

pub fn create_item(collection_id: u64, properties: Vec<u8>, owner: AccountId) -> Call {
    Nft::<NodeRuntimeTypes>::create_item(collection_id, properties, owner).into()
}

pub fn burn_item(collection_id: u64, item_id: u64) -> Call {
    Nft::<NodeRuntimeTypes>::burn_item(collection_id, item_id).into()
}
