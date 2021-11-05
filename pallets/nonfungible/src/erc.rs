use core::{
	char::{REPLACEMENT_CHARACTER, decode_utf16},
	convert::TryInto,
};
use evm_coder::{ToLog, execution::*, generate_stubgen, solidity, solidity_interface, types::*, weight};
use frame_support::BoundedVec;
use nft_data_structs::TokenId;
use pallet_evm_coder_substrate::dispatch_to_evm;
use sp_core::{H160, U256};
use sp_std::{vec::Vec, vec};
use pallet_common::{account::CrossAccountId, erc::CommonEvmHandler};
use pallet_evm_coder_substrate::call;
use pallet_common::erc::PrecompileOutput;

use crate::{
	AccountBalance, Config, CreateItemData, NonfungibleHandle, Pallet, TokenData, TokensMinted,
	SelfWeightOf, weights::WeightInfo,
};

#[derive(ToLog)]
pub enum ERC721Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		#[indexed]
		token_id: uint256,
	},
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		approved: address,
		#[indexed]
		token_id: uint256,
	},
	#[allow(dead_code)]
	ApprovalForAll {
		#[indexed]
		owner: address,
		#[indexed]
		operator: address,
		approved: bool,
	},
}

#[derive(ToLog)]
pub enum ERC721MintableEvents {
	#[allow(dead_code)]
	MintingFinished {},
}

#[solidity_interface(name = "ERC721Metadata")]
impl<T: Config> NonfungibleHandle<T> {
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}
	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}

	/// Returns token's const_metadata
	#[solidity(rename_selector = "tokenURI")]
	fn token_uri(&self, token_id: uint256) -> Result<string> {
		self.consume_store_reads(1)?;
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		Ok(string::from_utf8_lossy(
			&<TokenData<T>>::get((self.id, token_id))
				.ok_or("token not found")?
				.const_data,
		)
		.into())
	}
}

#[solidity_interface(name = "ERC721Enumerable")]
impl<T: Config> NonfungibleHandle<T> {
	fn token_by_index(&self, index: uint256) -> Result<uint256> {
		Ok(index)
	}

	/// Not implemented
	fn token_of_owner_by_index(&self, _owner: address, _index: uint256) -> Result<uint256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	fn total_supply(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<Pallet<T>>::total_supply(self).into())
	}
}

