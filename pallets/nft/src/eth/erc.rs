use core::char::{decode_utf16, REPLACEMENT_CHARACTER};
use evm_coder::{ToLog, execution::Result, generate_stubgen, solidity, solidity_interface, types::*};
use nft_data_structs::{CreateItemData, CreateNftData};
use core::convert::TryInto;
use crate::{
	Allowances, Module, Balance, CollectionHandle, CollectionMode, Config, NftItemList,
	ItemListIndex,
};
use frame_support::storage::{StorageMap, StorageDoubleMap};
use pallet_evm::AddressMapping;
use pallet_evm_coder_substrate::dispatch_to_evm;
use super::account::CrossAccountId;
use sp_std::{vec, vec::Vec};

#[solidity_interface(name = "ERC165")]
impl<T: Config> CollectionHandle<T> {
	fn supports_interface(&self, interface_id: bytes4) -> Result<bool> {
		Ok(match self.mode {
			CollectionMode::Fungible(_) => UniqueFungibleCall::supports_interface(interface_id),
			CollectionMode::NFT => UniqueNFTCall::supports_interface(interface_id),
			_ => false,
		})
	}
}

#[solidity_interface(name = "InlineNameSymbol")]
impl<T: Config> CollectionHandle<T> {
	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}
}

#[solidity_interface(name = "InlineTotalSupply")]
impl<T: Config> CollectionHandle<T> {
	fn total_supply(&self) -> Result<uint256> {
		// TODO: we do not track total amount of all tokens
		Ok(0.into())
	}
}

#[solidity_interface(name = "ERC721Metadata", inline_is(InlineNameSymbol))]
impl<T: Config> CollectionHandle<T> {
	#[solidity(rename_selector = "tokenURI")]
	fn token_uri(&self, token_id: uint256) -> Result<string> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		Ok(string::from_utf8_lossy(
			&<NftItemList<T>>::get(self.id, token_id)
				.ok_or("token not found")?
				.const_data,
		)
		.into())
	}
}

#[solidity_interface(name = "ERC721Enumerable", inline_is(InlineTotalSupply))]
impl<T: Config> CollectionHandle<T> {
	fn token_by_index(&self, index: uint256) -> Result<uint256> {
		Ok(index)
	}

	fn token_of_owner_by_index(&self, _owner: address, _index: uint256) -> Result<uint256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
}

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

#[solidity_interface(name = "ERC721", is(ERC165), events(ERC721Events))]
impl<T: Config> CollectionHandle<T> {
	#[solidity(rename_selector = "balanceOf")]
	fn balance_of_nft(&self, owner: address) -> Result<uint256> {
		let owner = T::EvmAddressMapping::into_account_id(owner);
		let balance = <Balance<T>>::get(self.id, owner);
		Ok(balance.into())
	}
	fn owner_of(&self, token_id: uint256) -> Result<address> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let token = <NftItemList<T>>::get(self.id, token_id).ok_or("unknown token")?;
		Ok(*token.owner.as_eth())
	}
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
		let token_id = token_id.try_into().map_err(|_| "token_id overflow")?;

		<Module<T>>::transfer_from_internal(&caller, &from, &to, self, token_id, 1)
			.map_err(|_| "transferFrom error")?;
		Ok(())
	}

	fn approve(
		&mut self,
		caller: caller,
		approved: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let approved = T::CrossAccountId::from_eth(approved);
		let token_id = token_id.try_into().map_err(|_| "token_id overflow")?;

		<Module<T>>::approve_internal(&caller, &approved, self, token_id, 1)
			.map_err(|_| "approve internal")?;
		Ok(())
	}

	fn set_approval_for_all(
		&mut self,
		_caller: caller,
		_operator: address,
		_approved: bool,
	) -> Result<void> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	fn get_approved(&self, _token_id: uint256) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	fn is_approved_for_all(&self, _owner: address, _operator: address) -> Result<address> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}
}

#[solidity_interface(name = "ERC721Burnable")]
impl<T: Config> CollectionHandle<T> {
	fn burn(&mut self, caller: caller, token_id: uint256) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id = token_id.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::burn_item_internal(&caller, &self, token_id, &caller, 1)
			.map_err(|_| "burn error")?;
		Ok(())
	}
}

#[derive(ToLog)]
pub enum ERC721MintableEvents {
	#[allow(dead_code)]
	MintingFinished {},
}

#[solidity_interface(name = "ERC721Mintable", events(ERC721MintableEvents))]
impl<T: Config> CollectionHandle<T> {
	fn minting_finished(&self) -> Result<bool> {
		Ok(false)
	}

	fn mint(&mut self, caller: caller, to: address, token_id: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id: u32 = token_id.try_into().map_err(|_| "amount overflow")?;
		if <ItemListIndex>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		<Module<T>>::create_item_internal(
			&caller,
			&self,
			&to,
			CreateItemData::NFT(CreateNftData {
				const_data: vec![].try_into().unwrap(),
				variable_data: vec![].try_into().unwrap(),
			}),
		)
		.map_err(|_| "mint error")?;
		Ok(true)
	}

	#[solidity(rename_selector = "mintWithTokenURI")]
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
		if <ItemListIndex>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			!= token_id
		{
			return Err("item id should be next".into());
		}

		<Module<T>>::create_item_internal(
			&caller,
			&self,
			&to,
			CreateItemData::NFT(CreateNftData {
				const_data: Vec::<u8>::from(token_uri)
					.try_into()
					.map_err(|_| "token uri is too long")?,
				variable_data: vec![].try_into().unwrap(),
			}),
		)
		.map_err(|_| "mint error")?;
		Ok(true)
	}

	fn finish_minting(&mut self, _caller: caller) -> Result<bool> {
		Err("not implementable".into())
	}
}

