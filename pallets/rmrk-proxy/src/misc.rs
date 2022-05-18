use super::*;
use codec::{Encode, Decode};
use pallet_nonfungible::NonfungibleHandle;

#[macro_export]
macro_rules! rmrk_property {
    ($key:ident, $value:expr) => {
        Property {
            key: rmrk_property!($key),
            value: $value.into()
        }
    };

    ($key:ident) => {
        RmrkProperty::$key.to_key()
    };
}

macro_rules! impl_rmrk_value {
    ($enum_name:path, decode_error: $error:ident) => {
        impl Into<PropertyValue> for $enum_name {
            fn into(self) -> PropertyValue {
                self.encode().try_into().unwrap()
            }
        }

        impl TryFrom<&PropertyValue> for $enum_name {
            type Error = MiscError;

            fn try_from(value: &PropertyValue) -> Result<Self, Self::Error> {
                let mut value = value.as_slice();

                <$enum_name>::decode(&mut value)
                    .map_err(|_| MiscError::$error)
            }
        }

    };
}

pub enum MiscError {
    CorruptedCollectionType,
}

impl<T: Config> From<MiscError> for Error<T> {
    fn from(error: MiscError) -> Self {
        match error {
            MiscError::CorruptedCollectionType => Self::CorruptedCollectionType,
        }
    }
}

pub trait IntoNftCollection<T: Config> {
    fn into_nft_collection(self) -> Result<NonfungibleHandle<T>, Error<T>>;
}

impl<T: Config> IntoNftCollection<T> for CollectionHandle<T> {
    fn into_nft_collection(self) -> Result<NonfungibleHandle<T>, Error<T>> {
        match self.mode {
            CollectionMode::NFT => Ok(NonfungibleHandle::cast(self)),
            _ => Err(<Error<T>>::NotRmrkCollection)
        }
    }
}

pub enum RmrkProperty {
    Metadata,
    CollectionType,
}

impl RmrkProperty {
    pub fn to_key(self) -> PropertyKey {
        let key = |str_key: &str| {
            PropertyKey::try_from(
                str_key.bytes().collect::<Vec<_>>()
            ).unwrap()
        };

        match self {
            Self::Metadata => key("metadata"),
            Self::CollectionType => key("collection-type"),
        }
    }
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum CollectionType {
    Regular,
    Resource,
    Base,
}

impl_rmrk_value!(CollectionType, decode_error: CorruptedCollectionType);
