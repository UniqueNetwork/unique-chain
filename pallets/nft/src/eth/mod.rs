pub mod account;
pub mod erc;
pub mod sponsoring;

use pallet_evm_coder_substrate::call_internal;
use sp_std::borrow::ToOwned;
use sp_std::vec::Vec;
use pallet_evm::{PrecompileOutput};
use sp_core::{H160, U256};
use frame_support::storage::StorageMap;
use crate::{Config, CollectionById, CollectionHandle, CollectionId, CollectionMode};
use erc::{UniqueFungibleCall, UniqueNFTCall};

pub struct NftErcSupport<T: Config>(core::marker::PhantomData<T>);

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection
// TODO: Unhardcode prefix
const ETH_ACCOUNT_PREFIX: [u8; 16] = [
	0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
];

fn map_eth_to_id(eth: &H160) -> Option<CollectionId> {
	if eth[0..16] != ETH_ACCOUNT_PREFIX {
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

/*
fn call_internal<T: Config>(
	collection: &mut CollectionHandle<T>,
	caller: caller,
	method_id: u32,
	mut input: AbiReader,
	value: U256,
) -> Result<Option<AbiWriter>> {
	match collection.mode.clone() {
		CollectionMode::Fungible(_) => {
			call_internal();
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
		_ => Err("erc calls only supported to fungible and nft collections for now".into()),
	}
}*/

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
		map_eth_to_id(target)
			.and_then(<CollectionById<T>>::get)
			.map(|collection| {
				match collection.mode {
					CollectionMode::NFT => include_bytes!("stubs/UniqueNFT.raw") as &[u8],
					CollectionMode::Fungible(_) => {
						include_bytes!("stubs/UniqueFungible.raw") as &[u8]
					}
					CollectionMode::ReFungible => {
						include_bytes!("stubs/UniqueRefungible.raw") as &[u8]
					}
					CollectionMode::Invalid => include_bytes!("stubs/UniqueInvalid.raw") as &[u8],
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
		let mut collection = map_eth_to_id(target)
			.and_then(|id| <CollectionHandle<T>>::get_with_gas_limit(id, gas_limit))?;
		let result = match collection.mode {
			CollectionMode::NFT => {
				call_internal::<UniqueNFTCall, _>(*source, &mut collection, value, input)
			}
			CollectionMode::Fungible(_) => {
				call_internal::<UniqueFungibleCall, _>(*source, &mut collection, value, input)
			}
			_ => return None,
		};
		collection.recorder.evm_to_precompile_output(result)
	}
}
