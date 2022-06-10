// Copyright (C) 2021-2022 RMRK
// This file is part of rmrk-substrate.
// License: Apache 2.0 modified by RMRK, see https://github.com/rmrk-team/rmrk-substrate/blob/main/LICENSE

use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

#[cfg(feature = "std")]
use serde::Serialize;

#[cfg(feature = "std")]
use crate::serialize;

use crate::primitives::*;

#[derive(Encode, Decode, Eq, PartialEq, Copy, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
pub enum AccountIdOrCollectionNftTuple<AccountId> {
	AccountId(AccountId),
	CollectionAndNftTuple(CollectionId, NftId),
}

/// Royalty information (recipient and amount)
#[cfg_attr(feature = "std", derive(PartialEq, Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, MaxEncodedLen)]
pub struct RoyaltyInfo<AccountId, RoyaltyAmount> {
	/// Recipient (AccountId) of the royalty
	pub recipient: AccountId,
	/// Amount (Permill) of the royalty
	pub amount: RoyaltyAmount,
}

/// Nft info.
#[cfg_attr(feature = "std", derive(PartialEq, Eq, Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			AccountId: Serialize,
			RoyaltyAmount: Serialize,
			BoundedString: AsRef<[u8]>
		"#)
)]
pub struct NftInfo<AccountId, RoyaltyAmount, BoundedString> {
	/// The owner of the NFT, can be either an Account or a tuple (CollectionId, NftId)
	pub owner: AccountIdOrCollectionNftTuple<AccountId>,
	/// Royalty (optional)
	pub royalty: Option<RoyaltyInfo<AccountId, RoyaltyAmount>>,

	/// Arbitrary data about an instance, e.g. IPFS hash
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub metadata: BoundedString,

	/// Equipped state
	pub equipped: bool,
	/// Pending state (if sent to NFT)
	pub pending: bool,
}

#[cfg_attr(feature = "std", derive(PartialEq, Eq, Serialize))]
#[derive(Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct NftChild {
	pub collection_id: CollectionId,
	pub nft_id: NftId,
}
