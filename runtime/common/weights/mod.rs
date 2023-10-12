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

use frame_support::weights::Weight;
use pallet_balances_adapter::{
	common::CommonWeights as NativeFungibleWeights, Config as NativeFungibleConfig,
};
use pallet_common::{dispatch::dispatch_weight, CommonWeightInfo, RefungibleExtensionsWeightInfo};
use pallet_fungible::{common::CommonWeights as FungibleWeights, Config as FungibleConfig};
use pallet_nonfungible::{
	common::CommonWeights as NonfungibleWeights, Config as NonfungibleConfig,
};
#[cfg(feature = "refungible")]
use pallet_refungible::{
	common::CommonWeights as RefungibleWeights, weights::WeightInfo, Config as RefungibleConfig,
};
use up_data_structs::{CreateItemData, CreateItemExData};

pub mod xcm;

macro_rules! max_weight_of {
	($method:ident ( $($args:tt)* )) => {{
		let max_weight = <FungibleWeights<T>>::$method($($args)*)
			.max(<NativeFungibleWeights<T>>::$method($($args)*))
			.max(<NonfungibleWeights<T>>::$method($($args)*));

		#[cfg(feature = "refungible")]
		let max_weight = max_weight.max(<RefungibleWeights<T>>::$method($($args)*));

		max_weight
	}};
}

#[cfg(not(feature = "refungible"))]
pub trait CommonWeightConfigs: FungibleConfig + NativeFungibleConfig + NonfungibleConfig {}

#[cfg(not(feature = "refungible"))]
impl<T: FungibleConfig + NativeFungibleConfig + NonfungibleConfig> CommonWeightConfigs for T {}

#[cfg(feature = "refungible")]
pub trait CommonWeightConfigs:
	FungibleConfig + NativeFungibleConfig + NonfungibleConfig + RefungibleConfig
{
}

#[cfg(feature = "refungible")]
impl<T: FungibleConfig + NativeFungibleConfig + NonfungibleConfig + RefungibleConfig>
	CommonWeightConfigs for T
{
}

pub struct CommonWeights<T>(PhantomData<T>);

impl<T> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T>
where
	T: CommonWeightConfigs,
{
	fn create_item(data: &CreateItemData) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_item(data))
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

	fn approve_from() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(approve_from())
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

	fn token_owner() -> Weight {
		max_weight_of!(token_owner())
	}

	fn set_allowance_for_all() -> Weight {
		max_weight_of!(set_allowance_for_all())
	}

	fn force_repair_item() -> Weight {
		max_weight_of!(force_repair_item())
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
