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

//! Implementation of magic contract

use core::marker::PhantomData;
use evm_coder::{
	abi::AbiWriter, execution::Result, generate_stubgen, solidity_interface, types::*, ToLog,
};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder, dispatch_to_evm};
use pallet_evm::{
	ExitRevert, OnCreate, OnMethodCall, PrecompileResult, PrecompileFailure, PrecompileHandle,
	account::CrossAccountId,
};
use sp_core::H160;
use up_data_structs::SponsorshipState;
use crate::{
	AllowlistEnabled, Config, Owner, Pallet, SponsorBasket, SponsoringRateLimit, SponsoringModeT,
	Sponsoring,
};
use frame_support::traits::Get;
use up_sponsorship::SponsorshipHandler;
use sp_std::vec::Vec;

/// Pallet events.
#[derive(ToLog)]
pub enum ContractHelpersEvents {
	/// Contract sponsor was set.
	ContractSponsorSet {
		/// Contract address of the affected collection.
		#[indexed]
		contract_address: address,
		/// New sponsor address.
		sponsor: address,
	},

	/// New sponsor was confirm.
	ContractSponsorshipConfirmed {
		/// Contract address of the affected collection.
		#[indexed]
		contract_address: address,
		/// New sponsor address.
		sponsor: address,
	},

	/// Collection sponsor was removed.
	ContractSponsorRemoved {
		/// Contract address of the affected collection.
		#[indexed]
		contract_address: address,
	},
}

/// See [`ContractHelpersCall`]
pub struct ContractHelpers<T: Config>(SubstrateRecorder<T>);
impl<T: Config> WithRecorder<T> for ContractHelpers<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.0
	}

	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.0
	}
}

