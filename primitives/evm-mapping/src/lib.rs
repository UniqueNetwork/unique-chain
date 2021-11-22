#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::sp_runtime::AccountId32;
use sp_core::H160;

/// Transforms substrate addresses to ethereum (Reverse of `EvmAddressMapping`)
/// pallet_evm doesn't have this, as it only checks if eth address
/// is owned by substrate via `EnsureAddressOrigin` trait
///
/// This trait implementations shouldn't conflict with used `EnsureAddressOrigin`
pub trait EvmBackwardsAddressMapping<AccountId> {
	fn from_account_id(account_id: AccountId) -> H160;
}

/// Should have same mapping as EnsureAddressTruncated
pub struct MapBackwardsAddressTruncated;
impl EvmBackwardsAddressMapping<AccountId32> for MapBackwardsAddressTruncated {
	fn from_account_id(account_id: AccountId32) -> H160 {
		let mut out = [0; 20];
		out.copy_from_slice(&(account_id.as_ref() as &[u8])[0..20]);
		H160(out)
	}
}
