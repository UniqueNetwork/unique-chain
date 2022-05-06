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

#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(not(feature = "std"))]
extern crate alloc;
#[cfg(not(feature = "std"))]
use alloc::format;
use frame_support::dispatch::Weight;

use core::marker::PhantomData;
use sp_std::cell::RefCell;
use sp_std::vec::Vec;

use codec::Decode;
use frame_support::pallet_prelude::DispatchError;
use frame_support::traits::PalletInfo;
use frame_support::{ensure, sp_runtime::ModuleError};
use up_data_structs::budget;
use pallet_evm::{
	ExitError, ExitRevert, ExitSucceed, GasWeightMapping, PrecompileFailure, PrecompileOutput,
	PrecompileResult, runner::stack::MaybeMirroredLog,
};
use sp_core::H160;
use pallet_ethereum::EthereumTransactionSender;
// #[cfg(feature = "runtime-benchmarks")]
// pub mod benchmarking;

use evm_coder::{
	ToLog,
	abi::{AbiReader, AbiWrite, AbiWriter},
	execution::{self, Result},
	types::{Msg, value},
};

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	use frame_system::ensure_signed;
	pub use frame_support::dispatch::DispatchResult;
	use frame_system::pallet_prelude::*;

	/// DispatchError is opaque, but we need to somehow extract correct error in case of OutOfGas failure
	/// So we have this pallet, which defines OutOfGas error, and knews its own id to check if DispatchError
	/// is thrown because of it
	///
	/// These errors shouldn't end in extrinsic results, as they only used in evm execution path
	#[pallet::error]
	pub enum Error<T> {
		OutOfGas,
		OutOfFund,
	}

	#[pallet::config]
	pub trait Config: frame_system::Config {
		type EthereumTransactionSender: pallet_ethereum::EthereumTransactionSender;
		type GasWeightMapping: pallet_evm::GasWeightMapping;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(0)]
		pub fn empty_call(origin: OriginFor<T>) -> DispatchResult {
			let _sender = ensure_signed(origin)?;
			Ok(())
		}
	}
}

// From instabul hardfork configuration: https://github.com/rust-blockchain/evm/blob/fd4fd6acc0ca3208d6770fdb3ba407c94cdf97c6/runtime/src/lib.rs#L284
pub const G_SLOAD_WORD: u64 = 800;
pub const G_SSTORE_WORD: u64 = 20000;

pub struct GasCallsBudget<'r, T: Config> {
	recorder: &'r SubstrateRecorder<T>,
	gas_per_call: u64,
}
impl<T: Config> budget::Budget for GasCallsBudget<'_, T> {
	fn consume_custom(&self, calls: u32) -> bool {
		let (gas, overflown) = (calls as u64).overflowing_add(self.gas_per_call);
		if overflown {
			return false;
		}
		self.recorder.consume_gas(gas).is_ok()
	}
}

#[derive(Default)]
pub struct SubstrateRecorder<T: Config> {
	contract: H160,
	logs: RefCell<Vec<MaybeMirroredLog>>,
	initial_gas: u64,
	gas_limit: RefCell<u64>,
	_phantom: PhantomData<*const T>,
}

impl<T: Config> SubstrateRecorder<T> {
	pub fn new(contract: H160, gas_limit: u64) -> Self {
		Self {
			contract,
			logs: RefCell::new(Vec::new()),
			initial_gas: gas_limit,
			gas_limit: RefCell::new(gas_limit),
			_phantom: PhantomData,
		}
	}

	pub fn is_empty(&self) -> bool {
		self.logs.borrow().is_empty()
	}
	// Logs emitted with log_direct appear as substrate evm.Log event
	pub fn log_direct(&self, log: impl ToLog) {
		self.logs
			.borrow_mut()
			.push(MaybeMirroredLog::direct(log.to_log(self.contract)))
	}
	/// If log already has substrate equivalent - then we don't need to emit evm.Log
	pub fn log_mirrored(&self, log: impl ToLog) {
		self.logs
			.borrow_mut()
			.push(MaybeMirroredLog::mirrored(log.to_log(self.contract)))
	}
	pub fn retrieve_logs(self) -> Vec<MaybeMirroredLog> {
		self.logs.into_inner()
	}

	pub fn gas_left(&self) -> u64 {
		*self.gas_limit.borrow()
	}
	pub fn gas_calls_budget(&self, gas_per_call: u64) -> GasCallsBudget<T> {
		GasCallsBudget {
			recorder: self,
			gas_per_call,
		}
	}
	pub fn weight_calls_budget(&self, weight_per_call: Weight) -> GasCallsBudget<T> {
		GasCallsBudget {
			recorder: self,
			gas_per_call: T::GasWeightMapping::weight_to_gas(weight_per_call),
		}
	}
	pub fn consume_sload_sub(&self) -> DispatchResult {
		self.consume_gas_sub(G_SLOAD_WORD)
	}
	pub fn consume_sstores_sub(&self, amount: usize) -> DispatchResult {
		self.consume_gas_sub(G_SSTORE_WORD.saturating_mul(amount as u64))
	}
	pub fn consume_sstore_sub(&self) -> DispatchResult {
		self.consume_gas_sub(G_SSTORE_WORD)
	}
	pub fn consume_gas_sub(&self, gas: u64) -> DispatchResult {
		ensure!(gas != u64::MAX, Error::<T>::OutOfGas);
		let mut gas_limit = self.gas_limit.borrow_mut();
		ensure!(gas <= *gas_limit, Error::<T>::OutOfGas);
		*gas_limit -= gas;
		Ok(())
	}

