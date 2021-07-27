use core::marker::PhantomData;
use evm_coder::{abi::AbiWriter, execution::Result, solidity_interface, types::*};
use pallet_evm_coder_substrate::SubstrateRecorder;
use pallet_evm::{ExitReason, ExitRevert, OnCreate, OnMethodCall, PrecompileOutput};
use sp_core::H160;
use crate::{
	AllowlistEnabled, Config, Owner, Pallet, SelfSponsoring, SponsorBasket, SponsoringRateLimit,
};
use frame_support::traits::Get;
use up_sponsorship::SponsorshipHandler;
use sp_std::vec::Vec;

struct ContractHelpers<T: Config>(SubstrateRecorder<T>);

#[solidity_interface(name = "ContractHelpers")]
impl<T: Config> ContractHelpers<T> {
	fn contract_owner(&self, contract: address) -> Result<address> {
		self.0.consume_sload()?;
		Ok(<Owner<T>>::get(contract))
	}

	fn sponsoring_enabled(&self, contract: address) -> Result<bool> {
		self.0.consume_sload()?;
		Ok(<SelfSponsoring<T>>::get(contract))
	}

	fn toggle_sponsoring(
		&mut self,
		caller: caller,
		contract: address,
		enabled: bool,
	) -> Result<void> {
		self.0.consume_sload()?;
		<Pallet<T>>::ensure_owner(contract, caller)?;
		self.0.consume_sstore()?;
		<Pallet<T>>::toggle_sponsoring(contract, enabled);
		Ok(())
	}

	fn allowed(&self, contract: address, user: address) -> Result<bool> {
		self.0.consume_sload()?;
		Ok(<Pallet<T>>::allowed(contract, user))
	}

	fn allowlist_enabled(&self, contract: address) -> Result<bool> {
		self.0.consume_sload()?;
		Ok(<AllowlistEnabled<T>>::get(contract))
	}

	fn toggle_allowlist(
		&mut self,
		caller: caller,
		contract: address,
		enabled: bool,
	) -> Result<void> {
		self.0.consume_sload()?;
		<Pallet<T>>::ensure_owner(contract, caller)?;
		self.0.consume_sstore()?;
		<Pallet<T>>::toggle_allowlist(contract, enabled);
		Ok(())
	}

	fn toggle_allowed(
		&mut self,
		caller: caller,
		contract: address,
		user: address,
		allowed: bool,
	) -> Result<void> {
		self.0.consume_sload()?;
		<Pallet<T>>::ensure_owner(contract, caller)?;
		self.0.consume_sstore()?;
		<Pallet<T>>::toggle_allowed(contract, user, allowed);
		Ok(())
	}
}

pub struct HelpersOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config> OnMethodCall<T> for HelpersOnMethodCall<T> {
	fn is_reserved(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn is_used(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn call(
		source: &sp_core::H160,
		target: &sp_core::H160,
		gas_left: u64,
		input: &[u8],
		value: sp_core::U256,
	) -> Option<PrecompileOutput> {
		// TODO: Extract to another OnMethodCall handler
		if !<Pallet<T>>::allowed(*target, *source) {
			return Some(PrecompileOutput {
				exit_status: ExitReason::Revert(ExitRevert::Reverted),
				cost: 0,
				output: {
					let mut writer = AbiWriter::new_call(evm_coder::fn_selector!(Error(string)));
					writer.string("Target contract is allowlisted");
					writer.finish()
				},
				logs: sp_std::vec![],
			});
		}

		if target != &T::ContractAddress::get() {
			return None;
		}

		let mut helpers = ContractHelpers::<T>(SubstrateRecorder::<T>::new(*target, gas_left));
		let result = pallet_evm_coder_substrate::call_internal(*source, &mut helpers, value, input);
		helpers.0.evm_to_precompile_output(result)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/ContractHelpers.bin").to_vec())
	}
}

pub struct HelpersOnCreate<T: Config>(PhantomData<*const T>);
impl<T: Config> OnCreate<T> for HelpersOnCreate<T> {
	fn on_create(owner: H160, contract: H160) {
		<Owner<T>>::insert(contract, owner);
	}
}

pub struct HelpersContractSponsoring<T: Config>(PhantomData<*const T>);
impl<T: Config> SponsorshipHandler<H160, (H160, Vec<u8>)> for HelpersContractSponsoring<T> {
	fn get_sponsor(who: &H160, call: &(H160, Vec<u8>)) -> Option<H160> {
		if <SelfSponsoring<T>>::get(&call.0) {
			let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
			let limit = <SponsoringRateLimit<T>>::get(&call.0);
			if let Some(last_tx_block) = <SponsorBasket<T>>::get(&call.0, who) {
				<SponsorBasket<T>>::insert(&call.0, who, block_number);
				let limit_time = last_tx_block + limit;
				if block_number > limit_time {
					return Some(call.0);
				}
			} else {
				<SponsorBasket<T>>::insert(&call.0, who, block_number);
				return Some(call.0);
			}
		}
		None
	}
}
