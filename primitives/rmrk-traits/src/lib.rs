// Copyright (C) 2021-2022 RMRK
// This file is part of rmrk-substrate.
// License: Apache 2.0 modified by RMRK, see https://github.com/rmrk-team/rmrk-substrate/blob/main/LICENSE

#![cfg_attr(not(feature = "std"), no_std)]

pub mod base;
pub mod collection;
pub mod nft;
pub mod part;
pub mod property;
pub mod resource;
pub mod theme;

#[cfg(feature = "std")]
mod serialize;

pub use base::BaseInfo;
pub use part::{EquippableList, FixedPart, PartType, SlotPart};
pub use theme::{Theme, ThemeProperty};
pub use collection::CollectionInfo;
pub use nft::{AccountIdOrCollectionNftTuple, NftInfo, RoyaltyInfo, NftChild};
pub use property::PropertyInfo;
pub use resource::{BasicResource, ComposableResource, ResourceInfo, ResourceTypes, SlotResource};
pub mod primitives {
	pub type CollectionId = u32;
	pub type ResourceId = u32;
	pub type NftId = u32;
	pub type BaseId = u32;
	pub type SlotId = u32;
	pub type PartId = u32;
	pub type ZIndex = u32;
}
