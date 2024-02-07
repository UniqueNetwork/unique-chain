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
#[cfg(feature = "governance")]
use sp_runtime::transaction_validity::InvalidTransaction;
use sp_runtime::{
	traits::{DispatchInfoOf, SignedExtension},
	transaction_validity::{TransactionValidity, TransactionValidityError, ValidTransaction},
};
use up_common::types::AccountId;

use crate::RuntimeCall;

#[derive(Debug, Encode, Decode, PartialEq, Eq, Clone, TypeInfo)]
pub struct DisableIdentityCalls;

impl SignedExtension for DisableIdentityCalls {
	type AccountId = AccountId;
	type Call = RuntimeCall;
	type AdditionalSigned = ();
	type Pre = ();

	const IDENTIFIER: &'static str = "DisableIdentityCalls";

	fn additional_signed(&self) -> Result<Self::AdditionalSigned, TransactionValidityError> {
		Ok(())
	}

	fn pre_dispatch(
		self,
		who: &Self::AccountId,
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		self.validate(who, call, info, len).map(|_| ())
	}

	fn validate(
		&self,
		_who: &Self::AccountId,
		call: &Self::Call,
		_info: &DispatchInfoOf<Self::Call>,
		_len: usize,
	) -> TransactionValidity {
		match call {
			#[cfg(feature = "governance")]
			RuntimeCall::Identity(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),
			_ => Ok(ValidTransaction::default()),
		}
	}
}