#[solidity_interface(name = "ERC721", events(ERC721Events))]
impl<T: Config> NonfungibleHandle<T> {
	fn balance_of(&self, owner: address) -> Result<uint256> {
		self.consume_store_reads(1)?;
		let owner = T::CrossAccountId::from_eth(owner);
		let balance = <AccountBalance<T>>::get((self.id, owner));
		Ok(balance.into())
	}
	fn owner_of(&self, token_id: uint256) -> Result<address> {
		self.consume_store_reads(1)?;
		let token: TokenId = token_id.try_into()?;
		Ok(*<TokenData<T>>::get((self.id, token))
			.ok_or("token not found")?
			.owner
			.as_eth())
	}
	/// Not implemented
	fn safe_transfer_from_with_data(
		&mut self,
		_from: address,
		_to: address,
		_token_id: uint256,
		_data: bytes,
		_value: value,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
	/// Not implemented
	fn safe_transfer_from(
		&mut self,
		_from: address,
		_to: address,
		_token_id: uint256,
		_value: value,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	#[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;

		<Pallet<T>>::transfer_from(self, &caller, &from, &to, token)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	#[weight(<SelfWeightOf<T>>::approve())]
	fn approve(
		&mut self,
		caller: caller,
		approved: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let approved = T::CrossAccountId::from_eth(approved);
		let token = token_id.try_into()?;

		<Pallet<T>>::set_allowance(self, &caller, token, Some(&approved))
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	/// Not implemented
	fn set_approval_for_all(
		&mut self,
		_caller: caller,
		_operator: address,
		_approved: bool,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// Not implemented
	fn get_approved(&self, _token_id: uint256) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	/// Not implemented
	fn is_approved_for_all(&self, _owner: address, _operator: address) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
}

#[solidity_interface(name = "ERC721Burnable")]
impl<T: Config> NonfungibleHandle<T> {
	#[weight(<SelfWeightOf<T>>::burn_item())]
	fn burn(&mut self, caller: caller, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token = token_id.try_into()?;

		<Pallet<T>>::burn(self, &caller, token).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}
}

#[solidity_interface(name = "ERC721Mintable", events(ERC721MintableEvents))]
impl<T: Config> NonfungibleHandle<T> {
	fn minting_finished(&self) -> Result<bool> {
		Ok(false)
	}

	/// `token_id` should be obtained with `next_token_id` method,
	/// unlike standard, you can't specify it manually
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint(&mut self, caller: caller, to: address, token_id: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id: u32 = token_id.try_into()?;
		if <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData {
				const_data: BoundedVec::default(),
				variable_data: BoundedVec::default(),
				owner: to,
			},
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(true)
	}

	/// `token_id` should be obtained with `next_token_id` method,
	/// unlike standard, you can't specify it manually
	#[solidity(rename_selector = "mintWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_item())]
	fn mint_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		token_uri: string,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id: u32 = token_id.try_into().map_err(|_| "amount overflow")?;
		if <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		<Pallet<T>>::create_item(
			self,
			&caller,
			CreateItemData {
				const_data: Vec::<u8>::from(token_uri)
					.try_into()
					.map_err(|_| "token uri is too long")?,
				variable_data: BoundedVec::default(),
				owner: to,
			},
		)
		.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	/// Not implemented
	fn finish_minting(&mut self, _caller: caller) -> Result<bool> {
		Err("not implementable".into())
	}
}

#[solidity_interface(name = "ERC721UniqueExtensions")]
impl<T: Config> NonfungibleHandle<T> {
	#[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token = token_id.try_into()?;

		<Pallet<T>>::transfer(self, &caller, &to, token).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	#[weight(<SelfWeightOf<T>>::burn_from())]
	fn burn_from(
		&mut self,
		caller: caller,
		from: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let token = token_id.try_into()?;

		<Pallet<T>>::burn_from(self, &caller, &from, token).map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn next_token_id(&self) -> Result<uint256> {
		self.consume_store_reads(1)?;
		Ok(<TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into())
	}

	#[weight(<SelfWeightOf<T>>::set_variable_metadata(data.len() as u32))]
	fn set_variable_metadata(
		&mut self,
		caller: caller,
		token_id: uint256,
		data: bytes,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token = token_id.try_into()?;

		<Pallet<T>>::set_variable_metadata(self, &caller, token, data)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn get_variable_metadata(&self, token_id: uint256) -> Result<bytes> {
		self.consume_store_reads(1)?;
		let token: TokenId = token_id.try_into()?;

		Ok(<TokenData<T>>::get((self.id, token))
			.ok_or("token not found")?
			.variable_data)
	}

	#[weight(<SelfWeightOf<T>>::create_multiple_items(token_ids.len() as u32))]
	fn mint_bulk(&mut self, caller: caller, to: address, token_ids: Vec<uint256>) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;

		let total_tokens = token_ids.len();
		for id in token_ids.into_iter() {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				return Err("item id should be next".into());
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;
		}
		let data = (0..total_tokens)
			.map(|_| CreateItemData {
				const_data: BoundedVec::default(),
				variable_data: BoundedVec::default(),
				owner: to.clone(),
			})
			.collect();

		<Pallet<T>>::create_multiple_items(self, &caller, data).map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	#[solidity(rename_selector = "mintBulkWithTokenURI")]
	#[weight(<SelfWeightOf<T>>::create_multiple_items(tokens.len() as u32))]
	fn mint_bulk_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		tokens: Vec<(uint256, string)>,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <TokensMinted<T>>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;

		let mut data = Vec::with_capacity(tokens.len());
		for (id, token_uri) in tokens {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				panic!("item id should be next ({}) but got {}", expected_index, id);
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;

			data.push(CreateItemData {
				const_data: Vec::<u8>::from(token_uri)
					.try_into()
					.map_err(|_| "token uri is too long")?,
				variable_data: vec![].try_into().unwrap(),
				owner: to.clone(),
			});
		}

		<Pallet<T>>::create_multiple_items(self, &caller, data).map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

#[solidity_interface(
	name = "UniqueNFT",
	is(
		ERC721,
		ERC721Metadata,
		ERC721Enumerable,
		ERC721UniqueExtensions,
		ERC721Mintable,
		ERC721Burnable,
	)
)]
impl<T: Config> NonfungibleHandle<T> {}

// Not a tests, but code generators
generate_stubgen!(gen_impl, UniqueNFTCall<()>, true);
generate_stubgen!(gen_iface, UniqueNFTCall<()>, false);

impl<T: Config> CommonEvmHandler for NonfungibleHandle<T> {
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueNFT.raw");

	fn call(self, source: &H160, input: &[u8], value: U256) -> Option<PrecompileOutput> {
		call::<T, UniqueNFTCall<T>, _>(*source, self, value, input)
	}
}
