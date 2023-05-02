//! The Substrate Node Template runtime. This can be compiled with `#[no_std]`, ready for Wasm.

#![cfg_attr(not(feature = "std"), no_std)]
// `construct_runtime!` does a lot of recursion and requires us to increase the limit to 256.
#![recursion_limit = "1024"]
#![allow(clippy::from_over_into, clippy::identity_op)]
#![allow(clippy::fn_to_numeric_cast_with_truncation)]
// Make the WASM binary available.
#[cfg(feature = "std")]
include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));

extern crate alloc;

use frame_support::parameter_types;

use sp_version::RuntimeVersion;
use sp_runtime::create_runtime_str;

use up_common::types::*;

use ::xcm::latest::NetworkId;

#[path = "../../common/mod.rs"]
mod runtime_common;

pub mod xcm_barrier;

pub use runtime_common::*;

pub const RUNTIME_NAME: &str = "opal";
pub const TOKEN_SYMBOL: &str = "OPL";

/// This runtime version.
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: create_runtime_str!(RUNTIME_NAME),
	impl_name: create_runtime_str!(RUNTIME_NAME),
	authoring_version: 1,
	spec_version: 941054,
	impl_version: 0,
	apis: RUNTIME_API_VERSIONS,
	transaction_version: 3,
	state_version: 0,
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
	CheckInherents = CheckInherents,
);
