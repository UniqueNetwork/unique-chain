use super::*;
use codec::{Encode, Decode};
use pallet_nonfungible::NonfungibleHandle;

macro_rules! impl_rmrk_value {
    ($enum_name:path, decode_error: $error:ident) => {
        impl IntoPropertyValue for $enum_name {
            fn into_property_value(self) -> Result<PropertyValue, MiscError> {
                self.encode()
                    .try_into()
                    .map_err(|_| MiscError::RmrkPropertyValueIsTooLong)
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
    RmrkPropertyValueIsTooLong,
    CorruptedCollectionType,
}

impl<T: Config> From<MiscError> for Error<T> {
    fn from(error: MiscError) -> Self {
        match error {
            MiscError::RmrkPropertyValueIsTooLong => Self::RmrkPropertyValueIsTooLong,
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
            _ => Err(<Error<T>>::CollectionUnknown)
        }
    }
}

pub trait IntoPropertyValue {
    fn into_property_value(self) -> Result<PropertyValue, MiscError>;
}

impl<L: Get<u32>> IntoPropertyValue for BoundedVec<u8, L> {
    fn into_property_value(self) -> Result<PropertyValue, MiscError> {
        self.into_inner()
            .try_into()
            .map_err(|_| MiscError::RmrkPropertyValueIsTooLong)
    }
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum CollectionType {
    Regular,
    Resource,
    Base,
}

impl_rmrk_value!(CollectionType, decode_error: CorruptedCollectionType);
