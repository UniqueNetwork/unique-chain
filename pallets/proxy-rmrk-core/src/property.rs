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

const RESOURCE_ID_PREFIX: &str = "rsid-";

pub enum RmrkProperty<'r> {
	Metadata,
	CollectionType,
	RmrkInternalCollectionId,
	TokenType,
	Transferable,
	RoyaltyInfo,
	Equipped,
	ResourcePriorities,
	NextResourceId,
	ResourceId(RmrkResourceId),
	PendingNftAccept,
	Parts,
	Base,
	Src,
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
			Self::RmrkInternalCollectionId => key!("internal-id"),
			Self::TokenType => key!("token-type"),
			Self::Transferable => key!("transferable"),
			Self::RoyaltyInfo => key!("royalty-info"),
			Self::Equipped => key!("equipped"),
			Self::ResourcePriorities => key!("resource-priorities"),
			Self::NextResourceId => key!("next-resource-id"),
			Self::ResourceId(id) => key!(RESOURCE_ID_PREFIX, id.to_le_bytes()),
			Self::PendingNftAccept => key!("pending-nft-accept"),
			Self::Parts => key!("parts"),
			Self::Base => key!("base"),
			Self::Src => key!("src"),
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
