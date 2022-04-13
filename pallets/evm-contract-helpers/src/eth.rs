// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

use core::marker::PhantomData;
use evm_coder::{abi::AbiWriter, execution::*, generate_stubgen, solidity_interface, types::*, ToLog};
use ethereum as _;
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use pallet_evm::{
	ExitRevert, OnCreate, OnMethodCall, PrecompileResult, PrecompileFailure,
	account::CrossAccountId, Pallet as PalletEvm
};
use sp_core::H160;
use crate::{
	AllowlistEnabled, Config, Owner, Pallet, SponsorBasket, SponsoringRateLimit, SponsoringModeT,
};
use frame_support::traits::Get;
use up_sponsorship::SponsorshipHandler;
use sp_std::vec::Vec;

struct ContractHelpers<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for ContractHelpers<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

#[derive(ToLog)]
pub enum ContractHelperEvent {
	CollectionCreated {
		#[indexed]
		owner: address,
		#[indexed]
		collection_id: address,
	},
}

#[solidity_interface(name = "ContractHelpers")]
impl<T: Config> ContractHelpers<T> {
	fn contract_owner(&self, contract_address: address) -> Result<address> {
		Ok(<Owner<T>>::get(contract_address))
	}

	fn sponsoring_enabled(&self, contract_address: address) -> Result<bool> {
		Ok(<Pallet<T>>::sponsoring_mode(contract_address) != SponsoringModeT::Disabled)
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
		Ok(<Pallet<T>>::allowed(contract_address, user))
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

	fn create_721_collection(&self, caller: caller) -> Result<address> {
		let caller = T::CrossAccountId::from_eth(caller);
		let collection_id = <pallet_nonfungible::Pallet<T>>::init_collection(
			caller.as_sub().clone(),
			Default::default(),
		)
		.map_err(pallet_evm_coder_substrate::dispatch_to_evm::<T>)?;
		let address = pallet_common::eth::collection_id_to_address(collection_id);

		<PalletEvm<T>>::deposit_log(
			ContractHelperEvent::CollectionCreated {
				owner: *caller.as_eth(),
				collection_id: address,
			}
			.to_log(address),
		);
		Ok(address)
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

		let helpers = ContractHelpers::<T>(SubstrateRecorder::<T>::new(gas_left));
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
impl<T: Config> SponsorshipHandler<T::CrossAccountId, (H160, Vec<u8>)>
	for HelpersContractSponsoring<T>
{
	fn get_sponsor(who: &T::CrossAccountId, call: &(H160, Vec<u8>)) -> Option<T::CrossAccountId> {
		let mode = <Pallet<T>>::sponsoring_mode(call.0);
		if mode == SponsoringModeT::Disabled {
			return None;
		}

		if mode == SponsoringModeT::Allowlisted && !<Pallet<T>>::allowed(call.0, *who.as_eth()) {
			return None;
		}
		let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;

		if let Some(last_tx_block) = <SponsorBasket<T>>::get(&call.0, who.as_eth()) {
			let limit = <SponsoringRateLimit<T>>::get(&call.0);

			let timeout = last_tx_block + limit;
			if block_number < timeout {
				return None;
			}
		}

		<SponsorBasket<T>>::insert(&call.0, who.as_eth(), block_number);

		let sponsor = T::CrossAccountId::from_eth(call.0);
		Some(sponsor)
	}
}

generate_stubgen!(contract_helpers_impl, ContractHelpersCall<()>, true);
generate_stubgen!(contract_helpers_iface, ContractHelpersCall<()>, false);
