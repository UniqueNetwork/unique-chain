use super::*;
use core::convert::AsRef;

pub enum RmrkProperty {
    Metadata,
    CollectionType,
    Recipient,
    Royalty,
    Equipped,
    Pending,
    ResourceCollection,
    ResourcePriorities,
    PendingRemoval,
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
    ThemeProperty(RmrkString),
    ThemeInherit,
}

impl RmrkProperty {
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
            Self::Recipient => key!("recipient"),
            Self::Royalty => key!("royalty"),
            Self::Equipped => key!("equipped"),
            Self::Pending => key!("pending"),
            Self::ResourceCollection => key!("resource-collection"),
            Self::ResourcePriorities => key!("resource-priorities"),
            Self::PendingRemoval => key!("pending-removal"),
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
    (Config=$cfg:ty, $key:ident $(($key_ext:expr))?: $value:expr) => {{
        let key = rmrk_property!(@$cfg, $key $(($key_ext))?)?;

        let value = $value.into_property_value()
            .map_err(<$crate::Error<$cfg>>::from)?;

        Ok::<_, $crate::Error<$cfg>>(Property {
            key,
            value,
        })
    }};

    (@$cfg:ty, $key:ident $(($key_ext:expr))?) => {
        $crate::RmrkProperty::$key $(($key_ext))?.to_key::<$cfg>()
    };

    (Config=$cfg:ty, $key:ident $(($key_ext:expr))?) => {
        PropertyScope::Rmrk.apply(rmrk_property!(@$cfg, $key $(($key_ext))?)?)
            .map_err(|_| <$crate::Error<$cfg>>::RmrkPropertyKeyIsTooLong)
    };
}
