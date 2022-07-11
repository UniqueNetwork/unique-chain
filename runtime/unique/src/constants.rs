use sp_runtime::create_runtime_str;
use sp_version::RuntimeVersion;

use super::constructor::RUNTIME_API_VERSIONS_PUB;

pub const RUNTIME_NAME: &str = "unique";
pub const TOKEN_SYMBOL: &str = "UNQ";

/// This runtime version.
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!(RUNTIME_NAME),
    impl_name: create_runtime_str!(RUNTIME_NAME),
    authoring_version: 1,
    spec_version: 924010,
    impl_version: 0,
    apis: RUNTIME_API_VERSIONS_PUB,
    transaction_version: 1,
    state_version: 0,
};