use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

#[cfg(feature = "std")]
use serde::Serialize;

#[cfg(feature = "std")]
use crate::serialize;

use crate::primitives::*;

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, Eq, MaxEncodedLen)]
#[cfg_attr(feature = "std", serde(bound = "BoundedString: AsRef<[u8]>"))]
pub struct FixedPart<BoundedString> {
	pub id: PartId,
	pub z: ZIndex,

	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub src: BoundedString,
}

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, Eq, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = "BoundedCollectionList: AsRef<[CollectionId]>")
)]
pub enum EquippableList<BoundedCollectionList> {
	All,
	Empty,
	Custom(#[cfg_attr(feature = "std", serde(with = "serialize::vec"))] BoundedCollectionList),
}

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, Eq, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			BoundedCollectionList: AsRef<[CollectionId]>
		"#)
)]
pub struct SlotPart<BoundedString, BoundedCollectionList> {
	pub id: PartId,
	pub equippable: EquippableList<BoundedCollectionList>,

	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub src: BoundedString,

	pub z: ZIndex,
}

#[cfg_attr(feature = "std", derive(Serialize))]
#[derive(Encode, Decode, Debug, TypeInfo, Clone, PartialEq, Eq, MaxEncodedLen)]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			BoundedCollectionList: AsRef<[CollectionId]>
		"#)
)]
pub enum PartType<BoundedString, BoundedCollectionList> {
	FixedPart(FixedPart<BoundedString>),
	SlotPart(SlotPart<BoundedString, BoundedCollectionList>),
}

impl<BoundedString, BoundedCollectionList> PartType<BoundedString, BoundedCollectionList> {
	pub fn id(&self) -> PartId {
		match self {
			Self::FixedPart(part) => part.id,
			Self::SlotPart(part) => part.id,
		}
	}

	pub fn src(&self) -> &BoundedString {
		match self {
			Self::FixedPart(part) => &part.src,
			Self::SlotPart(part) => &part.src,
		}
	}

	pub fn z_index(&self) -> ZIndex {
		match self {
			Self::FixedPart(part) => part.z,
			Self::SlotPart(part) => part.z,
		}
	}
}