/// @title Magic contract, which allows users to reconfigure other contracts
#[solidity_interface(name = ContractHelpers, events(ContractHelpersEvents))]
impl<T: Config> ContractHelpers<T>
where
	T::AccountId: AsRef<[u8; 32]>,
{
	/// Get user, which deployed specified contract
	/// @dev May return zero address in case if contract is deployed
	///  using uniquenetwork evm-migration pallet, or using other terms not
	///  intended by pallet-evm
	/// @dev Returns zero address if contract does not exists
	/// @param contractAddress Contract to get owner of
	/// @return address Owner of contract
	fn contract_owner(&self, contract_address: address) -> Result<address> {
		Ok(<Owner<T>>::get(contract_address))
	}

	/// Set sponsor.
	/// @param contractAddress Contract for which a sponsor is being established.
	/// @param sponsor User address who set as pending sponsor.
	fn set_sponsor(
		&mut self,
		caller: caller,
		contract_address: address,
		sponsor: address,
	) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		Pallet::<T>::set_sponsor(
			&T::CrossAccountId::from_eth(caller),
			contract_address,
			&T::CrossAccountId::from_eth(sponsor),
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	/// Set contract as self sponsored.
	///
	/// @param contractAddress Contract for which a self sponsoring is being enabled.
	fn self_sponsored_enable(&mut self, caller: caller, contract_address: address) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		let caller = T::CrossAccountId::from_eth(caller);

		Pallet::<T>::ensure_owner(contract_address, *caller.as_eth())
			.map_err(dispatch_to_evm::<T>)?;

		Pallet::<T>::force_set_sponsor(
			contract_address,
			&T::CrossAccountId::from_eth(contract_address),
		)
		.map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	/// Remove sponsor.
	///
	/// @param contractAddress Contract for which a sponsorship is being removed.
	fn remove_sponsor(&mut self, caller: caller, contract_address: address) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		Pallet::<T>::remove_sponsor(&T::CrossAccountId::from_eth(caller), contract_address)
			.map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	/// Confirm sponsorship.
	///
	/// @dev Caller must be same that set via [`setSponsor`].
	///
	/// @param contractAddress Сontract for which need to confirm sponsorship.
	fn confirm_sponsorship(&mut self, caller: caller, contract_address: address) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		Pallet::<T>::confirm_sponsorship(&T::CrossAccountId::from_eth(caller), contract_address)
			.map_err(dispatch_to_evm::<T>)?;

		Ok(())
	}

	/// Get current sponsor.
	///
	/// @param contractAddress The contract for which a sponsor is requested.
	/// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	fn get_sponsor(&self, contract_address: address) -> Result<(address, uint256)> {
		let sponsor =
			Pallet::<T>::get_sponsor(contract_address).ok_or("Contract has no sponsor")?;
		Ok(pallet_common::eth::convert_cross_account_to_tuple::<T>(&sponsor))
	}

	/// Check tat contract has confirmed sponsor.
	///
	/// @param contractAddress The contract for which the presence of a confirmed sponsor is checked.
	/// @return **true** if contract has confirmed sponsor.
	fn has_sponsor(&self, contract_address: address) -> Result<bool> {
		Ok(Pallet::<T>::get_sponsor(contract_address).is_some())
	}

	/// Check tat contract has pending sponsor.
	///
	/// @param contractAddress The contract for which the presence of a pending sponsor is checked.
	/// @return **true** if contract has pending sponsor.
	fn has_pending_sponsor(&self, contract_address: address) -> Result<bool> {
		Ok(match Sponsoring::<T>::get(contract_address) {
			SponsorshipState::Disabled | SponsorshipState::Confirmed(_) => false,
			SponsorshipState::Unconfirmed(_) => true,
		})
	}

	fn sponsoring_enabled(&self, contract_address: address) -> Result<bool> {
		Ok(<Pallet<T>>::sponsoring_mode(contract_address) != SponsoringModeT::Disabled)
	}

	fn set_sponsoring_mode(
		&mut self,
		caller: caller,
		contract_address: address,
		// TODO: implement support for enums in evm-coder
		mode: uint8,
	) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		<Pallet<T>>::ensure_owner(contract_address, caller).map_err(dispatch_to_evm::<T>)?;
		let mode = SponsoringModeT::from_eth(mode).ok_or("unknown mode")?;
		<Pallet<T>>::set_sponsoring_mode(contract_address, mode);

		Ok(())
	}

	/// Get current contract sponsoring rate limit
	/// @param contractAddress Contract to get sponsoring mode of
	/// @return uint32 Amount of blocks between two sponsored transactions
	fn get_sponsoring_rate_limit(&self, contract_address: address) -> Result<uint32> {
		Ok(<SponsoringRateLimit<T>>::get(contract_address)
			.try_into()
			.map_err(|_| "rate limit > u32::MAX")?)
	}

	/// Set contract sponsoring rate limit
	/// @dev Sponsoring rate limit - is a minimum amount of blocks that should
	///  pass between two sponsored transactions
	/// @param contractAddress Contract to change sponsoring rate limit of
	/// @param rateLimit Target rate limit
	/// @dev Only contract owner can change this setting
	fn set_sponsoring_rate_limit(
		&mut self,
		caller: caller,
		contract_address: address,
		rate_limit: uint32,
	) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		<Pallet<T>>::ensure_owner(contract_address, caller).map_err(dispatch_to_evm::<T>)?;
		<Pallet<T>>::set_sponsoring_rate_limit(contract_address, rate_limit.into());
		Ok(())
	}

	/// Is specified user present in contract allow list
	/// @dev Contract owner always implicitly included
	/// @param contractAddress Contract to check allowlist of
	/// @param user User to check
	/// @return bool Is specified users exists in contract allowlist
	fn allowed(&self, contract_address: address, user: address) -> Result<bool> {
		self.0.consume_sload()?;
		Ok(<Pallet<T>>::allowed(contract_address, user))
	}

	/// Toggle user presence in contract allowlist
	/// @param contractAddress Contract to change allowlist of
	/// @param user Which user presence should be toggled
	/// @param isAllowed `true` if user should be allowed to be sponsored
	///  or call this contract, `false` otherwise
	/// @dev Only contract owner can change this setting
	fn toggle_allowed(
		&mut self,
		caller: caller,
		contract_address: address,
		user: address,
		is_allowed: bool,
	) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		<Pallet<T>>::ensure_owner(contract_address, caller).map_err(dispatch_to_evm::<T>)?;
		<Pallet<T>>::toggle_allowed(contract_address, user, is_allowed);

		Ok(())
	}

	/// Is this contract has allowlist access enabled
	/// @dev Allowlist always can have users, and it is used for two purposes:
	///  in case of allowlist sponsoring mode, users will be sponsored if they exist in allowlist
	///  in case of allowlist access enabled, only users from allowlist may call this contract
	/// @param contractAddress Contract to get allowlist access of
	/// @return bool Is specified contract has allowlist access enabled
	fn allowlist_enabled(&self, contract_address: address) -> Result<bool> {
		Ok(<AllowlistEnabled<T>>::get(contract_address))
	}

	/// Toggle contract allowlist access
	/// @param contractAddress Contract to change allowlist access of
	/// @param enabled Should allowlist access to be enabled?
	fn toggle_allowlist(
		&mut self,
		caller: caller,
		contract_address: address,
		enabled: bool,
	) -> Result<void> {
		self.recorder().consume_sload()?;
		self.recorder().consume_sstore()?;

		<Pallet<T>>::ensure_owner(contract_address, caller).map_err(dispatch_to_evm::<T>)?;
		<Pallet<T>>::toggle_allowlist(contract_address, enabled);
		Ok(())
	}
}

