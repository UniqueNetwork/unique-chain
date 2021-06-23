pub mod account;
pub mod erc;
mod erc_impl;
pub mod log;
pub mod sponsoring;

use evm_coder::abi::AbiWriter;
use evm_coder::abi::StringError;
use sp_std::prelude::*;
use sp_std::borrow::ToOwned;
use sp_std::vec::Vec;

use pallet_evm::{PrecompileOutput, ExitReason, ExitRevert, ExitSucceed};
use sp_core::{H160, U256};
use frame_support::storage::StorageMap;

use crate::{Config, CollectionById, CollectionHandle, CollectionId, CollectionMode};

use erc::{UniqueFungible, UniqueFungibleCall, UniqueNFT, UniqueNFTCall};
use evm_coder::{types::*, abi::AbiReader};

pub struct NftErcSupport<T: Config>(core::marker::PhantomData<T>);

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection
// TODO: Unhardcode prefix
const ETH_ACCOUNT_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

fn map_eth_to_id(eth: &H160) -> Option<CollectionId> {
	if &eth[0..16] != ETH_ACCOUNT_PREFIX {
		return None;
	}
	let mut id_bytes = [0; 4];
	id_bytes.copy_from_slice(&eth[16..20]);
	Some(u32::from_be_bytes(id_bytes))
}
pub fn collection_id_to_address(id: u32) -> H160 {
	let mut out = [0; 20];
	out[0..16].copy_from_slice(&ETH_ACCOUNT_PREFIX);
	out[16..20].copy_from_slice(&u32::to_be_bytes(id));
	H160(out)
}

fn call_internal<T: Config>(
	collection: &mut CollectionHandle<T>,
	caller: caller,
	method_id: u32,
	mut input: AbiReader,
	value: U256,
) -> Result<Option<AbiWriter>, evm_coder::abi::StringError> {
	match collection.mode.clone() {
		CollectionMode::Fungible(_) => {
			#[cfg(feature = "std")]
			{
				println!("Parse fungible call {:x}", method_id);
			}
			let call = match UniqueFungibleCall::parse(method_id, &mut input)? {
				Some(v) => v,
				None => {
					#[cfg(feature = "std")]
					{
						println!("Method not found");
					}
					return Ok(None);
				}
			};
			#[cfg(feature = "std")]
			{
				dbg!(&call);
			}
			Ok(Some(<CollectionHandle<T> as UniqueFungible>::call(
				collection,
				Msg {
					call,
					caller,
					value,
				},
			)?))
		}
		CollectionMode::NFT => {
			let call = match UniqueNFTCall::parse(method_id, &mut input)? {
				Some(v) => v,
				None => return Ok(None),
			};
			Ok(Some(<CollectionHandle<T> as UniqueNFT>::call(
				collection,
				Msg {
					call,
					caller,
					value,
				},
			)?))
		}
		_ => {
			return Err(StringError::from(
				"erc calls only supported to fungible and nft collections for now",
			)
			.into())
		}
	}
}

impl<T: Config> pallet_evm::OnMethodCall<T> for NftErcSupport<T> {
	fn is_reserved(target: &H160) -> bool {
		map_eth_to_id(target).is_some()
	}
	fn is_used(target: &H160) -> bool {
		map_eth_to_id(target)
			.map(<CollectionById<T>>::contains_key)
			.unwrap_or(false)
	}
	fn get_code(target: &H160) -> Option<Vec<u8>> {
		map_eth_to_id(&target)
			.and_then(<CollectionById<T>>::get)
			.map(|collection| {
				match collection.mode {
					CollectionMode::NFT => include_bytes!("stubs/ERC721.bin") as &[u8],
					CollectionMode::Fungible(_) => include_bytes!("stubs/ERC20.bin") as &[u8],
					CollectionMode::ReFungible => include_bytes!("stubs/ERC1633.bin") as &[u8],
					CollectionMode::Invalid => include_bytes!("stubs/Invalid.bin") as &[u8],
				}
				.to_owned()
			})
	}
	fn call(
		source: &H160,
		target: &H160,
		gas_limit: u64,
		input: &[u8],
		value: U256,
	) -> Option<PrecompileOutput> {
		let mut collection = map_eth_to_id(&target)
			.and_then(|id| <CollectionHandle<T>>::get_with_gas_limit(id, gas_limit))?;
		let (method_id, input) = AbiReader::new_call(input).unwrap();
		let result = call_internal(&mut collection, *source, method_id, input, value);
		let cost = gas_limit - collection.gas_left();
		let logs = collection.logs.retrieve_logs();
		match result {
			Ok(Some(v)) => Some(PrecompileOutput {
				exit_status: ExitReason::Succeed(ExitSucceed::Returned),
				cost,
				logs,
				output: v.finish(),
			}),
			Ok(None) => None,
			Err(e) => Some(PrecompileOutput {
				exit_status: ExitReason::Revert(ExitRevert::Reverted),
				cost: 0,
				logs: Default::default(),
				output: AbiWriter::from(e).finish(),
			}),
		}
	}
}

// TODO: This function is slow, and output can be memoized
pub fn generate_transaction(collection_id: u32, chain_id: u64) -> ethereum::Transaction {
	let contract = collection_id_to_address(collection_id);

	// FIXME: Can be done on wasm runtime with https://github.com/paritytech/substrate/pull/8728
	#[cfg(feature = "std")]
	{
		let signed = ethereum_tx_sign::RawTransaction {
			nonce: 0.into(),
			to: Some(contract.0.into()),
			value: 0.into(),
			gas_price: 0.into(),
			gas: 0.into(),
			// zero selector, this transaction always have same sender, so all data should be acquired from logs
			data: Vec::from([0, 0, 0, 0]),
		}
		.sign(
			// TODO: move to pallet config
			// 0xF70631E55faff9f3FD3681545aa6c724226a3853
			// 9dbaef9b3ebc00e53f67c6a77bcfbf2c4f2aebe4d70d94af4f2df01744b7a91a
			&hex_literal::hex!("9dbaef9b3ebc00e53f67c6a77bcfbf2c4f2aebe4d70d94af4f2df01744b7a91a")
				.into(),
			&chain_id,
		);
		rlp::decode::<ethereum::Transaction>(&signed)
			.expect("transaction is just created, it can't be broken")
	}
	#[cfg(not(feature = "std"))]
	{
		panic!("transaction generation not yet supported by wasm runtime")
	}
}
