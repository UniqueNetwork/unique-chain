/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.

use sp_runtime::impl_opaque_keys;
use sp_std::prelude::*;

pub use unique_runtime_common::types::*;

use super::constructor::Aura;

impl_opaque_keys! {
    pub struct SessionKeys {
        pub aura: Aura,
    }
}