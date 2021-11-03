pub use pallet_evm::PrecompileOutput;
use sp_core::{H160, U256};

/// Does not always represent a full collection, for RFT it is either
/// collection (Implementing ERC721), or specific collection token (Implementing ERC20)
pub trait CommonEvmHandler {
	const CODE: &'static [u8];

	fn call(self, source: &H160, input: &[u8], value: U256) -> Option<PrecompileOutput>;
}
