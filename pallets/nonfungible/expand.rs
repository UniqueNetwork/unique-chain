#![feature(prelude_import)]
//! # Nonfungible Pallet
//!
//! The Nonfungible pallet provides functionality for handling nonfungible collections and tokens.
//!
//! - [`Config`]
//! - [`NonfungibleHandle`]
//! - [`Pallet`]
//! - [`CommonWeights`](common::CommonWeights)
//!
//! ## Overview
//!
//! The Nonfungible pallet provides functions for:
//!
//! - NFT collection creation and removal
//! - Minting and burning of NFT tokens
//! - Retrieving account balances
//! - Transfering NFT tokens
//! - Setting and checking allowance for NFT tokens
//! - Setting properties and permissions for NFT collections and tokens
//! - Nesting and unnesting tokens
//!
//! ### Terminology
//!
//! - **NFT token:** Non fungible token.
//!
//! - **NFT Collection:** A collection of NFT tokens. All NFT tokens are part of a collection.
//!   Each collection can define it's own properties, properties for it's tokens and set of permissions.
//!
//! - **Balance:** Number of NFT tokens owned by an account
//!
//! - **Allowance:** NFT tokens owned by one account that another account is allowed to make operations on
//!
//! - **Burning:** The process of “deleting” a token from a collection and from
//!   an account balance of the owner.
//!
//! - **Nesting:** Setting up parent-child relationship between tokens. Nested tokens are inhereting
//!   owner from their parent. There could be multiple levels of nesting. Token couldn't be nested in
//!   it's child token i.e. parent-child relationship graph shouldn't have cycles.
//!
//! - **Properties:** Key-Values pairs. Token properties are attached to a token. Collection properties are
//!   attached to a collection. Set of permissions could be defined for each property.
//!
//! ### Implementations
//!
//! The Nonfungible pallet provides implementations for the following traits. If these traits provide
//! the functionality that you need, then you can avoid coupling with the Nonfungible pallet.
//!
//! - [`CommonWeightInfo`](pallet_common::CommonWeightInfo): Functions for retrieval of transaction weight
//! - [`CommonCollectionOperations`](pallet_common::CommonCollectionOperations): Functions for dealing
//!   with collections
//!
//! ## Interface
//!
//! ### Dispatchable Functions
//!
//! - `init_collection` - Create NFT collection. NFT collection can be configured to allow or deny access for
//!   some accounts.
//! - `destroy_collection` - Destroy exising NFT collection. There should be no tokens in the collection.
//! - `burn` - Burn NFT token owned by account.
//! - `transfer` - Transfer NFT token. Transfers should be enabled for NFT collection.
//!   Nests the NFT token if it is sent to another token.
//! - `create_item` - Mint NFT token in collection. Sender should have permission to mint tokens.
//! - `set_allowance` - Set allowance for another account.
//! - `set_token_property` - Set token property value.
//! - `delete_token_property` - Remove property from the token.
//! - `set_collection_properties` - Set collection properties.
//! - `delete_collection_properties` - Remove properties from the collection.
//! - `set_property_permission` - Set collection property permission.
//! - `set_token_property_permissions` - Set token property permissions.
//!
//! ## Assumptions
//!
//! * To perform operations on tokens sender should be in collection's allow list if collection access mode is `AllowList`.
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
use erc::ERC721Events;
use evm_coder::ToLog;
use frame_support::{
    BoundedVec, ensure, fail, transactional, storage::with_transaction,
    pallet_prelude::DispatchResultWithPostInfo, pallet_prelude::Weight,
    weights::{PostDispatchInfo, Pays},
};
use up_data_structs::{
    AccessMode, CollectionId, CollectionFlags, CustomDataLimit, TokenId,
    CreateCollectionData, CreateNftExData, mapping::TokenAddressMapping, budget::Budget,
    Property, PropertyPermission, PropertyKey, PropertyValue, PropertyKeyPermission,
    Properties, PropertyScope, TrySetProperty, TokenChild, AuxPropertyValue,
};
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use pallet_common::{
    Error as CommonError, Pallet as PalletCommon, Event as CommonEvent, CollectionHandle,
    eth::collection_id_to_address,
};
use pallet_structure::{Pallet as PalletStructure, Error as StructureError};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, TransactionOutcome};
use sp_std::{vec::Vec, vec, collections::btree_map::BTreeMap};
use core::ops::Deref;
use codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;
pub use pallet::*;
use weights::WeightInfo;
pub mod common {
    use core::marker::PhantomData;
    use frame_support::{
        dispatch::DispatchResultWithPostInfo, ensure, fail, weights::Weight,
    };
    use up_data_structs::{
        TokenId, CreateItemExData, CollectionId, budget::Budget, Property, PropertyKey,
        PropertyKeyPermission, PropertyValue,
    };
    use pallet_common::{
        CommonCollectionOperations, CommonWeightInfo, RefungibleExtensions, with_weight,
        weights::WeightInfo as _,
    };
    use sp_runtime::DispatchError;
    use sp_std::{vec::Vec, vec};
    use crate::{
        AccountBalance, Allowance, Config, CreateItemData, Error, NonfungibleHandle,
        Owned, Pallet, SelfWeightOf, TokenData, weights::WeightInfo, TokensMinted,
    };
    pub struct CommonWeights<T: Config>(PhantomData<T>);
    impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
        fn create_item() -> Weight {
            <SelfWeightOf<T>>::create_item()
        }
        fn create_multiple_items_ex(
            data: &CreateItemExData<T::CrossAccountId>,
        ) -> Weight {
            match data {
                CreateItemExData::NFT(t) => {
                    <SelfWeightOf<T>>::create_multiple_items_ex(t.len() as u32)
                        + t
                            .iter()
                            .filter_map(|t| {
                                if t.properties.len() > 0 {
                                    Some(Self::set_token_properties(t.properties.len() as u32))
                                } else {
                                    None
                                }
                            })
                            .fold(Weight::zero(), |a, b| a.saturating_add(b))
                }
                _ => Weight::zero(),
            }
        }
        fn create_multiple_items(data: &[up_data_structs::CreateItemData]) -> Weight {
            <SelfWeightOf<T>>::create_multiple_items(data.len() as u32)
                + data
                    .iter()
                    .filter_map(|t| match t {
                        up_data_structs::CreateItemData::NFT(
                            n,
                        ) if n.properties.len() > 0 => {
                            Some(Self::set_token_properties(n.properties.len() as u32))
                        }
                        _ => None,
                    })
                    .fold(Weight::zero(), |a, b| a.saturating_add(b))
        }
        fn burn_item() -> Weight {
            <SelfWeightOf<T>>::burn_item()
        }
        fn set_collection_properties(amount: u32) -> Weight {
            <pallet_common::SelfWeightOf<T>>::set_collection_properties(amount)
        }
        fn delete_collection_properties(amount: u32) -> Weight {
            <pallet_common::SelfWeightOf<T>>::delete_collection_properties(amount)
        }
        fn set_token_properties(amount: u32) -> Weight {
            <SelfWeightOf<T>>::set_token_properties(amount)
        }
        fn delete_token_properties(amount: u32) -> Weight {
            <SelfWeightOf<T>>::delete_token_properties(amount)
        }
        fn set_token_property_permissions(amount: u32) -> Weight {
            <SelfWeightOf<T>>::set_token_property_permissions(amount)
        }
        fn transfer() -> Weight {
            <SelfWeightOf<T>>::transfer()
        }
        fn approve() -> Weight {
            <SelfWeightOf<T>>::approve()
        }
        fn transfer_from() -> Weight {
            <SelfWeightOf<T>>::transfer_from()
        }
        fn burn_from() -> Weight {
            <SelfWeightOf<T>>::burn_from()
        }
        fn burn_recursively_self_raw() -> Weight {
            <SelfWeightOf<T>>::burn_recursively_self_raw()
        }
        fn burn_recursively_breadth_raw(amount: u32) -> Weight {
            <SelfWeightOf<
                T,
            >>::burn_recursively_breadth_plus_self_plus_self_per_each_raw(amount)
                .saturating_sub(
                    Self::burn_recursively_self_raw().saturating_mul(amount as u64 + 1),
                )
        }
        fn token_owner() -> Weight {
            <SelfWeightOf<T>>::token_owner()
        }
    }
    fn map_create_data<T: Config>(
        data: up_data_structs::CreateItemData,
        to: &T::CrossAccountId,
    ) -> Result<CreateItemData<T>, DispatchError> {
        match data {
            up_data_structs::CreateItemData::NFT(data) => {
                Ok(CreateItemData::<T> {
                    properties: data.properties,
                    owner: to.clone(),
                })
            }
            _ => {
                return Err(
                    <Error<T>>::NotNonfungibleDataUsedToMintFungibleCollectionToken
                        .into(),
                );
            }
        }
    }
    /// Implementation of `CommonCollectionOperations` for `NonfungibleHandle`. It wraps Nonfungible Pallete
    /// methods and adds weight info.
    impl<T: Config> CommonCollectionOperations<T> for NonfungibleHandle<T> {
        fn create_item(
            &self,
            sender: T::CrossAccountId,
            to: T::CrossAccountId,
            data: up_data_structs::CreateItemData,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            with_weight(
                <Pallet<
                    T,
                >>::create_item(
                    self,
                    &sender,
                    map_create_data::<T>(data, &to)?,
                    nesting_budget,
                ),
                <CommonWeights<T>>::create_item(),
            )
        }
        fn create_multiple_items(
            &self,
            sender: T::CrossAccountId,
            to: T::CrossAccountId,
            data: Vec<up_data_structs::CreateItemData>,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<T>>::create_multiple_items(&data);
            let data = data
                .into_iter()
                .map(|d| map_create_data::<T>(d, &to))
                .collect::<Result<Vec<_>, DispatchError>>()?;
            with_weight(
                <Pallet<T>>::create_multiple_items(self, &sender, data, nesting_budget),
                weight,
            )
        }
        fn create_multiple_items_ex(
            &self,
            sender: <T>::CrossAccountId,
            data: up_data_structs::CreateItemExData<<T>::CrossAccountId>,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<T>>::create_multiple_items_ex(&data);
            let data = match data {
                up_data_structs::CreateItemExData::NFT(nft) => nft,
                _ => {
                    return Err(
                        Error::<T>::NotNonfungibleDataUsedToMintFungibleCollectionToken
                            .into(),
                    );
                }
            };
            with_weight(
                <Pallet<
                    T,
                >>::create_multiple_items(
                    self,
                    &sender,
                    data.into_inner(),
                    nesting_budget,
                ),
                weight,
            )
        }
        fn set_collection_properties(
            &self,
            sender: T::CrossAccountId,
            properties: Vec<Property>,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<
                T,
            >>::set_collection_properties(properties.len() as u32);
            with_weight(
                <Pallet<T>>::set_collection_properties(self, &sender, properties),
                weight,
            )
        }
        fn delete_collection_properties(
            &self,
            sender: &T::CrossAccountId,
            property_keys: Vec<PropertyKey>,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<
                T,
            >>::delete_collection_properties(property_keys.len() as u32);
            with_weight(
                <Pallet<T>>::delete_collection_properties(self, sender, property_keys),
                weight,
            )
        }
        fn set_token_properties(
            &self,
            sender: T::CrossAccountId,
            token_id: TokenId,
            properties: Vec<Property>,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<
                T,
            >>::set_token_properties(properties.len() as u32);
            with_weight(
                <Pallet<
                    T,
                >>::set_token_properties(
                    self,
                    &sender,
                    token_id,
                    properties.into_iter(),
                    false,
                    nesting_budget,
                ),
                weight,
            )
        }
        fn delete_token_properties(
            &self,
            sender: T::CrossAccountId,
            token_id: TokenId,
            property_keys: Vec<PropertyKey>,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<
                T,
            >>::delete_token_properties(property_keys.len() as u32);
            with_weight(
                <Pallet<
                    T,
                >>::delete_token_properties(
                    self,
                    &sender,
                    token_id,
                    property_keys.into_iter(),
                    nesting_budget,
                ),
                weight,
            )
        }
        fn set_token_property_permissions(
            &self,
            sender: &T::CrossAccountId,
            property_permissions: Vec<PropertyKeyPermission>,
        ) -> DispatchResultWithPostInfo {
            let weight = <CommonWeights<
                T,
            >>::set_token_property_permissions(property_permissions.len() as u32);
            with_weight(
                <Pallet<
                    T,
                >>::set_token_property_permissions(self, sender, property_permissions),
                weight,
            )
        }
        fn burn_item(
            &self,
            sender: T::CrossAccountId,
            token: TokenId,
            amount: u128,
        ) -> DispatchResultWithPostInfo {
            {
                if !(amount <= 1) {
                    { return Err(<Error<T>>::NonfungibleItemsHaveNoAmount.into()) };
                }
            };
            if amount == 1 {
                with_weight(
                    <Pallet<T>>::burn(self, &sender, token),
                    <CommonWeights<T>>::burn_item(),
                )
            } else {
                Ok(().into())
            }
        }
        fn burn_item_recursively(
            &self,
            sender: T::CrossAccountId,
            token: TokenId,
            self_budget: &dyn Budget,
            breadth_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            <Pallet<
                T,
            >>::burn_recursively(self, &sender, token, self_budget, breadth_budget)
        }
        fn transfer(
            &self,
            from: T::CrossAccountId,
            to: T::CrossAccountId,
            token: TokenId,
            amount: u128,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            {
                if !(amount <= 1) {
                    { return Err(<Error<T>>::NonfungibleItemsHaveNoAmount.into()) };
                }
            };
            if amount == 1 {
                with_weight(
                    <Pallet<T>>::transfer(self, &from, &to, token, nesting_budget),
                    <CommonWeights<T>>::transfer(),
                )
            } else {
                Ok(().into())
            }
        }
        fn approve(
            &self,
            sender: T::CrossAccountId,
            spender: T::CrossAccountId,
            token: TokenId,
            amount: u128,
        ) -> DispatchResultWithPostInfo {
            {
                if !(amount <= 1) {
                    { return Err(<Error<T>>::NonfungibleItemsHaveNoAmount.into()) };
                }
            };
            with_weight(
                if amount == 1 {
                    <Pallet<T>>::set_allowance(self, &sender, token, Some(&spender))
                } else {
                    <Pallet<T>>::set_allowance(self, &sender, token, None)
                },
                <CommonWeights<T>>::approve(),
            )
        }
        fn transfer_from(
            &self,
            sender: T::CrossAccountId,
            from: T::CrossAccountId,
            to: T::CrossAccountId,
            token: TokenId,
            amount: u128,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            {
                if !(amount <= 1) {
                    { return Err(<Error<T>>::NonfungibleItemsHaveNoAmount.into()) };
                }
            };
            if amount == 1 {
                with_weight(
                    <Pallet<
                        T,
                    >>::transfer_from(self, &sender, &from, &to, token, nesting_budget),
                    <CommonWeights<T>>::transfer_from(),
                )
            } else {
                Ok(().into())
            }
        }
        fn burn_from(
            &self,
            sender: T::CrossAccountId,
            from: T::CrossAccountId,
            token: TokenId,
            amount: u128,
            nesting_budget: &dyn Budget,
        ) -> DispatchResultWithPostInfo {
            {
                if !(amount <= 1) {
                    { return Err(<Error<T>>::NonfungibleItemsHaveNoAmount.into()) };
                }
            };
            if amount == 1 {
                with_weight(
                    <Pallet<T>>::burn_from(self, &sender, &from, token, nesting_budget),
                    <CommonWeights<T>>::burn_from(),
                )
            } else {
                Ok(().into())
            }
        }
        fn check_nesting(
            &self,
            sender: T::CrossAccountId,
            from: (CollectionId, TokenId),
            under: TokenId,
            nesting_budget: &dyn Budget,
        ) -> sp_runtime::DispatchResult {
            <Pallet<T>>::check_nesting(self, sender, from, under, nesting_budget)
        }
        fn nest(&self, under: TokenId, to_nest: (CollectionId, TokenId)) {
            <Pallet<T>>::nest((self.id, under), to_nest);
        }
        fn unnest(&self, under: TokenId, to_unnest: (CollectionId, TokenId)) {
            <Pallet<T>>::unnest((self.id, under), to_unnest);
        }
        fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId> {
            <Owned<T>>::iter_prefix((self.id, account)).map(|(id, _)| id).collect()
        }
        fn collection_tokens(&self) -> Vec<TokenId> {
            <TokenData<T>>::iter_prefix((self.id,)).map(|(id, _)| id).collect()
        }
        fn token_exists(&self, token: TokenId) -> bool {
            <Pallet<T>>::token_exists(self, token)
        }
        fn last_token_id(&self) -> TokenId {
            TokenId(<TokensMinted<T>>::get(self.id))
        }
        fn token_owner(&self, token: TokenId) -> Option<T::CrossAccountId> {
            <TokenData<T>>::get((self.id, token)).map(|t| t.owner)
        }
        /// Returns token owners.
        fn token_owners(&self, token: TokenId) -> Vec<T::CrossAccountId> {
            self.token_owner(token)
                .map_or_else(
                    || ::alloc::vec::Vec::new(),
                    |t| <[_]>::into_vec(#[rustc_box] ::alloc::boxed::Box::new([t])),
                )
        }
        fn token_property(
            &self,
            token_id: TokenId,
            key: &PropertyKey,
        ) -> Option<PropertyValue> {
            <Pallet<T>>::token_properties((self.id, token_id)).get(key).cloned()
        }
        fn token_properties(
            &self,
            token_id: TokenId,
            keys: Option<Vec<PropertyKey>>,
        ) -> Vec<Property> {
            let properties = <Pallet<T>>::token_properties((self.id, token_id));
            keys.map(|keys| {
                    keys.into_iter()
                        .filter_map(|key| {
                            properties
                                .get(&key)
                                .map(|value| Property {
                                    key,
                                    value: value.clone(),
                                })
                        })
                        .collect()
                })
                .unwrap_or_else(|| {
                    properties
                        .into_iter()
                        .map(|(key, value)| Property { key, value })
                        .collect()
                })
        }
        fn total_supply(&self) -> u32 {
            <Pallet<T>>::total_supply(self)
        }
        fn account_balance(&self, account: T::CrossAccountId) -> u32 {
            <AccountBalance<T>>::get((self.id, account))
        }
        fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128 {
            if <TokenData<T>>::get((self.id, token))
                .map(|a| a.owner == account)
                .unwrap_or(false)
            {
                1
            } else {
                0
            }
        }
        fn allowance(
            &self,
            sender: T::CrossAccountId,
            spender: T::CrossAccountId,
            token: TokenId,
        ) -> u128 {
            if <TokenData<T>>::get((self.id, token))
                .map(|a| a.owner != sender)
                .unwrap_or(true)
            {
                0
            } else if <Allowance<T>>::get((self.id, token)) == Some(spender) {
                1
            } else {
                0
            }
        }
        fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>> {
            None
        }
        fn total_pieces(&self, token: TokenId) -> Option<u128> {
            if <TokenData<T>>::contains_key((self.id, token)) { Some(1) } else { None }
        }
    }
}
pub mod erc {
    //! # Nonfungible Pallet EVM API
    //!
    //! Provides ERC-721 standart support implementation and EVM API for unique extensions for Nonfungible Pallet.
    //! Method implementations are mostly doing parameter conversion and calling Nonfungible Pallet methods.
    extern crate alloc;
    use alloc::{format, string::ToString};
    use core::{
        char::{REPLACEMENT_CHARACTER, decode_utf16},
        convert::TryInto,
    };
    use evm_coder::{
        ToLog, execution::*, generate_stubgen, solidity, solidity_interface, types::*,
        weight, custom_signature::{FunctionName, FunctionSignature},
        make_signature,
    };
    use frame_support::BoundedVec;
    use up_data_structs::{
        TokenId, PropertyPermission, PropertyKeyPermission, Property, CollectionId,
        PropertyKey, CollectionPropertiesVec,
    };
    use pallet_evm_coder_substrate::dispatch_to_evm;
    use sp_std::vec::Vec;
    use pallet_common::{
        erc::{
            CommonEvmHandler, PrecompileResult, CollectionCall,
            static_property::{key, value as property_value},
        },
        CollectionHandle, CollectionPropertyPermissions,
        eth::convert_tuple_to_cross_account,
    };
    use pallet_evm::{account::CrossAccountId, PrecompileHandle};
    use pallet_evm_coder_substrate::call;
    use pallet_structure::{SelfWeightOf as StructureWeight, weights::WeightInfo as _};
    use crate::{
        AccountBalance, Config, CreateItemData, NonfungibleHandle, Pallet, TokenData,
        TokensMinted, SelfWeightOf, weights::WeightInfo, TokenProperties,
    };
    /// @title A contract that allows to set and delete token properties and change token property permissions.
    impl<T: Config> NonfungibleHandle<T> {
        /// @notice Set permissions for token property.
        /// @dev Throws error if `msg.sender` is not admin or owner of the collection.
        /// @param key Property key.
        /// @param isMutable Permission to mutate property.
        /// @param collectionAdmin Permission to mutate property by collection admin if property is mutable.
        /// @param tokenOwner Permission to mutate property by token owner if property is mutable.
        fn set_token_property_permission(
            &mut self,
            caller: caller,
            key: string,
            is_mutable: bool,
            collection_admin: bool,
            token_owner: bool,
        ) -> Result<()> {
            let caller = T::CrossAccountId::from_eth(caller);
            <Pallet<
                T,
            >>::set_property_permission(
                    self,
                    &caller,
                    PropertyKeyPermission {
                        key: <Vec<u8>>::from(key)
                            .try_into()
                            .map_err(|_| "too long key")?,
                        permission: PropertyPermission {
                            mutable: is_mutable,
                            collection_admin,
                            token_owner,
                        },
                    },
                )
                .map_err(dispatch_to_evm::<T>)
        }
        /// @notice Set token property value.
        /// @dev Throws error if `msg.sender` has no permission to edit the property.
        /// @param tokenId ID of the token.
        /// @param key Property key.
        /// @param value Property value.
        fn set_property(
            &mut self,
            caller: caller,
            token_id: uint256,
            key: string,
            value: bytes,
        ) -> Result<()> {
            let caller = T::CrossAccountId::from_eth(caller);
            let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
            let key = <Vec<u8>>::from(key).try_into().map_err(|_| "key too long")?;
            let value = value.0.try_into().map_err(|_| "value too long")?;
            let nesting_budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<
                T,
            >>::set_token_property(
                    self,
                    &caller,
                    TokenId(token_id),
                    Property { key, value },
                    &nesting_budget,
                )
                .map_err(dispatch_to_evm::<T>)
        }
        /// @notice Delete token property value.
        /// @dev Throws error if `msg.sender` has no permission to edit the property.
        /// @param tokenId ID of the token.
        /// @param key Property key.
        fn delete_property(
            &mut self,
            token_id: uint256,
            caller: caller,
            key: string,
        ) -> Result<()> {
            let caller = T::CrossAccountId::from_eth(caller);
            let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
            let key = <Vec<u8>>::from(key).try_into().map_err(|_| "key too long")?;
            let nesting_budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<
                T,
            >>::delete_token_property(
                    self,
                    &caller,
                    TokenId(token_id),
                    key,
                    &nesting_budget,
                )
                .map_err(dispatch_to_evm::<T>)
        }
        /// @notice Get token property value.
        /// @dev Throws error if key not found
        /// @param tokenId ID of the token.
        /// @param key Property key.
        /// @return Property value bytes
        fn property(&self, token_id: uint256, key: string) -> Result<bytes> {
            let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
            let key = <Vec<u8>>::from(key).try_into().map_err(|_| "key too long")?;
            let props = <TokenProperties<T>>::get((self.id, token_id));
            let prop = props.get(&key).ok_or("key not found")?;
            Ok(prop.to_vec().into())
        }
    }
    /// @title A contract that allows to set and delete token properties and change token property permissions.
    pub enum TokenPropertiesCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        /// @notice Set permissions for token property.
        /// @dev Throws error if `msg.sender` is not admin or owner of the collection.
        /// @param key Property key.
        /// @param isMutable Permission to mutate property.
        /// @param collectionAdmin Permission to mutate property by collection admin if property is mutable.
        /// @param tokenOwner Permission to mutate property by token owner if property is mutable.
        #[allow(missing_docs)]
        SetTokenPropertyPermission {
            key: string,
            is_mutable: bool,
            collection_admin: bool,
            token_owner: bool,
        },
        /// @notice Set token property value.
        /// @dev Throws error if `msg.sender` has no permission to edit the property.
        /// @param tokenId ID of the token.
        /// @param key Property key.
        /// @param value Property value.
        #[allow(missing_docs)]
        SetProperty { token_id: uint256, key: string, value: bytes },
        /// @notice Delete token property value.
        /// @dev Throws error if `msg.sender` has no permission to edit the property.
        /// @param tokenId ID of the token.
        /// @param key Property key.
        #[allow(missing_docs)]
        DeleteProperty { token_id: uint256, key: string },
        /// @notice Get token property value.
        /// @dev Throws error if key not found
        /// @param tokenId ID of the token.
        /// @param key Property key.
        /// @return Property value bytes
        #[allow(missing_docs)]
        Property { token_id: uint256, key: string },
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for TokenPropertiesCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                TokenPropertiesCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                TokenPropertiesCall::SetTokenPropertyPermission {
                    key: __self_0,
                    is_mutable: __self_1,
                    collection_admin: __self_2,
                    token_owner: __self_3,
                } => {
                    ::core::fmt::Formatter::debug_struct_field4_finish(
                        f,
                        "SetTokenPropertyPermission",
                        "key",
                        &__self_0,
                        "is_mutable",
                        &__self_1,
                        "collection_admin",
                        &__self_2,
                        "token_owner",
                        &__self_3,
                    )
                }
                TokenPropertiesCall::SetProperty {
                    token_id: __self_0,
                    key: __self_1,
                    value: __self_2,
                } => {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "SetProperty",
                        "token_id",
                        &__self_0,
                        "key",
                        &__self_1,
                        "value",
                        &__self_2,
                    )
                }
                TokenPropertiesCall::DeleteProperty {
                    token_id: __self_0,
                    key: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "DeleteProperty",
                        "token_id",
                        &__self_0,
                        "key",
                        &__self_1,
                    )
                }
                TokenPropertiesCall::Property { token_id: __self_0, key: __self_1 } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "Property",
                        "token_id",
                        &__self_0,
                        "key",
                        &__self_1,
                    )
                }
            }
        }
    }
    impl<T> TokenPropertiesCall<T> {
        const SET_TOKEN_PROPERTY_PERMISSION_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(
                    &&FunctionName::new("setTokenPropertyPermission"),
                );
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                FunctionSignature::add_param(
                                    fs,
                                    (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                ),
                                (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                            ),
                            (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                        ),
                        (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///setTokenPropertyPermission(string,bool,bool,bool)
        const SET_TOKEN_PROPERTY_PERMISSION: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SET_TOKEN_PROPERTY_PERMISSION_SIGNATURE.signature,
                    Self::SET_TOKEN_PROPERTY_PERMISSION_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const SET_PROPERTY_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("setProperty"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                fs,
                                (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                            ),
                            (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                        ),
                        (<bytes>::SIGNATURE, <bytes>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///setProperty(uint256,string,bytes)
        const SET_PROPERTY: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SET_PROPERTY_SIGNATURE.signature,
                    Self::SET_PROPERTY_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const DELETE_PROPERTY_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("deleteProperty"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                        ),
                        (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///deleteProperty(uint256,string)
        const DELETE_PROPERTY: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::DELETE_PROPERTY_SIGNATURE.signature,
                    Self::DELETE_PROPERTY_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const PROPERTY_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("property"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                        ),
                        (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///property(uint256,string)
        const PROPERTY: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::PROPERTY_SIGNATURE.signature,
                    Self::PROPERTY_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::SET_TOKEN_PROPERTY_PERMISSION);
            interface_id ^= u32::from_be_bytes(Self::SET_PROPERTY);
            interface_id ^= u32::from_be_bytes(Self::DELETE_PROPERTY);
            interface_id ^= u32::from_be_bytes(Self::PROPERTY);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[
                    " @title A contract that allows to set and delete token properties and change token property permissions.",
                ],
                name: "TokenProperties",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice Set permissions for token property.",
                            " @dev Throws error if `msg.sender` is not admin or owner of the collection.",
                            " @param key Property key.",
                            " @param isMutable Permission to mutate property.",
                            " @param collectionAdmin Permission to mutate property by collection admin if property is mutable.",
                            " @param tokenOwner Permission to mutate property by token owner if property is mutable.",
                        ],
                        selector_str: "setTokenPropertyPermission(string,bool,bool,bool)",
                        selector: u32::from_be_bytes(
                            Self::SET_TOKEN_PROPERTY_PERMISSION,
                        ),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("setTokenPropertyPermission"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    FunctionSignature::add_param(
                                                        fs,
                                                        (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                                    ),
                                                    (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                                                ),
                                                (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                                            ),
                                            (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "setTokenPropertyPermission",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<string>>::new("key"),
                            <NamedArgument<bool>>::new("isMutable"),
                            <NamedArgument<bool>>::new("collectionAdmin"),
                            <NamedArgument<bool>>::new("tokenOwner"),
                        ),
                        result: <UnnamedArgument<()>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Set token property value.",
                            " @dev Throws error if `msg.sender` has no permission to edit the property.",
                            " @param tokenId ID of the token.",
                            " @param key Property key.",
                            " @param value Property value.",
                        ],
                        selector_str: "setProperty(uint256,string,bytes)",
                        selector: u32::from_be_bytes(Self::SET_PROPERTY),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("setProperty"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    fs,
                                                    (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                                ),
                                                (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                            ),
                                            (<bytes>::SIGNATURE, <bytes>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "setProperty",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<uint256>>::new("tokenId"),
                            <NamedArgument<string>>::new("key"),
                            <NamedArgument<bytes>>::new("value"),
                        ),
                        result: <UnnamedArgument<()>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Delete token property value.",
                            " @dev Throws error if `msg.sender` has no permission to edit the property.",
                            " @param tokenId ID of the token.",
                            " @param key Property key.",
                        ],
                        selector_str: "deleteProperty(uint256,string)",
                        selector: u32::from_be_bytes(Self::DELETE_PROPERTY),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("deleteProperty"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                            ),
                                            (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "deleteProperty",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<uint256>>::new("tokenId"),
                            <NamedArgument<string>>::new("key"),
                        ),
                        result: <UnnamedArgument<()>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Get token property value.",
                            " @dev Throws error if key not found",
                            " @param tokenId ID of the token.",
                            " @param key Property key.",
                            " @return Property value bytes",
                        ],
                        selector_str: "property(uint256,string)",
                        selector: u32::from_be_bytes(Self::PROPERTY),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("property"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                            ),
                                            (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "property",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (
                            <NamedArgument<uint256>>::new("tokenId"),
                            <NamedArgument<string>>::new("key"),
                        ),
                        result: <UnnamedArgument<bytes>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "TokenProperties".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for TokenPropertiesCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::SET_TOKEN_PROPERTY_PERMISSION => {
                    return Ok(
                        Some(Self::SetTokenPropertyPermission {
                            key: reader.abi_read()?,
                            is_mutable: reader.abi_read()?,
                            collection_admin: reader.abi_read()?,
                            token_owner: reader.abi_read()?,
                        }),
                    );
                }
                Self::SET_PROPERTY => {
                    return Ok(
                        Some(Self::SetProperty {
                            token_id: reader.abi_read()?,
                            key: reader.abi_read()?,
                            value: reader.abi_read()?,
                        }),
                    );
                }
                Self::DELETE_PROPERTY => {
                    return Ok(
                        Some(Self::DeleteProperty {
                            token_id: reader.abi_read()?,
                            key: reader.abi_read()?,
                        }),
                    );
                }
                Self::PROPERTY => {
                    return Ok(
                        Some(Self::Property {
                            token_id: reader.abi_read()?,
                            key: reader.abi_read()?,
                        }),
                    );
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> TokenPropertiesCall<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for TokenPropertiesCall<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::SetTokenPropertyPermission { .. } => ().into(),
                Self::SetProperty { .. } => ().into(),
                Self::DeleteProperty { .. } => ().into(),
                Self::Property { .. } => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<TokenPropertiesCall<T>>
    for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<TokenPropertiesCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                TokenPropertiesCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<TokenPropertiesCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                TokenPropertiesCall::SetTokenPropertyPermission {
                    key,
                    is_mutable,
                    collection_admin,
                    token_owner,
                } => {
                    let result = self
                        .set_token_property_permission(
                            c.caller.clone(),
                            key,
                            is_mutable,
                            collection_admin,
                            token_owner,
                        )?;
                    (&result).to_result()
                }
                TokenPropertiesCall::SetProperty { token_id, key, value } => {
                    let result = self
                        .set_property(c.caller.clone(), token_id, key, value)?;
                    (&result).to_result()
                }
                TokenPropertiesCall::DeleteProperty { token_id, key } => {
                    let result = self.delete_property(token_id, c.caller.clone(), key)?;
                    (&result).to_result()
                }
                TokenPropertiesCall::Property { token_id, key } => {
                    let result = self.property(token_id, key)?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    pub enum ERC721Events {
        /// @dev This emits when ownership of any NFT changes by any mechanism.
        ///  This event emits when NFTs are created (`from` == 0) and destroyed
        ///  (`to` == 0). Exception: during contract creation, any number of NFTs
        ///  may be created and assigned without emitting Transfer. At the time of
        ///  any transfer, the approved address for that NFT (if any) is reset to none.
        Transfer {
            #[indexed]
            from: address,
            #[indexed]
            to: address,
            #[indexed]
            token_id: uint256,
        },
        /// @dev This emits when the approved address for an NFT is changed or
        ///  reaffirmed. The zero address indicates there is no approved address.
        ///  When a Transfer event emits, this also indicates that the approved
        ///  address for that NFT (if any) is reset to none.
        Approval {
            #[indexed]
            owner: address,
            #[indexed]
            approved: address,
            #[indexed]
            token_id: uint256,
        },
        /// @dev This emits when an operator is enabled or disabled for an owner.
        ///  The operator can manage all NFTs of the owner.
        #[allow(dead_code)]
        ApprovalForAll {
            #[indexed]
            owner: address,
            #[indexed]
            operator: address,
            approved: bool,
        },
    }
    impl ERC721Events {
        ///Transfer(address,address,uint256)
        const TRANSFER: [u8; 32] = [
            221u8,
            242u8,
            82u8,
            173u8,
            27u8,
            226u8,
            200u8,
            155u8,
            105u8,
            194u8,
            176u8,
            104u8,
            252u8,
            55u8,
            141u8,
            170u8,
            149u8,
            43u8,
            167u8,
            241u8,
            99u8,
            196u8,
            161u8,
            22u8,
            40u8,
            245u8,
            90u8,
            77u8,
            245u8,
            35u8,
            179u8,
            239u8,
        ];
        ///Approval(address,address,uint256)
        const APPROVAL: [u8; 32] = [
            140u8,
            91u8,
            225u8,
            229u8,
            235u8,
            236u8,
            125u8,
            91u8,
            209u8,
            79u8,
            113u8,
            66u8,
            125u8,
            30u8,
            132u8,
            243u8,
            221u8,
            3u8,
            20u8,
            192u8,
            247u8,
            178u8,
            41u8,
            30u8,
            91u8,
            32u8,
            10u8,
            200u8,
            199u8,
            195u8,
            185u8,
            37u8,
        ];
        ///ApprovalForAll(address,address,bool)
        const APPROVAL_FOR_ALL: [u8; 32] = [
            23u8,
            48u8,
            126u8,
            171u8,
            57u8,
            171u8,
            97u8,
            7u8,
            232u8,
            137u8,
            152u8,
            69u8,
            173u8,
            61u8,
            89u8,
            189u8,
            150u8,
            83u8,
            242u8,
            0u8,
            242u8,
            32u8,
            146u8,
            4u8,
            137u8,
            202u8,
            43u8,
            89u8,
            55u8,
            105u8,
            108u8,
            49u8,
        ];
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[],
                selector: [0; 4],
                name: "ERC721Events",
                is: &[],
                functions: (
                    SolidityEvent {
                        name: "Transfer",
                        args: (
                            <SolidityEventArgument<address>>::new(true, "from"),
                            <SolidityEventArgument<address>>::new(true, "to"),
                            <SolidityEventArgument<uint256>>::new(true, "tokenId"),
                        ),
                    },
                    SolidityEvent {
                        name: "Approval",
                        args: (
                            <SolidityEventArgument<address>>::new(true, "owner"),
                            <SolidityEventArgument<address>>::new(true, "approved"),
                            <SolidityEventArgument<uint256>>::new(true, "tokenId"),
                        ),
                    },
                    SolidityEvent {
                        name: "ApprovalForAll",
                        args: (
                            <SolidityEventArgument<address>>::new(true, "owner"),
                            <SolidityEventArgument<address>>::new(true, "operator"),
                            <SolidityEventArgument<bool>>::new(false, "approved"),
                        ),
                    },
                ),
            };
            let mut out = string::new();
            out.push_str("/// @dev inlined interface\n");
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
        }
    }
    #[automatically_derived]
    impl ::evm_coder::events::ToLog for ERC721Events {
        fn to_log(&self, contract: address) -> ::ethereum::Log {
            use ::evm_coder::events::ToTopic;
            use ::evm_coder::abi::AbiWrite;
            let mut writer = ::evm_coder::abi::AbiWriter::new();
            let mut topics = Vec::new();
            match self {
                Self::Transfer { from, to, token_id } => {
                    topics.push(topic::from(Self::TRANSFER));
                    topics.push(from.to_topic());
                    topics.push(to.to_topic());
                    topics.push(token_id.to_topic());
                }
                Self::Approval { owner, approved, token_id } => {
                    topics.push(topic::from(Self::APPROVAL));
                    topics.push(owner.to_topic());
                    topics.push(approved.to_topic());
                    topics.push(token_id.to_topic());
                }
                Self::ApprovalForAll { owner, operator, approved } => {
                    topics.push(topic::from(Self::APPROVAL_FOR_ALL));
                    topics.push(owner.to_topic());
                    topics.push(operator.to_topic());
                    approved.abi_write(&mut writer);
                }
            }
            ::ethereum::Log {
                address: contract,
                topics,
                data: writer.finish(),
            }
        }
    }
    pub enum ERC721MintableEvents {
        #[allow(dead_code)]
        MintingFinished {},
    }
    impl ERC721MintableEvents {
        ///MintingFinished()
        const MINTING_FINISHED: [u8; 32] = [
            184u8,
            40u8,
            217u8,
            181u8,
            199u8,
            128u8,
            149u8,
            222u8,
            238u8,
            239u8,
            242u8,
            236u8,
            162u8,
            229u8,
            212u8,
            254u8,
            4u8,
            108u8,
            227u8,
            254u8,
            180u8,
            201u8,
            151u8,
            2u8,
            98u8,
            74u8,
            63u8,
            211u8,
            132u8,
            173u8,
            45u8,
            188u8,
        ];
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[],
                selector: [0; 4],
                name: "ERC721MintableEvents",
                is: &[],
                functions: (
                    SolidityEvent {
                        name: "MintingFinished",
                        args: (),
                    },
                ),
            };
            let mut out = string::new();
            out.push_str("/// @dev inlined interface\n");
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
        }
    }
    #[automatically_derived]
    impl ::evm_coder::events::ToLog for ERC721MintableEvents {
        fn to_log(&self, contract: address) -> ::ethereum::Log {
            use ::evm_coder::events::ToTopic;
            use ::evm_coder::abi::AbiWrite;
            let mut writer = ::evm_coder::abi::AbiWriter::new();
            let mut topics = Vec::new();
            match self {
                Self::MintingFinished {} => {
                    topics.push(topic::from(Self::MINTING_FINISHED));
                }
            }
            ::ethereum::Log {
                address: contract,
                topics,
                data: writer.finish(),
            }
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard, optional metadata extension
    /// @dev See https://eips.ethereum.org/EIPS/eip-721
    impl<T: Config> NonfungibleHandle<T> {
        /// @notice A descriptive name for a collection of NFTs in this contract
        fn name(&self) -> Result<string> {
            Ok(
                decode_utf16(self.name.iter().copied())
                    .map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
                    .collect::<string>(),
            )
        }
        /// @notice An abbreviated name for NFTs in this contract
        fn symbol(&self) -> Result<string> {
            Ok(string::from_utf8_lossy(&self.token_prefix).into())
        }
        /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
        ///
        /// @dev If the token has a `url` property and it is not empty, it is returned.
        ///  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.
        ///  If the collection property `baseURI` is empty or absent, return "" (empty string)
        ///  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix
        ///  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).
        ///
        /// @return token's const_metadata
        fn token_uri(&self, token_id: uint256) -> Result<string> {
            let token_id_u32: u32 = token_id
                .try_into()
                .map_err(|_| "token id overflow")?;
            if let Ok(url) = get_token_property(self, token_id_u32, &key::url()) {
                if !url.is_empty() {
                    return Ok(url);
                }
            } else if !is_erc721_metadata_compatible::<T>(self.id) {
                return Err("tokenURI not set".into());
            }
            if let Some(base_uri)
                = pallet_common::Pallet::<
                    T,
                >::get_collection_property(self.id, &key::base_uri()) {
                if !base_uri.is_empty() {
                    let base_uri = string::from_utf8(base_uri.into_inner())
                        .map_err(|e| {
                            Error::Revert({
                                let res = ::alloc::fmt::format(
                                    ::core::fmt::Arguments::new_v1(
                                        &[
                                            "Can not convert value \"baseURI\" to string with error \"",
                                            "\"",
                                        ],
                                        &[::core::fmt::ArgumentV1::new_display(&e)],
                                    ),
                                );
                                res
                            })
                        })?;
                    if let Ok(suffix)
                        = get_token_property(self, token_id_u32, &key::suffix()) {
                        if !suffix.is_empty() {
                            return Ok(base_uri + suffix.as_str());
                        }
                    }
                    return Ok(base_uri + token_id.to_string().as_str());
                }
            }
            Ok("".into())
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard, optional metadata extension
    /// @dev See https://eips.ethereum.org/EIPS/eip-721
    pub enum ERC721MetadataCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        Name,
        Symbol,
        /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
        ///
        /// @dev If the token has a `url` property and it is not empty, it is returned.
        ///  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.
        ///  If the collection property `baseURI` is empty or absent, return "" (empty string)
        ///  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix
        ///  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).
        ///
        /// @return token's const_metadata
        #[allow(missing_docs)]
        TokenUri { token_id: uint256 },
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721MetadataCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721MetadataCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721MetadataCall::Name => ::core::fmt::Formatter::write_str(f, "Name"),
                ERC721MetadataCall::Symbol => {
                    ::core::fmt::Formatter::write_str(f, "Symbol")
                }
                ERC721MetadataCall::TokenUri { token_id: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "TokenUri",
                        "token_id",
                        &__self_0,
                    )
                }
            }
        }
    }
    impl<T> ERC721MetadataCall<T> {
        const NAME_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("name"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///name()
        const NAME: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::NAME_SIGNATURE.signature,
                    Self::NAME_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const SYMBOL_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("symbol"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///symbol()
        const SYMBOL: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SYMBOL_SIGNATURE.signature,
                    Self::SYMBOL_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TOKEN_URI_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("tokenURI"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///tokenURI(uint256)
        const TOKEN_URI: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TOKEN_URI_SIGNATURE.signature,
                    Self::TOKEN_URI_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::NAME);
            interface_id ^= u32::from_be_bytes(Self::SYMBOL);
            interface_id ^= u32::from_be_bytes(Self::TOKEN_URI);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[
                    " @title ERC-721 Non-Fungible Token Standard, optional metadata extension",
                    " @dev See https://eips.ethereum.org/EIPS/eip-721",
                ],
                name: "ERC721Metadata",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice A descriptive name for a collection of NFTs in this contract",
                        ],
                        selector_str: "name()",
                        selector: u32::from_be_bytes(Self::NAME),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("name"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "name",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<string>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice An abbreviated name for NFTs in this contract",
                        ],
                        selector_str: "symbol()",
                        selector: u32::from_be_bytes(Self::SYMBOL),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("symbol"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "symbol",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<string>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice A distinct Uniform Resource Identifier (URI) for a given asset.",
                            "",
                            " @dev If the token has a `url` property and it is not empty, it is returned.",
                            "  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.",
                            "  If the collection property `baseURI` is empty or absent, return \"\" (empty string)",
                            "  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix",
                            "  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).",
                            "",
                            " @return token's const_metadata",
                        ],
                        selector_str: "tokenURI(uint256)",
                        selector: u32::from_be_bytes(Self::TOKEN_URI),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("tokenURI"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "tokenURI",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (<NamedArgument<uint256>>::new("tokenId"),),
                        result: <UnnamedArgument<string>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721Metadata".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721MetadataCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::NAME => return Ok(Some(Self::Name)),
                Self::SYMBOL => return Ok(Some(Self::Symbol)),
                Self::TOKEN_URI => {
                    return Ok(
                        Some(Self::TokenUri {
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721MetadataCall<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721MetadataCall<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::Name => ().into(),
                Self::Symbol => ().into(),
                Self::TokenUri { .. } => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721MetadataCall<T>>
    for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721MetadataCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721MetadataCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<ERC721MetadataCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721MetadataCall::Name => {
                    let result = self.name()?;
                    (&result).to_result()
                }
                ERC721MetadataCall::Symbol => {
                    let result = self.symbol()?;
                    (&result).to_result()
                }
                ERC721MetadataCall::TokenUri { token_id } => {
                    let result = self.token_uri(token_id)?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard, optional enumeration extension
    /// @dev See https://eips.ethereum.org/EIPS/eip-721
    impl<T: Config> NonfungibleHandle<T> {
        /// @notice Enumerate valid NFTs
        /// @param index A counter less than `totalSupply()`
        /// @return The token identifier for the `index`th NFT,
        ///  (sort order not specified)
        fn token_by_index(&self, index: uint256) -> Result<uint256> {
            Ok(index)
        }
        /// @dev Not implemented
        fn token_of_owner_by_index(
            &self,
            _owner: address,
            _index: uint256,
        ) -> Result<uint256> {
            Err("not implemented".into())
        }
        /// @notice Count NFTs tracked by this contract
        /// @return A count of valid NFTs tracked by this contract, where each one of
        ///  them has an assigned and queryable owner not equal to the zero address
        fn total_supply(&self) -> Result<uint256> {
            self.consume_store_reads(1)?;
            Ok(<Pallet<T>>::total_supply(self).into())
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard, optional enumeration extension
    /// @dev See https://eips.ethereum.org/EIPS/eip-721
    pub enum ERC721EnumerableCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        /// @notice Enumerate valid NFTs
        /// @param index A counter less than `totalSupply()`
        /// @return The token identifier for the `index`th NFT,
        ///  (sort order not specified)
        #[allow(missing_docs)]
        TokenByIndex { index: uint256 },
        /// @dev Not implemented
        #[allow(missing_docs)]
        TokenOfOwnerByIndex { _owner: address, _index: uint256 },
        TotalSupply,
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721EnumerableCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721EnumerableCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721EnumerableCall::TokenByIndex { index: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "TokenByIndex",
                        "index",
                        &__self_0,
                    )
                }
                ERC721EnumerableCall::TokenOfOwnerByIndex {
                    _owner: __self_0,
                    _index: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "TokenOfOwnerByIndex",
                        "_owner",
                        &__self_0,
                        "_index",
                        &__self_1,
                    )
                }
                ERC721EnumerableCall::TotalSupply => {
                    ::core::fmt::Formatter::write_str(f, "TotalSupply")
                }
            }
        }
    }
    impl<T> ERC721EnumerableCall<T> {
        const TOKEN_BY_INDEX_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("tokenByIndex"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///tokenByIndex(uint256)
        const TOKEN_BY_INDEX: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TOKEN_BY_INDEX_SIGNATURE.signature,
                    Self::TOKEN_BY_INDEX_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TOKEN_OF_OWNER_BY_INDEX_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(
                    &&FunctionName::new("tokenOfOwnerByIndex"),
                );
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///tokenOfOwnerByIndex(address,uint256)
        const TOKEN_OF_OWNER_BY_INDEX: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TOKEN_OF_OWNER_BY_INDEX_SIGNATURE.signature,
                    Self::TOKEN_OF_OWNER_BY_INDEX_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TOTAL_SUPPLY_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("totalSupply"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///totalSupply()
        const TOTAL_SUPPLY: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TOTAL_SUPPLY_SIGNATURE.signature,
                    Self::TOTAL_SUPPLY_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::TOKEN_BY_INDEX);
            interface_id ^= u32::from_be_bytes(Self::TOKEN_OF_OWNER_BY_INDEX);
            interface_id ^= u32::from_be_bytes(Self::TOTAL_SUPPLY);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[
                    " @title ERC-721 Non-Fungible Token Standard, optional enumeration extension",
                    " @dev See https://eips.ethereum.org/EIPS/eip-721",
                ],
                name: "ERC721Enumerable",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice Enumerate valid NFTs",
                            " @param index A counter less than `totalSupply()`",
                            " @return The token identifier for the `index`th NFT,",
                            "  (sort order not specified)",
                        ],
                        selector_str: "tokenByIndex(uint256)",
                        selector: u32::from_be_bytes(Self::TOKEN_BY_INDEX),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("tokenByIndex"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "tokenByIndex",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (<NamedArgument<uint256>>::new("index"),),
                        result: <UnnamedArgument<uint256>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "tokenOfOwnerByIndex(address,uint256)",
                        selector: u32::from_be_bytes(Self::TOKEN_OF_OWNER_BY_INDEX),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("tokenOfOwnerByIndex"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "tokenOfOwnerByIndex",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("owner"),
                            <NamedArgument<uint256>>::new("index"),
                        ),
                        result: <UnnamedArgument<uint256>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Count NFTs tracked by this contract",
                            " @return A count of valid NFTs tracked by this contract, where each one of",
                            "  them has an assigned and queryable owner not equal to the zero address",
                        ],
                        selector_str: "totalSupply()",
                        selector: u32::from_be_bytes(Self::TOTAL_SUPPLY),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("totalSupply"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "totalSupply",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<uint256>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721Enumerable".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721EnumerableCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::TOKEN_BY_INDEX => {
                    return Ok(
                        Some(Self::TokenByIndex {
                            index: reader.abi_read()?,
                        }),
                    );
                }
                Self::TOKEN_OF_OWNER_BY_INDEX => {
                    return Ok(
                        Some(Self::TokenOfOwnerByIndex {
                            _owner: reader.abi_read()?,
                            _index: reader.abi_read()?,
                        }),
                    );
                }
                Self::TOTAL_SUPPLY => return Ok(Some(Self::TotalSupply)),
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721EnumerableCall<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721EnumerableCall<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::TokenByIndex { .. } => ().into(),
                Self::TokenOfOwnerByIndex { .. } => ().into(),
                Self::TotalSupply => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721EnumerableCall<T>>
    for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721EnumerableCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721EnumerableCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<ERC721EnumerableCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721EnumerableCall::TokenByIndex { index } => {
                    let result = self.token_by_index(index)?;
                    (&result).to_result()
                }
                ERC721EnumerableCall::TokenOfOwnerByIndex { _owner, _index } => {
                    let result = self.token_of_owner_by_index(_owner, _index)?;
                    (&result).to_result()
                }
                ERC721EnumerableCall::TotalSupply => {
                    let result = self.total_supply()?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard
    /// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
    impl<T: Config> NonfungibleHandle<T> {
        /// @notice Count all NFTs assigned to an owner
        /// @dev NFTs assigned to the zero address are considered invalid, and this
        ///  function throws for queries about the zero address.
        /// @param owner An address for whom to query the balance
        /// @return The number of NFTs owned by `owner`, possibly zero
        fn balance_of(&self, owner: address) -> Result<uint256> {
            self.consume_store_reads(1)?;
            let owner = T::CrossAccountId::from_eth(owner);
            let balance = <AccountBalance<T>>::get((self.id, owner));
            Ok(balance.into())
        }
        /// @notice Find the owner of an NFT
        /// @dev NFTs assigned to zero address are considered invalid, and queries
        ///  about them do throw.
        /// @param tokenId The identifier for an NFT
        /// @return The address of the owner of the NFT
        fn owner_of(&self, token_id: uint256) -> Result<address> {
            self.consume_store_reads(1)?;
            let token: TokenId = token_id.try_into()?;
            Ok(
                *<TokenData<T>>::get((self.id, token))
                    .ok_or("token not found")?
                    .owner
                    .as_eth(),
            )
        }
        /// @dev Not implemented
        fn safe_transfer_from_with_data(
            &mut self,
            _from: address,
            _to: address,
            _token_id: uint256,
            _data: bytes,
        ) -> Result<void> {
            Err("not implemented".into())
        }
        /// @dev Not implemented
        fn safe_transfer_from(
            &mut self,
            _from: address,
            _to: address,
            _token_id: uint256,
        ) -> Result<void> {
            Err("not implemented".into())
        }
        /// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
        ///  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
        ///  THEY MAY BE PERMANENTLY LOST
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param to The new owner
        /// @param tokenId The NFT to transfer
        fn transfer_from(
            &mut self,
            caller: caller,
            from: address,
            to: address,
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let from = T::CrossAccountId::from_eth(from);
            let to = T::CrossAccountId::from_eth(to);
            let token = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<T>>::transfer_from(self, &caller, &from, &to, token, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Set or reaffirm the approved address for an NFT
        /// @dev The zero address indicates there is no approved address.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param approved The new approved NFT controller
        /// @param tokenId The NFT to approve
        fn approve(
            &mut self,
            caller: caller,
            approved: address,
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let approved = T::CrossAccountId::from_eth(approved);
            let token = token_id.try_into()?;
            <Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @dev Not implemented
        fn set_approval_for_all(
            &mut self,
            _caller: caller,
            _operator: address,
            _approved: bool,
        ) -> Result<void> {
            Err("not implemented".into())
        }
        /// @dev Not implemented
        fn get_approved(&self, _token_id: uint256) -> Result<address> {
            Err("not implemented".into())
        }
        /// @dev Not implemented
        fn is_approved_for_all(
            &self,
            _owner: address,
            _operator: address,
        ) -> Result<address> {
            Err("not implemented".into())
        }
    }
    /// @title ERC-721 Non-Fungible Token Standard
    /// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
    pub enum ERC721Call<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        /// @notice Count all NFTs assigned to an owner
        /// @dev NFTs assigned to the zero address are considered invalid, and this
        ///  function throws for queries about the zero address.
        /// @param owner An address for whom to query the balance
        /// @return The number of NFTs owned by `owner`, possibly zero
        #[allow(missing_docs)]
        BalanceOf { owner: address },
        /// @notice Find the owner of an NFT
        /// @dev NFTs assigned to zero address are considered invalid, and queries
        ///  about them do throw.
        /// @param tokenId The identifier for an NFT
        /// @return The address of the owner of the NFT
        #[allow(missing_docs)]
        OwnerOf { token_id: uint256 },
        /// @dev Not implemented
        #[allow(missing_docs)]
        SafeTransferFromWithData {
            _from: address,
            _to: address,
            _token_id: uint256,
            _data: bytes,
        },
        /// @dev Not implemented
        #[allow(missing_docs)]
        SafeTransferFrom { _from: address, _to: address, _token_id: uint256 },
        /// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
        ///  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
        ///  THEY MAY BE PERMANENTLY LOST
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param to The new owner
        /// @param tokenId The NFT to transfer
        #[allow(missing_docs)]
        TransferFrom { from: address, to: address, token_id: uint256 },
        /// @notice Set or reaffirm the approved address for an NFT
        /// @dev The zero address indicates there is no approved address.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param approved The new approved NFT controller
        /// @param tokenId The NFT to approve
        #[allow(missing_docs)]
        Approve { approved: address, token_id: uint256 },
        /// @dev Not implemented
        #[allow(missing_docs)]
        SetApprovalForAll { _operator: address, _approved: bool },
        /// @dev Not implemented
        #[allow(missing_docs)]
        GetApproved { _token_id: uint256 },
        /// @dev Not implemented
        #[allow(missing_docs)]
        IsApprovedForAll { _owner: address, _operator: address },
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721Call<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721Call::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721Call::BalanceOf { owner: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "BalanceOf",
                        "owner",
                        &__self_0,
                    )
                }
                ERC721Call::OwnerOf { token_id: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "OwnerOf",
                        "token_id",
                        &__self_0,
                    )
                }
                ERC721Call::SafeTransferFromWithData {
                    _from: __self_0,
                    _to: __self_1,
                    _token_id: __self_2,
                    _data: __self_3,
                } => {
                    ::core::fmt::Formatter::debug_struct_field4_finish(
                        f,
                        "SafeTransferFromWithData",
                        "_from",
                        &__self_0,
                        "_to",
                        &__self_1,
                        "_token_id",
                        &__self_2,
                        "_data",
                        &__self_3,
                    )
                }
                ERC721Call::SafeTransferFrom {
                    _from: __self_0,
                    _to: __self_1,
                    _token_id: __self_2,
                } => {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "SafeTransferFrom",
                        "_from",
                        &__self_0,
                        "_to",
                        &__self_1,
                        "_token_id",
                        &__self_2,
                    )
                }
                ERC721Call::TransferFrom {
                    from: __self_0,
                    to: __self_1,
                    token_id: __self_2,
                } => {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "TransferFrom",
                        "from",
                        &__self_0,
                        "to",
                        &__self_1,
                        "token_id",
                        &__self_2,
                    )
                }
                ERC721Call::Approve { approved: __self_0, token_id: __self_1 } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "Approve",
                        "approved",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721Call::SetApprovalForAll {
                    _operator: __self_0,
                    _approved: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "SetApprovalForAll",
                        "_operator",
                        &__self_0,
                        "_approved",
                        &__self_1,
                    )
                }
                ERC721Call::GetApproved { _token_id: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "GetApproved",
                        "_token_id",
                        &__self_0,
                    )
                }
                ERC721Call::IsApprovedForAll {
                    _owner: __self_0,
                    _operator: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "IsApprovedForAll",
                        "_owner",
                        &__self_0,
                        "_operator",
                        &__self_1,
                    )
                }
            }
        }
    }
    impl<T> ERC721Call<T> {
        const BALANCE_OF_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("balanceOf"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///balanceOf(address)
        const BALANCE_OF: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::BALANCE_OF_SIGNATURE.signature,
                    Self::BALANCE_OF_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const OWNER_OF_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("ownerOf"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///ownerOf(uint256)
        const OWNER_OF: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::OWNER_OF_SIGNATURE.signature,
                    Self::OWNER_OF_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const SAFE_TRANSFER_FROM_WITH_DATA_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("safeTransferFrom"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                FunctionSignature::add_param(
                                    fs,
                                    (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                ),
                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                            ),
                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                        ),
                        (<bytes>::SIGNATURE, <bytes>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///safeTransferFrom(address,address,uint256,bytes)
        const SAFE_TRANSFER_FROM_WITH_DATA: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SAFE_TRANSFER_FROM_WITH_DATA_SIGNATURE.signature,
                    Self::SAFE_TRANSFER_FROM_WITH_DATA_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const SAFE_TRANSFER_FROM_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("safeTransferFrom"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                fs,
                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                            ),
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///safeTransferFrom(address,address,uint256)
        const SAFE_TRANSFER_FROM: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SAFE_TRANSFER_FROM_SIGNATURE.signature,
                    Self::SAFE_TRANSFER_FROM_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TRANSFER_FROM_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("transferFrom"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                fs,
                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                            ),
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///transferFrom(address,address,uint256)
        const TRANSFER_FROM: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TRANSFER_FROM_SIGNATURE.signature,
                    Self::TRANSFER_FROM_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const APPROVE_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("approve"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///approve(address,uint256)
        const APPROVE: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::APPROVE_SIGNATURE.signature,
                    Self::APPROVE_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const SET_APPROVAL_FOR_ALL_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(
                    &&FunctionName::new("setApprovalForAll"),
                );
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///setApprovalForAll(address,bool)
        const SET_APPROVAL_FOR_ALL: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::SET_APPROVAL_FOR_ALL_SIGNATURE.signature,
                    Self::SET_APPROVAL_FOR_ALL_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const GET_APPROVED_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("getApproved"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///getApproved(uint256)
        const GET_APPROVED: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::GET_APPROVED_SIGNATURE.signature,
                    Self::GET_APPROVED_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const IS_APPROVED_FOR_ALL_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("isApprovedForAll"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///isApprovedForAll(address,address)
        const IS_APPROVED_FOR_ALL: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::IS_APPROVED_FOR_ALL_SIGNATURE.signature,
                    Self::IS_APPROVED_FOR_ALL_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::BALANCE_OF);
            interface_id ^= u32::from_be_bytes(Self::OWNER_OF);
            interface_id ^= u32::from_be_bytes(Self::SAFE_TRANSFER_FROM_WITH_DATA);
            interface_id ^= u32::from_be_bytes(Self::SAFE_TRANSFER_FROM);
            interface_id ^= u32::from_be_bytes(Self::TRANSFER_FROM);
            interface_id ^= u32::from_be_bytes(Self::APPROVE);
            interface_id ^= u32::from_be_bytes(Self::SET_APPROVAL_FOR_ALL);
            interface_id ^= u32::from_be_bytes(Self::GET_APPROVED);
            interface_id ^= u32::from_be_bytes(Self::IS_APPROVED_FOR_ALL);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[
                    " @title ERC-721 Non-Fungible Token Standard",
                    " @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md",
                ],
                name: "ERC721",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165", "ERC721Events"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice Count all NFTs assigned to an owner",
                            " @dev NFTs assigned to the zero address are considered invalid, and this",
                            "  function throws for queries about the zero address.",
                            " @param owner An address for whom to query the balance",
                            " @return The number of NFTs owned by `owner`, possibly zero",
                        ],
                        selector_str: "balanceOf(address)",
                        selector: u32::from_be_bytes(Self::BALANCE_OF),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("balanceOf"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "balanceOf",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (<NamedArgument<address>>::new("owner"),),
                        result: <UnnamedArgument<uint256>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Find the owner of an NFT",
                            " @dev NFTs assigned to zero address are considered invalid, and queries",
                            "  about them do throw.",
                            " @param tokenId The identifier for an NFT",
                            " @return The address of the owner of the NFT",
                        ],
                        selector_str: "ownerOf(uint256)",
                        selector: u32::from_be_bytes(Self::OWNER_OF),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("ownerOf"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "ownerOf",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (<NamedArgument<uint256>>::new("tokenId"),),
                        result: <UnnamedArgument<address>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "safeTransferFrom(address,address,uint256,bytes)",
                        selector: u32::from_be_bytes(Self::SAFE_TRANSFER_FROM_WITH_DATA),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("safeTransferFrom"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    FunctionSignature::add_param(
                                                        fs,
                                                        (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                                    ),
                                                    (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                                ),
                                                (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                            ),
                                            (<bytes>::SIGNATURE, <bytes>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "safeTransferFrom",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("from"),
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                            <NamedArgument<bytes>>::new("data"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "safeTransferFrom(address,address,uint256)",
                        selector: u32::from_be_bytes(Self::SAFE_TRANSFER_FROM),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("safeTransferFrom"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    fs,
                                                    (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                                ),
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "safeTransferFrom",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("from"),
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE",
                            "  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE",
                            "  THEY MAY BE PERMANENTLY LOST",
                            " @dev Throws unless `msg.sender` is the current owner or an authorized",
                            "  operator for this NFT. Throws if `from` is not the current owner. Throws",
                            "  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.",
                            " @param from The current owner of the NFT",
                            " @param to The new owner",
                            " @param tokenId The NFT to transfer",
                        ],
                        selector_str: "transferFrom(address,address,uint256)",
                        selector: u32::from_be_bytes(Self::TRANSFER_FROM),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("transferFrom"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    fs,
                                                    (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                                ),
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "transferFrom",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("from"),
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Set or reaffirm the approved address for an NFT",
                            " @dev The zero address indicates there is no approved address.",
                            " @dev Throws unless `msg.sender` is the current NFT owner, or an authorized",
                            "  operator of the current owner.",
                            " @param approved The new approved NFT controller",
                            " @param tokenId The NFT to approve",
                        ],
                        selector_str: "approve(address,uint256)",
                        selector: u32::from_be_bytes(Self::APPROVE),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("approve"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "approve",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("approved"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "setApprovalForAll(address,bool)",
                        selector: u32::from_be_bytes(Self::SET_APPROVAL_FOR_ALL),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("setApprovalForAll"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<bool>::SIGNATURE, <bool>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "setApprovalForAll",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("operator"),
                            <NamedArgument<bool>>::new("approved"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "getApproved(uint256)",
                        selector: u32::from_be_bytes(Self::GET_APPROVED),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("getApproved"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "getApproved",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (<NamedArgument<uint256>>::new("tokenId"),),
                        result: <UnnamedArgument<address>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "isApprovedForAll(address,address)",
                        selector: u32::from_be_bytes(Self::IS_APPROVED_FOR_ALL),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("isApprovedForAll"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "isApprovedForAll",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("owner"),
                            <NamedArgument<address>>::new("operator"),
                        ),
                        result: <UnnamedArgument<address>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            ERC721Events::generate_solidity_interface(tc, is_impl);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721Call<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::BALANCE_OF => {
                    return Ok(
                        Some(Self::BalanceOf {
                            owner: reader.abi_read()?,
                        }),
                    );
                }
                Self::OWNER_OF => {
                    return Ok(
                        Some(Self::OwnerOf {
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::SAFE_TRANSFER_FROM_WITH_DATA => {
                    return Ok(
                        Some(Self::SafeTransferFromWithData {
                            _from: reader.abi_read()?,
                            _to: reader.abi_read()?,
                            _token_id: reader.abi_read()?,
                            _data: reader.abi_read()?,
                        }),
                    );
                }
                Self::SAFE_TRANSFER_FROM => {
                    return Ok(
                        Some(Self::SafeTransferFrom {
                            _from: reader.abi_read()?,
                            _to: reader.abi_read()?,
                            _token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::TRANSFER_FROM => {
                    return Ok(
                        Some(Self::TransferFrom {
                            from: reader.abi_read()?,
                            to: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::APPROVE => {
                    return Ok(
                        Some(Self::Approve {
                            approved: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::SET_APPROVAL_FOR_ALL => {
                    return Ok(
                        Some(Self::SetApprovalForAll {
                            _operator: reader.abi_read()?,
                            _approved: reader.abi_read()?,
                        }),
                    );
                }
                Self::GET_APPROVED => {
                    return Ok(
                        Some(Self::GetApproved {
                            _token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::IS_APPROVED_FOR_ALL => {
                    return Ok(
                        Some(Self::IsApprovedForAll {
                            _owner: reader.abi_read()?,
                            _operator: reader.abi_read()?,
                        }),
                    );
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721Call<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721Call<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::BalanceOf { .. } => ().into(),
                Self::OwnerOf { .. } => ().into(),
                Self::SafeTransferFromWithData { .. } => ().into(),
                Self::SafeTransferFrom { .. } => ().into(),
                Self::TransferFrom { from, to, token_id } => {
                    (<SelfWeightOf<T>>::transfer_from()).into()
                }
                Self::Approve { approved, token_id } => {
                    (<SelfWeightOf<T>>::approve()).into()
                }
                Self::SetApprovalForAll { .. } => ().into(),
                Self::GetApproved { .. } => ().into(),
                Self::IsApprovedForAll { .. } => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721Call<T>> for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721Call<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721Call::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(&<ERC721Call<T>>::supports_interface(self, interface_id));
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721Call::BalanceOf { owner } => {
                    let result = self.balance_of(owner)?;
                    (&result).to_result()
                }
                ERC721Call::OwnerOf { token_id } => {
                    let result = self.owner_of(token_id)?;
                    (&result).to_result()
                }
                ERC721Call::SafeTransferFromWithData {
                    _from,
                    _to,
                    _token_id,
                    _data,
                } => {
                    let result = self
                        .safe_transfer_from_with_data(_from, _to, _token_id, _data)?;
                    (&result).to_result()
                }
                ERC721Call::SafeTransferFrom { _from, _to, _token_id } => {
                    let result = self.safe_transfer_from(_from, _to, _token_id)?;
                    (&result).to_result()
                }
                ERC721Call::TransferFrom { from, to, token_id } => {
                    let result = self
                        .transfer_from(c.caller.clone(), from, to, token_id)?;
                    (&result).to_result()
                }
                ERC721Call::Approve { approved, token_id } => {
                    let result = self.approve(c.caller.clone(), approved, token_id)?;
                    (&result).to_result()
                }
                ERC721Call::SetApprovalForAll { _operator, _approved } => {
                    let result = self
                        .set_approval_for_all(c.caller.clone(), _operator, _approved)?;
                    (&result).to_result()
                }
                ERC721Call::GetApproved { _token_id } => {
                    let result = self.get_approved(_token_id)?;
                    (&result).to_result()
                }
                ERC721Call::IsApprovedForAll { _owner, _operator } => {
                    let result = self.is_approved_for_all(_owner, _operator)?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    /// @title ERC721 Token that can be irreversibly burned (destroyed).
    impl<T: Config> NonfungibleHandle<T> {
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param tokenId The NFT to approve
        fn burn(&mut self, caller: caller, token_id: uint256) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let token = token_id.try_into()?;
            <Pallet<T>>::burn(self, &caller, token).map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
    }
    /// @title ERC721 Token that can be irreversibly burned (destroyed).
    pub enum ERC721BurnableCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param tokenId The NFT to approve
        #[allow(missing_docs)]
        Burn { token_id: uint256 },
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721BurnableCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721BurnableCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721BurnableCall::Burn { token_id: __self_0 } => {
                    ::core::fmt::Formatter::debug_struct_field1_finish(
                        f,
                        "Burn",
                        "token_id",
                        &__self_0,
                    )
                }
            }
        }
    }
    impl<T> ERC721BurnableCall<T> {
        const BURN_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("burn"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///burn(uint256)
        const BURN: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::BURN_SIGNATURE.signature,
                    Self::BURN_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::BURN);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[
                    " @title ERC721 Token that can be irreversibly burned (destroyed).",
                ],
                name: "ERC721Burnable",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice Burns a specific ERC721 token.",
                            " @dev Throws unless `msg.sender` is the current NFT owner, or an authorized",
                            "  operator of the current owner.",
                            " @param tokenId The NFT to approve",
                        ],
                        selector_str: "burn(uint256)",
                        selector: u32::from_be_bytes(Self::BURN),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("burn"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "burn",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (<NamedArgument<uint256>>::new("tokenId"),),
                        result: <UnnamedArgument<void>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721Burnable".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721BurnableCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::BURN => {
                    return Ok(
                        Some(Self::Burn {
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721BurnableCall<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721BurnableCall<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::Burn { token_id } => (<SelfWeightOf<T>>::burn_item()).into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721BurnableCall<T>>
    for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721BurnableCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721BurnableCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<ERC721BurnableCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721BurnableCall::Burn { token_id } => {
                    let result = self.burn(c.caller.clone(), token_id)?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    /// @title ERC721 minting logic.
    impl<T: Config> NonfungibleHandle<T> {
        fn minting_finished(&self) -> Result<bool> {
            Ok(false)
        }
        /// @notice Function to mint token.
        /// @dev `tokenId` should be obtained with `nextTokenId` method,
        ///  unlike standard, you can't specify it manually
        /// @param to The new owner
        /// @param tokenId ID of the minted NFT
        fn mint(
            &mut self,
            caller: caller,
            to: address,
            token_id: uint256,
        ) -> Result<bool> {
            let caller = T::CrossAccountId::from_eth(caller);
            let to = T::CrossAccountId::from_eth(to);
            let token_id: u32 = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            if <TokensMinted<T>>::get(self.id).checked_add(1).ok_or("item id overflow")?
                != token_id
            {
                return Err("item id should be next".into());
            }
            <Pallet<
                T,
            >>::create_item(
                    self,
                    &caller,
                    CreateItemData::<T> {
                        properties: BoundedVec::default(),
                        owner: to,
                    },
                    &budget,
                )
                .map_err(dispatch_to_evm::<T>)?;
            Ok(true)
        }
        /// @notice Function to mint token with the given tokenUri.
        /// @dev `tokenId` should be obtained with `nextTokenId` method,
        ///  unlike standard, you can't specify it manually
        /// @param to The new owner
        /// @param tokenId ID of the minted NFT
        /// @param tokenUri Token URI that would be stored in the NFT properties
        fn mint_with_token_uri(
            &mut self,
            caller: caller,
            to: address,
            token_id: uint256,
            token_uri: string,
        ) -> Result<bool> {
            let key = key::url();
            let permission = get_token_permission::<T>(self.id, &key)?;
            if !permission.collection_admin {
                return Err("Operation is not allowed".into());
            }
            let caller = T::CrossAccountId::from_eth(caller);
            let to = T::CrossAccountId::from_eth(to);
            let token_id: u32 = token_id.try_into().map_err(|_| "amount overflow")?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            if <TokensMinted<T>>::get(self.id).checked_add(1).ok_or("item id overflow")?
                != token_id
            {
                return Err("item id should be next".into());
            }
            let mut properties = CollectionPropertiesVec::default();
            properties
                .try_push(Property {
                    key,
                    value: token_uri
                        .into_bytes()
                        .try_into()
                        .map_err(|_| "token uri is too long")?,
                })
                .map_err(|e| Error::Revert({
                    let res = ::alloc::fmt::format(
                        ::core::fmt::Arguments::new_v1(
                            &["Can\'t add property: "],
                            &[::core::fmt::ArgumentV1::new_debug(&e)],
                        ),
                    );
                    res
                }))?;
            <Pallet<
                T,
            >>::create_item(
                    self,
                    &caller,
                    CreateItemData::<T> {
                        properties,
                        owner: to,
                    },
                    &budget,
                )
                .map_err(dispatch_to_evm::<T>)?;
            Ok(true)
        }
        /// @dev Not implemented
        fn finish_minting(&mut self, _caller: caller) -> Result<bool> {
            Err("not implementable".into())
        }
    }
    /// @title ERC721 minting logic.
    pub enum ERC721MintableCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        MintingFinished,
        /// @notice Function to mint token.
        /// @dev `tokenId` should be obtained with `nextTokenId` method,
        ///  unlike standard, you can't specify it manually
        /// @param to The new owner
        /// @param tokenId ID of the minted NFT
        #[allow(missing_docs)]
        Mint { to: address, token_id: uint256 },
        /// @notice Function to mint token with the given tokenUri.
        /// @dev `tokenId` should be obtained with `nextTokenId` method,
        ///  unlike standard, you can't specify it manually
        /// @param to The new owner
        /// @param tokenId ID of the minted NFT
        /// @param tokenUri Token URI that would be stored in the NFT properties
        #[allow(missing_docs)]
        MintWithTokenUri { to: address, token_id: uint256, token_uri: string },
        FinishMinting,
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721MintableCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721MintableCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721MintableCall::MintingFinished => {
                    ::core::fmt::Formatter::write_str(f, "MintingFinished")
                }
                ERC721MintableCall::Mint { to: __self_0, token_id: __self_1 } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "Mint",
                        "to",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721MintableCall::MintWithTokenUri {
                    to: __self_0,
                    token_id: __self_1,
                    token_uri: __self_2,
                } => {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "MintWithTokenUri",
                        "to",
                        &__self_0,
                        "token_id",
                        &__self_1,
                        "token_uri",
                        &__self_2,
                    )
                }
                ERC721MintableCall::FinishMinting => {
                    ::core::fmt::Formatter::write_str(f, "FinishMinting")
                }
            }
        }
    }
    impl<T> ERC721MintableCall<T> {
        const MINTING_FINISHED_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("mintingFinished"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///mintingFinished()
        const MINTING_FINISHED: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::MINTING_FINISHED_SIGNATURE.signature,
                    Self::MINTING_FINISHED_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const MINT_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("mint"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///mint(address,uint256)
        const MINT: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::MINT_SIGNATURE.signature,
                    Self::MINT_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const MINT_WITH_TOKEN_URI_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("mintWithTokenURI"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                fs,
                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                            ),
                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                        ),
                        (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///mintWithTokenURI(address,uint256,string)
        const MINT_WITH_TOKEN_URI: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::MINT_WITH_TOKEN_URI_SIGNATURE.signature,
                    Self::MINT_WITH_TOKEN_URI_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const FINISH_MINTING_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("finishMinting"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///finishMinting()
        const FINISH_MINTING: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::FINISH_MINTING_SIGNATURE.signature,
                    Self::FINISH_MINTING_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::MINTING_FINISHED);
            interface_id ^= u32::from_be_bytes(Self::MINT);
            interface_id ^= u32::from_be_bytes(Self::MINT_WITH_TOKEN_URI);
            interface_id ^= u32::from_be_bytes(Self::FINISH_MINTING);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[" @title ERC721 minting logic."],
                name: "ERC721Mintable",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165", "ERC721MintableEvents"],
                functions: (
                    SolidityFunction {
                        docs: &[],
                        selector_str: "mintingFinished()",
                        selector: u32::from_be_bytes(Self::MINTING_FINISHED),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("mintingFinished"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "mintingFinished",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Function to mint token.",
                            " @dev `tokenId` should be obtained with `nextTokenId` method,",
                            "  unlike standard, you can't specify it manually",
                            " @param to The new owner",
                            " @param tokenId ID of the minted NFT",
                        ],
                        selector_str: "mint(address,uint256)",
                        selector: u32::from_be_bytes(Self::MINT),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("mint"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "mint",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Function to mint token with the given tokenUri.",
                            " @dev `tokenId` should be obtained with `nextTokenId` method,",
                            "  unlike standard, you can't specify it manually",
                            " @param to The new owner",
                            " @param tokenId ID of the minted NFT",
                            " @param tokenUri Token URI that would be stored in the NFT properties",
                        ],
                        selector_str: "mintWithTokenURI(address,uint256,string)",
                        selector: u32::from_be_bytes(Self::MINT_WITH_TOKEN_URI),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("mintWithTokenURI"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    fs,
                                                    (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                                ),
                                                (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                            ),
                                            (<string>::SIGNATURE, <string>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "mintWithTokenURI",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                            <NamedArgument<string>>::new("tokenUri"),
                        ),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @dev Not implemented"],
                        selector_str: "finishMinting()",
                        selector: u32::from_be_bytes(Self::FINISH_MINTING),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("finishMinting"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "finishMinting",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721Mintable".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            ERC721MintableEvents::generate_solidity_interface(tc, is_impl);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721MintableCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::MINTING_FINISHED => return Ok(Some(Self::MintingFinished)),
                Self::MINT => {
                    return Ok(
                        Some(Self::Mint {
                            to: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::MINT_WITH_TOKEN_URI => {
                    return Ok(
                        Some(Self::MintWithTokenUri {
                            to: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                            token_uri: reader.abi_read()?,
                        }),
                    );
                }
                Self::FINISH_MINTING => return Ok(Some(Self::FinishMinting)),
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721MintableCall<T> {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721MintableCall<T> {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::MintingFinished => ().into(),
                Self::Mint { to, token_id } => (<SelfWeightOf<T>>::create_item()).into(),
                Self::MintWithTokenUri { to, token_id, token_uri } => {
                    (<SelfWeightOf<T>>::create_item()).into()
                }
                Self::FinishMinting => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721MintableCall<T>>
    for NonfungibleHandle<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721MintableCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721MintableCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<ERC721MintableCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721MintableCall::MintingFinished => {
                    let result = self.minting_finished()?;
                    (&result).to_result()
                }
                ERC721MintableCall::Mint { to, token_id } => {
                    let result = self.mint(c.caller.clone(), to, token_id)?;
                    (&result).to_result()
                }
                ERC721MintableCall::MintWithTokenUri { to, token_id, token_uri } => {
                    let result = self
                        .mint_with_token_uri(c.caller.clone(), to, token_id, token_uri)?;
                    (&result).to_result()
                }
                ERC721MintableCall::FinishMinting => {
                    let result = self.finish_minting(c.caller.clone())?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    fn get_token_property<T: Config>(
        collection: &CollectionHandle<T>,
        token_id: u32,
        key: &up_data_structs::PropertyKey,
    ) -> Result<string> {
        collection.consume_store_reads(1)?;
        let properties = <TokenProperties<T>>::try_get((collection.id, token_id))
            .map_err(|_| Error::Revert("Token properties not found".into()))?;
        if let Some(property) = properties.get(key) {
            return Ok(string::from_utf8_lossy(property).into());
        }
        Err("Property tokenURI not found".into())
    }
    fn is_erc721_metadata_compatible<T: Config>(collection_id: CollectionId) -> bool {
        if let Some(shema_name)
            = pallet_common::Pallet::<
                T,
            >::get_collection_property(collection_id, &key::schema_name()) {
            let shema_name = shema_name.into_inner();
            shema_name == property_value::ERC721_METADATA
        } else {
            false
        }
    }
    fn get_token_permission<T: Config>(
        collection_id: CollectionId,
        key: &PropertyKey,
    ) -> Result<PropertyPermission> {
        let token_property_permissions = CollectionPropertyPermissions::<
            T,
        >::try_get(collection_id)
            .map_err(|_| Error::Revert("No permissions for collection".into()))?;
        let a = token_property_permissions
            .get(key)
            .map(Clone::clone)
            .ok_or_else(|| {
                let key = string::from_utf8(key.clone().into_inner())
                    .unwrap_or_default();
                Error::Revert({
                    let res = ::alloc::fmt::format(
                        ::core::fmt::Arguments::new_v1(
                            &["No permission for key "],
                            &[::core::fmt::ArgumentV1::new_display(&key)],
                        ),
                    );
                    res
                })
            })?;
        Ok(a)
    }
    fn has_token_permission<T: Config>(
        collection_id: CollectionId,
        key: &PropertyKey,
    ) -> bool {
        if let Ok(token_property_permissions)
            = CollectionPropertyPermissions::<T>::try_get(collection_id) {
            return token_property_permissions.contains_key(key);
        }
        false
    }
    /// @title Unique extensions for ERC721.
    impl<T: Config> NonfungibleHandle<T>
    where
        T::AccountId: From<[u8; 32]>,
    {
        /// @notice Set or reaffirm the approved address for an NFT
        /// @dev The zero address indicates there is no approved address.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param approved The new substrate address approved NFT controller
        /// @param tokenId The NFT to approve
        fn approve_cross(
            &mut self,
            caller: caller,
            approved: (address, uint256),
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let approved = convert_tuple_to_cross_account::<T>(approved)?;
            let token = token_id.try_into()?;
            <Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Transfer ownership of an NFT
        /// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
        ///  is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param to The new owner
        /// @param tokenId The NFT to transfer
        fn transfer(
            &mut self,
            caller: caller,
            to: address,
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let to = T::CrossAccountId::from_eth(to);
            let token = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<T>>::transfer(self, &caller, &to, token, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Transfer ownership of an NFT from cross account address to cross account address
        /// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
        ///  is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from Cross acccount address of current owner
        /// @param to Cross acccount address of new owner
        /// @param tokenId The NFT to transfer
        fn transfer_from_cross(
            &mut self,
            caller: caller,
            from: EthCrossAccount,
            to: EthCrossAccount,
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let from = from.into_sub_cross_account::<T>()?;
            let to = to.into_sub_cross_account::<T>()?;
            let token_id = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            Pallet::<T>::transfer_from(self, &caller, &from, &to, token_id, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param tokenId The NFT to transfer
        fn burn_from(
            &mut self,
            caller: caller,
            from: address,
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let from = T::CrossAccountId::from_eth(from);
            let token = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<T>>::burn_from(self, &caller, &from, token, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param tokenId The NFT to transfer
        fn burn_from_cross(
            &mut self,
            caller: caller,
            from: (address, uint256),
            token_id: uint256,
        ) -> Result<void> {
            let caller = T::CrossAccountId::from_eth(caller);
            let from = convert_tuple_to_cross_account::<T>(from)?;
            let token = token_id.try_into()?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            <Pallet<T>>::burn_from(self, &caller, &from, token, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(())
        }
        /// @notice Returns next free NFT ID.
        fn next_token_id(&self) -> Result<uint256> {
            self.consume_store_reads(1)?;
            Ok(
                <TokensMinted<T>>::get(self.id)
                    .checked_add(1)
                    .ok_or("item id overflow")?
                    .into(),
            )
        }
        /// @notice Function to mint multiple tokens.
        /// @dev `tokenIds` should be an array of consecutive numbers and first number
        ///  should be obtained with `nextTokenId` method
        /// @param to The new owner
        /// @param tokenIds IDs of the minted NFTs
        fn mint_bulk(
            &mut self,
            caller: caller,
            to: address,
            token_ids: Vec<uint256>,
        ) -> Result<bool> {
            let caller = T::CrossAccountId::from_eth(caller);
            let to = T::CrossAccountId::from_eth(to);
            let mut expected_index = <TokensMinted<T>>::get(self.id)
                .checked_add(1)
                .ok_or("item id overflow")?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            let total_tokens = token_ids.len();
            for id in token_ids.into_iter() {
                let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
                if id != expected_index {
                    return Err("item id should be next".into());
                }
                expected_index = expected_index
                    .checked_add(1)
                    .ok_or("item id overflow")?;
            }
            let data = (0..total_tokens)
                .map(|_| CreateItemData::<T> {
                    properties: BoundedVec::default(),
                    owner: to.clone(),
                })
                .collect();
            <Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(true)
        }
        /// @notice Function to mint multiple tokens with the given tokenUris.
        /// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
        ///  numbers and first number should be obtained with `nextTokenId` method
        /// @param to The new owner
        /// @param tokens array of pairs of token ID and token URI for minted tokens
        fn mint_bulk_with_token_uri(
            &mut self,
            caller: caller,
            to: address,
            tokens: Vec<(uint256, string)>,
        ) -> Result<bool> {
            let key = key::url();
            let caller = T::CrossAccountId::from_eth(caller);
            let to = T::CrossAccountId::from_eth(to);
            let mut expected_index = <TokensMinted<T>>::get(self.id)
                .checked_add(1)
                .ok_or("item id overflow")?;
            let budget = self
                .recorder
                .weight_calls_budget(<StructureWeight<T>>::find_parent());
            let mut data = Vec::with_capacity(tokens.len());
            for (id, token_uri) in tokens {
                let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
                if id != expected_index {
                    return Err("item id should be next".into());
                }
                expected_index = expected_index
                    .checked_add(1)
                    .ok_or("item id overflow")?;
                let mut properties = CollectionPropertiesVec::default();
                properties
                    .try_push(Property {
                        key: key.clone(),
                        value: token_uri
                            .into_bytes()
                            .try_into()
                            .map_err(|_| "token uri is too long")?,
                    })
                    .map_err(|e| Error::Revert({
                        let res = ::alloc::fmt::format(
                            ::core::fmt::Arguments::new_v1(
                                &["Can\'t add property: "],
                                &[::core::fmt::ArgumentV1::new_debug(&e)],
                            ),
                        );
                        res
                    }))?;
                data.push(CreateItemData::<T> {
                    properties,
                    owner: to.clone(),
                });
            }
            <Pallet<T>>::create_multiple_items(self, &caller, data, &budget)
                .map_err(dispatch_to_evm::<T>)?;
            Ok(true)
        }
    }
    /// @title Unique extensions for ERC721.
    pub enum ERC721UniqueExtensionsCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        /// @notice Set or reaffirm the approved address for an NFT
        /// @dev The zero address indicates there is no approved address.
        /// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
        ///  operator of the current owner.
        /// @param approved The new substrate address approved NFT controller
        /// @param tokenId The NFT to approve
        #[allow(missing_docs)]
        ApproveCross { approved: (address, uint256), token_id: uint256 },
        /// @notice Transfer ownership of an NFT
        /// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
        ///  is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param to The new owner
        /// @param tokenId The NFT to transfer
        #[allow(missing_docs)]
        Transfer { to: address, token_id: uint256 },
        /// @notice Transfer ownership of an NFT from cross account address to cross account address
        /// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
        ///  is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from Cross acccount address of current owner
        /// @param to Cross acccount address of new owner
        /// @param tokenId The NFT to transfer
        #[allow(missing_docs)]
        TransferFromCross {
            from: EthCrossAccount,
            to: EthCrossAccount,
            token_id: uint256,
        },
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param tokenId The NFT to transfer
        #[allow(missing_docs)]
        BurnFrom { from: address, token_id: uint256 },
        /// @notice Burns a specific ERC721 token.
        /// @dev Throws unless `msg.sender` is the current owner or an authorized
        ///  operator for this NFT. Throws if `from` is not the current owner. Throws
        ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
        /// @param from The current owner of the NFT
        /// @param tokenId The NFT to transfer
        #[allow(missing_docs)]
        BurnFromCross { from: (address, uint256), token_id: uint256 },
        NextTokenId,
        /// @notice Function to mint multiple tokens.
        /// @dev `tokenIds` should be an array of consecutive numbers and first number
        ///  should be obtained with `nextTokenId` method
        /// @param to The new owner
        /// @param tokenIds IDs of the minted NFTs
        #[allow(missing_docs)]
        MintBulk { to: address, token_ids: Vec<uint256> },
        /// @notice Function to mint multiple tokens with the given tokenUris.
        /// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
        ///  numbers and first number should be obtained with `nextTokenId` method
        /// @param to The new owner
        /// @param tokens array of pairs of token ID and token URI for minted tokens
        #[allow(missing_docs)]
        MintBulkWithTokenUri { to: address, tokens: Vec<(uint256, string)> },
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for ERC721UniqueExtensionsCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                ERC721UniqueExtensionsCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::ApproveCross {
                    approved: __self_0,
                    token_id: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "ApproveCross",
                        "approved",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::Transfer {
                    to: __self_0,
                    token_id: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "Transfer",
                        "to",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::TransferFromCross {
                    from: __self_0,
                    to: __self_1,
                    token_id: __self_2,
                } => {
                    ::core::fmt::Formatter::debug_struct_field3_finish(
                        f,
                        "TransferFromCross",
                        "from",
                        &__self_0,
                        "to",
                        &__self_1,
                        "token_id",
                        &__self_2,
                    )
                }
                ERC721UniqueExtensionsCall::BurnFrom {
                    from: __self_0,
                    token_id: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "BurnFrom",
                        "from",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::BurnFromCross {
                    from: __self_0,
                    token_id: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "BurnFromCross",
                        "from",
                        &__self_0,
                        "token_id",
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::NextTokenId => {
                    ::core::fmt::Formatter::write_str(f, "NextTokenId")
                }
                ERC721UniqueExtensionsCall::MintBulk {
                    to: __self_0,
                    token_ids: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "MintBulk",
                        "to",
                        &__self_0,
                        "token_ids",
                        &__self_1,
                    )
                }
                ERC721UniqueExtensionsCall::MintBulkWithTokenUri {
                    to: __self_0,
                    tokens: __self_1,
                } => {
                    ::core::fmt::Formatter::debug_struct_field2_finish(
                        f,
                        "MintBulkWithTokenUri",
                        "to",
                        &__self_0,
                        "tokens",
                        &__self_1,
                    )
                }
            }
        }
    }
    impl<T> ERC721UniqueExtensionsCall<T> {
        const APPROVE_CROSS_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("approveCross"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///approveCross((address,uint256),uint256)
        const APPROVE_CROSS: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::APPROVE_CROSS_SIGNATURE.signature,
                    Self::APPROVE_CROSS_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TRANSFER_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("transfer"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///transfer(address,uint256)
        const TRANSFER: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TRANSFER_SIGNATURE.signature,
                    Self::TRANSFER_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const TRANSFER_FROM_CROSS_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(
                    &&FunctionName::new("transferFromCross"),
                );
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            FunctionSignature::add_param(
                                fs,
                                (
                                    <EthCrossAccount>::SIGNATURE,
                                    <EthCrossAccount>::SIGNATURE_LEN,
                                ),
                            ),
                            (
                                <EthCrossAccount>::SIGNATURE,
                                <EthCrossAccount>::SIGNATURE_LEN,
                            ),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///transferFromCross(EthCrossAccount,EthCrossAccount,uint256)
        const TRANSFER_FROM_CROSS: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::TRANSFER_FROM_CROSS_SIGNATURE.signature,
                    Self::TRANSFER_FROM_CROSS_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const BURN_FROM_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("burnFrom"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        FunctionSignature::add_param(
                            fs,
                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                        ),
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///burnFrom(address,uint256)
        const BURN_FROM: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::BURN_FROM_SIGNATURE.signature,
                    Self::BURN_FROM_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const BURN_FROM_CROSS_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("burnFromCross"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///burnFromCross((address,uint256),uint256)
        const BURN_FROM_CROSS: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::BURN_FROM_CROSS_SIGNATURE.signature,
                    Self::BURN_FROM_CROSS_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const NEXT_TOKEN_ID_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("nextTokenId"));
                let fs = FunctionSignature::done(fs, false);
                fs
            }
        };
        ///nextTokenId()
        const NEXT_TOKEN_ID: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::NEXT_TOKEN_ID_SIGNATURE.signature,
                    Self::NEXT_TOKEN_ID_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const MINT_BULK_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(&&FunctionName::new("mintBulk"));
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///mintBulk(address,uint256[])
        const MINT_BULK: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::MINT_BULK_SIGNATURE.signature,
                    Self::MINT_BULK_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        const MINT_BULK_WITH_TOKEN_URI_SIGNATURE: ::evm_coder::custom_signature::FunctionSignature = {
            {
                let fs = FunctionSignature::new(
                    &&FunctionName::new("mintBulkWithTokenURI"),
                );
                let fs = FunctionSignature::done(
                    FunctionSignature::add_param(
                        fs,
                        (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                    ),
                    true,
                );
                fs
            }
        };
        ///mintBulkWithTokenURI(address,(uint256,string)[])
        const MINT_BULK_WITH_TOKEN_URI: ::evm_coder::types::bytes4 = {
            let a = ::evm_coder::sha3_const::Keccak256::new()
                .update_with_size(
                    &Self::MINT_BULK_WITH_TOKEN_URI_SIGNATURE.signature,
                    Self::MINT_BULK_WITH_TOKEN_URI_SIGNATURE.signature_len,
                )
                .finalize();
            [a[0], a[1], a[2], a[3]]
        };
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            interface_id ^= u32::from_be_bytes(Self::APPROVE_CROSS);
            interface_id ^= u32::from_be_bytes(Self::TRANSFER);
            interface_id ^= u32::from_be_bytes(Self::TRANSFER_FROM_CROSS);
            interface_id ^= u32::from_be_bytes(Self::BURN_FROM);
            interface_id ^= u32::from_be_bytes(Self::BURN_FROM_CROSS);
            interface_id ^= u32::from_be_bytes(Self::NEXT_TOKEN_ID);
            interface_id ^= u32::from_be_bytes(Self::MINT_BULK);
            interface_id ^= u32::from_be_bytes(Self::MINT_BULK_WITH_TOKEN_URI);
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[" @title Unique extensions for ERC721."],
                name: "ERC721UniqueExtensions",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[
                            " @notice Set or reaffirm the approved address for an NFT",
                            " @dev The zero address indicates there is no approved address.",
                            " @dev Throws unless `msg.sender` is the current NFT owner, or an authorized",
                            "  operator of the current owner.",
                            " @param approved The new substrate address approved NFT controller",
                            " @param tokenId The NFT to approve",
                        ],
                        selector_str: "approveCross((address,uint256),uint256)",
                        selector: u32::from_be_bytes(Self::APPROVE_CROSS),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("approveCross"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "approveCross",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<(address, uint256)>>::new("approved"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Transfer ownership of an NFT",
                            " @dev Throws unless `msg.sender` is the current owner. Throws if `to`",
                            "  is the zero address. Throws if `tokenId` is not a valid NFT.",
                            " @param to The new owner",
                            " @param tokenId The NFT to transfer",
                        ],
                        selector_str: "transfer(address,uint256)",
                        selector: u32::from_be_bytes(Self::TRANSFER),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("transfer"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "transfer",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Transfer ownership of an NFT from cross account address to cross account address",
                            " @dev Throws unless `msg.sender` is the current owner. Throws if `to`",
                            "  is the zero address. Throws if `tokenId` is not a valid NFT.",
                            " @param from Cross acccount address of current owner",
                            " @param to Cross acccount address of new owner",
                            " @param tokenId The NFT to transfer",
                        ],
                        selector_str: "transferFromCross(EthCrossAccount,EthCrossAccount,uint256)",
                        selector: u32::from_be_bytes(Self::TRANSFER_FROM_CROSS),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("transferFromCross"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                FunctionSignature::add_param(
                                                    fs,
                                                    (
                                                        <EthCrossAccount>::SIGNATURE,
                                                        <EthCrossAccount>::SIGNATURE_LEN,
                                                    ),
                                                ),
                                                (
                                                    <EthCrossAccount>::SIGNATURE,
                                                    <EthCrossAccount>::SIGNATURE_LEN,
                                                ),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "transferFromCross",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<EthCrossAccount>>::new("from"),
                            <NamedArgument<EthCrossAccount>>::new("to"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Burns a specific ERC721 token.",
                            " @dev Throws unless `msg.sender` is the current owner or an authorized",
                            "  operator for this NFT. Throws if `from` is not the current owner. Throws",
                            "  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.",
                            " @param from The current owner of the NFT",
                            " @param tokenId The NFT to transfer",
                        ],
                        selector_str: "burnFrom(address,uint256)",
                        selector: u32::from_be_bytes(Self::BURN_FROM),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("burnFrom"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            FunctionSignature::add_param(
                                                fs,
                                                (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                            ),
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "burnFrom",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("from"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Burns a specific ERC721 token.",
                            " @dev Throws unless `msg.sender` is the current owner or an authorized",
                            "  operator for this NFT. Throws if `from` is not the current owner. Throws",
                            "  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.",
                            " @param from The current owner of the NFT",
                            " @param tokenId The NFT to transfer",
                        ],
                        selector_str: "burnFromCross((address,uint256),uint256)",
                        selector: u32::from_be_bytes(Self::BURN_FROM_CROSS),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("burnFromCross"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<uint256>::SIGNATURE, <uint256>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "burnFromCross",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<(address, uint256)>>::new("from"),
                            <NamedArgument<uint256>>::new("tokenId"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[" @notice Returns next free NFT ID."],
                        selector_str: "nextTokenId()",
                        selector: u32::from_be_bytes(Self::NEXT_TOKEN_ID),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("nextTokenId"),
                                    );
                                    let fs = FunctionSignature::done(fs, false);
                                    fs
                                }
                            };
                            cs
                        },
                        name: "nextTokenId",
                        mutability: SolidityMutability::View,
                        is_payable: false,
                        args: (),
                        result: <UnnamedArgument<uint256>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Function to mint multiple tokens.",
                            " @dev `tokenIds` should be an array of consecutive numbers and first number",
                            "  should be obtained with `nextTokenId` method",
                            " @param to The new owner",
                            " @param tokenIds IDs of the minted NFTs",
                        ],
                        selector_str: "mintBulk(address,uint256[])",
                        selector: u32::from_be_bytes(Self::MINT_BULK),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("mintBulk"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "mintBulk",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<Vec<uint256>>>::new("tokenIds"),
                        ),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[
                            " @notice Function to mint multiple tokens with the given tokenUris.",
                            " @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive",
                            "  numbers and first number should be obtained with `nextTokenId` method",
                            " @param to The new owner",
                            " @param tokens array of pairs of token ID and token URI for minted tokens",
                        ],
                        selector_str: "mintBulkWithTokenURI(address,(uint256,string)[])",
                        selector: u32::from_be_bytes(Self::MINT_BULK_WITH_TOKEN_URI),
                        custom_signature: {
                            const cs: FunctionSignature = {
                                {
                                    let fs = FunctionSignature::new(
                                        &&FunctionName::new("mintBulkWithTokenURI"),
                                    );
                                    let fs = FunctionSignature::done(
                                        FunctionSignature::add_param(
                                            fs,
                                            (<address>::SIGNATURE, <address>::SIGNATURE_LEN),
                                        ),
                                        true,
                                    );
                                    fs
                                }
                            };
                            cs
                        },
                        name: "mintBulkWithTokenURI",
                        mutability: SolidityMutability::Mutable,
                        is_payable: false,
                        args: (
                            <NamedArgument<address>>::new("to"),
                            <NamedArgument<Vec<(uint256, string)>>>::new("tokens"),
                        ),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                ),
            };
            let mut out = ::evm_coder::types::string::new();
            if "ERC721UniqueExtensions".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for ERC721UniqueExtensionsCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                Self::APPROVE_CROSS => {
                    return Ok(
                        Some(Self::ApproveCross {
                            approved: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::TRANSFER => {
                    return Ok(
                        Some(Self::Transfer {
                            to: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::TRANSFER_FROM_CROSS => {
                    return Ok(
                        Some(Self::TransferFromCross {
                            from: reader.abi_read()?,
                            to: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::BURN_FROM => {
                    return Ok(
                        Some(Self::BurnFrom {
                            from: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::BURN_FROM_CROSS => {
                    return Ok(
                        Some(Self::BurnFromCross {
                            from: reader.abi_read()?,
                            token_id: reader.abi_read()?,
                        }),
                    );
                }
                Self::NEXT_TOKEN_ID => return Ok(Some(Self::NextTokenId)),
                Self::MINT_BULK => {
                    return Ok(
                        Some(Self::MintBulk {
                            to: reader.abi_read()?,
                            token_ids: reader.abi_read()?,
                        }),
                    );
                }
                Self::MINT_BULK_WITH_TOKEN_URI => {
                    return Ok(
                        Some(Self::MintBulkWithTokenUri {
                            to: reader.abi_read()?,
                            tokens: reader.abi_read()?,
                        }),
                    );
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ERC721UniqueExtensionsCall<T>
    where
        T::AccountId: From<[u8; 32]>,
    {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ERC721UniqueExtensionsCall<T>
    where
        T::AccountId: From<[u8; 32]>,
    {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
                Self::ApproveCross { approved, token_id } => {
                    (<SelfWeightOf<T>>::approve()).into()
                }
                Self::Transfer { to, token_id } => (<SelfWeightOf<T>>::transfer()).into(),
                Self::TransferFromCross { from, to, token_id } => {
                    (<SelfWeightOf<T>>::transfer()).into()
                }
                Self::BurnFrom { from, token_id } => {
                    (<SelfWeightOf<T>>::burn_from()).into()
                }
                Self::BurnFromCross { from, token_id } => {
                    (<SelfWeightOf<T>>::burn_from()).into()
                }
                Self::NextTokenId => ().into(),
                Self::MintBulk { to, token_ids } => {
                    (<SelfWeightOf<T>>::create_multiple_items(token_ids.len() as u32))
                        .into()
                }
                Self::MintBulkWithTokenUri { to, tokens } => {
                    (<SelfWeightOf<T>>::create_multiple_items(tokens.len() as u32))
                        .into()
                }
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ERC721UniqueExtensionsCall<T>>
    for NonfungibleHandle<T>
    where
        T::AccountId: From<[u8; 32]>,
    {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ERC721UniqueExtensionsCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                ERC721UniqueExtensionsCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<ERC721UniqueExtensionsCall<
                                T,
                            >>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                ERC721UniqueExtensionsCall::ApproveCross { approved, token_id } => {
                    let result = self
                        .approve_cross(c.caller.clone(), approved, token_id)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::Transfer { to, token_id } => {
                    let result = self.transfer(c.caller.clone(), to, token_id)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::TransferFromCross { from, to, token_id } => {
                    let result = self
                        .transfer_from_cross(c.caller.clone(), from, to, token_id)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::BurnFrom { from, token_id } => {
                    let result = self.burn_from(c.caller.clone(), from, token_id)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::BurnFromCross { from, token_id } => {
                    let result = self.burn_from_cross(c.caller.clone(), from, token_id)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::NextTokenId => {
                    let result = self.next_token_id()?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::MintBulk { to, token_ids } => {
                    let result = self.mint_bulk(c.caller.clone(), to, token_ids)?;
                    (&result).to_result()
                }
                ERC721UniqueExtensionsCall::MintBulkWithTokenUri { to, tokens } => {
                    let result = self
                        .mint_bulk_with_token_uri(c.caller.clone(), to, tokens)?;
                    (&result).to_result()
                }
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    impl<T: Config> NonfungibleHandle<T>
    where
        T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
    {}
    pub enum UniqueNFTCall<T> {
        /// Inherited method
        ERC165Call(::evm_coder::ERC165Call, ::core::marker::PhantomData<T>),
        ERC721(ERC721Call<T>),
        ERC721Metadata(ERC721MetadataCall<T>),
        ERC721Enumerable(ERC721EnumerableCall<T>),
        ERC721UniqueExtensions(ERC721UniqueExtensionsCall<T>),
        ERC721Mintable(ERC721MintableCall<T>),
        ERC721Burnable(ERC721BurnableCall<T>),
        Collection(CollectionCall<T>),
        TokenProperties(TokenPropertiesCall<T>),
    }
    #[automatically_derived]
    impl<T: ::core::fmt::Debug> ::core::fmt::Debug for UniqueNFTCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match self {
                UniqueNFTCall::ERC165Call(__self_0, __self_1) => {
                    ::core::fmt::Formatter::debug_tuple_field2_finish(
                        f,
                        "ERC165Call",
                        &__self_0,
                        &__self_1,
                    )
                }
                UniqueNFTCall::ERC721(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721",
                        &__self_0,
                    )
                }
                UniqueNFTCall::ERC721Metadata(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721Metadata",
                        &__self_0,
                    )
                }
                UniqueNFTCall::ERC721Enumerable(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721Enumerable",
                        &__self_0,
                    )
                }
                UniqueNFTCall::ERC721UniqueExtensions(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721UniqueExtensions",
                        &__self_0,
                    )
                }
                UniqueNFTCall::ERC721Mintable(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721Mintable",
                        &__self_0,
                    )
                }
                UniqueNFTCall::ERC721Burnable(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "ERC721Burnable",
                        &__self_0,
                    )
                }
                UniqueNFTCall::Collection(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "Collection",
                        &__self_0,
                    )
                }
                UniqueNFTCall::TokenProperties(__self_0) => {
                    ::core::fmt::Formatter::debug_tuple_field1_finish(
                        f,
                        "TokenProperties",
                        &__self_0,
                    )
                }
            }
        }
    }
    impl<T> UniqueNFTCall<T> {
        /// Return this call ERC165 selector
        pub fn interface_id() -> ::evm_coder::types::bytes4 {
            let mut interface_id = 0;
            u32::to_be_bytes(interface_id)
        }
        /// Generate solidity definitions for methods described in this interface
        pub fn generate_solidity_interface(
            tc: &evm_coder::solidity::TypeCollector,
            is_impl: bool,
        ) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                docs: &[],
                name: "UniqueNFT",
                selector: Self::interface_id(),
                is: &[
                    "Dummy",
                    "ERC165",
                    "ERC721",
                    "ERC721Metadata",
                    "ERC721Enumerable",
                    "ERC721UniqueExtensions",
                    "ERC721Mintable",
                    "ERC721Burnable",
                    "Collection",
                    "TokenProperties",
                ],
                functions: (),
            };
            let mut out = ::evm_coder::types::string::new();
            if "UniqueNFT".starts_with("Inline") {
                out.push_str("/// @dev inlined interface\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
            <ERC721Call<T>>::generate_solidity_interface(tc, is_impl);
            <ERC721MetadataCall<T>>::generate_solidity_interface(tc, is_impl);
            <ERC721EnumerableCall<T>>::generate_solidity_interface(tc, is_impl);
            <ERC721UniqueExtensionsCall<T>>::generate_solidity_interface(tc, is_impl);
            <ERC721MintableCall<T>>::generate_solidity_interface(tc, is_impl);
            <ERC721BurnableCall<T>>::generate_solidity_interface(tc, is_impl);
            <CollectionCall<T>>::generate_solidity_interface(tc, is_impl);
            <TokenPropertiesCall<T>>::generate_solidity_interface(tc, is_impl);
            if is_impl {
                tc.collect(
                    "/// @dev common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n"
                        .into(),
                );
            } else {
                tc.collect(
                    "/// @dev common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n"
                        .into(),
                );
            }
        }
    }
    impl<T> ::evm_coder::Call for UniqueNFTCall<T> {
        fn parse(
            method_id: ::evm_coder::types::bytes4,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?
                            .map(|c| Self::ERC165Call(c, ::core::marker::PhantomData)),
                    );
                }
                _ => {}
            }
            if let Some(parsed_call) = <ERC721Call<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721(parsed_call)))
            } else if let Some(parsed_call)
                = <ERC721MetadataCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721Metadata(parsed_call)))
            } else if let Some(parsed_call)
                = <ERC721EnumerableCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721Enumerable(parsed_call)))
            } else if let Some(parsed_call)
                = <ERC721UniqueExtensionsCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721UniqueExtensions(parsed_call)))
            } else if let Some(parsed_call)
                = <ERC721MintableCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721Mintable(parsed_call)))
            } else if let Some(parsed_call)
                = <ERC721BurnableCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::ERC721Burnable(parsed_call)))
            } else if let Some(parsed_call)
                = <CollectionCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::Collection(parsed_call)))
            } else if let Some(parsed_call)
                = <TokenPropertiesCall<T>>::parse(method_id, reader)? {
                return Ok(Some(Self::TokenProperties(parsed_call)))
            }
            return Ok(None);
        }
    }
    impl<T: Config> UniqueNFTCall<T>
    where
        T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
    {
        /// Is this contract implements specified ERC165 selector
        pub fn supports_interface(
            this: &NonfungibleHandle<T>,
            interface_id: ::evm_coder::types::bytes4,
        ) -> bool {
            interface_id != u32::to_be_bytes(0xffffff)
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id()
                    || <ERC721Call<T>>::supports_interface(this, interface_id)
                    || <ERC721MetadataCall<T>>::supports_interface(this, interface_id)
                    || <ERC721EnumerableCall<T>>::supports_interface(this, interface_id)
                    || <ERC721UniqueExtensionsCall<
                        T,
                    >>::supports_interface(this, interface_id)
                    || <ERC721MintableCall<T>>::supports_interface(this, interface_id)
                    || <ERC721BurnableCall<T>>::supports_interface(this, interface_id)
                    || <CollectionCall<T>>::supports_interface(this, interface_id)
                    || <TokenPropertiesCall<T>>::supports_interface(this, interface_id))
        }
    }
    impl<T: Config> ::evm_coder::Weighted for UniqueNFTCall<T>
    where
        T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
    {
        #[allow(unused_variables)]
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            match self {
                Self::ERC721(call) => call.weight(),
                Self::ERC721Metadata(call) => call.weight(),
                Self::ERC721Enumerable(call) => call.weight(),
                Self::ERC721UniqueExtensions(call) => call.weight(),
                Self::ERC721Mintable(call) => call.weight(),
                Self::ERC721Burnable(call) => call.weight(),
                Self::Collection(call) => call.weight(),
                Self::TokenProperties(call) => call.weight(),
                Self::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { .. },
                    _,
                ) => ::frame_support::weights::Weight::from_ref_time(100).into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<UniqueNFTCall<T>> for NonfungibleHandle<T>
    where
        T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
    {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<UniqueNFTCall<T>>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            match c.call {
                UniqueNFTCall::ERC721(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721Call<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC721Metadata(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721MetadataCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC721Enumerable(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721EnumerableCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC721UniqueExtensions(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721UniqueExtensionsCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC721Mintable(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721MintableCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC721Burnable(call) => {
                    return <Self as ::evm_coder::Callable<
                        ERC721BurnableCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::Collection(call) => {
                    return <CollectionHandle<
                        T,
                    > as ::evm_coder::Callable<
                        CollectionCall<T>,
                    >>::call(
                        self.common_mut(),
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::TokenProperties(call) => {
                    return <Self as ::evm_coder::Callable<
                        TokenPropertiesCall<T>,
                    >>::call(
                        self,
                        Msg {
                            call,
                            caller: c.caller,
                            value: c.value,
                        },
                    );
                }
                UniqueNFTCall::ERC165Call(
                    ::evm_coder::ERC165Call::SupportsInterface { interface_id },
                    _,
                ) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer
                        .bool(
                            &<UniqueNFTCall<T>>::supports_interface(self, interface_id),
                        );
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                _ => {
                    Err(
                        ::evm_coder::execution::Error::from("method is not available")
                            .into(),
                    )
                }
            }
        }
    }
    impl<T: Config> CommonEvmHandler for NonfungibleHandle<T>
    where
        T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
    {
        const CODE: &'static [u8] = b"`\xe0`@R`&`\x80\x81\x81R\x90b\x00\x138`\xa09`\x01\x90b\x00\x00\"\x90\x82b\x00\x00\xdcV[P4\x80\x15b\x00\x000W`\x00\x80\xfd[Pb\x00\x01\xa8V[cNH{q`\xe0\x1b`\x00R`A`\x04R`$`\x00\xfd[`\x01\x81\x81\x1c\x90\x82\x16\x80b\x00\x00bW`\x7f\x82\x16\x91P[` \x82\x10\x81\x03b\x00\x00\x83WcNH{q`\xe0\x1b`\x00R`\"`\x04R`$`\x00\xfd[P\x91\x90PV[`\x1f\x82\x11\x15b\x00\x00\xd7W`\x00\x81\x81R` \x81 `\x1f\x85\x01`\x05\x1c\x81\x01` \x86\x10\x15b\x00\x00\xb2WP\x80[`\x1f\x85\x01`\x05\x1c\x82\x01\x91P[\x81\x81\x10\x15b\x00\x00\xd3W\x82\x81U`\x01\x01b\x00\x00\xbeV[PPP[PPPV[\x81Q`\x01`\x01`@\x1b\x03\x81\x11\x15b\x00\x00\xf8Wb\x00\x00\xf8b\x00\x007V[b\x00\x01\x10\x81b\x00\x01\t\x84Tb\x00\x00MV[\x84b\x00\x00\x89V[` \x80`\x1f\x83\x11`\x01\x81\x14b\x00\x01HW`\x00\x84\x15b\x00\x01/WP\x85\x83\x01Q[`\x00\x19`\x03\x86\x90\x1b\x1c\x19\x16`\x01\x85\x90\x1b\x17\x85Ub\x00\x00\xd3V[`\x00\x85\x81R` \x81 `\x1f\x19\x86\x16\x91[\x82\x81\x10\x15b\x00\x01yW\x88\x86\x01Q\x82U\x94\x84\x01\x94`\x01\x90\x91\x01\x90\x84\x01b\x00\x01XV[P\x85\x82\x10\x15b\x00\x01\x98W\x87\x85\x01Q`\x00\x19`\x03\x88\x90\x1b`\xf8\x16\x1c\x19\x16\x81U[PPPPP`\x01\x90\x81\x1b\x01\x90UPV[a\x11\x80\x80b\x00\x01\xb8`\x009`\x00\xf3\xfe`\x80`@R4\x80\x15a\x00\x10W`\x00\x80\xfd[P`\x046\x10a\x03\xdaW`\x005`\xe0\x1c\x80cj8A\xdb\x11a\x02\nW\x80c\x98\x11\xb0\xc7\x11a\x01%W\x80c\xcf$\xfdm\x11a\x00\xb8W\x80c\xdfr};\x11a\x00\x87W\x80c\xdfr};\x14a\x05\xaaW\x80c\xe5\xc9\x91?\x14a\x04{W\x80c\xe9\x85\xe9\xc5\x14a\x06PW\x80c\xf6\xb4\xdf\xb4\x14a\x06^W\x80c\xfa\xfd{B\x14a\x04\x97W`\x00\x80\xfd[\x80c\xcf$\xfdm\x14a\x064W\x80c\xd3KU\xb8\x14a\x042W\x80c\xd5\xcfC\x0b\x14a\x06BW\x80c\xd6:\x8e\x11\x14a\x05\xeeW`\x00\x80\xfd[\x80c\xa9\x05\x9c\xbb\x11a\x00\xf4W\x80c\xa9\x05\x9c\xbb\x14a\x04mW\x80c\xb8\x8dO\xde\x14a\x06\x18W\x80c\xbb/ZX\x14a\x04\x89W\x80c\xc8{V\xdd\x14a\x06&W`\x00\x80\xfd[\x80c\x98\x11\xb0\xc7\x14a\x05\xeeW\x80c\x99;\x7f\xba\x14a\x05\xfcW\x80c\xa0\x18J:\x14a\x04{W\x80c\xa2,\xb4e\x14a\x06\nW`\x00\x80\xfd[\x80cy\xccg\x90\x11a\x01\x9dW\x80c\x85\x9a\xa7\xd6\x11a\x01lW\x80c\x85\x9a\xa7\xd6\x14a\x04{W\x80c\x85\xc5\x1a\xcb\x14a\x04\x97W\x80c\x92\xe4b\xc7\x14a\x04\x97W\x80c\x95\xd8\x9bA\x14a\x042W`\x00\x80\xfd[\x80cy\xccg\x90\x14a\x04mW\x80c{}\xeb\xce\x14a\x05\xe0W\x80c}d\xbc\xb4\x14a\x04\x1cW\x80c\x84\xa1\xd5\xa8\x14a\x04{W`\x00\x80\xfd[\x80cp\xa0\x821\x11a\x01\xd9W\x80cp\xa0\x821\x14a\x05\xbfW\x80cr(\xc3\'\x14a\x05\xcdW\x80cuyJ<\x14a\x04\xb3W\x80cv#@.\x14a\x04\x97W`\x00\x80\xfd[\x80cj8A\xdb\x14a\x05\x9cW\x80cl\x0c\xd1s\x14a\x04{W\x80cn\x03&\xa3\x14a\x05\x0fW\x80cn\xc0\xa9\xf1\x14a\x05\xaaW`\x00\x80\xfd[\x80c/\x07?f\x11a\x02\xfaW\x80cB\x96lh\x11a\x02\x8dW\x80cX\x13!k\x11a\x02\\W\x80cX\x13!k\x14a\x05yW\x80ccR!\x1e\x14a\x04GW\x80cd\x87#\x96\x14a\x05\x8eW\x80cg\x84O\xe6\x14a\x04\x97W`\x00\x80\xfd[\x80cB\x96lh\x14a\x05AW\x80cD\xa9\x94^\x14a\x05OW\x80cOl\xcc\xe7\x14a\x05]W\x80cP\xbbN\x7f\x14a\x05kW`\x00\x80\xfd[\x80c>u\xa9\x05\x11a\x02\xc9W\x80c>u\xa9\x05\x14a\x05\x17W\x80c@\xc1\x0f\x19\x14a\x05%W\x80cA\x83]L\x14a\x053W\x80cB\x84.\x0e\x14a\x04\xd7W`\x00\x80\xfd[\x80c/\x07?f\x14a\x04\xe5W\x80c/t\\Y\x14a\x04\xf3W\x80c6T0\x06\x14a\x05\x01W\x80c<P\xe9z\x14a\x05\x0fW`\x00\x80\xfd[\x80c\t\xbaE*\x11a\x03rW\x80c\x17R\xd6{\x11a\x03AW\x80c\x17R\xd6{\x14a\x04\xa5W\x80c\x18\x16\r\xdd\x14a\x04\xb3W\x80c\"-\x97\xfa\x14a\x04\xc9W\x80c#\xb8r\xdd\x14a\x04\xd7W`\x00\x80\xfd[\x80c\t\xbaE*\x14a\x04{W\x80c\x0e\xcd\n\xb0\x14a\x04\x89W\x80c\x11-E\x86\x14a\x03\xdfW\x80c\x13\xaf@5\x14a\x04\x97W`\x00\x80\xfd[\x80c\x06a\x11\xd1\x11a\x03\xaeW\x80c\x06a\x11\xd1\x14a\x04$W\x80c\x06\xfd\xde\x03\x14a\x042W\x80c\x08\x18\x12\xfc\x14a\x04GW\x80c\t^\xa7\xb3\x14a\x04mW`\x00\x80\xfd[\x80b\x01\x8e\x84\x14a\x03\xdfW\x80c\x01\xff\xc9\xa7\x14a\x03\xf4W\x80c\x05\x8a\xc1\x85\x14a\x04\x1cW\x80c\x05\xd2\x03[\x14a\x04\x1cW[`\x00\x80\xfd[a\x03\xf2a\x03\xed6`\x04a\x07$V[a\x06fV[\x00[a\x04\x07a\x04\x026`\x04a\x07FV[a\x06\x8aV[`@Q\x90\x15\x15\x81R` \x01[`@Q\x80\x91\x03\x90\xf3[a\x04\x07a\x06\x8aV[a\x03\xf2a\x03\xed6`\x04a\x08MV[a\x04:a\x06\xa7V[`@Qa\x04\x13\x91\x90a\x08\xd9V[a\x04Ua\x04\x026`\x04a\x08\xecV[`@Q`\x01`\x01`\xa0\x1b\x03\x90\x91\x16\x81R` \x01a\x04\x13V[a\x03\xf2a\x03\xed6`\x04a\t\x1cV[a\x03\xf2a\x03\xed6`\x04a\t\x9cV[a\x03\xf2a\x03\xed6`\x04a\t\xb8V[a\x03\xf2a\x03\xed6`\x04a\t\xe3V[a\x03\xf2a\x03\xed6`\x04a\t\xfeV[a\x04\xbba\x06\x8aV[`@Q\x90\x81R` \x01a\x04\x13V[a\x03\xf2a\x03\xed6`\x04a\njV[a\x03\xf2a\x03\xed6`\x04a\n\xd8V[a\x03\xf2a\x03\xed6`\x04a\x0b\x14V[a\x04\xbba\x04\x026`\x04a\t\x1cV[a\x04\x07a\x04\x026`\x04a\x0b\x90V[a\x03\xf2a\x06fV[a\x04\x07a\x04\x026`\x04a\t\x9cV[a\x04\x07a\x04\x026`\x04a\t\x1cV[a\x03\xf2a\x03\xed6`\x04a\x0c\x95V[a\x03\xf2a\x03\xed6`\x04a\x08\xecV[a\x04\x07a\x04\x026`\x04a\x0c\xb8V[a\x04\xbba\x04\x026`\x04a\x08\xecV[a\x04\x07a\x04\x026`\x04a\r[V[a\x05\x81a\x06\xa7V[`@Qa\x04\x13\x91\x90a\r\xa7V[a\x03\xf2a\x03\xed6`\x04a\x0e\x07V[a\x03\xf2a\x03\xed6`\x04a\x0e\xa2V[a\x05\xb2a\x06\xf6V[`@Qa\x04\x13\x91\x90a\x0e\xfcV[a\x04\xbba\x04\x026`\x04a\t\xe3V[a\x04:a\x05\xdb6`\x04a\x08MV[a\x06\xa7V[a\x03\xf2a\x03\xed6`\x04a\x0f\x1cV[a\x04\x07a\x04\x026`\x04a\t\xe3V[a\x03\xf2a\x03\xed6`\x04a\x0fXV[a\x03\xf2a\x03\xed6`\x04a\x0f\xa5V[a\x03\xf2a\x03\xed6`\x04a\x0f\xcfV[a\x04:a\x05\xdb6`\x04a\x08\xecV[a\x04:a\x05\xdb6`\x04a\x0f\x1cV[a\x03\xf2a\x03\xed6`\x04a\x106V[a\x04Ua\x04\x026`\x04a\x10tV[a\x04Ua\x06\x8aV[`\x01`@QbF\x1b\xcd`\xe5\x1b\x81R`\x04\x01a\x06\x81\x91\x90a\x10\x9eV[`@Q\x80\x91\x03\x90\xfd[`\x00`\x01`@QbF\x1b\xcd`\xe5\x1b\x81R`\x04\x01a\x06\x81\x91\x90a\x10\x9eV[```\x01`@QbF\x1b\xcd`\xe5\x1b\x81R`\x04\x01a\x06\x81\x91\x90a\x10\x9eV[\x92\x91PPV[`@\x80Q\x80\x82\x01\x90\x91R`\x00\x80\x82R` \x82\x01R\x81R` \x01\x90`\x01\x90\x03\x90\x81a\x06\xcaW\x90PP\x90P\x90V[`@\x80Q\x80\x82\x01\x90\x91R`\x00\x80\x82R` \x82\x01Ra\x06fV[\x805\x80\x15\x15\x81\x14a\x07\x1fW`\x00\x80\xfd[\x91\x90PV[`\x00` \x82\x84\x03\x12\x15a\x076W`\x00\x80\xfd[a\x07?\x82a\x07\x0fV[\x93\x92PPPV[`\x00` \x82\x84\x03\x12\x15a\x07XW`\x00\x80\xfd[\x815`\x01`\x01`\xe0\x1b\x03\x19\x81\x16\x81\x14a\x07?W`\x00\x80\xfd[cNH{q`\xe0\x1b`\x00R`A`\x04R`$`\x00\xfd[`@\x80Q\x90\x81\x01`\x01`\x01`@\x1b\x03\x81\x11\x82\x82\x10\x17\x15a\x07\xa8Wa\x07\xa8a\x07pV[`@R\x90V[`@Q`\x1f\x82\x01`\x1f\x19\x16\x81\x01`\x01`\x01`@\x1b\x03\x81\x11\x82\x82\x10\x17\x15a\x07\xd6Wa\x07\xd6a\x07pV[`@R\x91\x90PV[`\x00\x82`\x1f\x83\x01\x12a\x07\xefW`\x00\x80\xfd[\x815`\x01`\x01`@\x1b\x03\x81\x11\x15a\x08\x08Wa\x08\x08a\x07pV[a\x08\x1b`\x1f\x82\x01`\x1f\x19\x16` \x01a\x07\xaeV[\x81\x81R\x84` \x83\x86\x01\x01\x11\x15a\x080W`\x00\x80\xfd[\x81` \x85\x01` \x83\x017`\x00\x91\x81\x01` \x01\x91\x90\x91R\x93\x92PPPV[`\x00\x80`@\x83\x85\x03\x12\x15a\x08`W`\x00\x80\xfd[\x825\x91P` \x83\x015`\x01`\x01`@\x1b\x03\x81\x11\x15a\x08}W`\x00\x80\xfd[a\x08\x89\x85\x82\x86\x01a\x07\xdeV[\x91PP\x92P\x92\x90PV[`\x00\x81Q\x80\x84R`\x00[\x81\x81\x10\x15a\x08\xb9W` \x81\x85\x01\x81\x01Q\x86\x83\x01\x82\x01R\x01a\x08\x9dV[P`\x00` \x82\x86\x01\x01R` `\x1f\x19`\x1f\x83\x01\x16\x85\x01\x01\x91PP\x92\x91PPV[` \x81R`\x00a\x07?` \x83\x01\x84a\x08\x93V[`\x00` \x82\x84\x03\x12\x15a\x08\xfeW`\x00\x80\xfd[P5\x91\x90PV[\x805`\x01`\x01`\xa0\x1b\x03\x81\x16\x81\x14a\x07\x1fW`\x00\x80\xfd[`\x00\x80`@\x83\x85\x03\x12\x15a\t/W`\x00\x80\xfd[a\t8\x83a\t\x05V[\x94` \x93\x90\x93\x015\x93PPPV[`\x00`@\x82\x84\x03\x12\x15a\tXW`\x00\x80\xfd[`@Q`@\x81\x01\x81\x81\x10`\x01`\x01`@\x1b\x03\x82\x11\x17\x15a\tzWa\tza\x07pV[`@R\x90P\x80a\t\x89\x83a\t\x05V[\x81R` \x83\x015` \x82\x01RP\x92\x91PPV[`\x00`@\x82\x84\x03\x12\x15a\t\xaeW`\x00\x80\xfd[a\x07?\x83\x83a\tFV[`\x00\x80``\x83\x85\x03\x12\x15a\t\xcbW`\x00\x80\xfd[a\t\xd5\x84\x84a\tFV[\x94`@\x93\x90\x93\x015\x93PPPV[`\x00` \x82\x84\x03\x12\x15a\t\xf5W`\x00\x80\xfd[a\x07?\x82a\t\x05V[`\x00\x80`\x00``\x84\x86\x03\x12\x15a\n\x13W`\x00\x80\xfd[\x835\x92P` \x84\x015`\x01`\x01`@\x1b\x03\x80\x82\x11\x15a\n1W`\x00\x80\xfd[a\n=\x87\x83\x88\x01a\x07\xdeV[\x93P`@\x86\x015\x91P\x80\x82\x11\x15a\nSW`\x00\x80\xfd[Pa\n`\x86\x82\x87\x01a\x07\xdeV[\x91PP\x92P\x92P\x92V[`\x00\x80`\x00\x80`\x80\x85\x87\x03\x12\x15a\n\x80W`\x00\x80\xfd[\x845`\x01`\x01`@\x1b\x03\x81\x11\x15a\n\x96W`\x00\x80\xfd[a\n\xa2\x87\x82\x88\x01a\x07\xdeV[\x94PPa\n\xb1` \x86\x01a\x07\x0fV[\x92Pa\n\xbf`@\x86\x01a\x07\x0fV[\x91Pa\n\xcd``\x86\x01a\x07\x0fV[\x90P\x92\x95\x91\x94P\x92PV[`\x00\x80`\x00``\x84\x86\x03\x12\x15a\n\xedW`\x00\x80\xfd[a\n\xf6\x84a\t\x05V[\x92Pa\x0b\x04` \x85\x01a\t\x05V[\x91P`@\x84\x015\x90P\x92P\x92P\x92V[`\x00\x80`@\x83\x85\x03\x12\x15a\x0b\'W`\x00\x80\xfd[\x825`\x01`\x01`@\x1b\x03\x80\x82\x11\x15a\x0b>W`\x00\x80\xfd[a\x0bJ\x86\x83\x87\x01a\x07\xdeV[\x93P` \x85\x015\x91P\x80\x82\x11\x15a\x0b`W`\x00\x80\xfd[Pa\x08\x89\x85\x82\x86\x01a\x07\xdeV[`\x00`\x01`\x01`@\x1b\x03\x82\x11\x15a\x0b\x86Wa\x0b\x86a\x07pV[P`\x05\x1b` \x01\x90V[`\x00\x80`@\x80\x84\x86\x03\x12\x15a\x0b\xa4W`\x00\x80\xfd[a\x0b\xad\x84a\t\x05V[\x92P` \x80\x85\x015`\x01`\x01`@\x1b\x03\x80\x82\x11\x15a\x0b\xcaW`\x00\x80\xfd[\x81\x87\x01\x91P\x87`\x1f\x83\x01\x12a\x0b\xdeW`\x00\x80\xfd[\x815a\x0b\xf1a\x0b\xec\x82a\x0bmV[a\x07\xaeV[\x81\x81R`\x05\x91\x90\x91\x1b\x83\x01\x84\x01\x90\x84\x81\x01\x90\x8a\x83\x11\x15a\x0c\x10W`\x00\x80\xfd[\x85\x85\x01[\x83\x81\x10\x15a\x0c\x83W\x805\x85\x81\x11\x15a\x0c,W`\x00\x80\x81\xfd[\x86\x01\x80\x8d\x03`\x1f\x19\x01\x89\x13\x15a\x0cBW`\x00\x80\x81\xfd[a\x0cJa\x07\x86V[\x88\x82\x015\x81R\x89\x82\x015\x87\x81\x11\x15a\x0cbW`\x00\x80\x81\xfd[a\x0cp\x8f\x8b\x83\x86\x01\x01a\x07\xdeV[\x82\x8b\x01RP\x84RP\x91\x86\x01\x91\x86\x01a\x0c\x14V[P\x80\x97PPPPPPPP\x92P\x92\x90PV[`\x00` \x82\x84\x03\x12\x15a\x0c\xa7W`\x00\x80\xfd[\x815`\xff\x81\x16\x81\x14a\x07?W`\x00\x80\xfd[`\x00\x80`@\x83\x85\x03\x12\x15a\x0c\xcbW`\x00\x80\xfd[a\x0c\xd4\x83a\t\x05V[\x91P` \x80\x84\x015`\x01`\x01`@\x1b\x03\x81\x11\x15a\x0c\xf0W`\x00\x80\xfd[\x84\x01`\x1f\x81\x01\x86\x13a\r\x01W`\x00\x80\xfd[\x805a\r\x0fa\x0b\xec\x82a\x0bmV[\x81\x81R`\x05\x91\x90\x91\x1b\x82\x01\x83\x01\x90\x83\x81\x01\x90\x88\x83\x11\x15a\r.W`\x00\x80\xfd[\x92\x84\x01\x92[\x82\x84\x10\x15a\rLW\x835\x82R\x92\x84\x01\x92\x90\x84\x01\x90a\r3V[\x80\x95PPPPPP\x92P\x92\x90PV[`\x00\x80`\x00``\x84\x86\x03\x12\x15a\rpW`\x00\x80\xfd[a\ry\x84a\t\x05V[\x92P` \x84\x015\x91P`@\x84\x015`\x01`\x01`@\x1b\x03\x81\x11\x15a\r\x9bW`\x00\x80\xfd[a\n`\x86\x82\x87\x01a\x07\xdeV[` \x80\x82R\x82Q\x82\x82\x01\x81\x90R`\x00\x91\x90`@\x90\x81\x85\x01\x90\x86\x84\x01\x85[\x82\x81\x10\x15a\r\xfaWa\r\xea\x84\x83Q\x80Q`\x01`\x01`\xa0\x1b\x03\x16\x82R` \x90\x81\x01Q\x91\x01RV[\x92\x84\x01\x92\x90\x85\x01\x90`\x01\x01a\r\xc4V[P\x91\x97\x96PPPPPPPV[`\x00\x80`@\x83\x85\x03\x12\x15a\x0e\x1aW`\x00\x80\xfd[a\x0e#\x83a\x07\x0fV[\x91P` \x80\x84\x015`\x01`\x01`@\x1b\x03\x81\x11\x15a\x0e?W`\x00\x80\xfd[\x84\x01`\x1f\x81\x01\x86\x13a\x0ePW`\x00\x80\xfd[\x805a\x0e^a\x0b\xec\x82a\x0bmV[\x81\x81R`\x05\x91\x90\x91\x1b\x82\x01\x83\x01\x90\x83\x81\x01\x90\x88\x83\x11\x15a\x0e}W`\x00\x80\xfd[\x92\x84\x01\x92[\x82\x84\x10\x15a\rLWa\x0e\x93\x84a\t\x05V[\x82R\x92\x84\x01\x92\x90\x84\x01\x90a\x0e\x82V[`\x00\x80`@\x83\x85\x03\x12\x15a\x0e\xb5W`\x00\x80\xfd[\x825`\x01`\x01`@\x1b\x03\x81\x11\x15a\x0e\xcbW`\x00\x80\xfd[a\x0e\xd7\x85\x82\x86\x01a\x07\xdeV[\x92PP` \x83\x015c\xff\xff\xff\xff\x81\x16\x81\x14a\x0e\xf1W`\x00\x80\xfd[\x80\x91PP\x92P\x92\x90PV[\x81Q`\x01`\x01`\xa0\x1b\x03\x16\x81R` \x80\x83\x01Q\x90\x82\x01R`@\x81\x01a\x06\xc4V[`\x00` \x82\x84\x03\x12\x15a\x0f.W`\x00\x80\xfd[\x815`\x01`\x01`@\x1b\x03\x81\x11\x15a\x0fDW`\x00\x80\xfd[a\x0fP\x84\x82\x85\x01a\x07\xdeV[\x94\x93PPPPV[`\x00\x80`@\x83\x85\x03\x12\x15a\x0fkW`\x00\x80\xfd[\x825`\x01`\x01`@\x1b\x03\x81\x11\x15a\x0f\x81W`\x00\x80\xfd[a\x0f\x8d\x85\x82\x86\x01a\x07\xdeV[\x92PPa\x0f\x9c` \x84\x01a\x07\x0fV[\x90P\x92P\x92\x90PV[`\x00\x80`@\x83\x85\x03\x12\x15a\x0f\xb8W`\x00\x80\xfd[a\x0f\xc1\x83a\t\x05V[\x91Pa\x0f\x9c` \x84\x01a\x07\x0fV[`\x00\x80`\x00\x80`\x80\x85\x87\x03\x12\x15a\x0f\xe5W`\x00\x80\xfd[a\x0f\xee\x85a\t\x05V[\x93Pa\x0f\xfc` \x86\x01a\t\x05V[\x92P`@\x85\x015\x91P``\x85\x015`\x01`\x01`@\x1b\x03\x81\x11\x15a\x10\x1eW`\x00\x80\xfd[a\x10*\x87\x82\x88\x01a\x07\xdeV[\x91PP\x92\x95\x91\x94P\x92PV[`\x00\x80`\x00`\xa0\x84\x86\x03\x12\x15a\x10KW`\x00\x80\xfd[a\x10U\x85\x85a\tFV[\x92Pa\x10d\x85`@\x86\x01a\tFV[\x91P`\x80\x84\x015\x90P\x92P\x92P\x92V[`\x00\x80`@\x83\x85\x03\x12\x15a\x10\x87W`\x00\x80\xfd[a\x10\x90\x83a\t\x05V[\x91Pa\x0f\x9c` \x84\x01a\t\x05V[`\x00` \x80\x83R`\x00\x84T\x81`\x01\x82\x81\x1c\x91P\x80\x83\x16\x80a\x10\xc0W`\x7f\x83\x16\x92P[\x85\x83\x10\x81\x03a\x10\xddWcNH{q`\xe0\x1b\x85R`\"`\x04R`$\x85\xfd[\x87\x86\x01\x83\x81R` \x01\x81\x80\x15a\x10\xfaW`\x01\x81\x14a\x11\x10Wa\x11;V[`\xff\x19\x86\x16\x82R\x84\x15\x15`\x05\x1b\x82\x01\x96Pa\x11;V[`\x00\x8b\x81R` \x90 `\x00[\x86\x81\x10\x15a\x115W\x81T\x84\x82\x01R\x90\x85\x01\x90\x89\x01a\x11\x1cV[\x83\x01\x97PP[P\x94\x99\x98PPPPPPPPPV\xfe\xa2dipfsX\"\x12 eT\x15\xcb|u\xb1F\x80}\xaa]\xc0#\xe0\xdeO$^\x96a\xfb1\xc5\xb0\xfa\t\x12\x00>F\xa8dsolcC\x00\x08\x10\x003this contract is implemented in native";
        fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
            call::<T, UniqueNFTCall<T>, _, _>(handle, self)
        }
    }
}
pub mod weights {
    //! Autogenerated weights for pallet_nonfungible
    //!
    //! THIS FILE WAS AUTO-GENERATED USING THE SUBSTRATE BENCHMARK CLI VERSION 4.0.0-dev
    //! DATE: 2022-08-15, STEPS: `50`, REPEAT: 80, LOW RANGE: `[]`, HIGH RANGE: `[]`
    //! EXECUTION: None, WASM-EXECUTION: Compiled, CHAIN: None, DB CACHE: 1024
    #![allow(unused_parens)]
    #![allow(unused_imports)]
    #![allow(clippy::unnecessary_cast)]
    use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
    use sp_std::marker::PhantomData;
    /// Weight functions needed for pallet_nonfungible.
    pub trait WeightInfo {
        fn create_item() -> Weight;
        fn create_multiple_items(b: u32) -> Weight;
        fn create_multiple_items_ex(b: u32) -> Weight;
        fn burn_item() -> Weight;
        fn burn_recursively_self_raw() -> Weight;
        fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32) -> Weight;
        fn transfer() -> Weight;
        fn approve() -> Weight;
        fn transfer_from() -> Weight;
        fn burn_from() -> Weight;
        fn set_token_property_permissions(b: u32) -> Weight;
        fn set_token_properties(b: u32) -> Weight;
        fn delete_token_properties(b: u32) -> Weight;
        fn token_owner() -> Weight;
    }
    /// Weights for pallet_nonfungible using the Substrate node and recommended hardware.
    pub struct SubstrateWeight<T>(PhantomData<T>);
    impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
        fn create_item() -> Weight {
            Weight::from_ref_time(25_905_000)
                .saturating_add(T::DbWeight::get().reads(2 as u64))
                .saturating_add(T::DbWeight::get().writes(4 as u64))
        }
        fn create_multiple_items(b: u32) -> Weight {
            Weight::from_ref_time(24_955_000)
                .saturating_add(
                    Weight::from_ref_time(5_340_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(2 as u64))
                .saturating_add(T::DbWeight::get().writes(2 as u64))
                .saturating_add(
                    T::DbWeight::get().writes((2 as u64).saturating_mul(b as u64)),
                )
        }
        fn create_multiple_items_ex(b: u32) -> Weight {
            Weight::from_ref_time(13_666_000)
                .saturating_add(
                    Weight::from_ref_time(8_299_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(1 as u64))
                .saturating_add(
                    T::DbWeight::get().reads((1 as u64).saturating_mul(b as u64)),
                )
                .saturating_add(T::DbWeight::get().writes(1 as u64))
                .saturating_add(
                    T::DbWeight::get().writes((3 as u64).saturating_mul(b as u64)),
                )
        }
        fn burn_item() -> Weight {
            Weight::from_ref_time(36_205_000)
                .saturating_add(T::DbWeight::get().reads(5 as u64))
                .saturating_add(T::DbWeight::get().writes(5 as u64))
        }
        fn burn_recursively_self_raw() -> Weight {
            Weight::from_ref_time(44_550_000)
                .saturating_add(T::DbWeight::get().reads(5 as u64))
                .saturating_add(T::DbWeight::get().writes(5 as u64))
        }
        fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(312_125_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(7 as u64))
                .saturating_add(
                    T::DbWeight::get().reads((4 as u64).saturating_mul(b as u64)),
                )
                .saturating_add(T::DbWeight::get().writes(6 as u64))
                .saturating_add(
                    T::DbWeight::get().writes((4 as u64).saturating_mul(b as u64)),
                )
        }
        fn transfer() -> Weight {
            Weight::from_ref_time(31_116_000)
                .saturating_add(T::DbWeight::get().reads(4 as u64))
                .saturating_add(T::DbWeight::get().writes(5 as u64))
        }
        fn approve() -> Weight {
            Weight::from_ref_time(20_802_000)
                .saturating_add(T::DbWeight::get().reads(2 as u64))
                .saturating_add(T::DbWeight::get().writes(1 as u64))
        }
        fn transfer_from() -> Weight {
            Weight::from_ref_time(36_083_000)
                .saturating_add(T::DbWeight::get().reads(4 as u64))
                .saturating_add(T::DbWeight::get().writes(6 as u64))
        }
        fn burn_from() -> Weight {
            Weight::from_ref_time(41_781_000)
                .saturating_add(T::DbWeight::get().reads(5 as u64))
                .saturating_add(T::DbWeight::get().writes(6 as u64))
        }
        fn set_token_property_permissions(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(15_705_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(1 as u64))
                .saturating_add(T::DbWeight::get().writes(1 as u64))
        }
        fn set_token_properties(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(590_344_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(2 as u64))
                .saturating_add(T::DbWeight::get().writes(1 as u64))
        }
        fn delete_token_properties(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(605_836_000).saturating_mul(b as u64),
                )
                .saturating_add(T::DbWeight::get().reads(2 as u64))
                .saturating_add(T::DbWeight::get().writes(1 as u64))
        }
        fn token_owner() -> Weight {
            Weight::from_ref_time(4_366_000)
                .saturating_add(T::DbWeight::get().reads(1 as u64))
        }
    }
    impl WeightInfo for () {
        fn create_item() -> Weight {
            Weight::from_ref_time(25_905_000)
                .saturating_add(RocksDbWeight::get().reads(2 as u64))
                .saturating_add(RocksDbWeight::get().writes(4 as u64))
        }
        fn create_multiple_items(b: u32) -> Weight {
            Weight::from_ref_time(24_955_000)
                .saturating_add(
                    Weight::from_ref_time(5_340_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(2 as u64))
                .saturating_add(RocksDbWeight::get().writes(2 as u64))
                .saturating_add(
                    RocksDbWeight::get().writes((2 as u64).saturating_mul(b as u64)),
                )
        }
        fn create_multiple_items_ex(b: u32) -> Weight {
            Weight::from_ref_time(13_666_000)
                .saturating_add(
                    Weight::from_ref_time(8_299_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(1 as u64))
                .saturating_add(
                    RocksDbWeight::get().reads((1 as u64).saturating_mul(b as u64)),
                )
                .saturating_add(RocksDbWeight::get().writes(1 as u64))
                .saturating_add(
                    RocksDbWeight::get().writes((3 as u64).saturating_mul(b as u64)),
                )
        }
        fn burn_item() -> Weight {
            Weight::from_ref_time(36_205_000)
                .saturating_add(RocksDbWeight::get().reads(5 as u64))
                .saturating_add(RocksDbWeight::get().writes(5 as u64))
        }
        fn burn_recursively_self_raw() -> Weight {
            Weight::from_ref_time(44_550_000)
                .saturating_add(RocksDbWeight::get().reads(5 as u64))
                .saturating_add(RocksDbWeight::get().writes(5 as u64))
        }
        fn burn_recursively_breadth_plus_self_plus_self_per_each_raw(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(312_125_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(7 as u64))
                .saturating_add(
                    RocksDbWeight::get().reads((4 as u64).saturating_mul(b as u64)),
                )
                .saturating_add(RocksDbWeight::get().writes(6 as u64))
                .saturating_add(
                    RocksDbWeight::get().writes((4 as u64).saturating_mul(b as u64)),
                )
        }
        fn transfer() -> Weight {
            Weight::from_ref_time(31_116_000)
                .saturating_add(RocksDbWeight::get().reads(4 as u64))
                .saturating_add(RocksDbWeight::get().writes(5 as u64))
        }
        fn approve() -> Weight {
            Weight::from_ref_time(20_802_000)
                .saturating_add(RocksDbWeight::get().reads(2 as u64))
                .saturating_add(RocksDbWeight::get().writes(1 as u64))
        }
        fn transfer_from() -> Weight {
            Weight::from_ref_time(36_083_000)
                .saturating_add(RocksDbWeight::get().reads(4 as u64))
                .saturating_add(RocksDbWeight::get().writes(6 as u64))
        }
        fn burn_from() -> Weight {
            Weight::from_ref_time(41_781_000)
                .saturating_add(RocksDbWeight::get().reads(5 as u64))
                .saturating_add(RocksDbWeight::get().writes(6 as u64))
        }
        fn set_token_property_permissions(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(15_705_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(1 as u64))
                .saturating_add(RocksDbWeight::get().writes(1 as u64))
        }
        fn set_token_properties(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(590_344_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(2 as u64))
                .saturating_add(RocksDbWeight::get().writes(1 as u64))
        }
        fn delete_token_properties(b: u32) -> Weight {
            (Weight::from_ref_time(0))
                .saturating_add(
                    Weight::from_ref_time(605_836_000).saturating_mul(b as u64),
                )
                .saturating_add(RocksDbWeight::get().reads(2 as u64))
                .saturating_add(RocksDbWeight::get().writes(1 as u64))
        }
        fn token_owner() -> Weight {
            Weight::from_ref_time(4_366_000)
                .saturating_add(RocksDbWeight::get().reads(1 as u64))
        }
    }
}
pub type CreateItemData<T> = CreateNftExData<
    <T as pallet_evm::account::Config>::CrossAccountId,
>;
pub(crate) type SelfWeightOf<T> = <T as Config>::WeightInfo;
/// Token data, stored independently from other data used to describe it
/// for the convenience of database access. Notably contains the owner account address.
pub struct ItemDataVersion1<CrossAccountId> {
    pub const_data: BoundedVec<u8, CustomDataLimit>,
    pub variable_data: BoundedVec<u8, CustomDataLimit>,
    pub owner: CrossAccountId,
}
#[allow(deprecated)]
const _: () = {
    #[automatically_derived]
    impl<CrossAccountId> ::codec::Encode for ItemDataVersion1<CrossAccountId>
    where
        CrossAccountId: ::codec::Encode,
        CrossAccountId: ::codec::Encode,
    {
        fn encode_to<__CodecOutputEdqy: ::codec::Output + ?::core::marker::Sized>(
            &self,
            __codec_dest_edqy: &mut __CodecOutputEdqy,
        ) {
            ::codec::Encode::encode_to(&self.const_data, __codec_dest_edqy);
            ::codec::Encode::encode_to(&self.variable_data, __codec_dest_edqy);
            ::codec::Encode::encode_to(&self.owner, __codec_dest_edqy);
        }
    }
    #[automatically_derived]
    impl<CrossAccountId> ::codec::EncodeLike for ItemDataVersion1<CrossAccountId>
    where
        CrossAccountId: ::codec::Encode,
        CrossAccountId: ::codec::Encode,
    {}
};
#[allow(deprecated)]
const _: () = {
    #[automatically_derived]
    impl<CrossAccountId> ::codec::Decode for ItemDataVersion1<CrossAccountId>
    where
        CrossAccountId: ::codec::Decode,
        CrossAccountId: ::codec::Decode,
    {
        fn decode<__CodecInputEdqy: ::codec::Input>(
            __codec_input_edqy: &mut __CodecInputEdqy,
        ) -> ::core::result::Result<Self, ::codec::Error> {
            ::core::result::Result::Ok(ItemDataVersion1::<CrossAccountId> {
                const_data: {
                    let __codec_res_edqy = <BoundedVec<
                        u8,
                        CustomDataLimit,
                    > as ::codec::Decode>::decode(__codec_input_edqy);
                    match __codec_res_edqy {
                        ::core::result::Result::Err(e) => {
                            return ::core::result::Result::Err(
                                e.chain("Could not decode `ItemDataVersion1::const_data`"),
                            );
                        }
                        ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                    }
                },
                variable_data: {
                    let __codec_res_edqy = <BoundedVec<
                        u8,
                        CustomDataLimit,
                    > as ::codec::Decode>::decode(__codec_input_edqy);
                    match __codec_res_edqy {
                        ::core::result::Result::Err(e) => {
                            return ::core::result::Result::Err(
                                e
                                    .chain("Could not decode `ItemDataVersion1::variable_data`"),
                            );
                        }
                        ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                    }
                },
                owner: {
                    let __codec_res_edqy = <CrossAccountId as ::codec::Decode>::decode(
                        __codec_input_edqy,
                    );
                    match __codec_res_edqy {
                        ::core::result::Result::Err(e) => {
                            return ::core::result::Result::Err(
                                e.chain("Could not decode `ItemDataVersion1::owner`"),
                            );
                        }
                        ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                    }
                },
            })
        }
    }
};
#[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
const _: () = {
    impl<CrossAccountId> ::scale_info::TypeInfo for ItemDataVersion1<CrossAccountId>
    where
        CrossAccountId: ::scale_info::TypeInfo + 'static,
        CrossAccountId: ::scale_info::TypeInfo + 'static,
    {
        type Identity = Self;
        fn type_info() -> ::scale_info::Type {
            ::scale_info::Type::builder()
                .path(::scale_info::Path::new("ItemDataVersion1", "pallet_nonfungible"))
                .type_params(
                    <[_]>::into_vec(
                        #[rustc_box]
                        ::alloc::boxed::Box::new([
                            ::scale_info::TypeParameter::new(
                                "CrossAccountId",
                                ::core::option::Option::Some(
                                    ::scale_info::meta_type::<CrossAccountId>(),
                                ),
                            ),
                        ]),
                    ),
                )
                .docs(
                    &[
                        "Token data, stored independently from other data used to describe it",
                        "for the convenience of database access. Notably contains the owner account address.",
                    ],
                )
                .composite(
                    ::scale_info::build::Fields::named()
                        .field(|f| {
                            f
                                .ty::<BoundedVec<u8, CustomDataLimit>>()
                                .name("const_data")
                                .type_name("BoundedVec<u8, CustomDataLimit>")
                                .docs(&[])
                        })
                        .field(|f| {
                            f
                                .ty::<BoundedVec<u8, CustomDataLimit>>()
                                .name("variable_data")
                                .type_name("BoundedVec<u8, CustomDataLimit>")
                                .docs(&[])
                        })
                        .field(|f| {
                            f
                                .ty::<CrossAccountId>()
                                .name("owner")
                                .type_name("CrossAccountId")
                                .docs(&[])
                        }),
                )
        }
    }
};
const _: () = {
    impl<CrossAccountId> ::codec::MaxEncodedLen for ItemDataVersion1<CrossAccountId>
    where
        CrossAccountId: ::codec::MaxEncodedLen,
        CrossAccountId: ::codec::MaxEncodedLen,
    {
        fn max_encoded_len() -> ::core::primitive::usize {
            0_usize
                .saturating_add(<BoundedVec<u8, CustomDataLimit>>::max_encoded_len())
                .saturating_add(<BoundedVec<u8, CustomDataLimit>>::max_encoded_len())
                .saturating_add(<CrossAccountId>::max_encoded_len())
        }
    }
};
/// Token data, stored independently from other data used to describe it
/// for the convenience of database access. Notably contains the owner account address.
/// # Versioning
/// Changes between 1 and 2:
/// - const_data: BoundedVec < u8, CustomDataLimit > was removed
/// - variable_data: BoundedVec < u8, CustomDataLimit > was removed
pub struct ItemData<CrossAccountId> {
    pub owner: CrossAccountId,
}
#[allow(deprecated)]
const _: () = {
    #[automatically_derived]
    impl<CrossAccountId> ::codec::Encode for ItemData<CrossAccountId>
    where
        CrossAccountId: ::codec::Encode,
        CrossAccountId: ::codec::Encode,
    {
        fn encode_to<__CodecOutputEdqy: ::codec::Output + ?::core::marker::Sized>(
            &self,
            __codec_dest_edqy: &mut __CodecOutputEdqy,
        ) {
            ::codec::Encode::encode_to(&&self.owner, __codec_dest_edqy)
        }
        fn encode(&self) -> ::codec::alloc::vec::Vec<::core::primitive::u8> {
            ::codec::Encode::encode(&&self.owner)
        }
        fn using_encoded<R, F: ::core::ops::FnOnce(&[::core::primitive::u8]) -> R>(
            &self,
            f: F,
        ) -> R {
            ::codec::Encode::using_encoded(&&self.owner, f)
        }
    }
    #[automatically_derived]
    impl<CrossAccountId> ::codec::EncodeLike for ItemData<CrossAccountId>
    where
        CrossAccountId: ::codec::Encode,
        CrossAccountId: ::codec::Encode,
    {}
};
#[allow(deprecated)]
const _: () = {
    #[automatically_derived]
    impl<CrossAccountId> ::codec::Decode for ItemData<CrossAccountId>
    where
        CrossAccountId: ::codec::Decode,
        CrossAccountId: ::codec::Decode,
    {
        fn decode<__CodecInputEdqy: ::codec::Input>(
            __codec_input_edqy: &mut __CodecInputEdqy,
        ) -> ::core::result::Result<Self, ::codec::Error> {
            ::core::result::Result::Ok(ItemData::<CrossAccountId> {
                owner: {
                    let __codec_res_edqy = <CrossAccountId as ::codec::Decode>::decode(
                        __codec_input_edqy,
                    );
                    match __codec_res_edqy {
                        ::core::result::Result::Err(e) => {
                            return ::core::result::Result::Err(
                                e.chain("Could not decode `ItemData::owner`"),
                            );
                        }
                        ::core::result::Result::Ok(__codec_res_edqy) => __codec_res_edqy,
                    }
                },
            })
        }
    }
};
#[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
const _: () = {
    impl<CrossAccountId> ::scale_info::TypeInfo for ItemData<CrossAccountId>
    where
        CrossAccountId: ::scale_info::TypeInfo + 'static,
        CrossAccountId: ::scale_info::TypeInfo + 'static,
    {
        type Identity = Self;
        fn type_info() -> ::scale_info::Type {
            ::scale_info::Type::builder()
                .path(::scale_info::Path::new("ItemData", "pallet_nonfungible"))
                .type_params(
                    <[_]>::into_vec(
                        #[rustc_box]
                        ::alloc::boxed::Box::new([
                            ::scale_info::TypeParameter::new(
                                "CrossAccountId",
                                ::core::option::Option::Some(
                                    ::scale_info::meta_type::<CrossAccountId>(),
                                ),
                            ),
                        ]),
                    ),
                )
                .docs(
                    &[
                        "Token data, stored independently from other data used to describe it",
                        "for the convenience of database access. Notably contains the owner account address.",
                        "# Versioning",
                        "Changes between 1 and 2:",
                        "- const_data: BoundedVec < u8, CustomDataLimit > was removed",
                        "- variable_data: BoundedVec < u8, CustomDataLimit > was removed",
                    ],
                )
                .composite(
                    ::scale_info::build::Fields::named()
                        .field(|f| {
                            f
                                .ty::<CrossAccountId>()
                                .name("owner")
                                .type_name("CrossAccountId")
                                .docs(&[])
                        }),
                )
        }
    }
};
const _: () = {
    impl<CrossAccountId> ::codec::MaxEncodedLen for ItemData<CrossAccountId>
    where
        CrossAccountId: ::codec::MaxEncodedLen,
        CrossAccountId: ::codec::MaxEncodedLen,
    {
        fn max_encoded_len() -> ::core::primitive::usize {
            0_usize.saturating_add(<CrossAccountId>::max_encoded_len())
        }
    }
};
impl<CrossAccountId> From<ItemDataVersion1<CrossAccountId>>
for ItemData<CrossAccountId> {
    fn from(old: ItemDataVersion1<CrossAccountId>) -> Self {
        let ItemDataVersion1 { const_data, variable_data, owner } = old;
        let _ = &const_data;
        let _ = &variable_data;
        Self { owner }
    }
}
pub type ItemDataVersion2<CrossAccountId> = ItemData<CrossAccountId>;
/**
			The module that hosts all the
			[FRAME](https://docs.substrate.io/main-docs/build/events-errors/)
			types needed to add this pallet to a
			runtime.
			*/
pub mod pallet {
    use super::*;
    use frame_support::{
        Blake2_128Concat, Twox64Concat, pallet_prelude::*, storage::Key,
        traits::StorageVersion,
    };
    use frame_system::pallet_prelude::*;
    use up_data_structs::{CollectionId, TokenId};
    use super::weights::WeightInfo;
    #[scale_info(skip_type_params(T), capture_docs = "always")]
    /**
			Custom [dispatch errors](https://docs.substrate.io/main-docs/build/events-errors/)
			of this pallet.
			*/
    pub enum Error<T> {
        #[doc(hidden)]
        #[codec(skip)]
        __Ignore(frame_support::sp_std::marker::PhantomData<(T)>, frame_support::Never),
        /// Not Nonfungible item data used to mint in Nonfungible collection.
        NotNonfungibleDataUsedToMintFungibleCollectionToken,
        /// Used amount > 1 with NFT
        NonfungibleItemsHaveNoAmount,
        /// Unable to burn NFT with children
        CantBurnNftWithChildren,
    }
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl<T> ::codec::Encode for Error<T> {
            fn encode_to<__CodecOutputEdqy: ::codec::Output + ?::core::marker::Sized>(
                &self,
                __codec_dest_edqy: &mut __CodecOutputEdqy,
            ) {
                match *self {
                    Error::NotNonfungibleDataUsedToMintFungibleCollectionToken => {
                        __codec_dest_edqy.push_byte(0usize as ::core::primitive::u8);
                    }
                    Error::NonfungibleItemsHaveNoAmount => {
                        __codec_dest_edqy.push_byte(1usize as ::core::primitive::u8);
                    }
                    Error::CantBurnNftWithChildren => {
                        __codec_dest_edqy.push_byte(2usize as ::core::primitive::u8);
                    }
                    _ => {}
                }
            }
        }
        #[automatically_derived]
        impl<T> ::codec::EncodeLike for Error<T> {}
    };
    #[allow(deprecated)]
    const _: () = {
        #[automatically_derived]
        impl<T> ::codec::Decode for Error<T> {
            fn decode<__CodecInputEdqy: ::codec::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::codec::Error> {
                match __codec_input_edqy
                    .read_byte()
                    .map_err(|e| {
                        e.chain("Could not decode `Error`, failed to read variant byte")
                    })?
                {
                    __codec_x_edqy if __codec_x_edqy
                        == 0usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(
                            Error::<
                                T,
                            >::NotNonfungibleDataUsedToMintFungibleCollectionToken,
                        )
                    }
                    __codec_x_edqy if __codec_x_edqy
                        == 1usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(
                            Error::<T>::NonfungibleItemsHaveNoAmount,
                        )
                    }
                    __codec_x_edqy if __codec_x_edqy
                        == 2usize as ::core::primitive::u8 => {
                        ::core::result::Result::Ok(Error::<T>::CantBurnNftWithChildren)
                    }
                    _ => {
                        ::core::result::Result::Err(
                            <_ as ::core::convert::Into<
                                _,
                            >>::into("Could not decode `Error`, variant doesn't exist"),
                        )
                    }
                }
            }
        }
    };
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl<T> ::scale_info::TypeInfo for Error<T>
        where
            frame_support::sp_std::marker::PhantomData<
                (T),
            >: ::scale_info::TypeInfo + 'static,
            T: 'static,
        {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("Error", "pallet_nonfungible::pallet"))
                    .type_params(
                        <[_]>::into_vec(
                            #[rustc_box]
                            ::alloc::boxed::Box::new([
                                ::scale_info::TypeParameter::new(
                                    "T",
                                    ::core::option::Option::None,
                                ),
                            ]),
                        ),
                    )
                    .docs_always(
                        &[
                            "\n\t\t\tCustom [dispatch errors](https://docs.substrate.io/main-docs/build/events-errors/)\n\t\t\tof this pallet.\n\t\t\t",
                        ],
                    )
                    .variant(
                        ::scale_info::build::Variants::new()
                            .variant(
                                "NotNonfungibleDataUsedToMintFungibleCollectionToken",
                                |v| {
                                    v
                                        .index(0usize as ::core::primitive::u8)
                                        .docs_always(
                                            &[
                                                "Not Nonfungible item data used to mint in Nonfungible collection.",
                                            ],
                                        )
                                },
                            )
                            .variant(
                                "NonfungibleItemsHaveNoAmount",
                                |v| {
                                    v
                                        .index(1usize as ::core::primitive::u8)
                                        .docs_always(&["Used amount > 1 with NFT"])
                                },
                            )
                            .variant(
                                "CantBurnNftWithChildren",
                                |v| {
                                    v
                                        .index(2usize as ::core::primitive::u8)
                                        .docs_always(&["Unable to burn NFT with children"])
                                },
                            ),
                    )
            }
        }
    };
    const _: () = {
        impl<T> frame_support::traits::PalletError for Error<T> {
            const MAX_ENCODED_SIZE: usize = 1;
        }
    };
    /**
			Configuration trait of this pallet.

			Implement this type for a runtime in order to customize this pallet.
			*/
    pub trait Config: frame_system::Config + pallet_common::Config + pallet_structure::Config + pallet_evm::Config {
        type WeightInfo: WeightInfo;
    }
    const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);
    /**
			The [pallet](https://docs.substrate.io/reference/frame-pallets/#pallets) implementing
			the on-chain logic.
			*/
    pub struct Pallet<T>(frame_support::sp_std::marker::PhantomData<(T)>);
    const _: () = {
        impl<T> core::clone::Clone for Pallet<T> {
            fn clone(&self) -> Self {
                Self(core::clone::Clone::clone(&self.0))
            }
        }
    };
    const _: () = {
        impl<T> core::cmp::Eq for Pallet<T> {}
    };
    const _: () = {
        impl<T> core::cmp::PartialEq for Pallet<T> {
            fn eq(&self, other: &Self) -> bool {
                true && self.0 == other.0
            }
        }
    };
    const _: () = {
        impl<T> core::fmt::Debug for Pallet<T> {
            fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::fmt::Result {
                fmt.debug_tuple("Pallet").field(&self.0).finish()
            }
        }
    };
    /// Total amount of minted tokens in a collection.
    #[allow(type_alias_bounds)]
    pub type TokensMinted<T: Config> = StorageMap<
        _GeneratedPrefixForStorageTokensMinted<T>,
        Twox64Concat,
        CollectionId,
        u32,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Amount of burnt tokens in a collection.
    #[allow(type_alias_bounds)]
    pub type TokensBurnt<T: Config> = StorageMap<
        _GeneratedPrefixForStorageTokensBurnt<T>,
        Twox64Concat,
        CollectionId,
        u32,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Token data, used to partially describe a token.
    #[allow(type_alias_bounds)]
    pub type TokenData<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageTokenData<T>,
        (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
        ItemData<T::CrossAccountId>,
        OptionQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Map of key-value pairs, describing the metadata of a token.
    #[allow(type_alias_bounds)]
    pub type TokenProperties<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageTokenProperties<T>,
        (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
        Properties,
        ValueQuery,
        up_data_structs::TokenProperties,
        frame_support::traits::GetDefault,
    >;
    /// Custom data of a token that is serialized to bytes,
    /// primarily reserved for on-chain operations,
    /// normally obscured from the external users.
    ///
    /// Auxiliary properties are slightly different from
    /// usual [`TokenProperties`] due to an unlimited number
    /// and separately stored and written-to key-value pairs.
    ///
    /// Currently used to store RMRK data.
    #[allow(type_alias_bounds)]
    pub type TokenAuxProperties<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageTokenAuxProperties<T>,
        (
            Key<Twox64Concat, CollectionId>,
            Key<Twox64Concat, TokenId>,
            Key<Twox64Concat, PropertyScope>,
            Key<Twox64Concat, PropertyKey>,
        ),
        AuxPropertyValue,
        OptionQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Used to enumerate tokens owned by account.
    #[allow(type_alias_bounds)]
    pub type Owned<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageOwned<T>,
        (
            Key<Twox64Concat, CollectionId>,
            Key<Blake2_128Concat, T::CrossAccountId>,
            Key<Twox64Concat, TokenId>,
        ),
        bool,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Used to enumerate token's children.
    #[allow(type_alias_bounds)]
    pub type TokenChildren<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageTokenChildren<T>,
        (
            Key<Twox64Concat, CollectionId>,
            Key<Twox64Concat, TokenId>,
            Key<Twox64Concat, (CollectionId, TokenId)>,
        ),
        bool,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Amount of tokens owned by an account in a collection.
    #[allow(type_alias_bounds)]
    pub type AccountBalance<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageAccountBalance<T>,
        (Key<Twox64Concat, CollectionId>, Key<Blake2_128Concat, T::CrossAccountId>),
        u32,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Allowance set by a token owner for another user to perform one of certain transactions on a token.
    #[allow(type_alias_bounds)]
    pub type Allowance<T: Config> = StorageNMap<
        _GeneratedPrefixForStorageAllowance<T>,
        (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
        T::CrossAccountId,
        OptionQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    /// Upgrade from the old schema to properties.
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_runtime_upgrade() -> Weight {
            StorageVersion::new(1).put::<Pallet<T>>();
            Weight::zero()
        }
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn pallet_constants_metadata() -> frame_support::sp_std::vec::Vec<
            frame_support::metadata::PalletConstantMetadata,
        > {
            ::alloc::vec::Vec::new()
        }
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn error_metadata() -> Option<frame_support::metadata::PalletErrorMetadata> {
            Some(frame_support::metadata::PalletErrorMetadata {
                ty: frame_support::scale_info::meta_type::<Error<T>>(),
            })
        }
    }
    /// Type alias to `Pallet`, to be used by `construct_runtime`.
    ///
    /// Generated by `pallet` attribute macro.
    #[deprecated(note = "use `Pallet` instead")]
    #[allow(dead_code)]
    pub type Module<T> = Pallet<T>;
    impl<T: Config> frame_support::traits::GetStorageVersion for Pallet<T> {
        fn current_storage_version() -> frame_support::traits::StorageVersion {
            STORAGE_VERSION
        }
        fn on_chain_storage_version() -> frame_support::traits::StorageVersion {
            frame_support::traits::StorageVersion::get::<Self>()
        }
    }
    impl<T: Config> frame_support::traits::OnGenesis for Pallet<T> {
        fn on_genesis() {
            let storage_version = STORAGE_VERSION;
            storage_version.put::<Self>();
        }
    }
    impl<T: Config> frame_support::traits::PalletInfoAccess for Pallet<T> {
        fn index() -> usize {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::index::<
                Self,
            >()
                .expect(
                    "Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime",
                )
        }
        fn name() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Self,
            >()
                .expect(
                    "Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime",
                )
        }
        fn module_name() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::module_name::<
                Self,
            >()
                .expect(
                    "Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime",
                )
        }
        fn crate_version() -> frame_support::traits::CrateVersion {
            frame_support::traits::CrateVersion {
                major: 0u16,
                minor: 1u8,
                patch: 5u8,
            }
        }
    }
    impl<T: Config> frame_support::traits::PalletsInfoAccess for Pallet<T> {
        fn count() -> usize {
            1
        }
        fn infos() -> frame_support::sp_std::vec::Vec<
            frame_support::traits::PalletInfoData,
        > {
            use frame_support::traits::PalletInfoAccess;
            let item = frame_support::traits::PalletInfoData {
                index: Self::index(),
                name: Self::name(),
                module_name: Self::module_name(),
                crate_version: Self::crate_version(),
            };
            <[_]>::into_vec(#[rustc_box] ::alloc::boxed::Box::new([item]))
        }
    }
    impl<T: Config> frame_support::traits::StorageInfoTrait for Pallet<T> {
        fn storage_info() -> frame_support::sp_std::vec::Vec<
            frame_support::traits::StorageInfo,
        > {
            #[allow(unused_mut)]
            let mut res = ::alloc::vec::Vec::new();
            {
                let mut storage_info = <TokensMinted<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <TokensBurnt<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <TokenData<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <TokenProperties<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <TokenAuxProperties<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <Owned<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <TokenChildren<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <AccountBalance<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = <Allowance<
                    T,
                > as frame_support::traits::StorageInfoTrait>::storage_info();
                res.append(&mut storage_info);
            }
            res
        }
    }
    #[doc(hidden)]
    pub mod __substrate_call_check {
        #[doc(hidden)]
        pub use __is_call_part_defined_0 as is_call_part_defined;
    }
    ///Contains one variant per dispatchable that can be called by an extrinsic.
    #[codec(encode_bound())]
    #[codec(decode_bound())]
    #[scale_info(skip_type_params(T), capture_docs = "always")]
    #[allow(non_camel_case_types)]
    pub enum Call<T: Config> {
        #[doc(hidden)]
        #[codec(skip)]
        __Ignore(frame_support::sp_std::marker::PhantomData<(T,)>, frame_support::Never),
    }
    const _: () = {
        impl<T: Config> core::fmt::Debug for Call<T> {
            fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::fmt::Result {
                match *self {
                    Self::__Ignore(ref _0, ref _1) => {
                        fmt.debug_tuple("Call::__Ignore").field(&_0).field(&_1).finish()
                    }
                }
            }
        }
    };
    const _: () = {
        impl<T: Config> core::clone::Clone for Call<T> {
            fn clone(&self) -> Self {
                match self {
                    Self::__Ignore(ref _0, ref _1) => {
                        Self::__Ignore(
                            core::clone::Clone::clone(_0),
                            core::clone::Clone::clone(_1),
                        )
                    }
                }
            }
        }
    };
    const _: () = {
        impl<T: Config> core::cmp::Eq for Call<T> {}
    };
    const _: () = {
        impl<T: Config> core::cmp::PartialEq for Call<T> {
            fn eq(&self, other: &Self) -> bool {
                match (self, other) {
                    (Self::__Ignore(_0, _1), Self::__Ignore(_0_other, _1_other)) => {
                        true && _0 == _0_other && _1 == _1_other
                    }
                }
            }
        }
    };
    #[allow(deprecated)]
    const _: () = {
        #[allow(non_camel_case_types)]
        #[automatically_derived]
        impl<T: Config> ::codec::Encode for Call<T> {}
        #[automatically_derived]
        impl<T: Config> ::codec::EncodeLike for Call<T> {}
    };
    #[allow(deprecated)]
    const _: () = {
        #[allow(non_camel_case_types)]
        #[automatically_derived]
        impl<T: Config> ::codec::Decode for Call<T> {
            fn decode<__CodecInputEdqy: ::codec::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::codec::Error> {
                match __codec_input_edqy
                    .read_byte()
                    .map_err(|e| {
                        e.chain("Could not decode `Call`, failed to read variant byte")
                    })?
                {
                    _ => {
                        ::core::result::Result::Err(
                            <_ as ::core::convert::Into<
                                _,
                            >>::into("Could not decode `Call`, variant doesn't exist"),
                        )
                    }
                }
            }
        }
    };
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl<T: Config> ::scale_info::TypeInfo for Call<T>
        where
            frame_support::sp_std::marker::PhantomData<
                (T,),
            >: ::scale_info::TypeInfo + 'static,
            T: Config + 'static,
        {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new("Call", "pallet_nonfungible::pallet"))
                    .type_params(
                        <[_]>::into_vec(
                            #[rustc_box]
                            ::alloc::boxed::Box::new([
                                ::scale_info::TypeParameter::new(
                                    "T",
                                    ::core::option::Option::None,
                                ),
                            ]),
                        ),
                    )
                    .docs_always(
                        &[
                            "Contains one variant per dispatchable that can be called by an extrinsic.",
                        ],
                    )
                    .variant(::scale_info::build::Variants::new())
            }
        }
    };
    impl<T: Config> Call<T> {}
    impl<T: Config> frame_support::dispatch::GetDispatchInfo for Call<T> {
        fn get_dispatch_info(&self) -> frame_support::dispatch::DispatchInfo {
            match *self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(
                        ::core::fmt::Arguments::new_v1(
                            &["internal error: entered unreachable code: "],
                            &[
                                ::core::fmt::ArgumentV1::new_display(
                                    &::core::fmt::Arguments::new_v1(
                                        &["__Ignore cannot be used"],
                                        &[],
                                    ),
                                ),
                            ],
                        ),
                    )
                }
            }
        }
    }
    impl<T: Config> frame_support::dispatch::GetCallName for Call<T> {
        fn get_call_name(&self) -> &'static str {
            match *self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(
                        ::core::fmt::Arguments::new_v1(
                            &["internal error: entered unreachable code: "],
                            &[
                                ::core::fmt::ArgumentV1::new_display(
                                    &::core::fmt::Arguments::new_v1(
                                        &["__PhantomItem cannot be used."],
                                        &[],
                                    ),
                                ),
                            ],
                        ),
                    )
                }
            }
        }
        fn get_call_names() -> &'static [&'static str] {
            &[]
        }
    }
    impl<T: Config> frame_support::traits::UnfilteredDispatchable for Call<T> {
        type Origin = frame_system::pallet_prelude::OriginFor<T>;
        fn dispatch_bypass_filter(
            self,
            origin: Self::Origin,
        ) -> frame_support::dispatch::DispatchResultWithPostInfo {
            match self {
                Self::__Ignore(_, _) => {
                    let _ = origin;
                    ::core::panicking::panic_fmt(
                        ::core::fmt::Arguments::new_v1(
                            &["internal error: entered unreachable code: "],
                            &[
                                ::core::fmt::ArgumentV1::new_display(
                                    &::core::fmt::Arguments::new_v1(
                                        &["__PhantomItem cannot be used."],
                                        &[],
                                    ),
                                ),
                            ],
                        ),
                    );
                }
            }
        }
    }
    impl<T: Config> frame_support::dispatch::Callable<T> for Pallet<T> {
        type Call = Call<T>;
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn call_functions() -> frame_support::metadata::PalletCallMetadata {
            frame_support::scale_info::meta_type::<Call<T>>().into()
        }
    }
    impl<T: Config> frame_support::sp_std::fmt::Debug for Error<T> {
        fn fmt(
            &self,
            f: &mut frame_support::sp_std::fmt::Formatter<'_>,
        ) -> frame_support::sp_std::fmt::Result {
            f.write_str(self.as_str())
        }
    }
    impl<T: Config> Error<T> {
        #[doc(hidden)]
        pub fn as_str(&self) -> &'static str {
            match &self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(
                        ::core::fmt::Arguments::new_v1(
                            &["internal error: entered unreachable code: "],
                            &[
                                ::core::fmt::ArgumentV1::new_display(
                                    &::core::fmt::Arguments::new_v1(
                                        &["`__Ignore` can never be constructed"],
                                        &[],
                                    ),
                                ),
                            ],
                        ),
                    )
                }
                Self::NotNonfungibleDataUsedToMintFungibleCollectionToken => {
                    "NotNonfungibleDataUsedToMintFungibleCollectionToken"
                }
                Self::NonfungibleItemsHaveNoAmount => "NonfungibleItemsHaveNoAmount",
                Self::CantBurnNftWithChildren => "CantBurnNftWithChildren",
            }
        }
    }
    impl<T: Config> From<Error<T>> for &'static str {
        fn from(err: Error<T>) -> &'static str {
            err.as_str()
        }
    }
    impl<T: Config> From<Error<T>> for frame_support::sp_runtime::DispatchError {
        fn from(err: Error<T>) -> Self {
            use frame_support::codec::Encode;
            let index = <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::index::<
                Pallet<T>,
            >()
                .expect("Every active module has an index in the runtime; qed") as u8;
            let mut encoded = err.encode();
            encoded.resize(frame_support::MAX_MODULE_ERROR_ENCODED_SIZE, 0);
            frame_support::sp_runtime::DispatchError::Module(frame_support::sp_runtime::ModuleError {
                index,
                error: TryInto::try_into(encoded)
                    .expect(
                        "encoded error is resized to be equal to the maximum encoded error size; qed",
                    ),
                message: Some(err.as_str()),
            })
        }
    }
    pub use __tt_error_token_1 as tt_error_token;
    #[doc(hidden)]
    pub mod __substrate_event_check {
        #[doc(hidden)]
        pub use __is_event_part_defined_2 as is_event_part_defined;
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn storage_metadata() -> frame_support::metadata::PalletStorageMetadata {
            frame_support::metadata::PalletStorageMetadata {
                prefix: <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                    Pallet<T>,
                >()
                    .expect("Every active pallet has a name in the runtime; qed"),
                entries: {
                    #[allow(unused_mut)]
                    let mut entries = ::alloc::vec::Vec::new();
                    {
                        <TokensMinted<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Total amount of minted tokens in a collection.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <TokensBurnt<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Amount of burnt tokens in a collection.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <TokenData<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Token data, used to partially describe a token.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <TokenProperties<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Map of key-value pairs, describing the metadata of a token.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <TokenAuxProperties<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Custom data of a token that is serialized to bytes,",
                                    " primarily reserved for on-chain operations,",
                                    " normally obscured from the external users.",
                                    "",
                                    " Auxiliary properties are slightly different from",
                                    " usual [`TokenProperties`] due to an unlimited number",
                                    " and separately stored and written-to key-value pairs.",
                                    "",
                                    " Currently used to store RMRK data.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <Owned<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Used to enumerate tokens owned by account.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <TokenChildren<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Used to enumerate token\'s children.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <AccountBalance<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Amount of tokens owned by an account in a collection.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    {
                        <Allowance<
                            T,
                        > as frame_support::storage::StorageEntryMetadataBuilder>::build_metadata(
                            <[_]>::into_vec(
                                #[rustc_box]
                                ::alloc::boxed::Box::new([
                                    " Allowance set by a token owner for another user to perform one of certain transactions on a token.",
                                ]),
                            ),
                            &mut entries,
                        );
                    }
                    entries
                },
            }
        }
    }
    impl<T: Config> Pallet<T> {
        /// Map of key-value pairs, describing the metadata of a token.
        pub fn token_properties<KArg>(key: KArg) -> Properties
        where
            KArg: frame_support::storage::types::EncodeLikeTuple<
                    <(
                        Key<Twox64Concat, CollectionId>,
                        Key<Twox64Concat, TokenId>,
                    ) as frame_support::storage::types::KeyGenerator>::KArg,
                > + frame_support::storage::types::TupleToEncodedIter,
        {
            <TokenProperties<
                T,
            > as frame_support::storage::StorageNMap<
                (Key<Twox64Concat, CollectionId>, Key<Twox64Concat, TokenId>),
                Properties,
            >>::get(key)
        }
    }
    impl<T: Config> Pallet<T> {
        /// Custom data of a token that is serialized to bytes,
        /// primarily reserved for on-chain operations,
        /// normally obscured from the external users.
        ///
        /// Auxiliary properties are slightly different from
        /// usual [`TokenProperties`] due to an unlimited number
        /// and separately stored and written-to key-value pairs.
        ///
        /// Currently used to store RMRK data.
        pub fn token_aux_property<KArg>(key: KArg) -> Option<AuxPropertyValue>
        where
            KArg: frame_support::storage::types::EncodeLikeTuple<
                    <(
                        Key<Twox64Concat, CollectionId>,
                        Key<Twox64Concat, TokenId>,
                        Key<Twox64Concat, PropertyScope>,
                        Key<Twox64Concat, PropertyKey>,
                    ) as frame_support::storage::types::KeyGenerator>::KArg,
                > + frame_support::storage::types::TupleToEncodedIter,
        {
            <TokenAuxProperties<
                T,
            > as frame_support::storage::StorageNMap<
                (
                    Key<Twox64Concat, CollectionId>,
                    Key<Twox64Concat, TokenId>,
                    Key<Twox64Concat, PropertyScope>,
                    Key<Twox64Concat, PropertyKey>,
                ),
                AuxPropertyValue,
            >>::get(key)
        }
    }
    impl<T: Config> Pallet<T> {
        /// Used to enumerate token's children.
        pub fn token_children<KArg>(key: KArg) -> bool
        where
            KArg: frame_support::storage::types::EncodeLikeTuple<
                    <(
                        Key<Twox64Concat, CollectionId>,
                        Key<Twox64Concat, TokenId>,
                        Key<Twox64Concat, (CollectionId, TokenId)>,
                    ) as frame_support::storage::types::KeyGenerator>::KArg,
                > + frame_support::storage::types::TupleToEncodedIter,
        {
            <TokenChildren<
                T,
            > as frame_support::storage::StorageNMap<
                (
                    Key<Twox64Concat, CollectionId>,
                    Key<Twox64Concat, TokenId>,
                    Key<Twox64Concat, (CollectionId, TokenId)>,
                ),
                bool,
            >>::get(key)
        }
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokensMinted<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokensMinted<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokensMinted";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokensBurnt<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokensBurnt<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokensBurnt";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokenData<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokenData<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokenData";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokenProperties<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokenProperties<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokenProperties";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokenAuxProperties<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokenAuxProperties<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokenAuxProperties";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageOwned<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageOwned<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "Owned";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageTokenChildren<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageTokenChildren<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "TokenChildren";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageAccountBalance<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageAccountBalance<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "AccountBalance";
    }
    #[doc(hidden)]
    pub struct _GeneratedPrefixForStorageAllowance<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
    for _GeneratedPrefixForStorageAllowance<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
                .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "Allowance";
    }
    #[doc(hidden)]
    pub mod __substrate_inherent_check {
        #[doc(hidden)]
        pub use __is_inherent_part_defined_3 as is_inherent_part_defined;
    }
    /// Hidden instance generated to be internally used when module is used without
    /// instance.
    #[doc(hidden)]
    pub type __InherentHiddenInstance = ();
    pub(super) trait Store {
        type TokensMinted;
        type TokensBurnt;
        type TokenData;
        type TokenProperties;
        type TokenAuxProperties;
        type Owned;
        type TokenChildren;
        type AccountBalance;
        type Allowance;
    }
    impl<T: Config> Store for Pallet<T> {
        type TokensMinted = TokensMinted<T>;
        type TokensBurnt = TokensBurnt<T>;
        type TokenData = TokenData<T>;
        type TokenProperties = TokenProperties<T>;
        type TokenAuxProperties = TokenAuxProperties<T>;
        type Owned = Owned<T>;
        type TokenChildren = TokenChildren<T>;
        type AccountBalance = AccountBalance<T>;
        type Allowance = Allowance<T>;
    }
    impl<
        T: Config,
    > frame_support::traits::OnFinalize<<T as frame_system::Config>::BlockNumber>
    for Pallet<T> {
        fn on_finalize(n: <T as frame_system::Config>::BlockNumber) {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::callsite::DefaultCallsite = {
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_finalize",
                            "pallet_nonfungible::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/nonfungible/src/lib.rs"),
                            Some(147u32),
                            Some("pallet_nonfungible::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    ::tracing::callsite::DefaultCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE
                        <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && ::tracing::__macro_support::__is_enabled(
                        CALLSITE.metadata(),
                        interest,
                    )
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = ::tracing::__macro_support::__disabled_span(
                        CALLSITE.metadata(),
                    );
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::on_finalize(n)
        }
    }
    impl<
        T: Config,
    > frame_support::traits::OnIdle<<T as frame_system::Config>::BlockNumber>
    for Pallet<T> {
        fn on_idle(
            n: <T as frame_system::Config>::BlockNumber,
            remaining_weight: frame_support::weights::Weight,
        ) -> frame_support::weights::Weight {
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::on_idle(n, remaining_weight)
        }
    }
    impl<
        T: Config,
    > frame_support::traits::OnInitialize<<T as frame_system::Config>::BlockNumber>
    for Pallet<T> {
        fn on_initialize(
            n: <T as frame_system::Config>::BlockNumber,
        ) -> frame_support::weights::Weight {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::callsite::DefaultCallsite = {
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_initialize",
                            "pallet_nonfungible::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/nonfungible/src/lib.rs"),
                            Some(147u32),
                            Some("pallet_nonfungible::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    ::tracing::callsite::DefaultCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE
                        <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && ::tracing::__macro_support::__is_enabled(
                        CALLSITE.metadata(),
                        interest,
                    )
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = ::tracing::__macro_support::__disabled_span(
                        CALLSITE.metadata(),
                    );
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::on_initialize(n)
        }
    }
    impl<T: Config> frame_support::traits::OnRuntimeUpgrade for Pallet<T> {
        fn on_runtime_upgrade() -> frame_support::weights::Weight {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::callsite::DefaultCallsite = {
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_runtime_update",
                            "pallet_nonfungible::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/nonfungible/src/lib.rs"),
                            Some(147u32),
                            Some("pallet_nonfungible::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    ::tracing::callsite::DefaultCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE
                        <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && ::tracing::__macro_support::__is_enabled(
                        CALLSITE.metadata(),
                        interest,
                    )
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = ::tracing::__macro_support::__disabled_span(
                        CALLSITE.metadata(),
                    );
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            let pallet_name = <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Self,
            >()
                .unwrap_or("<unknown pallet name>");
            {
                let lvl = ::log::Level::Info;
                if lvl <= ::log::STATIC_MAX_LEVEL && lvl <= ::log::max_level() {
                    ::log::__private_api_log(
                        ::core::fmt::Arguments::new_v1(
                            &[
                                "\u{26a0}\u{fe0f} ",
                                " declares internal migrations (which *might* execute). On-chain `",
                                "` vs current storage version `",
                                "`",
                            ],
                            &[
                                ::core::fmt::ArgumentV1::new_display(&pallet_name),
                                ::core::fmt::ArgumentV1::new_debug(
                                    &<Self as frame_support::traits::GetStorageVersion>::on_chain_storage_version(),
                                ),
                                ::core::fmt::ArgumentV1::new_debug(
                                    &<Self as frame_support::traits::GetStorageVersion>::current_storage_version(),
                                ),
                            ],
                        ),
                        lvl,
                        &(
                            frame_support::LOG_TARGET,
                            "pallet_nonfungible::pallet",
                            "pallets/nonfungible/src/lib.rs",
                            147u32,
                        ),
                        ::log::__private_api::Option::None,
                    );
                }
            };
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::on_runtime_upgrade()
        }
    }
    impl<
        T: Config,
    > frame_support::traits::OffchainWorker<<T as frame_system::Config>::BlockNumber>
    for Pallet<T> {
        fn offchain_worker(n: <T as frame_system::Config>::BlockNumber) {
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::offchain_worker(n)
        }
    }
    impl<T: Config> frame_support::traits::IntegrityTest for Pallet<T> {
        fn integrity_test() {
            <Self as frame_support::traits::Hooks<
                <T as frame_system::Config>::BlockNumber,
            >>::integrity_test()
        }
    }
    #[doc(hidden)]
    pub mod __substrate_genesis_config_check {
        #[doc(hidden)]
        pub use __is_genesis_config_defined_4 as is_genesis_config_defined;
        #[doc(hidden)]
        pub use __is_std_enabled_for_genesis_4 as is_std_enabled_for_genesis;
    }
    #[doc(hidden)]
    pub mod __substrate_origin_check {
        #[doc(hidden)]
        pub use __is_origin_part_defined_5 as is_origin_part_defined;
    }
    #[doc(hidden)]
    pub mod __substrate_validate_unsigned_check {
        #[doc(hidden)]
        pub use __is_validate_unsigned_part_defined_6 as is_validate_unsigned_part_defined;
    }
    pub use __tt_default_parts_7 as tt_default_parts;
}
pub struct NonfungibleHandle<T: Config>(pallet_common::CollectionHandle<T>);
impl<T: Config> NonfungibleHandle<T> {
    pub fn cast(inner: pallet_common::CollectionHandle<T>) -> Self {
        Self(inner)
    }
    pub fn into_inner(self) -> pallet_common::CollectionHandle<T> {
        self.0
    }
    pub fn common_mut(&mut self) -> &mut pallet_common::CollectionHandle<T> {
        &mut self.0
    }
}
impl<T: Config> WithRecorder<T> for NonfungibleHandle<T> {
    fn recorder(&self) -> &SubstrateRecorder<T> {
        self.0.recorder()
    }
    fn into_recorder(self) -> SubstrateRecorder<T> {
        self.0.into_recorder()
    }
}
impl<T: Config> Deref for NonfungibleHandle<T> {
    type Target = pallet_common::CollectionHandle<T>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl<T: Config> Pallet<T> {
    /// Get number of NFT tokens in collection.
    pub fn total_supply(collection: &NonfungibleHandle<T>) -> u32 {
        <TokensMinted<T>>::get(collection.id) - <TokensBurnt<T>>::get(collection.id)
    }
    /// Check that NFT token exists.
    ///
    /// - `token`: Token ID.
    pub fn token_exists(collection: &NonfungibleHandle<T>, token: TokenId) -> bool {
        <TokenData<T>>::contains_key((collection.id, token))
    }
    /// Set the token property with the scope.
    ///
    /// - `property`: Contains key-value pair.
    pub fn set_scoped_token_property(
        collection_id: CollectionId,
        token_id: TokenId,
        scope: PropertyScope,
        property: Property,
    ) -> DispatchResult {
        TokenProperties::<
            T,
        >::try_mutate(
                (collection_id, token_id),
                |properties| {
                    properties.try_scoped_set(scope, property.key, property.value)
                },
            )
            .map_err(<CommonError<T>>::from)?;
        Ok(())
    }
    /// Batch operation to set multiple properties with the same scope.
    pub fn set_scoped_token_properties(
        collection_id: CollectionId,
        token_id: TokenId,
        scope: PropertyScope,
        properties: impl Iterator<Item = Property>,
    ) -> DispatchResult {
        TokenProperties::<
            T,
        >::try_mutate(
                (collection_id, token_id),
                |stored_properties| {
                    stored_properties.try_scoped_set_from_iter(scope, properties)
                },
            )
            .map_err(<CommonError<T>>::from)?;
        Ok(())
    }
    /// Add or edit auxiliary data for the property.
    ///
    /// - `f`: function that adds or edits auxiliary data.
    pub fn try_mutate_token_aux_property<R, E>(
        collection_id: CollectionId,
        token_id: TokenId,
        scope: PropertyScope,
        key: PropertyKey,
        f: impl FnOnce(&mut Option<AuxPropertyValue>) -> Result<R, E>,
    ) -> Result<R, E> {
        <TokenAuxProperties<T>>::try_mutate((collection_id, token_id, scope, key), f)
    }
    /// Remove auxiliary data for the property.
    pub fn remove_token_aux_property(
        collection_id: CollectionId,
        token_id: TokenId,
        scope: PropertyScope,
        key: PropertyKey,
    ) {
        <TokenAuxProperties<T>>::remove((collection_id, token_id, scope, key));
    }
    /// Get all auxiliary data in a given scope.
    ///
    /// Returns iterator over Property Key - Data pairs.
    pub fn iterate_token_aux_properties(
        collection_id: CollectionId,
        token_id: TokenId,
        scope: PropertyScope,
    ) -> impl Iterator<Item = (PropertyKey, AuxPropertyValue)> {
        <TokenAuxProperties<T>>::iter_prefix((collection_id, token_id, scope))
    }
    /// Get ID of the last minted token
    pub fn current_token_id(collection_id: CollectionId) -> TokenId {
        TokenId(<TokensMinted<T>>::get(collection_id))
    }
}
impl<T: Config> Pallet<T> {
    /// Create NFT collection
    ///
    /// `init_collection` will take non-refundable deposit for collection creation.
    ///
    /// - `data`: Contains settings for collection limits and permissions.
    pub fn init_collection(
        owner: T::CrossAccountId,
        payer: T::CrossAccountId,
        data: CreateCollectionData<T::AccountId>,
        is_external: bool,
    ) -> Result<CollectionId, DispatchError> {
        <PalletCommon<
            T,
        >>::init_collection(
            owner,
            payer,
            data,
            CollectionFlags {
                external: is_external,
                ..Default::default()
            },
        )
    }
    /// Destroy NFT collection
    ///
    /// `destroy_collection` will throw error if collection contains any tokens.
    /// Only owner can destroy collection.
    pub fn destroy_collection(
        collection: NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
    ) -> DispatchResult {
        let id = collection.id;
        if Self::collection_has_tokens(id) {
            return Err(<CommonError<T>>::CantDestroyNotEmptyCollection.into());
        }
        PalletCommon::destroy_collection(collection.0, sender)?;
        let _ = <TokenData<T>>::clear_prefix((id,), u32::MAX, None);
        let _ = <TokenChildren<T>>::clear_prefix((id,), u32::MAX, None);
        let _ = <Owned<T>>::clear_prefix((id,), u32::MAX, None);
        <TokensMinted<T>>::remove(id);
        <TokensBurnt<T>>::remove(id);
        let _ = <Allowance<T>>::clear_prefix((id,), u32::MAX, None);
        let _ = <AccountBalance<T>>::clear_prefix((id,), u32::MAX, None);
        Ok(())
    }
    /// Burn NFT token
    ///
    /// `burn` removes `token` from the `collection`, from it's owner and from the parent token
    /// if the token is nested.
    /// Only the owner can `burn` the token. The `token` shouldn't have any nested tokens.
    /// Also removes all corresponding properties and auxiliary properties.
    ///
    /// - `token`: Token that should be burned
    /// - `collection`: Collection that contains the token
    pub fn burn(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token: TokenId,
    ) -> DispatchResult {
        let token_data = <TokenData<T>>::get((collection.id, token))
            .ok_or(<CommonError<T>>::TokenNotFound)?;
        {
            if !(&token_data.owner == sender) {
                { return Err(<CommonError<T>>::NoPermission.into()) };
            }
        };
        if collection.permissions.access() == AccessMode::AllowList {
            collection.check_allowlist(sender)?;
        }
        if Self::token_has_children(collection.id, token) {
            return Err(<Error<T>>::CantBurnNftWithChildren.into());
        }
        let burnt = <TokensBurnt<T>>::get(collection.id)
            .checked_add(1)
            .ok_or(ArithmeticError::Overflow)?;
        let balance = <AccountBalance<T>>::get((collection.id, token_data.owner.clone()))
            .checked_sub(1)
            .ok_or(ArithmeticError::Overflow)?;
        if balance == 0 {
            <AccountBalance<T>>::remove((collection.id, token_data.owner.clone()));
        } else {
            <AccountBalance<
                T,
            >>::insert((collection.id, token_data.owner.clone()), balance);
        }
        <PalletStructure<T>>::unnest_if_nested(&token_data.owner, collection.id, token);
        <Owned<T>>::remove((collection.id, &token_data.owner, token));
        <TokensBurnt<T>>::insert(collection.id, burnt);
        <TokenData<T>>::remove((collection.id, token));
        <TokenProperties<T>>::remove((collection.id, token));
        let _ = <TokenAuxProperties<
            T,
        >>::clear_prefix((collection.id, token), u32::MAX, None);
        let old_spender = <Allowance<T>>::take((collection.id, token));
        if let Some(old_spender) = old_spender {
            <PalletCommon<
                T,
            >>::deposit_event(
                CommonEvent::Approved(
                    collection.id,
                    token,
                    token_data.owner.clone(),
                    old_spender,
                    0,
                ),
            );
        }
        <PalletEvm<
            T,
        >>::deposit_log(
            ERC721Events::Transfer {
                from: *token_data.owner.as_eth(),
                to: H160::default(),
                token_id: token.into(),
            }
                .to_log(collection_id_to_address(collection.id)),
        );
        <PalletCommon<
            T,
        >>::deposit_event(
            CommonEvent::ItemDestroyed(collection.id, token, token_data.owner, 1),
        );
        Ok(())
    }
    /// Same as [`burn`] but burns all the tokens that are nested in the token first
    ///
    /// - `self_budget`: Limit for searching children in depth.
    /// - `breadth_budget`: Limit of breadth of searching children.
    ///
    /// [`burn`]: struct.Pallet.html#method.burn
    pub fn burn_recursively(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token: TokenId,
        self_budget: &dyn Budget,
        breadth_budget: &dyn Budget,
    ) -> DispatchResultWithPostInfo {
        use frame_support::storage::{with_transaction, TransactionOutcome};
        with_transaction(|| {
            let r = (|| {
                {
                    {
                        if !self_budget.consume() {
                            { return Err(<StructureError<T>>::DepthLimit.into()) };
                        }
                    };
                    let current_token_account = T::CrossTokenAddressMapping::token_to_address(
                        collection.id,
                        token,
                    );
                    let mut weight = Weight::zero();
                    for ((collection, token), _) in <TokenChildren<
                        T,
                    >>::iter_prefix((collection.id, token)) {
                        {
                            if !breadth_budget.consume() {
                                { return Err(<StructureError<T>>::BreadthLimit.into()) };
                            }
                        };
                        let PostDispatchInfo { actual_weight, .. } = <PalletStructure<
                            T,
                        >>::burn_item_recursively(
                            current_token_account.clone(),
                            collection,
                            token,
                            self_budget,
                            breadth_budget,
                        )?;
                        if let Some(actual_weight) = actual_weight {
                            weight = weight.saturating_add(actual_weight);
                        }
                    }
                    Self::burn(collection, sender, token)?;
                    DispatchResultWithPostInfo::Ok(PostDispatchInfo {
                        actual_weight: Some(weight + <SelfWeightOf<T>>::burn_item()),
                        pays_fee: Pays::Yes,
                    })
                }
            })();
            if r.is_ok() {
                TransactionOutcome::Commit(r)
            } else {
                TransactionOutcome::Rollback(r)
            }
        })
    }
    /// Batch operation to add, edit or remove properties for the token
    ///
    /// All affected properties should have mutable permission and sender should have
    /// permission to edit those properties.
    ///
    /// - `nesting_budget`: Limit for searching parents in depth to check ownership.
    /// - `is_token_create`: Indicates that method is called during token initialization.
    ///   Allows to bypass ownership check.
    fn modify_token_properties(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token_id: TokenId,
        properties: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
        is_token_create: bool,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        use frame_support::storage::{with_transaction, TransactionOutcome};
        with_transaction(|| {
            let r = (|| {
                {
                    let mut collection_admin_status = None;
                    let mut token_owner_result = None;
                    let mut is_collection_admin = || {
                        *collection_admin_status
                            .get_or_insert_with(|| collection.is_owner_or_admin(sender))
                    };
                    let mut is_token_owner = || {
                        *token_owner_result
                            .get_or_insert_with(|| -> Result<bool, DispatchError> {
                                let is_owned = <PalletStructure<
                                    T,
                                >>::check_indirectly_owned(
                                    sender.clone(),
                                    collection.id,
                                    token_id,
                                    None,
                                    nesting_budget,
                                )?;
                                Ok(is_owned)
                            })
                    };
                    for (key, value) in properties {
                        let permission = <PalletCommon<
                            T,
                        >>::property_permissions(collection.id)
                            .get(&key)
                            .cloned()
                            .unwrap_or_else(PropertyPermission::none);
                        let is_property_exists = TokenProperties::<
                            T,
                        >::get((collection.id, token_id))
                            .get(&key)
                            .is_some();
                        match permission {
                            PropertyPermission {
                                mutable: false,
                                ..
                            } if is_property_exists => {
                                return Err(<CommonError<T>>::NoPermission.into());
                            }
                            PropertyPermission { collection_admin, token_owner, .. } => {
                                if is_token_create && (collection_admin || token_owner)
                                    && value.is_some()
                                {} else if collection_admin && is_collection_admin()
                                {} else if token_owner && is_token_owner()? {} else {
                                    { return Err(<CommonError<T>>::NoPermission.into()) };
                                }
                            }
                        }
                        match value {
                            Some(value) => {
                                <TokenProperties<
                                    T,
                                >>::try_mutate(
                                        (collection.id, token_id),
                                        |properties| { properties.try_set(key.clone(), value) },
                                    )
                                    .map_err(<CommonError<T>>::from)?;
                                <PalletCommon<
                                    T,
                                >>::deposit_event(
                                    CommonEvent::TokenPropertySet(collection.id, token_id, key),
                                );
                            }
                            None => {
                                <TokenProperties<
                                    T,
                                >>::try_mutate(
                                        (collection.id, token_id),
                                        |properties| { properties.remove(&key) },
                                    )
                                    .map_err(<CommonError<T>>::from)?;
                                <PalletCommon<
                                    T,
                                >>::deposit_event(
                                    CommonEvent::TokenPropertyDeleted(
                                        collection.id,
                                        token_id,
                                        key,
                                    ),
                                );
                            }
                        }
                    }
                    Ok(())
                }
            })();
            if r.is_ok() {
                TransactionOutcome::Commit(r)
            } else {
                TransactionOutcome::Rollback(r)
            }
        })
    }
    /// Batch operation to add or edit properties for the token
    ///
    /// Same as [`modify_token_properties`] but doesn't allow to remove properties
    ///
    /// [`modify_token_properties`]: struct.Pallet.html#method.modify_token_properties
    pub fn set_token_properties(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token_id: TokenId,
        properties: impl Iterator<Item = Property>,
        is_token_create: bool,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        Self::modify_token_properties(
            collection,
            sender,
            token_id,
            properties.map(|p| (p.key, Some(p.value))),
            is_token_create,
            nesting_budget,
        )
    }
    /// Add or edit single property for the token
    ///
    /// Calls [`set_token_properties`] internally
    ///
    /// [`set_token_properties`]: struct.Pallet.html#method.set_token_properties
    pub fn set_token_property(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token_id: TokenId,
        property: Property,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        let is_token_create = false;
        Self::set_token_properties(
            collection,
            sender,
            token_id,
            [property].into_iter(),
            is_token_create,
            nesting_budget,
        )
    }
    /// Batch operation to remove properties from the token
    ///
    /// Same as [`modify_token_properties`] but doesn't allow to add or edit properties
    ///
    /// [`modify_token_properties`]: struct.Pallet.html#method.modify_token_properties
    pub fn delete_token_properties(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token_id: TokenId,
        property_keys: impl Iterator<Item = PropertyKey>,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        let is_token_create = false;
        Self::modify_token_properties(
            collection,
            sender,
            token_id,
            property_keys.into_iter().map(|key| (key, None)),
            is_token_create,
            nesting_budget,
        )
    }
    /// Remove single property from the token
    ///
    /// Calls [`delete_token_properties`] internally
    ///
    /// [`delete_token_properties`]: struct.Pallet.html#method.delete_token_properties
    pub fn delete_token_property(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token_id: TokenId,
        property_key: PropertyKey,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        Self::delete_token_properties(
            collection,
            sender,
            token_id,
            [property_key].into_iter(),
            nesting_budget,
        )
    }
    /// Add or edit properties for the collection
    pub fn set_collection_properties(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        properties: Vec<Property>,
    ) -> DispatchResult {
        <PalletCommon<T>>::set_collection_properties(collection, sender, properties)
    }
    /// Remove properties from the collection
    pub fn delete_collection_properties(
        collection: &CollectionHandle<T>,
        sender: &T::CrossAccountId,
        property_keys: Vec<PropertyKey>,
    ) -> DispatchResult {
        <PalletCommon<
            T,
        >>::delete_collection_properties(collection, sender, property_keys)
    }
    /// Set property permissions for the token.
    ///
    /// Sender should be the owner or admin of token's collection.
    pub fn set_token_property_permissions(
        collection: &CollectionHandle<T>,
        sender: &T::CrossAccountId,
        property_permissions: Vec<PropertyKeyPermission>,
    ) -> DispatchResult {
        <PalletCommon<
            T,
        >>::set_token_property_permissions(collection, sender, property_permissions)
    }
    /// Set property permissions for the token with scope.
    ///
    /// Sender should be the owner or admin of token's collection.
    pub fn set_scoped_token_property_permissions(
        collection: &CollectionHandle<T>,
        sender: &T::CrossAccountId,
        scope: PropertyScope,
        property_permissions: Vec<PropertyKeyPermission>,
    ) -> DispatchResult {
        <PalletCommon<
            T,
        >>::set_scoped_token_property_permissions(
            collection,
            sender,
            scope,
            property_permissions,
        )
    }
    /// Set property permissions for the collection.
    ///
    /// Sender should be the owner or admin of the collection.
    pub fn set_property_permission(
        collection: &CollectionHandle<T>,
        sender: &T::CrossAccountId,
        permission: PropertyKeyPermission,
    ) -> DispatchResult {
        <PalletCommon<T>>::set_property_permission(collection, sender, permission)
    }
    /// Transfer NFT token from one account to another.
    ///
    /// `from` account stops being the owner and `to` account becomes the owner of the token.
    /// If `to` is token than `to` becomes owner of the token and the token become nested.
    /// Unnests token from previous parent if it was nested before.
    /// Removes allowance for the token if there was any.
    /// Throws if transfers aren't allowed for collection or if receiver reached token ownership limit.
    ///
    /// - `nesting_budget`: Limit for token nesting depth
    pub fn transfer(
        collection: &NonfungibleHandle<T>,
        from: &T::CrossAccountId,
        to: &T::CrossAccountId,
        token: TokenId,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        {
            if !collection.limits.transfers_enabled() {
                { return Err(<CommonError<T>>::TransferNotAllowed.into()) };
            }
        };
        let token_data = <TokenData<T>>::get((collection.id, token))
            .ok_or(<CommonError<T>>::TokenNotFound)?;
        {
            if !(&token_data.owner == from) {
                { return Err(<CommonError<T>>::NoPermission.into()) };
            }
        };
        if collection.permissions.access() == AccessMode::AllowList {
            collection.check_allowlist(from)?;
            collection.check_allowlist(to)?;
        }
        <PalletCommon<T>>::ensure_correct_receiver(to)?;
        let balance_from = <AccountBalance<T>>::get((collection.id, from))
            .checked_sub(1)
            .ok_or(<CommonError<T>>::TokenValueTooLow)?;
        let balance_to = if from != to {
            let balance_to = <AccountBalance<T>>::get((collection.id, to))
                .checked_add(1)
                .ok_or(ArithmeticError::Overflow)?;
            {
                if !(balance_to < collection.limits.account_token_ownership_limit()) {
                    { return Err(<CommonError<T>>::AccountTokenLimitExceeded.into()) };
                }
            };
            Some(balance_to)
        } else {
            None
        };
        <PalletStructure<
            T,
        >>::nest_if_sent_to_token(
            from.clone(),
            to,
            collection.id,
            token,
            nesting_budget,
        )?;
        <PalletStructure<T>>::unnest_if_nested(&token_data.owner, collection.id, token);
        <TokenData<
            T,
        >>::insert(
            (collection.id, token),
            ItemData {
                owner: to.clone(),
                ..token_data
            },
        );
        if let Some(balance_to) = balance_to {
            if balance_from == 0 {
                <AccountBalance<T>>::remove((collection.id, from));
            } else {
                <AccountBalance<T>>::insert((collection.id, from), balance_from);
            }
            <AccountBalance<T>>::insert((collection.id, to), balance_to);
            <Owned<T>>::remove((collection.id, from, token));
            <Owned<T>>::insert((collection.id, to, token), true);
        }
        Self::set_allowance_unchecked(collection, from, token, None, true);
        <PalletEvm<
            T,
        >>::deposit_log(
            ERC721Events::Transfer {
                from: *from.as_eth(),
                to: *to.as_eth(),
                token_id: token.into(),
            }
                .to_log(collection_id_to_address(collection.id)),
        );
        <PalletCommon<
            T,
        >>::deposit_event(
            CommonEvent::Transfer(collection.id, token, from.clone(), to.clone(), 1),
        );
        Ok(())
    }
    /// Batch operation to mint multiple NFT tokens.
    ///
    /// The sender should be the owner/admin of the collection or collection should be configured
    /// to allow public minting.
    /// Throws if amount of tokens reached it's limit for the collection or if caller reached
    /// token ownership limit.
    ///
    /// - `data`: Contains list of token properties and users who will become the owners of the
    ///   corresponging tokens.
    /// - `nesting_budget`: Limit for token nesting depth
    pub fn create_multiple_items(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        data: Vec<CreateItemData<T>>,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        if !collection.is_owner_or_admin(sender) {
            {
                if !collection.permissions.mint_mode() {
                    { return Err(<CommonError<T>>::PublicMintingNotAllowed.into()) };
                }
            };
            collection.check_allowlist(sender)?;
            for item in data.iter() {
                collection.check_allowlist(&item.owner)?;
            }
        }
        for data in data.iter() {
            <PalletCommon<T>>::ensure_correct_receiver(&data.owner)?;
        }
        let first_token = <TokensMinted<T>>::get(collection.id);
        let tokens_minted = first_token
            .checked_add(data.len() as u32)
            .ok_or(ArithmeticError::Overflow)?;
        {
            if !(tokens_minted <= collection.limits.token_limit()) {
                { return Err(<CommonError<T>>::CollectionTokenLimitExceeded.into()) };
            }
        };
        let mut balances = BTreeMap::new();
        for data in &data {
            let balance = balances
                .entry(&data.owner)
                .or_insert_with(|| <AccountBalance<
                    T,
                >>::get((collection.id, &data.owner)));
            *balance = balance.checked_add(1).ok_or(ArithmeticError::Overflow)?;
            {
                if !(*balance <= collection.limits.account_token_ownership_limit()) {
                    { return Err(<CommonError<T>>::AccountTokenLimitExceeded.into()) };
                }
            };
        }
        for (i, data) in data.iter().enumerate() {
            let token = TokenId(first_token + i as u32 + 1);
            <PalletStructure<
                T,
            >>::check_nesting(
                sender.clone(),
                &data.owner,
                collection.id,
                token,
                nesting_budget,
            )?;
        }
        with_transaction(|| {
            for (i, data) in data.iter().enumerate() {
                let token = first_token + i as u32 + 1;
                <TokenData<
                    T,
                >>::insert(
                    (collection.id, token),
                    ItemData {
                        owner: data.owner.clone(),
                    },
                );
                <PalletStructure<
                    T,
                >>::nest_if_sent_to_token_unchecked(
                    &data.owner,
                    collection.id,
                    TokenId(token),
                );
                if let Err(e)
                    = Self::set_token_properties(
                        collection,
                        sender,
                        TokenId(token),
                        data.properties.clone().into_iter(),
                        true,
                        nesting_budget,
                    ) {
                    return TransactionOutcome::Rollback(Err(e));
                }
            }
            TransactionOutcome::Commit(Ok(()))
        })?;
        <TokensMinted<T>>::insert(collection.id, tokens_minted);
        for (account, balance) in balances {
            <AccountBalance<T>>::insert((collection.id, account), balance);
        }
        for (i, data) in data.into_iter().enumerate() {
            let token = first_token + i as u32 + 1;
            <Owned<T>>::insert((collection.id, &data.owner, token), true);
            <PalletEvm<
                T,
            >>::deposit_log(
                ERC721Events::Transfer {
                    from: H160::default(),
                    to: *data.owner.as_eth(),
                    token_id: token.into(),
                }
                    .to_log(collection_id_to_address(collection.id)),
            );
            <PalletCommon<
                T,
            >>::deposit_event(
                CommonEvent::ItemCreated(
                    collection.id,
                    TokenId(token),
                    data.owner.clone(),
                    1,
                ),
            );
        }
        Ok(())
    }
    pub fn set_allowance_unchecked(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token: TokenId,
        spender: Option<&T::CrossAccountId>,
        assume_implicit_eth: bool,
    ) {
        if let Some(spender) = spender {
            let old_spender = <Allowance<T>>::get((collection.id, token));
            <Allowance<T>>::insert((collection.id, token), spender);
            <PalletEvm<
                T,
            >>::deposit_log(
                ERC721Events::Approval {
                    owner: *sender.as_eth(),
                    approved: *spender.as_eth(),
                    token_id: token.into(),
                }
                    .to_log(collection_id_to_address(collection.id)),
            );
            if old_spender.as_ref() != Some(spender) {
                if let Some(old_owner) = old_spender {
                    <PalletCommon<
                        T,
                    >>::deposit_event(
                        CommonEvent::Approved(
                            collection.id,
                            token,
                            sender.clone(),
                            old_owner,
                            0,
                        ),
                    );
                }
                <PalletCommon<
                    T,
                >>::deposit_event(
                    CommonEvent::Approved(
                        collection.id,
                        token,
                        sender.clone(),
                        spender.clone(),
                        1,
                    ),
                );
            }
        } else {
            let old_spender = <Allowance<T>>::take((collection.id, token));
            if !assume_implicit_eth {
                <PalletEvm<
                    T,
                >>::deposit_log(
                    ERC721Events::Approval {
                        owner: *sender.as_eth(),
                        approved: H160::default(),
                        token_id: token.into(),
                    }
                        .to_log(collection_id_to_address(collection.id)),
                );
            }
            if let Some(old_spender) = old_spender {
                <PalletCommon<
                    T,
                >>::deposit_event(
                    CommonEvent::Approved(
                        collection.id,
                        token,
                        sender.clone(),
                        old_spender,
                        0,
                    ),
                );
            }
        }
    }
    /// Set allowance for the spender to `transfer` or `burn` sender's token.
    ///
    /// - `token`: Token the spender is allowed to `transfer` or `burn`.
    pub fn set_allowance(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        token: TokenId,
        spender: Option<&T::CrossAccountId>,
    ) -> DispatchResult {
        if collection.permissions.access() == AccessMode::AllowList {
            collection.check_allowlist(sender)?;
            if let Some(spender) = spender {
                collection.check_allowlist(spender)?;
            }
        }
        if let Some(spender) = spender {
            <PalletCommon<T>>::ensure_correct_receiver(spender)?;
        }
        let token_data = <TokenData<T>>::get((collection.id, token))
            .ok_or(<CommonError<T>>::TokenNotFound)?;
        if &token_data.owner != sender {
            {
                if !collection.ignores_owned_amount(sender) {
                    { return Err(<CommonError<T>>::CantApproveMoreThanOwned.into()) };
                }
            };
        }
        Self::set_allowance_unchecked(collection, sender, token, spender, false);
        Ok(())
    }
    /// Checks allowance for the spender to use the token.
    fn check_allowed(
        collection: &NonfungibleHandle<T>,
        spender: &T::CrossAccountId,
        from: &T::CrossAccountId,
        token: TokenId,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        if spender.conv_eq(from) {
            return Ok(());
        }
        if collection.permissions.access() == AccessMode::AllowList {
            collection.check_allowlist(spender)?;
        }
        if collection.limits.owner_can_transfer()
            && collection.is_owner_or_admin(spender)
        {
            return Ok(());
        }
        if let Some(source) = T::CrossTokenAddressMapping::address_to_token(from) {
            {
                if !<PalletStructure<
                    T,
                >>::check_indirectly_owned(
                    spender.clone(),
                    source.0,
                    source.1,
                    None,
                    nesting_budget,
                )? {
                    { return Err(<CommonError<T>>::ApprovedValueTooLow.into()) };
                }
            };
            return Ok(());
        }
        if <Allowance<T>>::get((collection.id, token)).as_ref() == Some(spender) {
            return Ok(());
        }
        {
            if !collection.ignores_allowance(spender) {
                { return Err(<CommonError<T>>::ApprovedValueTooLow.into()) };
            }
        };
        Ok(())
    }
    /// Transfer NFT token from one account to another.
    ///
    /// Same as the [`transfer`] but spender doesn't needs to be the owner of the token.
    /// The owner should set allowance for the spender to transfer token.
    ///
    /// [`transfer`]: struct.Pallet.html#method.transfer
    pub fn transfer_from(
        collection: &NonfungibleHandle<T>,
        spender: &T::CrossAccountId,
        from: &T::CrossAccountId,
        to: &T::CrossAccountId,
        token: TokenId,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        Self::check_allowed(collection, spender, from, token, nesting_budget)?;
        Self::transfer(collection, from, to, token, nesting_budget)
    }
    /// Burn NFT token for `from` account.
    ///
    /// Same as the [`burn`] but spender doesn't need to be an owner of the token. The owner should
    /// set allowance for the spender to burn token.
    ///
    /// [`burn`]: struct.Pallet.html#method.burn
    pub fn burn_from(
        collection: &NonfungibleHandle<T>,
        spender: &T::CrossAccountId,
        from: &T::CrossAccountId,
        token: TokenId,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        Self::check_allowed(collection, spender, from, token, nesting_budget)?;
        Self::burn(collection, from, token)
    }
    /// Check that `from` token could be nested in `under` token.
    ///
    pub fn check_nesting(
        handle: &NonfungibleHandle<T>,
        sender: T::CrossAccountId,
        from: (CollectionId, TokenId),
        under: TokenId,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        let nesting = handle.permissions.nesting();
        #[cfg(not(feature = "runtime-benchmarks"))]
        let permissive = false;
        if permissive {} else if nesting.token_owner
            && <PalletStructure<
                T,
            >>::check_indirectly_owned(
                sender.clone(),
                handle.id,
                under,
                Some(from),
                nesting_budget,
            )?
        {} else if nesting.collection_admin && handle.is_owner_or_admin(&sender)
        {} else {
            { return Err(<CommonError<T>>::UserIsNotAllowedToNest.into()) };
        }
        if let Some(whitelist) = &nesting.restricted {
            {
                if !whitelist.contains(&from.0) {
                    {
                        return Err(
                            <CommonError<T>>::SourceCollectionIsNotAllowedToNest.into(),
                        )
                    };
                }
            };
        }
        Ok(())
    }
    fn nest(under: (CollectionId, TokenId), to_nest: (CollectionId, TokenId)) {
        <TokenChildren<T>>::insert((under.0, under.1, (to_nest.0, to_nest.1)), true);
    }
    fn unnest(under: (CollectionId, TokenId), to_unnest: (CollectionId, TokenId)) {
        <TokenChildren<T>>::remove((under.0, under.1, to_unnest));
    }
    fn collection_has_tokens(collection_id: CollectionId) -> bool {
        <TokenData<T>>::iter_prefix((collection_id,)).next().is_some()
    }
    fn token_has_children(collection_id: CollectionId, token_id: TokenId) -> bool {
        <TokenChildren<T>>::iter_prefix((collection_id, token_id)).next().is_some()
    }
    pub fn token_children_ids(
        collection_id: CollectionId,
        token_id: TokenId,
    ) -> Vec<TokenChild> {
        <TokenChildren<T>>::iter_prefix((collection_id, token_id))
            .map(|((child_collection_id, child_id), _)| TokenChild {
                collection: child_collection_id,
                token: child_id,
            })
            .collect()
    }
    /// Mint single NFT token.
    ///
    /// Delegated to [`create_multiple_items`]
    ///
    /// [`create_multiple_items`]: struct.Pallet.html#method.create_multiple_items
    pub fn create_item(
        collection: &NonfungibleHandle<T>,
        sender: &T::CrossAccountId,
        data: CreateItemData<T>,
        nesting_budget: &dyn Budget,
    ) -> DispatchResult {
        Self::create_multiple_items(
            collection,
            sender,
            <[_]>::into_vec(#[rustc_box] ::alloc::boxed::Box::new([data])),
            nesting_budget,
        )
    }
}
