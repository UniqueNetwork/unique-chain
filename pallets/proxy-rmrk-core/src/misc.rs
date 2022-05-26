use super::*;
use codec::{Encode, Decode};

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

pub trait RmrkDecode<T: Decode + Default, S> {
    fn decode_or_default(&self) -> T;
}

impl<T: Decode + Default, S> RmrkDecode<T, S> for BoundedVec<u8, S> {
    fn decode_or_default(&self) -> T {
        let mut value = self.as_slice();

        T::decode(&mut value).unwrap_or_default()
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
