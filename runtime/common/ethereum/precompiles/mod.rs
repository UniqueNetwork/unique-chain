use pallet_evm::{Precompile, PrecompileHandle, PrecompileResult, PrecompileSet};
use sp_core::H160;
use sp_std::marker::PhantomData;

use pallet_evm_precompile_simple::{ECRecover};
use sr25519::Sr25519Precompile;

mod sr25519;
mod utils;

pub struct UniquePrecompiles<R>(PhantomData<R>);

impl<R> UniquePrecompiles<R>
where
	R: pallet_evm::Config,
{
	pub fn new() -> Self {
		Self(Default::default())
	}
	pub fn used_addresses() -> [H160; 2] {
		[hash(1), hash(20482)]
	}
}
impl<R> PrecompileSet for UniquePrecompiles<R>
where
	R: pallet_evm::Config,
{
	fn execute(&self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		match handle.code_address() {
			a if a == hash(1) => Some(ECRecover::execute(handle)),
			// Sr25519     0x5002
			a if a == hash(20482) => Some(Sr25519Precompile::<R>::execute(handle)),
			_ => None,
		}
	}

	fn is_precompile(&self, address: H160) -> bool {
		Self::used_addresses().contains(&address)
	}
}

fn hash(a: u64) -> H160 {
	H160::from_low_u64_be(a)
}
