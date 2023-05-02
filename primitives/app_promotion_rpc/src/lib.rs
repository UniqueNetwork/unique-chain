#![cfg_attr(not(feature = "std"), no_std)]

use sp_std::vec::Vec;
use codec::Decode;
use sp_runtime::{
	DispatchError,
	traits::{AtLeast32BitUnsigned, Member},
};

type Result<T> = core::result::Result<T, DispatchError>;

sp_api::decl_runtime_apis! {
	#[api_version(2)]
	/// Trait for generate rpc.
	pub trait AppPromotionApi<BlockNumber ,CrossAccountId, AccountId> where
		BlockNumber: Decode + Member + AtLeast32BitUnsigned,
		AccountId: Decode,
		CrossAccountId: pallet_evm::account::CrossAccountId<AccountId>,
	{
		fn total_staked(staker: Option<CrossAccountId>) -> Result<u128>;
		fn total_staked_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>>;
		fn pending_unstake(staker: Option<CrossAccountId>) -> Result<u128>;
		fn pending_unstake_per_block(staker: CrossAccountId) -> Result<Vec<(BlockNumber, u128)>>;
	}
}
