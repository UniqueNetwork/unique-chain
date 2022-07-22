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

//! Miscellaneous helpers and utilities used by the proxy pallet.

use super::*;
use codec::{Encode, Decode, Error};

/// Match an error to a provided pattern matcher and get
/// the corresponding error of another type if a match is successful.
#[macro_export]
macro_rules! map_unique_err_to_proxy {
    (match $err:ident { $($unique_err_ty:ident :: $unique_err:ident => $proxy_err:ident),+ $(,)? }) => {
        $(
            if $err == <$unique_err_ty<T>>::$unique_err.into() {
                return <Error<T>>::$proxy_err.into()
            } else
        )+ {
            $err
        }
    };
}

/// Interface to decode some serialized bytes into an arbitrary type `T`,
/// preferably if these bytes were originally encoded from `T`.
pub trait RmrkDecode<T: Decode, S> {
	/// Try to decode self into an arbitrary type `T`.
	fn decode(&self) -> Result<T, Error>;
}

impl<T: Decode, S> RmrkDecode<T, S> for BoundedVec<u8, S> {
	fn decode(&self) -> Result<T, Error> {
		let mut value = self.as_slice();

		T::decode(&mut value)
	}
}

/// Interface to "rebind" - change the limit of a bounded byte vector.
pub trait RmrkRebind<T, S> {
	/// Try to change the limit of a bounded byte vector.
	fn rebind(&self) -> Result<BoundedVec<u8, S>, Error>;
}

impl<T, S> RmrkRebind<T, S> for BoundedVec<u8, T>
where
	BoundedVec<u8, S>: TryFrom<Vec<u8>>,
{
	fn rebind(&self) -> Result<BoundedVec<u8, S>, Error> {
		BoundedVec::<u8, S>::try_from(self.clone().into_inner())
			.map_err(|_| "BoundedVec exceeds its limit".into())
	}
}

/// RMRK Base shares functionality with a regular collection, and is thus
/// stored as one, but they are used for different purposes and need to be differentiated.
#[derive(Encode, Decode, PartialEq, Eq)]
pub enum CollectionType {
	Regular,
	Base,
}

/// RMRK Base, being stored as a collection, can have different kinds of tokens,
/// all except the `Regular` type, which is attributed to `Regular` collection.
#[derive(Encode, Decode, PartialEq, Eq)]
pub enum NftType {
	Regular,
	FixedPart,
	SlotPart,
	Theme,
}
