use std::marker::PhantomData;
use evm_coder::{execution::Result, generate_stubgen, solidity_interface, types::*};

struct Generic<T>(PhantomData<T>);

#[solidity_interface(name = "GenericIs")]
impl<T> Generic<T> {
	fn test_1(&self) -> Result<uint256> {
		todo!()
	}
}

#[solidity_interface(name = "Generic", is(GenericIs))]
impl<T: Into<u32>> Generic<T> {
	fn test_2(&self) -> Result<uint256> {
		todo!()
	}
}

generate_stubgen!(gen_iface, GenericCall<()>, false);
