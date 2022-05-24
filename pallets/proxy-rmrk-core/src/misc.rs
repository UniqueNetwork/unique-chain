use super::*;
use codec::{Encode, Decode};
use pallet_nonfungible::{NonfungibleHandle, ItemData};

macro_rules! impl_rmrk_value {
    ($enum_name:path, decode_error: $error:ident) => {
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

#[macro_export]
macro_rules! map_common_err_to_proxy {
    (match $err:ident { $($common_err:ident => $proxy_err:ident),+ }) => {
        $(
            if $err == <CommonError<T>>::$common_err.into() {
                return <Error<T>>::$proxy_err.into()
            } else
        )+ {
            $err
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

impl<T: Encode> IntoPropertyValue for T {
    fn into_property_value(self) -> Result<PropertyValue, MiscError> {
        self.encode()
            .try_into()
            .map_err(|_| MiscError::RmrkPropertyValueIsTooLong)
    }
}

pub trait RmrkNft {
    fn rmrk_nft_type(&self) -> Option<NftType>;
}

impl<CrossAccountId> RmrkNft for ItemData<CrossAccountId> {
    fn rmrk_nft_type(&self) -> Option<NftType> {
        let mut value = self.const_data.as_slice();

        NftType::decode(&mut value).ok()
    }
}

pub trait RmrkDecode<T: Decode> {
    fn decode_property(&self) -> Option<T>;
}

impl<T: Decode> RmrkDecode<T> for RmrkString {
    fn decode_property(&self) -> Option<T> { // todo access runtime errors? // but then rmrk_nft_type must have it too
        let mut value = self.as_slice();

        T::decode(&mut value).ok()
    }
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum CollectionType {
    Regular,
    Resource,
    Base,
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum NftType {
    Regular,
    Resource,
    FixedPart,
    SlotPart,
    Theme
}

impl_rmrk_value!(CollectionType, decode_error: CorruptedCollectionType);
