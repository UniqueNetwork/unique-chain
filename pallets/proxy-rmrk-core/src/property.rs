use super::*;
use core::convert::AsRef;

pub enum RmrkProperty<'r> {
	Metadata,
	CollectionType,
	RoyaltyInfo,
	Equipped,
	ResourceCollection,
	ResourcePriorities,
	ResourceType,
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
			Self::RoyaltyInfo => key!("royalty-info"),
			Self::Equipped => key!("equipped"),
			Self::ResourceCollection => key!("resource-collection"),
			Self::ResourcePriorities => key!("resource-priorities"),
			Self::ResourceType => key!("resource-type"),
			Self::PendingResourceAccept => key!("pending-accept"),
			Self::PendingResourceRemoval => key!("pending-removal"),
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
