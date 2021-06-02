use core::char::{decode_utf16, REPLACEMENT_CHARACTER};
use evm_coder::{
	abi::{AbiWriter, StringError},
	types::*,
};
use core::convert::TryInto;
use alloc::format;
use crate::{Allowances, Module, Balance, CollectionHandle, CollectionMode, Config, NftItemList};
use frame_support::storage::StorageDoubleMap;
use pallet_evm::AddressMapping;
use super::erc::*;
use super::account::CrossAccountId;

type Result<T> = core::result::Result<T, StringError>;

impl<T: Config> InlineNameSymbol for CollectionHandle<T> {
	type Error = StringError;

	fn name(&self) -> Result<string> {
		Ok(decode_utf16(self.name.iter().copied())
			.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
			.collect::<string>())
	}

	fn symbol(&self) -> Result<string> {
		Ok(string::from_utf8_lossy(&self.token_prefix).into())
	}
}

impl<T: Config> InlineTotalSupply for CollectionHandle<T> {
	type Error = StringError;

	fn total_supply(&self) -> Result<uint256> {
		// TODO: we do not track total amount of all tokens
		Ok(0.into())
	}
}

impl<T: Config> ERC721Metadata for CollectionHandle<T> {
	type Error = StringError;

	fn token_uri(&self, token_id: uint256) -> Result<string> {
		// TODO: We should standartize url prefix, maybe via offchain schema?
		Ok(format!("unique.network/{}/{}", self.id, token_id))
	}

	fn call_inline_name_symbol(&mut self, c: Msg<InlineNameSymbolCall>) -> Result<AbiWriter> {
		<Self as InlineNameSymbol>::call(self, c)
	}
}

impl<T: Config> ERC721Enumerable for CollectionHandle<T> {
	type Error = StringError;

	fn token_by_index(&self, index: uint256) -> Result<uint256> {
		Ok(index)
	}

	fn token_of_owner_by_index(&self, owner: address, index: uint256) -> Result<uint256> {
		// TODO: Not implemetable
		Err("not implemented".into())
	}

	fn call_inline_total_supply(&mut self, c: Msg<InlineTotalSupplyCall>) -> Result<AbiWriter> {
		<Self as InlineTotalSupply>::call(self, c)
	}
}

impl<T: Config> ERC721 for CollectionHandle<T> {
	type Error = StringError;

	fn balance_of(&self, owner: address) -> Result<uint256> {
		let owner = T::EvmAddressMapping::into_account_id(owner);
		let balance = <Balance<T>>::get(self.id, owner);
		Ok(balance.into())
	}
	fn owner_of(&self, token_id: uint256) -> Result<address> {
		let token_id: u32 = token_id.try_into().map_err(|_| "token id overflow")?;
		let token = <NftItemList<T>>::get(self.id, token_id).ok_or("unknown token")?;
		Ok(token.owner.as_eth().clone())
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

		<Module<T>>::transfer_from_internal(&caller, &from, &to, &self, token_id, 1)
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

		<Module<T>>::approve_internal(&caller, &approved, &self, token_id, 1)
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

	fn call_erc165(&mut self, c: Msg<ERC165Call>) -> Result<AbiWriter> {
		let ERC165Call::SupportsInterface { interface_id } = c.call;
		Ok(evm_coder::abi_encode!(bool(
			&ERC721Call::supports_interface(interface_id)
		)))
	}
}

impl<T: Config> ERC721UniqueExtensions for CollectionHandle<T> {
	type Error = StringError;
	fn transfer(
		&mut self,
		caller: caller,
		to: address,
		token_id: uint256,
		value: value,
	) -> Result<void> {
		let caller = T::CrossAccountId::from_eth(caller);
		let to = T::CrossAccountId::from_eth(to);
		let token_id = token_id.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::transfer_internal(&caller, &to, &self, token_id, 1)
			.map_err(|_| "transfer error")?;
		Ok(())
	}
}

impl<T: Config> UniqueNFT for CollectionHandle<T> {
	type Error = StringError;
	fn call_erc165(&mut self, c: Msg<ERC165Call>) -> Result<AbiWriter> {
		let ERC165Call::SupportsInterface { interface_id } = c.call;
		Ok(evm_coder::abi_encode!(bool(
			&UniqueNFTCall::supports_interface(interface_id)
		)))
	}
	fn call_erc721(&mut self, c: Msg<ERC721Call>) -> Result<AbiWriter> {
		<Self as ERC721>::call(self, c)
	}
	fn call_erc721_metadata(&mut self, c: Msg<ERC721MetadataCall>) -> Result<AbiWriter> {
		<Self as ERC721Metadata>::call(self, c)
	}
	fn call_erc721_enumerable(&mut self, c: Msg<ERC721EnumerableCall>) -> Result<AbiWriter> {
		<Self as ERC721Enumerable>::call(self, c)
	}
	fn call_erc721_unique_extensions(
		&mut self,
		c: Msg<ERC721UniqueExtensionsCall>,
	) -> Result<AbiWriter> {
		<Self as ERC721UniqueExtensions>::call(self, c)
	}
}

impl<T: Config> ERC20 for CollectionHandle<T> {
	type Error = StringError;
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

		<Module<T>>::transfer_internal(&caller, &to, &self, 1, amount)
			.map_err(|_| "transfer error")?;
		Ok(true)
	}
	fn transfer_from(
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

		<Module<T>>::transfer_from_internal(&caller, &from, &to, &self, 1, amount)
			.map_err(|_| "transferFrom error")?;
		Ok(true)
	}
	fn approve(&mut self, caller: caller, spender: address, amount: uint256) -> Result<bool> {
		let caller = T::CrossAccountId::from_eth(caller);
		let spender = T::CrossAccountId::from_eth(spender);
		let amount = amount.try_into().map_err(|_| "amount overflow")?;

		<Module<T>>::approve_internal(&caller, &spender, &self, 1, amount)
			.map_err(|_| "approve internal")?;
		Ok(true)
	}
	fn allowance(&self, owner: address, spender: address) -> Result<uint256> {
		let owner = T::CrossAccountId::from_eth(owner);
		let spender = T::CrossAccountId::from_eth(spender);

		Ok(<Allowances<T>>::get(self.id, (1, owner.as_sub(), spender.as_sub())).into())
	}
	fn call_inline_name_symbol(&mut self, c: Msg<InlineNameSymbolCall>) -> Result<AbiWriter> {
		<Self as InlineNameSymbol>::call(self, c)
	}
	fn call_inline_total_supply(&mut self, c: Msg<InlineTotalSupplyCall>) -> Result<AbiWriter> {
		<Self as InlineTotalSupply>::call(self, c)
	}
}

impl<T: Config> UniqueFungible for CollectionHandle<T> {
	type Error = StringError;
	fn call_erc165(&mut self, c: Msg<ERC165Call>) -> Result<AbiWriter> {
		let ERC165Call::SupportsInterface { interface_id } = c.call;
		Ok(evm_coder::abi_encode!(bool(
			&UniqueNFTCall::supports_interface(interface_id)
		)))
	}
	fn call_erc20(&mut self, c: Msg<ERC20Call>) -> Result<AbiWriter> {
		<Self as ERC20>::call(self, c)
	}
}
