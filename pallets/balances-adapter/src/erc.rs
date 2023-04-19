use crate::Config;
use evm_coder::{abi::AbiType, AbiCoder, ToLog, generate_stubgen, solidity_interface, types::*};
use pallet_common::erc::{CommonEvmHandler, PrecompileHandle, PrecompileResult};
use pallet_evm_coder_substrate::{
	call, dispatch_to_evm,
	execution::{PreDispatch, Result},
	frontier_contract, WithRecorder, SubstrateRecorder,
};
use sp_core::{U256};
use sp_std::vec::Vec;

frontier_contract! {
	macro_rules! NativeFungibleHandle_result {...}
	impl<T: Config> Contract for NativeFungibleHandle<T> {...}
}

#[derive(ToLog)]
pub enum ERC20Events {
	Transfer {
		#[indexed]
		from: Address,
		#[indexed]
		to: Address,
		value: U256,
	},
	Approval {
		#[indexed]
		owner: Address,
		#[indexed]
		spender: Address,
		value: U256,
	},
}

pub struct NativeFungibleHandle<T: Config>(SubstrateRecorder<T>);

impl<T: Config> WithRecorder<T> for NativeFungibleHandle<T> {
	fn recorder(&self) -> &pallet_evm_coder_substrate::SubstrateRecorder<T> {
		&self.0
	}
	fn into_recorder(self) -> pallet_evm_coder_substrate::SubstrateRecorder<T> {
		self.0
	}
}

#[solidity_interface(name = ERC20, events(ERC20Events), enum(derive(PreDispatch)), enum_attr(weight), expect_selector = 0x942e8b22)]
impl<T: Config> NativeFungibleHandle<T> {
	fn name(&self) -> Result<String> {
		// Ok(decode_utf16(self.name.iter().copied())
		// 	.map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
		// 	.collect::<String>())
		todo!()
	}

	fn symbol(&self) -> Result<String> {
		// Ok(String::from_utf8_lossy(&self.token_prefix).into())
		todo!()
	}
	fn total_supply(&self) -> Result<U256> {
		// self.consume_store_reads(1)?;
		// Ok(<TotalSupply<T>>::get(self.id).into())
		todo!()
	}

	fn decimals(&self) -> Result<u8> {
		// Ok(if let CollectionMode::Fungible(decimals) = &self.mode {
		// 	*decimals
		// } else {
		// 	unreachable!()
		// })
		todo!()
	}

	fn balance_of(&self, owner: Address) -> Result<U256> {
		// self.consume_store_reads(1)?;
		// let owner = T::CrossAccountId::from_eth(owner);
		// let balance = <Balance<T>>::get((self.id, owner));
		// Ok(balance.into())
		todo!()
	}

	// #[weight(<SelfWeightOf<T>>::transfer())]
	fn transfer(&mut self, caller: Caller, to: Address, amount: U256) -> Result<bool> {
		// let caller = T::CrossAccountId::from_eth(caller);
		// let to = T::CrossAccountId::from_eth(to);
		// let amount = amount.try_into().map_err(|_| "amount overflow")?;
		// let budget = self
		// 	.recorder
		// 	.weight_calls_budget(<StructureWeight<T>>::find_parent());

		// <Pallet<T>>::transfer(self, &caller, &to, amount, &budget).map_err(|_| "transfer error")?;
		// Ok(true)
		todo!()
	}

	// #[weight(<SelfWeightOf<T>>::transfer_from())]
	fn transfer_from(
		&mut self,
		caller: Caller,
		from: Address,
		to: Address,
		amount: U256,
	) -> Result<bool> {
		// let caller = T::CrossAccountId::from_eth(caller);
		// let from = T::CrossAccountId::from_eth(from);
		// let to = T::CrossAccountId::from_eth(to);
		// let amount = amount.try_into().map_err(|_| "amount overflow")?;
		// let budget = self
		// 	.recorder
		// 	.weight_calls_budget(<StructureWeight<T>>::find_parent());

		// <Pallet<T>>::transfer_from(self, &caller, &from, &to, amount, &budget)
		// 	.map_err(dispatch_to_evm::<T>)?;
		// Ok(true)
		todo!()
	}

	// #[weight(<SelfWeightOf<T>>::approve())]
	fn approve(&mut self, caller: Caller, spender: Address, amount: U256) -> Result<bool> {
		// let caller = T::CrossAccountId::from_eth(caller);
		// let spender = T::CrossAccountId::from_eth(spender);
		// let amount = amount.try_into().map_err(|_| "amount overflow")?;

		// <Pallet<T>>::set_allowance(self, &caller, &spender, amount)
		// 	.map_err(dispatch_to_evm::<T>)?;
		// Ok(true)
		todo!()
	}

	fn allowance(&self, owner: Address, spender: Address) -> Result<U256> {
		// self.consume_store_reads(1)?;
		// let owner = T::CrossAccountId::from_eth(owner);
		// let spender = T::CrossAccountId::from_eth(spender);

		// Ok(<Allowance<T>>::get((self.id, owner, spender)).into())
		todo!()
	}
}

#[solidity_interface(
	name = UniqueNativeFungible,
	is(ERC20),
	enum(derive(PreDispatch))
)]
impl<T: Config> NativeFungibleHandle<T> where T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]> {}

generate_stubgen!(gen_impl, UniqueNativeFungibleCall<()>, true);
generate_stubgen!(gen_iface, UniqueNativeFungibleCall<()>, false);

impl<T: Config> CommonEvmHandler for NativeFungibleHandle<T>
where
	T::AccountId: From<[u8; 32]> + AsRef<[u8; 32]>,
{
	const CODE: &'static [u8] = include_bytes!("./stubs/UniqueNativeFungible.raw");

	fn call(self, handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		call::<T, UniqueNativeFungibleCall<T>, _, _>(handle, self)
	}
}
