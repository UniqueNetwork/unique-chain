// Copyright 2019-2022 PureStake Inc.
// Copyright 2022      Stake Technologies

// Astar Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Astar Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Astar Network. If not, see <http://www.gnu.org/licenses/>.

use fp_evm::{Context, ExitSucceed, PrecompileHandle, PrecompileOutput};
use pallet_evm::Precompile;
use sp_core::{crypto::UncheckedFrom, sr25519, H256};
use sp_std::marker::PhantomData;
use sp_std::prelude::*;

use super::utils::{Bytes, EvmDataReader, EvmDataWriter, EvmResult, FunctionModifier, Gasometer};

#[precompile_utils_macro::generate_function_selector]
#[derive(Debug, PartialEq)]
pub enum Action {
	Verify = "verify(bytes32,bytes,bytes)",
}

/// A precompile to wrap substrate sr25519 functions.
pub struct Sr25519Precompile<Runtime>(PhantomData<Runtime>);

impl<Runtime: pallet_evm::Config> Precompile for Sr25519Precompile<Runtime> {
	fn execute(handle: &mut impl PrecompileHandle) -> EvmResult<PrecompileOutput> {
		log::trace!(target: "sr25519-precompile", "In sr25519 precompile");

		let gasometer = Gasometer::new();

		let (mut input, selector) = EvmDataReader::new_with_selector(&gasometer, handle.input())?;
		let input = &mut input;

		gasometer.check_function_modifier(
			handle.context(),
			handle.is_static(),
			FunctionModifier::View,
		)?;

		match selector {
			// Dispatchables
			Action::Verify => Self::verify(input, &gasometer, handle.context()),
		}
	}
}

impl<Runtime: pallet_evm::Config> Sr25519Precompile<Runtime> {
	fn verify(
		input: &mut EvmDataReader,
		gasometer: &Gasometer,
		_: &Context,
	) -> EvmResult<PrecompileOutput> {
		// Bound check
		input.expect_arguments(gasometer, 3)?;

		// Parse arguments
		let public: sr25519::Public =
			sr25519::Public::unchecked_from(input.read::<H256>(gasometer)?);
		let signature_bytes: Vec<u8> = input.read::<Bytes>(gasometer)?.into();
		let message: Vec<u8> = input.read::<Bytes>(gasometer)?.into();

		// Parse signature
		let signature_opt = sr25519::Signature::from_slice(&signature_bytes[..]);

		let signature = if let Some(sig) = signature_opt {
			sig
		} else {
			// Return `false` if signature length is wrong
			return Ok(PrecompileOutput {
				exit_status: ExitSucceed::Returned,
				output: EvmDataWriter::new().write(false).build(),
			});
		};

		log::trace!(
			target: "sr25519-precompile",
			"Verify signature {:?} for public {:?} and message {:?}",
			signature, public, message,
		);

		let is_confirmed = sp_io::crypto::sr25519_verify(&signature, &message[..], &public);

		log::trace!(
			target: "sr25519-precompile",
			"Verified signature {:?} is {:?}",
			signature, is_confirmed,
		);

		Ok(PrecompileOutput {
			exit_status: ExitSucceed::Returned,
			output: EvmDataWriter::new().write(is_confirmed).build(),
		})
	}
}
