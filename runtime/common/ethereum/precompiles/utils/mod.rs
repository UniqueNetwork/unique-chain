use sp_std::borrow::ToOwned;
use fp_evm::{Context, ExitRevert, PrecompileFailure};
use sp_core::U256;
use sp_std::marker::PhantomData;

mod data;

pub use data::{Bytes, EvmData, EvmDataReader, EvmDataWriter};

/// Alias for Result returning an EVM precompile error.
pub type EvmResult<T = ()> = Result<T, PrecompileFailure>;

/// Helper functions requiring a Runtime.
/// This runtime must of course implement `pallet_evm::Config`.
#[derive(Clone, Copy, Debug)]
pub struct RuntimeHelper<Runtime>(PhantomData<Runtime>);

/// Represents modifiers a Solidity function can be annotated with.
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum FunctionModifier {
	/// Function that doesn't modify the state.
	View,
	/// Function that modifies the state and accept funds.
	Payable,
}

/// Custom Gasometer to record costs in precompiles.
/// It is advised to record known costs as early as possible to
/// avoid unecessary computations if there is an Out of Gas.
///
/// Provides functions related to reverts, as reverts takes the recorded amount
/// of gas into account.
#[derive(Clone, Copy, Debug)]
pub struct Gasometer();

impl Gasometer {
	/// Create a new Gasometer with provided gas limit.
	/// None is no limit.
	pub fn new() -> Self {
		Self()
	}

	/// Revert the execution, making the user pay for the the currently
	/// recorded cost. It is better to **revert** instead of **error** as
	/// erroring consumes the entire gas limit, and **revert** returns an error
	/// message to the calling contract.
	///
	/// TODO : Record cost of the input based on its size and handle Out of Gas ?
	/// This might be required if we format revert messages using user data.
	#[must_use]
	pub fn revert(&self, output: impl AsRef<[u8]>) -> PrecompileFailure {
		PrecompileFailure::Revert {
			exit_status: ExitRevert::Reverted,
			output: output.as_ref().to_owned(),
		}
	}

	#[must_use]
	/// Check that a function call is compatible with the context it is
	/// called into.
	pub fn check_function_modifier(
		&self,
		context: &Context,
		is_static: bool,
		modifier: FunctionModifier,
	) -> EvmResult {
		if is_static && modifier != FunctionModifier::View {
			return Err(self.revert("can't call non-static function in static context"));
		}

		if modifier != FunctionModifier::Payable && context.apparent_value > U256::zero() {
			return Err(self.revert("function is not payable"));
		}

		Ok(())
	}
}
