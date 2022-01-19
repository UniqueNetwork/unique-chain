use core::marker::PhantomData;
use evm_coder::{abi::AbiWriter, execution::Result, generate_stubgen, solidity_interface, types::*};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{ExitRevert, OnCreate, OnMethodCall, PrecompileResult, PrecompileFailure};
use sp_core::H160;
use crate::{
	AllowlistEnabled, Config, Owner, Pallet, SelfSponsoring, SponsoringMode, SponsorBasket,
	SponsoringRateLimit, SponsoringModeT,
};
use frame_support::traits::Get;
use up_sponsorship::SponsorshipHandler;
use sp_std::{convert::TryInto, vec::Vec};

struct ContractHelpers<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for ContractHelpers<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

#[solidity_interface(name = "ContractHelpers")]
impl<T: Config> ContractHelpers<T> {
	fn contract_owner(&self, contract_address: address) -> Result<address> {
		Ok(<Owner<T>>::get(contract_address))
	}

	fn sponsoring_enabled(&self, contract_address: address) -> Result<bool> {
		Ok(<SelfSponsoring<T>>::get(contract_address))
	}

	/// Deprecated
	fn toggle_sponsoring(
		&mut self,
		caller: caller,
		contract_address: address,
		enabled: bool,
	) -> Result<void> {
		<Pallet<T>>::ensure_owner(contract_address, caller)?;
		<Pallet<T>>::toggle_sponsoring(contract_address, enabled);
		Ok(())
	}

	fn set_sponsoring_mode(
		&mut self,
		caller: caller,
		contract_address: address,
		mode: uint8,
	) -> Result<void> {
		<Pallet<T>>::ensure_owner(contract_address, caller)?;
		let mode = SponsoringModeT::from_eth(mode).ok_or("unknown mode")?;
		<Pallet<T>>::set_sponsoring_mode(contract_address, mode);
		Ok(())
	}

	fn sponsoring_mode(&self, contract_address: address) -> Result<uint8> {
		Ok(<Pallet<T>>::sponsoring_mode(contract_address).to_eth())
	}

	fn set_sponsoring_rate_limit(
		&mut self,
		caller: caller,
		contract_address: address,
		rate_limit: uint32,
	) -> Result<void> {
		<Pallet<T>>::ensure_owner(contract_address, caller)?;
		<Pallet<T>>::set_sponsoring_rate_limit(contract_address, rate_limit.into());
		Ok(())
	}

	fn get_sponsoring_rate_limit(&self, contract_address: address) -> Result<uint32> {
		Ok(<SponsoringRateLimit<T>>::get(contract_address)
			.try_into()
			.map_err(|_| "rate limit > u32::MAX")?)
	}

	fn allowed(&self, contract_address: address, user: address) -> Result<bool> {
		self.0.consume_sload()?;
		Ok(<Pallet<T>>::allowed(contract_address, user)
			|| !<AllowlistEnabled<T>>::get(contract_address))
	}

	fn allowlist_enabled(&self, contract_address: address) -> Result<bool> {
		Ok(<AllowlistEnabled<T>>::get(contract_address))
	}

	fn toggle_allowlist(
		&mut self,
		caller: caller,
		contract_address: address,
		enabled: bool,
	) -> Result<void> {
		<Pallet<T>>::ensure_owner(contract_address, caller)?;
		<Pallet<T>>::toggle_allowlist(contract_address, enabled);
		Ok(())
	}

	fn toggle_allowed(
		&mut self,
		caller: caller,
		contract_address: address,
		user: address,
		allowed: bool,
	) -> Result<void> {
		<Pallet<T>>::ensure_owner(contract_address, caller)?;
		<Pallet<T>>::toggle_allowed(contract_address, user, allowed);
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
	) -> Option<PrecompileResult> {
		// TODO: Extract to another OnMethodCall handler
		if <AllowlistEnabled<T>>::get(target) && !<Pallet<T>>::allowed(*target, *source) {
			return Some(Err(PrecompileFailure::Revert {
				exit_status: ExitRevert::Reverted,
				cost: 0,
				output: {
					let mut writer = AbiWriter::new_call(evm_coder::fn_selector!(Error(string)));
					writer.string("Target contract is allowlisted");
					writer.finish()
				},
			}));
		}

		if target != &T::ContractAddress::get() {
			return None;
		}

		let helpers = ContractHelpers::<T>(SubstrateRecorder::<T>::new(*target, gas_left));
		pallet_evm_coder_substrate::call(*source, helpers, value, input)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/ContractHelpers.raw").to_vec())
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
		let mode = <Pallet<T>>::sponsoring_mode(call.0);
		if mode == SponsoringModeT::Disabled {
			return None;
		}
		if mode == SponsoringModeT::Allowlisted && !<Pallet<T>>::allowed(call.0, *who) {
			return None;
		}
		let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;

		if let Some(last_tx_block) = <SponsorBasket<T>>::get(&call.0, who) {
			let limit = <SponsoringRateLimit<T>>::get(&call.0);

			let timeout = last_tx_block + limit;
			if block_number < timeout {
				return None;
			}
		}

		<SponsorBasket<T>>::insert(&call.0, who, block_number);

		Some(call.0)
	}
}

generate_stubgen!(contract_helpers_impl, ContractHelpersCall<()>, true);
generate_stubgen!(contract_helpers_iface, ContractHelpersCall<()>, false);
