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

use super::*;
use core::convert::AsRef;

pub enum RmrkProperty<'r> {
	Metadata,
	CollectionType,
	TokenType,
	Transferable,
	RoyaltyInfo,
	Equipped,
	ResourceCollection,
	ResourcePriorities,
	ResourceType,
	PendingNftAccept,
	PendingResourceAccept,
	PendingResourceRemoval,
	Parts,
	Base,
	Src,
	Slot,
	License,
	Thumb,
	EquippedNft,
	BaseType,
	ExternalPartId,
	EquippableList,
	ZIndex,
	ThemeName,
	ThemeInherit,
	UserProperty(&'r [u8]),
}

impl<'r> RmrkProperty<'r> {
	pub fn to_key<T: Config>(self) -> Result<PropertyKey, Error<T>> {
		fn get_bytes<T: AsRef<[u8]>>(container: &T) -> &[u8] {
			container.as_ref()
		}

		macro_rules! key {
            ($($component:expr),+) => {
                PropertyKey::try_from([$(key!(@ &$component)),+].concat())
                    .map_err(|_| <Error<T>>::RmrkPropertyKeyIsTooLong)
            };

            (@ $key:expr) => {
                get_bytes($key)
            };
        }

		match self {
			Self::Metadata => key!("metadata"),
			Self::CollectionType => key!("collection-type"),
			Self::TokenType => key!("token-type"),
			Self::Transferable => key!("transferable"),
			Self::RoyaltyInfo => key!("royalty-info"),
			Self::Equipped => key!("equipped"),
			Self::ResourceCollection => key!("resource-collection"),
			Self::ResourcePriorities => key!("resource-priorities"),
			Self::ResourceType => key!("resource-type"),
			Self::PendingNftAccept => key!("pending-nft-accept"),
			Self::PendingResourceAccept => key!("pending-resource-accept"),
			Self::PendingResourceRemoval => key!("pending-resource-removal"),
			Self::Parts => key!("parts"),
			Self::Base => key!("base"),
			Self::Src => key!("src"),
			Self::Slot => key!("slot"),
			Self::License => key!("license"),
			Self::Thumb => key!("thumb"),
			Self::EquippedNft => key!("equipped-nft"),
			Self::BaseType => key!("base-type"),
			Self::ExternalPartId => key!("ext-part-id"),
			Self::EquippableList => key!("equippable-list"),
			Self::ZIndex => key!("z-index"),
			Self::ThemeName => key!("theme-name"),
			Self::ThemeInherit => key!("theme-inherit"),
			Self::UserProperty(name) => key!("userprop-", name),
		}
	}
}
