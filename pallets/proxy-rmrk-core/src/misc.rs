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
use codec::{Encode, Decode, Error};

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

// Utilize the RmrkCore pallet for access to Runtime errors.
pub trait RmrkDecode<T: Decode, S> {
	fn decode(&self) -> Result<T, Error>;
}

impl<T: Decode, S> RmrkDecode<T, S> for BoundedVec<u8, S> {
	fn decode(&self) -> Result<T, Error> {
		let mut value = self.as_slice();

		T::decode(&mut value)
	}
}

// Utilize the RmrkCore pallet for access to Runtime errors.
pub trait RmrkRebind<T, S> {
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
	Theme,
}

#[derive(Encode, Decode, PartialEq, Eq)]
pub enum ResourceType {
	Basic,
	Composable,
	Slot,
}
