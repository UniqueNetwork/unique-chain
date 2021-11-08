use nft_data_structs::TokenId;
use pallet_common::erc::CommonEvmHandler;

use crate::{Config, RefungibleHandle};

impl<T: Config> CommonEvmHandler for RefungibleHandle<T> {
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungible.raw");

	fn call(
		self,
		_source: &sp_core::H160,
		_input: &[u8],
		_value: sp_core::U256,
	) -> Option<pallet_common::erc::PrecompileOutput> {
		// TODO: Implement RFT variant of ERC721
		None
	}
}

pub struct RefungibleTokenHandle<T: Config>(pub RefungibleHandle<T>, pub TokenId);

impl<T: Config> CommonEvmHandler for RefungibleTokenHandle<T> {
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueRefungibleToken.raw");

	fn call(
		self,
		_source: &sp_core::H160,
		_input: &[u8],
		_value: sp_core::U256,
	) -> Option<pallet_common::erc::PrecompileOutput> {
		// TODO: Implement RFT variant of ERC20
		None
	}
}
