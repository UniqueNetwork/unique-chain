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

#![cfg_attr(not(feature = "std"), no_std)]

use scale_info::TypeInfo;

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
	pub result: ApplyExtrinsicResult,
}

sp_api::decl_runtime_apis! {
	pub trait PovEstimateApi {
		fn pov_estimate(uxt: Bytes) -> ApplyExtrinsicResult;
	}
}