	pub fn consume_sload(&self) -> Result<()> {
		self.consume_gas(G_SLOAD_WORD)
	}
	pub fn consume_sstore(&self) -> Result<()> {
		self.consume_gas(G_SSTORE_WORD)
	}
	pub fn consume_gas(&self, gas: u64) -> Result<()> {
		if gas == u64::MAX {
			return Err(execution::Error::Error(ExitError::OutOfGas));
		}
		let mut gas_limit = self.gas_limit.borrow_mut();
		if gas > *gas_limit {
			return Err(execution::Error::Error(ExitError::OutOfGas));
		}
		*gas_limit -= gas;
		Ok(())
	}
	pub fn return_gas(&self, gas: u64) {
		let mut gas_limit = self.gas_limit.borrow_mut();
		*gas_limit += gas;
	}

	pub fn evm_to_precompile_output(
		self,
		result: evm_coder::execution::Result<Option<AbiWriter>>,
	) -> Option<PrecompileResult> {
		use evm_coder::execution::Error;
		Some(match result {
			Ok(Some(v)) => Ok(PrecompileOutput {
				exit_status: ExitSucceed::Returned,
				cost: self.initial_gas - self.gas_left(),
				// TODO: preserve mirroring status
				logs: self.retrieve_logs().into_iter().map(|l| l.log).collect(),
				output: v.finish(),
			}),
			Ok(None) => return None,
			Err(Error::Revert(e)) => {
				let mut writer = AbiWriter::new_call(evm_coder::fn_selector!(Error(string)));
				(&e as &str).abi_write(&mut writer);

				Err(PrecompileFailure::Revert {
					exit_status: ExitRevert::Reverted,
					cost: self.initial_gas - self.gas_left(),
					output: writer.finish(),
				})
			}
			Err(Error::Fatal(f)) => Err(f.into()),
			Err(Error::Error(e)) => Err(e.into()),
		})
	}

	pub fn submit_logs(self) {
		let logs = self.retrieve_logs();
		if logs.is_empty() {
			return;
		}
		T::EthereumTransactionSender::submit_logs_transaction(Default::default(), logs)
	}
}

pub fn dispatch_to_evm<T: Config>(err: DispatchError) -> evm_coder::execution::Error {
	use evm_coder::execution::Error as ExError;
	match err {
		DispatchError::Module(ModuleError { index, error, .. })
			if index
				== T::PalletInfo::index::<Pallet<T>>()
					.expect("evm-coder-substrate is a pallet, which should be added to runtime")
					as u8 =>
		{
			let mut read = &error as &[u8];
			match Error::<T>::decode(&mut read) {
				Ok(Error::<T>::OutOfGas) => ExError::Error(ExitError::OutOfGas),
				Ok(Error::<T>::OutOfFund) => ExError::Error(ExitError::OutOfFund),
				_ => unreachable!("this pallet only defines two possible errors"),
			}
		}
		DispatchError::Module(ModuleError {
			message: Some(msg), ..
		}) => ExError::Revert(msg.into()),
		DispatchError::Module(ModuleError { index, error, .. }) => {
			ExError::Revert(format!("error {:?} in pallet {}", error, index))
		}
		e => ExError::Revert(format!("substrate error: {:?}", e)),
	}
}

pub trait WithRecorder<T: Config> {
	fn recorder(&self) -> &SubstrateRecorder<T>;
	fn into_recorder(self) -> SubstrateRecorder<T>;
}

/// Helper to simplify implementing bridge between evm-coder definitions and pallet-evm
pub fn call<
	T: Config,
	C: evm_coder::Call + evm_coder::Weighted,
	E: evm_coder::Callable<C> + WithRecorder<T>,
>(
	caller: H160,
	mut e: E,
	value: value,
	input: &[u8],
) -> Option<PrecompileResult> {
	let result = call_internal(caller, &mut e, value, input);
	e.into_recorder().evm_to_precompile_output(result)
}

fn call_internal<
	T: Config,
	C: evm_coder::Call + evm_coder::Weighted,
	E: evm_coder::Callable<C> + WithRecorder<T>,
>(
	caller: H160,
	e: &mut E,
	value: value,
	input: &[u8],
) -> evm_coder::execution::Result<Option<AbiWriter>> {
	let (selector, mut reader) = AbiReader::new_call(input)?;
	let call = C::parse(selector, &mut reader)?;
	if call.is_none() {
		return Ok(None);
	}
	let call = call.unwrap();

	let dispatch_info = call.weight();
	e.recorder()
		.consume_gas(T::GasWeightMapping::weight_to_gas(dispatch_info.weight))?;

	match e.call(Msg {
		call,
		caller,
		value,
	}) {
		Ok(v) => {
			let unspent = v.post_info.calc_unspent(&dispatch_info);
			e.recorder()
				.return_gas(T::GasWeightMapping::weight_to_gas(unspent));
			Ok(Some(v.data))
		}
		Err(v) => {
			let unspent = v.post_info.calc_unspent(&dispatch_info);
			e.recorder()
				.return_gas(T::GasWeightMapping::weight_to_gas(unspent));
			Err(v.data)
		}
	}
}
