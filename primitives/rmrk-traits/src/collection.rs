// Copyright (C) 2021-2022 RMRK
// This file is part of rmrk-substrate.
// License: Apache 2.0 modified by RMRK, see https://github.com/rmrk-team/rmrk-substrate/blob/main/LICENSE

use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

#[cfg(feature = "std")]
use serde::Serialize;

#[cfg(feature = "std")]
use crate::serialize;

#[cfg_attr(feature = "std", derive(PartialEq, Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			AccountId: Serialize,
			BoundedString: AsRef<[u8]>,
			BoundedSymbol: AsRef<[u8]>
		"#)
)]
pub struct CollectionInfo<BoundedString, BoundedSymbol, AccountId> {
	/// Current bidder and bid price.
	pub issuer: AccountId,

	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub metadata: BoundedString,
	pub max: Option<u32>,

	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub symbol: BoundedSymbol,
	pub nfts_count: u32,
}