/// Implements [`OnMethodCall`], which delegates call to [`ContractHelpers`]
pub struct HelpersOnMethodCall<T: Config>(PhantomData<*const T>);
impl<T: Config> OnMethodCall<T> for HelpersOnMethodCall<T>
where
	T::AccountId: AsRef<[u8; 32]>,
{
	fn is_reserved(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn is_used(contract: &sp_core::H160) -> bool {
		contract == &T::ContractAddress::get()
	}

	fn call(handle: &mut impl PrecompileHandle) -> Option<PrecompileResult> {
		// TODO: Extract to another OnMethodCall handler
		if <AllowlistEnabled<T>>::get(handle.code_address())
			&& !<Pallet<T>>::allowed(handle.code_address(), handle.context().caller)
		{
			return Some(Err(PrecompileFailure::Revert {
				exit_status: ExitRevert::Reverted,
				output: {
					let mut writer = AbiWriter::new_call(evm_coder::fn_selector!(Error(string)));
					writer.string("Target contract is allowlisted");
					writer.finish()
				},
			}));
		}

		if handle.code_address() != T::ContractAddress::get() {
			return None;
		}

		let helpers = ContractHelpers::<T>(SubstrateRecorder::<T>::new(handle.remaining_gas()));
		pallet_evm_coder_substrate::call(handle, helpers)
	}

	fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
		(contract == &T::ContractAddress::get())
			.then(|| include_bytes!("./stubs/ContractHelpers.raw").to_vec())
	}
}

/// Hooks into contract creation, storing owner of newly deployed contract
pub struct HelpersOnCreate<T: Config>(PhantomData<*const T>);
impl<T: Config> OnCreate<T> for HelpersOnCreate<T> {
	fn on_create(owner: H160, contract: H160) {
		<Owner<T>>::insert(contract, owner);
	}
}

/// Bridge to pallet-sponsoring
pub struct HelpersContractSponsoring<T: Config>(PhantomData<*const T>);
impl<T: Config> SponsorshipHandler<T::CrossAccountId, (H160, Vec<u8>)>
	for HelpersContractSponsoring<T>
{
	fn get_sponsor(who: &T::CrossAccountId, call: &(H160, Vec<u8>)) -> Option<T::CrossAccountId> {
		let (contract_address, _) = call;
		let mode = <Pallet<T>>::sponsoring_mode(*contract_address);
		if mode == SponsoringModeT::Disabled {
			return None;
		}

		let sponsor = match <Pallet<T>>::get_sponsor(*contract_address) {
			Some(sponsor) => sponsor,
			None => return None,
		};

		if mode == SponsoringModeT::Allowlisted
			&& !<Pallet<T>>::allowed(*contract_address, *who.as_eth())
		{
			return None;
		}
		let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;

		if let Some(last_tx_block) = <SponsorBasket<T>>::get(contract_address, who.as_eth()) {
			let limit = <SponsoringRateLimit<T>>::get(contract_address);

			let timeout = last_tx_block + limit;
			if block_number < timeout {
				return None;
			}
		}

		<SponsorBasket<T>>::insert(contract_address, who.as_eth(), block_number);

		Some(sponsor)
	}
}

generate_stubgen!(contract_helpers_impl, ContractHelpersCall<()>, true);
generate_stubgen!(contract_helpers_iface, ContractHelpersCall<()>, false);
