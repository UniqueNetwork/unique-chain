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

extern crate self as pallet_evm_coder_substrate;

#[cfg(not(feature = "std"))]
extern crate alloc;
#[cfg(not(feature = "std"))]
use alloc::format;
use core::marker::PhantomData;

use execution::PreDispatch;
use frame_support::{
	ensure, pallet_prelude::DispatchError, sp_runtime::ModuleError, traits::PalletInfo,
};
use pallet_evm::{
	ExitError, ExitRevert, ExitSucceed, GasWeightMapping, PrecompileFailure, PrecompileHandle,
	PrecompileOutput, PrecompileResult,
};
use parity_scale_codec::Decode;
use sp_core::{Get, H160};
use sp_std::{cell::RefCell, vec::Vec};
use sp_weights::Weight;
use up_data_structs::budget;
// #[cfg(feature = "runtime-benchmarks")]
// pub mod benchmarking;
pub mod execution;

pub use evm_coder::{abi, solidity_interface, types, Contract, ResultWithPostInfoOf, ToLog};
use evm_coder::{
	types::{Msg, Value},
	AbiEncode,
};
pub use pallet::*;
#[doc(hidden)]
pub use spez::spez;

#[frame_support::pallet]
pub mod pallet {
	pub use frame_support::dispatch::DispatchResult;

	use super::*;

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
	pub trait Config: frame_system::Config + pallet_evm::Config {}

	#[pallet::pallet]
	pub struct Pallet<T>(_);
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
	initial_gas: u64,
	gas_limit: RefCell<u64>,
	_phantom: PhantomData<*const T>,
}

impl<T: Config> SubstrateRecorder<T> {
	pub fn new(gas_limit: u64) -> Self {
		Self {
			initial_gas: gas_limit,
			gas_limit: RefCell::new(gas_limit),
			_phantom: PhantomData,
		}
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

	pub fn consume_sload(&self) -> execution::Result<()> {
		self.consume_gas(G_SLOAD_WORD)
	}
	pub fn consume_sstore(&self) -> execution::Result<()> {
		self.consume_gas(G_SSTORE_WORD)
	}
	pub fn consume_gas(&self, gas: u64) -> execution::Result<()> {
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
		handle: &mut impl PrecompileHandle,
		result: execution::Result<Option<Vec<u8>>>,
	) -> Option<PrecompileResult> {
		use execution::Error;
		// We ignore error here, as it should not occur, as we have our own bookkeeping of gas
		let _ = handle.record_cost(self.initial_gas - self.gas_left());
		Some(match result {
			Ok(Some(v)) => Ok(PrecompileOutput {
				exit_status: ExitSucceed::Returned,
				output: v,
			}),
			Ok(None) => return None,
			Err(Error::Revert(e)) => Err(PrecompileFailure::Revert {
				exit_status: ExitRevert::Reverted,
				output: (&e as &str,).abi_encode_call(evm_coder::fn_selector!(Error(string))),
			}),
			Err(Error::Fatal(f)) => Err(PrecompileFailure::Fatal { exit_status: f }),
			Err(Error::Error(e)) => Err(e.into()),
		})
	}

	/// Consume gas for reading.
	pub fn consume_store_reads(&self, reads: u64) -> execution::Result<()> {
		self.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
			<T as frame_system::Config>::DbWeight::get()
				.read
				.saturating_mul(reads),
			// TODO: measure proof
			0,
		)))
	}

	/// Consume gas for writing.
	pub fn consume_store_writes(&self, writes: u64) -> execution::Result<()> {
		self.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
			<T as frame_system::Config>::DbWeight::get()
				.write
				.saturating_mul(writes),
			// TODO: measure proof
			0,
		)))
	}

	/// Consume gas for reading and writing.
	pub fn consume_store_reads_and_writes(&self, reads: u64, writes: u64) -> execution::Result<()> {
		let weight = <T as frame_system::Config>::DbWeight::get();
		let reads = weight.read.saturating_mul(reads);
		let writes = weight.read.saturating_mul(writes);
		self.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
			reads.saturating_add(writes),
			// TODO: measure proof
			0,
		)))
	}
}

pub fn dispatch_to_evm<T: Config>(err: DispatchError) -> execution::Error {
	use execution::Error as ExError;
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
			ExError::Revert(format!("error {error:?} in pallet {index}"))
		}
		e => ExError::Revert(format!("substrate error: {e:?}")),
	}
}

pub trait WithRecorder<T: Config> {
	fn recorder(&self) -> &SubstrateRecorder<T>;
	fn into_recorder(self) -> SubstrateRecorder<T>;
}

/// Helper to simplify implementing bridge between evm-coder definitions and pallet-evm
pub fn call<T, C, E, H>(handle: &mut H, mut e: E) -> Option<PrecompileResult>
where
	T: Config,
	C: evm_coder::Call + PreDispatch,
	E: evm_coder::Callable<C> + WithRecorder<T>,
	H: PrecompileHandle,
	execution::ResultWithPostInfo<Vec<u8>>: From<ResultWithPostInfoOf<E, Vec<u8>>>,
{
	let result = call_internal(
		handle.context().caller,
		&mut e,
		handle.context().apparent_value,
		handle.input(),
	);
	e.into_recorder().evm_to_precompile_output(handle, result)
}

fn call_internal<T, C, E>(
	caller: H160,
	e: &mut E,
	value: Value,
	input: &[u8],
) -> execution::Result<Option<Vec<u8>>>
where
	T: Config,
	C: evm_coder::Call + PreDispatch,
	E: Contract + evm_coder::Callable<C> + WithRecorder<T>,
	execution::ResultWithPostInfo<Vec<u8>>: From<ResultWithPostInfoOf<E, Vec<u8>>>,
{
	let call = C::parse_full(input)?;
	if call.is_none() {
		let selector = if input.len() >= 4 {
			let mut selector = [0; 4];
			selector.copy_from_slice(&input[..4]);
			u32::from_be_bytes(selector)
		} else {
			0
		};
		return Err(format!("unrecognized selector: 0x{selector:0>8x}").into());
	}
	let call = call.unwrap();

	let dispatch_info = call.dispatch_info();
	e.recorder()
		.consume_gas(T::GasWeightMapping::weight_to_gas(dispatch_info.weight))?;

	match execution::ResultWithPostInfo::from(e.call(Msg {
		call,
		caller,
		value,
	})) {
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

#[cfg(test)]
#[allow(dead_code)]
mod tests {
	use core::marker::PhantomData;

	use evm_coder::ERC165Call;
	use frame_support::weights::Weight;

	use crate::execution::PreDispatch;

	#[derive(PreDispatch)]
	enum ExampleCall<T: super::Config> {
		ERC165Call(ERC165Call, PhantomData<fn() -> T>),
		OtherCall(ERC165Call),

		#[weight(Weight::from_parts(a + b, 0))]
		Example {
			a: u64,
			b: u64,
		},
	}
}
