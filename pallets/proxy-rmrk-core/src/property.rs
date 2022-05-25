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
    // // RmrkPartId(/* Id type? */)
    EquippableList,
    ZIndex,
    ThemeName,
    ThemeProperty(&'r RmrkString),
    ThemeInherit,
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
            // RmrkResourceId(/* Id type? */)
            // RmrkPartId(/* Id type? */)
            Self::EquippableList => key!("equippable-list"),
            Self::ZIndex => key!("z-index"),
            Self::ThemeName => key!("theme-name"),
            Self::ThemeProperty(name) => key!("theme-property-", name),
            Self::ThemeInherit => key!("theme-inherit"),
        }
    }
}

#[macro_export]
macro_rules! rmrk_property {
    (Config=$cfg:ty, key: $key:ident $(($key_ext:expr))?) => {
        rmrk_property!(Config=$cfg, $crate::RmrkProperty::$key $(($key_ext))?)
    };

    (Config=$cfg:ty, $key:ident $(($key_ext:expr))?: $value:expr) => {{
        let key = rmrk_property!(@$cfg, $crate::RmrkProperty::$key $(($key_ext))?)?;

        let value = $value.into_property_value()
            .map_err(<$crate::Error<$cfg>>::from)?;

        Ok::<_, $crate::Error<$cfg>>(Property {
            key,
            value,
        })
    }};

    (@$cfg:ty, $key_enum:expr) => {
        $key_enum.to_key::<$cfg>()
    };

    (Config=$cfg:ty, $key_enum:expr) => {
        PropertyScope::Rmrk.apply(rmrk_property!(@$cfg, $key_enum)?)
            .map_err(|_| <$crate::Error<$cfg>>::RmrkPropertyKeyIsTooLong)
    };
}
