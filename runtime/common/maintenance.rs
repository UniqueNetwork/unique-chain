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

use parity_scale_codec::{Decode, Encode};
use scale_info::TypeInfo;
use sp_runtime::{
	impl_tx_ext_default,
	traits::{DispatchInfoOf, DispatchOriginOf, TransactionExtension, ValidateResult},
	transaction_validity::{
		InvalidTransaction, TransactionSource, TransactionValidity, TransactionValidityError, ValidTransaction,
	},
	Weight,
};

use crate::{Maintenance, RuntimeCall, RuntimeOrigin};

#[derive(Debug, Encode, Decode, PartialEq, Eq, Clone, TypeInfo)]
pub struct CheckMaintenance;

impl TransactionExtension<RuntimeCall> for CheckMaintenance {
	const IDENTIFIER: &'static str = "CheckMaintenance";

	type Pre = ();
	type Val = ();
	type Implicit = ();

	fn weight(&self, _call: &RuntimeCall) -> Weight {
		Weight::zero()
	}

	fn validate(
		&self,
		origin: DispatchOriginOf<RuntimeCall>,
		call: &RuntimeCall,
		_info: &DispatchInfoOf<RuntimeCall>,
		_len: usize,
		_self_implicit: Self::Implicit,
		_inherited_implication: &impl Encode,
		_source: TransactionSource,
	) -> ValidateResult<Self::Val, RuntimeCall> {
		if Maintenance::is_enabled() {
			match call {
				RuntimeCall::EvmMigration(_)
				| RuntimeCall::EVM(_)
				| RuntimeCall::Ethereum(_)
				| RuntimeCall::Inflation(_)
				| RuntimeCall::Structure(_)
				| RuntimeCall::Unique(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				#[cfg(feature = "app-promotion")]
				RuntimeCall::AppPromotion(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}

				#[cfg(feature = "foreign-assets")]
				RuntimeCall::ForeignAssets(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}

				#[cfg(feature = "collator-selection")]
				RuntimeCall::CollatorSelection(_) | RuntimeCall::Session(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}

				#[cfg(feature = "governance")]
				RuntimeCall::Identity(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				#[cfg(feature = "pallet-test-utils")]
				RuntimeCall::TestUtils(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				_ => Ok((ValidTransaction::default(), (), origin)),
			}
		} else {
			Ok((ValidTransaction::default(), (), origin))
		}
	}

	fn prepare(
		self,
		_val: Self::Val,
		origin: &DispatchOriginOf<RuntimeCall>,
		call: &RuntimeCall,
		info: &DispatchInfoOf<RuntimeCall>,
		len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		Ok(())
	}

	fn bare_validate(
		call: &RuntimeCall,
		_info: &DispatchInfoOf<RuntimeCall>,
		_len: usize,
	) -> TransactionValidity {
		if Maintenance::is_enabled() {
			match call {
				RuntimeCall::EVM(_) | RuntimeCall::Ethereum(_) | RuntimeCall::EvmMigration(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}
				_ => Ok(ValidTransaction::default()),
			}
		} else {
			Ok(ValidTransaction::default())
		}
	}

	fn bare_validate_and_prepare(
		call: &RuntimeCall,
		info: &DispatchInfoOf<RuntimeCall>,
		len: usize,
	) -> Result<(), TransactionValidityError> {
		Self::bare_validate(call, info, len).map(|_| ())
	}
}
