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

use core::marker::PhantomData;
use frame_support::{weights::Weight};
use pallet_common::{CommonWeightInfo, dispatch::dispatch_weight, RefungibleExtensionsWeightInfo};

use pallet_fungible::{Config as FungibleConfig, common::CommonWeights as FungibleWeights};
use pallet_nonfungible::{Config as NonfungibleConfig, common::CommonWeights as NonfungibleWeights};
use pallet_refungible::{
	Config as RefungibleConfig, weights::WeightInfo, common::CommonWeights as RefungibleWeights,
};
use up_data_structs::{CreateItemExData, CreateItemData};

macro_rules! max_weight_of {
	($method:ident ( $($args:tt)* )) => {{
		let max_weight = <FungibleWeights<T>>::$method($($args)*)
			.max(<NonfungibleWeights<T>>::$method($($args)*));

		#[cfg(feature = "refungible")]
		let max_weight = max_weight.max(<RefungibleWeights<T>>::$method($($args)*));

		max_weight
	}};
}

#[cfg(not(feature = "refungible"))]
pub trait CommonWeightConfigs: FungibleConfig + NonfungibleConfig {}

#[cfg(not(feature = "refungible"))]
impl<T: FungibleConfig + NonfungibleConfig> CommonWeightConfigs for T {}

#[cfg(feature = "refungible")]
pub trait CommonWeightConfigs: FungibleConfig + NonfungibleConfig + RefungibleConfig {}

#[cfg(feature = "refungible")]
impl<T: FungibleConfig + NonfungibleConfig + RefungibleConfig> CommonWeightConfigs for T {}


pub struct CommonWeights<T>(PhantomData<T>);

impl<T> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T>
where
	T: CommonWeightConfigs,
{
	fn create_item() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_item())
	}

	fn create_multiple_items(data: &[CreateItemData]) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_multiple_items(data))
	}

	fn create_multiple_items_ex(data: &CreateItemExData<T::CrossAccountId>) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_multiple_items_ex(data))
	}

	fn burn_item() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(burn_item())
	}

	fn set_collection_properties(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(set_collection_properties(amount))
	}

	fn delete_collection_properties(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(delete_collection_properties(amount))
	}

	fn set_token_properties(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(set_token_properties(amount))
	}

	fn delete_token_properties(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(delete_token_properties(amount))
	}

	fn set_token_property_permissions(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(set_token_property_permissions(amount))
	}

	fn transfer() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(transfer())
	}

	fn approve() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(approve())
	}

	fn transfer_from() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(transfer_from())
	}

	fn burn_from() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(burn_from())
	}

	fn burn_recursively_self_raw() -> Weight {
		max_weight_of!(burn_recursively_self_raw())
	}

	fn burn_recursively_breadth_raw(amount: u32) -> Weight {
		max_weight_of!(burn_recursively_breadth_raw(amount))
	}
}

#[cfg(feature = "refungible")]
impl<T> RefungibleExtensionsWeightInfo for CommonWeights<T>
where
	T: FungibleConfig + NonfungibleConfig + RefungibleConfig,
{
	fn repartition() -> Weight {
		dispatch_weight::<T>() + <<T as RefungibleConfig>::WeightInfo>::repartition_item()
	}
}

#[cfg(not(feature = "refungible"))]
impl<T> RefungibleExtensionsWeightInfo for CommonWeights<T>
where
	T: FungibleConfig + NonfungibleConfig,
{
	fn repartition() -> Weight {
		dispatch_weight::<T>()
	}
}
