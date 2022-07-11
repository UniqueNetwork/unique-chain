use frame_support::traits::Currency;
use pallet_evm;
use sp_runtime;

use unique_runtime_common::types::AccountId;

use super::constructor::{Balances, Runtime};

pub(crate) type CrossAccountId = pallet_evm::account::BasicCrossAccountId<Runtime>;

pub(crate) type NegativeImbalance = <Balances as Currency<AccountId>>::NegativeImbalance;

/// Digest item type.
pub type DigestItem = sp_runtime::generic::DigestItem;

