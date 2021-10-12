#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(not(feature = "std"))]
extern crate alloc;

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
	#[cfg(not(feature = "std"))]
	use alloc::format;

	use evm_coder::{
		ToLog,
		abi::{AbiReader, AbiWrite, AbiWriter},
		execution::{self, Result},
		types::{Msg, value},
	};
	use frame_support::{ensure};
	use pallet_evm::{ExitError, ExitReason, ExitRevert, ExitSucceed, PrecompileOutput};
	pub use frame_support::dispatch::DispatchResult;
	use pallet_ethereum::EthereumTransactionSender;
	use sp_std::cell::RefCell;
	use sp_std::vec::Vec;
	use sp_core::{H160, H256};
	use ethereum::Log;
	use frame_support::{pallet_prelude::*, traits::PalletInfo};

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
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	// FIXME: those items are defined as private in evm_gasometer::consts, and we can't directly use it
	pub const G_LOG: u64 = 375;
	pub const G_LOGDATA: u64 = 8;
	pub const G_LOGTOPIC: u64 = 375;

	// From instabul hardfork configuration: https://github.com/rust-blockchain/evm/blob/fd4fd6acc0ca3208d6770fdb3ba407c94cdf97c6/runtime/src/lib.rs#L284
	pub const G_SLOAD_WORD: u64 = 800;
	pub const G_SSTORE_WORD: u64 = 20000;

	fn log_price(data: usize, topics: usize) -> u64 {
		G_LOG
			.saturating_add((data as u64).saturating_mul(G_LOGDATA))
			.saturating_add((topics as u64).saturating_mul(G_LOGTOPIC))
	}

	pub fn generate_transaction() -> ethereum::TransactionV0 {
		use ethereum::{TransactionV0, TransactionAction, TransactionSignature};
		TransactionV0 {
			nonce: 0.into(),
			gas_price: 0.into(),
			gas_limit: 0.into(),
			action: TransactionAction::Call(H160([0; 20])),
			value: 0.into(),
			// zero selector, this transaction always has same sender, so all data should be acquired from logs
			input: Vec::from([0, 0, 0, 0]),
			// if v is not 27 - then we need to pass some other validity checks
			signature: TransactionSignature::new(27, H256([0x88; 32]), H256([0x88; 32])).unwrap(),
		}
	}

	#[derive(Default)]
	pub struct SubstrateRecorder<T: Config> {
		contract: H160,
		logs: RefCell<Vec<Log>>,
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
		pub fn log_sub(&self, log: impl ToLog) -> DispatchResult {
			self.log_raw_sub(log.to_log(self.contract))
		}
		pub fn log_raw_sub(&self, log: Log) -> DispatchResult {
			self.consume_gas_sub(log_price(log.data.len(), log.topics.len()))?;
			self.logs.borrow_mut().push(log);
			Ok(())
		}
		/// Doesn't consumes any gas, should be used after consume_log_sub
		pub fn log_infallible(&self, log: impl ToLog) {
			self.logs.borrow_mut().push(log.to_log(self.contract));
		}
		pub fn retrieve_logs(self) -> Vec<Log> {
			self.logs.into_inner()
		}

		pub fn gas_left(&self) -> u64 {
			*self.gas_limit.borrow()
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
		pub fn consume_log_sub(&self, topics: usize, data: usize) -> DispatchResult {
			self.consume_gas_sub(log_price(data, topics))
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

		pub fn evm_to_precompile_output(
			self,
			result: evm_coder::execution::Result<Option<AbiWriter>>,
		) -> Option<PrecompileOutput> {
			use evm_coder::execution::Error;
			let (writer, reason) = match result {
				Ok(Some(v)) => (v, ExitReason::Succeed(ExitSucceed::Returned)),
				Ok(None) => return None,
				Err(Error::Revert(e)) => {
					let mut writer = AbiWriter::new_call(evm_coder::fn_selector!(Error(string)));
					(&e as &str).abi_write(&mut writer);

					(writer, ExitReason::Revert(ExitRevert::Reverted))
				}
				Err(Error::Fatal(f)) => (AbiWriter::new(), ExitReason::Fatal(f)),
				Err(Error::Error(e)) => (AbiWriter::new(), ExitReason::Error(e)),
			};

			Some(PrecompileOutput {
				cost: self.initial_gas - self.gas_left(),
				exit_status: reason,
				logs: self.retrieve_logs(),
				output: writer.finish(),
			})
		}

		pub fn submit_logs(self) -> DispatchResult {
			let logs = self.retrieve_logs();
			if logs.is_empty() {
				return Ok(());
			}
			T::EthereumTransactionSender::submit_logs_transaction(generate_transaction(), logs)
		}
	}

	pub fn dispatch_to_evm<T: Config>(err: DispatchError) -> evm_coder::execution::Error {
		use evm_coder::execution::Error as ExError;
		match err {
			DispatchError::Module { index, error, .. }
				if index
					== T::PalletInfo::index::<Pallet<T>>()
						.expect("evm-coder-substrate is a pallet, which should be added to runtime")
						as u8 =>
			{
				match error {
					v if v == Error::<T>::OutOfGas.as_u8() => ExError::Error(ExitError::OutOfGas),
					v if v == Error::<T>::OutOfFund.as_u8() => ExError::Error(ExitError::OutOfFund),
					_ => unreachable!("this pallet only defines two possible errors"),
				}
			}
			DispatchError::Module {
				message: Some(msg), ..
			} => ExError::Revert(msg.into()),
			DispatchError::Module { index, error, .. } => {
				ExError::Revert(format!("error {} in pallet {}", error, index))
			}
			e => ExError::Revert(format!("substrate error: {:?}", e)),
		}
	}

	pub fn call_internal<C: evm_coder::Call, E: evm_coder::Callable<C>>(
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
		e.call(Msg {
			call,
			caller,
			value,
		})
		.map(Some)
	}
}
