extern crate alloc;
use evm_coder::{generate_stubgen, solidity_interface, types::*};

use pallet_common::{CollectionHandle, erc::CollectionCall, erc::CommonEvmHandler};

use pallet_evm::PrecompileHandle;
use pallet_evm_coder_substrate::call;

use crate::{Config, RefungibleHandle};

#[solidity_interface(
	name = "UniqueRFT",
	is(via("CollectionHandle<T>", common_mut, Collection),)
)]
impl<T: Config> RefungibleHandle<T> where T::AccountId: From<[u8; 32]> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueRFTCall<()>, true);
generate_stubgen!(gen_iface, UniqueRFTCall<()>, false);

impl<T: Config> CommonEvmHandler for RefungibleHandle<T>
where
	T::AccountId: From<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");
	fn call(
		self,
		handle: &mut impl PrecompileHandle,
	) -> Option<pallet_common::erc::PrecompileResult> {
		call::<T, UniqueRFTCall<T>, _, _>(handle, self)
	}
}
