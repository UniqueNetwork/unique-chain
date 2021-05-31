pub mod account;
use account::CrossAccountId;
pub mod abi;
use abi::{AbiReader, AbiWriter};
pub mod log;

use sp_std::borrow::ToOwned;
use sp_std::vec::Vec;
use sp_std::convert::TryInto;

use codec::{Decode, Encode};
use pallet_evm::{AddressMapping, PrecompileLog, PrecompileOutput, ExitReason, ExitRevert, ExitSucceed};
use sp_core::{H160, H256};
use frame_support::storage::{StorageMap, StorageDoubleMap};

use crate::{Allowances, NftItemList, Module, Balance, Config, CollectionById, CollectionHandle, CollectionId, CollectionMode};

pub struct NftErcSupport<T: Config>(core::marker::PhantomData<T>);

// 0x17c4e6453Cc49AAAaEACA894e6D9683e00000001 - collection
// TODO: Unhardcode prefix
const ETH_ACCOUNT_PREFIX: [u8; 16] = [0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e];

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

fn result_to_output(result: Result<AbiWriter, Option<&'static str>>, logs: Vec<PrecompileLog>) -> PrecompileOutput {
	sp_io::storage::start_transaction();
	match result {
		Ok(result) => {
			sp_io::storage::commit_transaction();
			// TODO: weight
			PrecompileOutput(ExitReason::Succeed(ExitSucceed::Returned), result.finish(), 0, logs)
		}
		Err(Some(s)) => {
			sp_io::storage::rollback_transaction();
			// Error(string)
			let mut out = AbiWriter::new_call(0x08c379a0);
			out.string(&s);
			PrecompileOutput(ExitReason::Revert(ExitRevert::Reverted), out.finish(), 0, Vec::new())
		}
		Err(None) => {
			sp_io::storage::rollback_transaction();
			PrecompileOutput(ExitReason::Revert(ExitRevert::Reverted), Vec::new(), 0, Vec::new())
		}
	}
}

