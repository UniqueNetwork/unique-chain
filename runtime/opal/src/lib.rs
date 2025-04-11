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

//! The Substrate Node Template runtime. This can be compiled with `#[no_std]`, ready for Wasm.

#![cfg_attr(not(feature = "std"), no_std)]
// `construct_runtime!` does a lot of recursion and requires us to increase the limit to 256.
#![recursion_limit = "1024"]
#![allow(clippy::from_over_into, clippy::identity_op)]
#![allow(clippy::fn_to_numeric_cast_with_truncation)]
// For `cumulus_pallet_dmp_queue`.
#![allow(deprecated)]
// Make the WASM binary available.
#[cfg(feature = "std")]
include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));

extern crate alloc;

use ::staging_xcm::latest::NetworkId;
use frame_support::parameter_types;
use sp_runtime::create_runtime_str;
use sp_version::RuntimeVersion;
use up_common::types::*;

mod runtime_common;

pub mod governance_timings;
pub mod xcm_barrier;

pub use runtime_common::*;

pub const TOKEN_SYMBOL: &str = "OPL";
pub const DECIMALS: u8 = 18;

/// This runtime version.
#[sp_version::runtime_version]
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: create_runtime_str!("opal"),
	impl_name: create_runtime_str!("opal"),
	authoring_version: 1,
	spec_version: 10170080,
	impl_version: 0,
	apis: RUNTIME_API_VERSIONS,
	transaction_version: 3,
	system_version: 1,
};

parameter_types! {
	pub const Version: RuntimeVersion = VERSION;
	pub const SS58Prefix: u16 = 42;
	pub const ChainId: u64 = 8882;
	pub const RelayNetwork: NetworkId = NetworkId::Kusama;
}

construct_runtime!();

impl_common_runtime_apis!();

cumulus_pallet_parachain_system::register_validate_block!(
	Runtime = Runtime,
	BlockExecutor = cumulus_pallet_aura_ext::BlockExecutor::<Runtime, Executive>,
);
