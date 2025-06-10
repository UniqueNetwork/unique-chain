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

use parity_scale_codec::{Decode, DecodeWithMemTracking, Encode};
use scale_info::TypeInfo;
#[cfg(feature = "governance")]
use sp_runtime::transaction_validity::InvalidTransaction;
use sp_runtime::{
	traits::{DispatchInfoOf, DispatchOriginOf, TransactionExtension, ValidateResult},
	transaction_validity::{TransactionSource, TransactionValidityError, ValidTransaction},
	Weight,
};

use crate::RuntimeCall;

#[derive(Debug, Encode, Decode, DecodeWithMemTracking, PartialEq, Eq, Clone, TypeInfo)]
pub struct DisableIdentityCalls;

impl TransactionExtension<RuntimeCall> for DisableIdentityCalls {
	const IDENTIFIER: &'static str = "DisableIdentityCalls";

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
		match call {
			#[cfg(feature = "governance")]
			RuntimeCall::Identity(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),
			_ => Ok((ValidTransaction::default(), (), origin)),
		}
	}

	fn prepare(
		self,
		_val: Self::Val,
		_origin: &DispatchOriginOf<RuntimeCall>,
		_call: &RuntimeCall,
		_info: &DispatchInfoOf<RuntimeCall>,
		_len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		Ok(())
	}
}
