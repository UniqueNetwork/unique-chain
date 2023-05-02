use scale_info::TypeInfo;
use codec::{Encode, Decode};
use up_common::types::AccountId;
use crate::RuntimeCall;

use sp_runtime::{
	traits::{DispatchInfoOf, SignedExtension},
	transaction_validity::{TransactionValidity, ValidTransaction, TransactionValidityError},
};

#[cfg(feature = "collator-selection")]
use sp_runtime::transaction_validity::InvalidTransaction;

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
			#[cfg(feature = "collator-selection")]
			RuntimeCall::Identity(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),
			_ => Ok(ValidTransaction::default()),
		}
	}
}
