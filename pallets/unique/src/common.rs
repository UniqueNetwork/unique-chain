use core::marker::PhantomData;
use frame_support::{weights::Weight};
use pallet_common::{CommonWeightInfo};

use pallet_fungible::{common::CommonWeights as FungibleWeights};
use pallet_nonfungible::{common::CommonWeights as NonfungibleWeights};
use pallet_refungible::{common::CommonWeights as RefungibleWeights};
use up_data_structs::CreateItemExData;

use crate::{Config, dispatch::dispatch_weight};

macro_rules! max_weight_of {
	($method:ident ( $($args:tt)* )) => {
		<FungibleWeights<T>>::$method($($args)*)
		.max(<NonfungibleWeights<T>>::$method($($args)*))
		.max(<RefungibleWeights<T>>::$method($($args)*))
	};
}

pub struct CommonWeights<T: Config>(PhantomData<T>);
impl<T: Config> CommonWeightInfo<T::CrossAccountId> for CommonWeights<T> {
	fn create_item() -> up_data_structs::Weight {
		dispatch_weight::<T>() + max_weight_of!(create_item())
	}

	fn create_multiple_items(amount: u32) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_multiple_items(amount))
	}

	fn create_multiple_items_ex(data: &CreateItemExData<T::CrossAccountId>) -> Weight {
		dispatch_weight::<T>() + max_weight_of!(create_multiple_items_ex(data))
	}

	fn burn_item() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(burn_item())
	}

	fn transfer() -> up_data_structs::Weight {
		dispatch_weight::<T>() + max_weight_of!(transfer())
	}

	fn approve() -> up_data_structs::Weight {
		dispatch_weight::<T>() + max_weight_of!(approve())
	}

	fn transfer_from() -> up_data_structs::Weight {
		dispatch_weight::<T>() + max_weight_of!(transfer_from())
	}

	fn set_variable_metadata(bytes: u32) -> up_data_structs::Weight {
		dispatch_weight::<T>() + max_weight_of!(set_variable_metadata(bytes))
	}

	fn burn_from() -> Weight {
		dispatch_weight::<T>() + max_weight_of!(burn_from())
	}
}