fn call_internal<T: Config>(sender: H160, collection: &CollectionHandle<T>, method_id: u32, mut input: AbiReader) -> Result<AbiWriter, Option<&'static str>> {
	let erc20 = matches!(collection.mode, CollectionMode::Fungible(_));
	let erc721 = matches!(collection.mode, CollectionMode::NFT);

	Ok(match method_id {
		// function name() external view returns (string memory)
		fn_selector!(name()) => {
			let name = collection.name.iter()
				.map(|&e| e.try_into().ok() as Option<u8>)
				.collect::<Option<Vec<u8>>>()
				.ok_or(Some("non-ascii name"))?;

			crate::abi_encode!(memory(&name))
		}
		// function symbol() external view returns (string memory)
		fn_selector!(symbol()) => {
			let name = collection.token_prefix.iter()
				.map(|&e| e.is_ascii_uppercase().then(|| e))
				.collect::<Option<Vec<u8>>>()
				.ok_or(Some("non-uppercase prefix"))?;

			crate::abi_encode!(memory(&name))
		}
		// function decimals() external view returns (uint8 decimals)
		fn_selector!(decimals()) if erc20 => {
			if let CollectionMode::Fungible(decimals) = &collection.mode {
				crate::abi_encode!(uint8(*decimals))
			} else {
				unreachable!()
			}
		}
		// function totalSupply() external view returns (uint256)
		fn_selector!(totalSupply()) if erc20 || erc721 => {
			// TODO: can't be implemented, as we don't track total amount of fungibles
			crate::abi_encode!(uint256(0))
		}
		// function balanceOf(address account) external view returns (uint256)
		fn_selector!(balanceOf(address)) if erc20 || erc721 => {
			crate::abi_decode!(input, account: address);
			let account = T::EvmAddressMapping::into_account_id(account);
			let balance = <Balance<T>>::get(collection.id, account);
			crate::abi_encode!(uint256(balance))
		}
		// function ownerOf(uint256 tokenId) external view returns (address)
		fn_selector!(ownerOf(uint256)) if erc721 => {
			crate::abi_decode!(input, token_id: uint256);
			let token_id: u32 = token_id.try_into().map_err(|_| "bad token id")?;

			let token = <NftItemList<T>>::get(collection.id, token_id).ok_or("unknown token")?;

			crate::abi_encode!(address(token.owner.as_eth().clone()))
		}
		// function transfer(address recipient, uint256 amount) external returns (bool) {
		fn_selector!(transfer(address, uint256)) if erc20 => {
			crate::abi_decode!(input, recipient: address, amount: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let recipient = T::CrossAccountId::from_eth(recipient);

			<Module<T>>::transfer_internal(
				&sender,
				&recipient,
				&collection,
				1,
				amount,
			).map_err(|_| "transfer error")?;

			crate::abi_encode!(bool(true))
		}

		fn_selector!(transfer(address, uint256)) if erc721 => {
			crate::abi_decode!(input, recipient: address, token_id: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let recipient = T::CrossAccountId::from_eth(recipient);
			let token_id: u32 = token_id.try_into().map_err(|_| "bad token id")?;

			<Module<T>>::transfer_internal(
				&sender,
				&recipient,
				&collection,
				token_id,
				1,
			).map_err(|_| "transfer error")?;

			crate::abi_encode!(bool(true))
		}

		// function allowance(address owner, address spender) external view returns (uint256)
		fn_selector!(allowance(address, address)) if erc20 => {
			crate::abi_decode!(input, owner: address, spender: address);
			let owner = T::EvmAddressMapping::into_account_id(owner);
			let spender = T::EvmAddressMapping::into_account_id(spender);
			let allowance = <Allowances<T>>::get(collection.id, (1, &owner, &spender));
			crate::abi_encode!(uint256(allowance))
		}
		// function approve(address spender, uint256 amount) external returns (bool)
		// FIXME: All current implementations resets amount to specified value, ours - adds it
		// FIXME: Our implementation doesn't handle resets (approve with zero amount)
		fn_selector!(approve(address, uint256)) if erc20 => {
			crate::abi_decode!(input, spender: address, amount: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let spender = T::CrossAccountId::from_eth(spender);

			<Module<T>>::approve_internal(
				&sender,
				&spender,
				&collection,
				1,
				amount,
			).map_err(|_| "approve error")?;

			crate::abi_encode!(bool(true))
		}
		// function approve(address approved, uint256 tokenId) external payable
		fn_selector!(approve(address, uint256)) if erc721 => {
			crate::abi_decode!(input, approved: address, token_id: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let approved = T::CrossAccountId::from_eth(approved);
			let token_id = token_id.try_into().map_err(|_| "bad token id")?;

			<Module<T>>::approve_internal(
				&sender,
				&approved,
				&collection,
				token_id,
				1,
			).map_err(|_| "approve error")?;
			crate::abi_encode!()
		}
		// function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)
		fn_selector!(transferFrom(address, address, uint256)) if erc20 => {
			crate::abi_decode!(input, from: address, recipient: address, amount: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let from = T::CrossAccountId::from_eth(from);
			let recipient = T::CrossAccountId::from_eth(recipient);

			<Module<T>>::transfer_from_internal(
				&sender,
				&from,
				&recipient,
				&collection,
				1,
				amount,
			).map_err(|_| "transfer_from error")?;

			crate::abi_encode!(bool(true))
		}
		// function transferFrom(address from, address to, uint256 tokenId) external payable
		fn_selector!(transferFrom(address, address, uint256)) if erc721 => {
			crate::abi_decode!(input, from: address, recipient: address, token_id: uint256);
			let sender = T::CrossAccountId::from_eth(sender);
			let from = T::CrossAccountId::from_eth(from);
			let recipient = T::CrossAccountId::from_eth(recipient);
			let token_id = token_id.try_into().map_err(|_| "bad token id")?;

			<Module<T>>::transfer_from_internal(
				&sender,
				&from,
				&recipient,
				&collection,
				token_id,
				1,
			).map_err(|_| "transfer_from error")?;

			crate::abi_encode!()
		}
		// function supportsInterface(bytes4 interfaceID) public pure returns (bool)
		fn_selector!(supportsInterface(bytes4)) => {
			crate::abi_decode!(input, interface_id: uint32);
			let supports = match interface_id {
				// ERC165
				0x01ffc9a7 => true,
				// ERC20
				0x36372b07 if erc20 => true,
				// ERC721
				0x80ac58cd if erc721 => true,
				_ => false,
			};
			crate::abi_encode!(bool(supports))
		}
		_ => return Err(None)
	})
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
				}.to_owned()
			})
	}
	fn call(
		source: &H160,
		target: &H160,
		input: &[u8],
	) -> Option<PrecompileOutput> {
		let collection = map_eth_to_id(&target)
			.and_then(<CollectionHandle<T>>::get)?;
		let (method_id, input) = AbiReader::new_call(input).unwrap();
		let result = call_internal(*source, &collection, method_id, input);
		Some(result_to_output(result, collection.logs.retrieve_logs_for_contract(*target)))
	}
}

pub const TRANSFER_NFT_TOPIC: H256 = event_topic!(Transfer(address, address, uint256));
pub const APPROVAL_NFT_TOPIC: H256 = event_topic!(Approval(address, address, uint256));
// TODO: event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

pub const TRANSFER_FUNGIBLE_TOPIC: H256 = event_topic!(Transfer(address, address, uint256));
pub const APPROVAL_FUNGIBLE_TOPIC: H256 = event_topic!(Approval(address, address, uint256));

pub fn address_to_topic(address: &H160) -> H256 {
	let mut output = [0; 32];
	output[12..32].copy_from_slice(&address.0);
	H256(output)
}

pub fn u32_to_topic(id: u32) -> H256 {
	let mut output = [0; 32];
	output[28..32].copy_from_slice(&id.to_be_bytes());
	H256(output)
}


// TODO: This function is slow, and output can be memoized
pub fn generate_transaction(collection_id: u32, chain_id: u64) -> ethereum::Transaction {
	let contract = collection_id_to_address(collection_id);

	// TODO: Make it work without native runtime by forking ethereum_tx_sign, and
	// switching to pure-rust implementation of secp256k1
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
		}.sign(
			// TODO: move to pallet config
			// 0xF70631E55faff9f3FD3681545aa6c724226a3853
			// 9dbaef9b3ebc00e53f67c6a77bcfbf2c4f2aebe4d70d94af4f2df01744b7a91a
			&hex_literal::hex!("9dbaef9b3ebc00e53f67c6a77bcfbf2c4f2aebe4d70d94af4f2df01744b7a91a").into(),
			&chain_id
		);
		rlp::decode::<ethereum::Transaction>(&signed).expect("transaction is just created, it can't be broken")
	}
	#[cfg(not(feature = "std"))]
	{
		panic!("transaction generation not yet supported by wasm runtime")
	}
}