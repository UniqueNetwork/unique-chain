#![cfg_attr(not(feature = "std"), no_std)]

use scale_info::TypeInfo;
use sp_std::vec::Vec;

#[cfg(feature = "std")]
use serde::Serialize;

use sp_runtime::ApplyExtrinsicResult;
use sp_core::Bytes;

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Debug, TypeInfo)]
pub struct PovInfo {
	pub proof_size: u64,
	pub compact_proof_size: u64,
	pub compressed_proof_size: u64,
	pub results: Vec<ApplyExtrinsicResult>,
	pub key_values: Vec<TrieKeyValue>,
}

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Debug, TypeInfo)]
pub struct TrieKeyValue {
	pub key: Vec<u8>,
	pub value: Vec<u8>,
}

sp_api::decl_runtime_apis! {
	pub trait PovEstimateApi {
		fn pov_estimate(uxt: Bytes) -> ApplyExtrinsicResult;
	}
}
