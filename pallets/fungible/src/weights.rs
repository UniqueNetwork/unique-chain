#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame_support::{traits::Get, weights::{Weight, constants::RocksDbWeight}};
use sp_std::marker::PhantomData;

pub trait WeightInfo {
	fn create_item() -> Weight;
	fn burn_item() -> Weight;
	fn transfer() -> Weight;
	fn approve() -> Weight;
	fn transfer_from() -> Weight;
}

pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
    fn create_item() -> Weight {0}
	fn burn_item() -> Weight {0}
	fn transfer() -> Weight {0}
	fn approve() -> Weight {0}
	fn transfer_from() -> Weight {0}
}

impl WeightInfo for () {
    fn create_item() -> Weight {0}
	fn burn_item() -> Weight {0}
	fn transfer() -> Weight {0}
	fn approve() -> Weight {0}
	fn transfer_from() -> Weight {0}
}