#[solidity_interface(name = "ERC721UniqueExtensions")]
impl<T: Config> CollectionHandle<T> {
	#[solidity(rename_selector = "transfer")]
	fn transfer_nft(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		_value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id = token_id.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::transfer_internal(&caller, &to, self, token_id, 1)
			.map_err(|_| "transfer error")?;
		Ok(())
	}

	fn next_token_id(&self) -> Result<uint256> {
		Ok(ItemListIndex::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?
			.into())
	}

	fn set_variable_metadata(
		&mut self,
		caller: caller,
		token_id: uint256,
		data: bytes,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let token_id = token_id.try_into().map_err(|_| "token id overflow")?;

		<Module<T>>::set_variable_meta_data_internal(&caller, self, token_id, data)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(())
	}

	fn get_variable_metadata(&self, token_id: uint256) -> Result<bytes> {
		let token_id = token_id.try_into().map_err(|_| "token id overflow")?;

		<Module<T>>::get_variable_metadata(self, token_id).map_err(dispatch_to_evm::<T>)
	}

	fn mint_bulk(&mut self, caller: caller, to: address, token_ids: Vec<uint256>) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <ItemListIndex>::get(self.id)
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
			.map(|_| {
				CreateItemData::NFT(CreateNftData {
					const_data: vec![].try_into().unwrap(),
					variable_data: vec![].try_into().unwrap(),
				})
			})
			.collect();

		<Module<T>>::create_multiple_items_internal(&caller, self, &to, data)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}

	#[solidity(rename_selector = "mintBulkWithTokenURI")]
	fn mint_bulk_with_token_uri(
		&mut self,
		caller: caller,
		to: address,
		tokens: Vec<(uint256, string)>,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let mut expected_index = <ItemListIndex>::get(self.id)
			.checked_add(1)
			.ok_or("item id overflow")?;

		let mut data = Vec::with_capacity(tokens.len());
		for (id, token_uri) in tokens {
			let id: u32 = id.try_into().map_err(|_| "token id overflow")?;
			if id != expected_index {
				panic!("item id should be next ({}) but got {}", expected_index, id);
			}
			expected_index = expected_index.checked_add(1).ok_or("item id overflow")?;

			data.push(CreateItemData::NFT(CreateNftData {
				const_data: Vec::<u8>::from(token_uri)
					.try_into()
					.map_err(|_| "token uri is too long")?,
				variable_data: vec![].try_into().unwrap(),
			}));
		}

		<Module<T>>::create_multiple_items_internal(&caller, self, &to, data)
			.map_err(dispatch_to_evm::<T>)?;
		Ok(true)
	}
}

#[solidity_interface(
	name = "UniqueNFT",
	is(
		ERC165,
		ERC721,
		ERC721Metadata,
		ERC721Enumerable,
		ERC721UniqueExtensions,
		ERC721Mintable,
		ERC721Burnable,
	)
)]
impl<T: Config> CollectionHandle<T> {}

#[derive(ToLog)]
pub enum ERC20Events {
	Transfer {
		#[indexed]
		from: address,
		#[indexed]
		to: address,
		value: uint256,
	},
	Approval {
		#[indexed]
		owner: address,
		#[indexed]
		spender: address,
		value: uint256,
	},
}

#[solidity_interface(
	name = "ERC20",
	inline_is(InlineNameSymbol, InlineTotalSupply),
	events(ERC20Events)
)]
impl<T: Config> CollectionHandle<T> {
	fn decimals(&self) -> Result<uint8> {
		Ok(if let CollectionMode::Fungible(decimals) = &self.mode {
			*decimals
		} else {
			unreachable!()
		})
	}
	fn balance_of(&self, owner: address) -> Result<uint256> {
		let owner = T::EvmAddressMapping::into_account_id(owner);
		let balance = <Balance<T>>::get(self.id, owner);
		Ok(balance.into())
	}
	fn transfer(&mut self, caller: caller, to: address, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::transfer_internal(&caller, &to, self, 1, amount)
			.map_err(|_| "transfer error")?;
		Ok(true)
	}
	#[solidity(rename_selector = "transferFrom")]
	fn transfer_from_fungible(
		&mut self,
		caller: caller,
		from: address,
		to: address,
		amount: uint256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let from = T::CrossAccountId::from_eth(from);
		let to = T::CrossAccountId::from_eth(to);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::transfer_from_internal(&caller, &from, &to, self, 1, amount)
			.map_err(|_| "transferFrom error")?;
		Ok(true)
	}
	#[solidity(rename_selector = "approve")]
	fn approve_fungible(
		&mut self,
		caller: caller,
		spender: address,
		amount: uint256,
	) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::approve_internal(&caller, &spender, self, 1, amount)
			.map_err(|_| "approve internal")?;
		Ok(true)
	}
	fn allowance(&self, owner: address, spender: address) -> Result<uint256> {
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowances<T>>::get(self.id, (1, owner.as_sub(), spender.as_sub())).into())
	}
}

#[solidity_interface(name = "UniqueFungible", is(ERC165, ERC20))]
impl<T: Config> CollectionHandle<T> {}

// Not a tests, but code generators
generate_stubgen!(nft_impl, UniqueNFTCall, true);
generate_stubgen!(nft_iface, UniqueNFTCall, false);

generate_stubgen!(fungible_impl, UniqueFungibleCall, true);
generate_stubgen!(fungible_iface, UniqueFungibleCall, false);
