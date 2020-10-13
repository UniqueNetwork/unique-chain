// Copyright 2018-2019 Parity Technologies (UK) Ltd.
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

//! Definitions for environment types for contracts targeted at a
//! substrate chain with the default `node-runtime` configuration.

#![cfg_attr(not(feature = "std"), no_std)]

use core::{array::TryFromSliceError, convert::TryFrom};
use ink_core::env::Clear;
use scale::{Decode, Encode};
use sp_core::crypto::AccountId32;
#[cfg(feature = "ink-generate-abi")]
use type_metadata::{HasTypeId, HasTypeDef, Metadata, MetaType, TypeId, TypeDef, TypeIdArray};

pub mod calls;

/// Contract environment types defined in substrate node-runtime
#[cfg_attr(feature = "ink-generate-abi", derive(Metadata))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum NodeRuntimeTypes {}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Encode, Decode)]
pub struct AccountId (AccountId32);

impl From<AccountId32> for AccountId {
    fn from(account: AccountId32) -> Self {
        AccountId(account)
    }
}

#[cfg(feature = "ink-generate-abi")]
impl HasTypeId for AccountId {
    fn type_id() -> TypeId {
        TypeIdArray::new(32, MetaType::new::<u8>()).into()
    }
}

#[cfg(feature = "ink-generate-abi")]
impl HasTypeDef for AccountId {
    fn type_def() -> TypeDef {
        TypeDef::builtin()
    }
}

/// The default SRML balance type.
pub type Balance = u128;

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

impl ink_core::env::EnvTypes for NodeRuntimeTypes {
    type AccountId = AccountId;
    type Balance = Balance;
    type Hash = Hash;
    type Timestamp = Timestamp;
    type BlockNumber = BlockNumber;
    type Call = calls::Call;
}
