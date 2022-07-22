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

#[derive(Encode, Decode, Eq, PartialEq, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
#[cfg_attr(feature = "std", serde(bound = "BoundedString: AsRef<[u8]>"))]
pub struct BasicResource<BoundedString> {
	/// If the resource is Media, the base property is absent. Media src should be a URI like an
	/// IPFS hash.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub src: Option<BoundedString>,

	/// Reference to IPFS location of metadata
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub metadata: Option<BoundedString>,

	/// Optional location or identier of license
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub license: Option<BoundedString>,

	/// If the resource has the thumb property, this will be a URI to a thumbnail of the given
	/// resource. For example, if we have a composable NFT like a Kanaria bird, the resource is
	/// complex and too detailed to show in a search-results page or a list. Also, if a bird owns
	/// another bird, showing the full render of one bird inside the other's inventory might be a
	/// bit of a strain on the browser. For this reason, the thumb value can contain a URI to an
	/// image that is lighter and faster to load but representative of this resource.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub thumb: Option<BoundedString>,
}

#[derive(Encode, Decode, Eq, PartialEq, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			BoundedParts: AsRef<[PartId]>
		"#)
)]
pub struct ComposableResource<BoundedString, BoundedParts> {
	/// If a resource is composed, it will have an array of parts that compose it
	#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub parts: BoundedParts,

	/// A Base is uniquely identified by the combination of the word `base`, its minting block
	/// number, and user provided symbol during Base creation, glued by dashes `-`, e.g.
	/// base-4477293-kanaria_superbird.
	pub base: BaseId,

	/// If the resource is Media, the base property is absent. Media src should be a URI like an
	/// IPFS hash.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub src: Option<BoundedString>,

	/// Reference to IPFS location of metadata
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub metadata: Option<BoundedString>,

	/// If the resource has the slot property, it was designed to fit into a specific Base's slot.
	/// The baseslot will be composed of two dot-delimited values, like so:
	/// "base-4477293-kanaria_superbird.machine_gun_scope". This means: "This resource is
	/// compatible with the machine_gun_scope slot of base base-4477293-kanaria_superbird

	/// Optional location or identier of license
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub license: Option<BoundedString>,

	/// If the resource has the thumb property, this will be a URI to a thumbnail of the given
	/// resource. For example, if we have a composable NFT like a Kanaria bird, the resource is
	/// complex and too detailed to show in a search-results page or a list. Also, if a bird owns
	/// another bird, showing the full render of one bird inside the other's inventory might be a
	/// bit of a strain on the browser. For this reason, the thumb value can contain a URI to an
	/// image that is lighter and faster to load but representative of this resource.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub thumb: Option<BoundedString>,
}

#[derive(Encode, Decode, Eq, PartialEq, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
#[cfg_attr(feature = "std", serde(bound = "BoundedString: AsRef<[u8]>"))]
pub struct SlotResource<BoundedString> {
	/// A Base is uniquely identified by the combination of the word `base`, its minting block
	/// number, and user provided symbol during Base creation, glued by dashes `-`, e.g.
	/// base-4477293-kanaria_superbird.
	pub base: BaseId,

	/// If the resource is Media, the base property is absent. Media src should be a URI like an
	/// IPFS hash.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub src: Option<BoundedString>,

	/// Reference to IPFS location of metadata
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub metadata: Option<BoundedString>,

	/// If the resource has the slot property, it was designed to fit into a specific Base's slot.
	/// The baseslot will be composed of two dot-delimited values, like so:
	/// "base-4477293-kanaria_superbird.machine_gun_scope". This means: "This resource is
	/// compatible with the machine_gun_scope slot of base base-4477293-kanaria_superbird
	pub slot: SlotId,

	/// The license field, if present, should contain a link to a license (IPFS or static HTTP
	/// url), or an identifier, like RMRK_nocopy or ipfs://ipfs/someHashOfLicense.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub license: Option<BoundedString>,

	/// If the resource has the thumb property, this will be a URI to a thumbnail of the given
	/// resource. For example, if we have a composable NFT like a Kanaria bird, the resource is
	/// complex and too detailed to show in a search-results page or a list. Also, if a bird owns
	/// another bird, showing the full render of one bird inside the other's inventory might be a
	/// bit of a strain on the browser. For this reason, the thumb value can contain a URI to an
	/// image that is lighter and faster to load but representative of this resource.
	#[cfg_attr(feature = "std", serde(with = "serialize::opt_vec"))]
	pub thumb: Option<BoundedString>,
}

#[derive(Encode, Decode, Eq, PartialEq, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			BoundedParts: AsRef<[PartId]>
		"#)
)]
pub enum ResourceTypes<BoundedString, BoundedParts> {
	Basic(BasicResource<BoundedString>),
	Composable(ComposableResource<BoundedString, BoundedParts>),
	Slot(SlotResource<BoundedString>),
}

#[derive(Encode, Decode, Eq, PartialEq, Clone, Debug, TypeInfo, MaxEncodedLen)]
#[cfg_attr(feature = "std", derive(Serialize))]
#[cfg_attr(
	feature = "std",
	serde(bound = r#"
			BoundedString: AsRef<[u8]>,
			BoundedParts: AsRef<[PartId]>
		"#)
)]
pub struct ResourceInfo<BoundedString, BoundedParts> {
	/// ID a unique identifier for a resource across all those of a single NFT.
	/// The combination of a collection ID, an NFT ID, and the resource ID must be 
	/// unique across the entire RMRK ecosystem.
	//#[cfg_attr(feature = "std", serde(with = "serialize::vec"))]
	pub id: ResourceId,

	/// Resource type and the accordingly structured data stored
	pub resource: ResourceTypes<BoundedString, BoundedParts>,

	/// If resource is sent to non-rootowned NFT, pending will be false and need to be accepted
	pub pending: bool,

	/// If resource removal request is sent by non-rootowned NFT, pending will be true and need to be accepted
	pub pending_removal: bool,
}
