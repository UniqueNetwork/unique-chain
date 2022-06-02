use super::*;
use codec::{Encode, Decode};
use derivative::Derivative;

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

// todo fail if unwrap doesn't work
impl<T: Decode + Default, S> RmrkDecode<T, S> for BoundedVec<u8, S> {
	fn decode_or_default(&self) -> T {
		let mut value = self.as_slice();

		T::decode(&mut value).unwrap_or_default()
	}
}

pub trait RmrkRebind<T, S> {
	fn rebind(&self) -> BoundedVec<u8, S>;
}

// todo fail if unwrap doesn't work
impl<T, S> RmrkRebind<T, S> for BoundedVec<u8, T>
where
	BoundedVec<u8, S>: TryFrom<Vec<u8>>,
{
	fn rebind(&self) -> BoundedVec<u8, S> {
		BoundedVec::<u8, S>::try_from(self.clone().into_inner()).unwrap_or_default()
	}
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum CollectionType {
	Regular,
	Resource,
	Base,
}

// todo remove default?
#[derive(Encode, Decode, PartialEq, Eq, Derivative)]
#[derivative(Default(bound=""))]
pub enum NftType {
	#[derivative(Default)]
	Regular,
	Resource,
	FixedPart,
	SlotPart,
	Theme,
}

// todo remove default?
#[derive(Encode, Decode, PartialEq, Eq, Derivative)]
#[derivative(Default(bound=""))]
pub enum ResourceType {
	#[derivative(Default)]
	Basic,
	Composable,
	Slot,
}
