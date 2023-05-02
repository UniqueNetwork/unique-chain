use scale_info::TypeInfo;
use codec::{Encode, Decode};
use up_common::types::AccountId;
use crate::{RuntimeCall, Maintenance};

use sp_runtime::{
	traits::{DispatchInfoOf, SignedExtension},
	transaction_validity::{
		TransactionValidity, ValidTransaction, InvalidTransaction, TransactionValidityError,
	},
};

#[derive(Debug, Encode, Decode, PartialEq, Eq, Clone, TypeInfo)]
pub struct CheckMaintenance;

impl SignedExtension for CheckMaintenance {
	type AccountId = AccountId;
	type Call = RuntimeCall;
	type AdditionalSigned = ();
	type Pre = ();

	const IDENTIFIER: &'static str = "CheckMaintenance";

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
		if Maintenance::is_enabled() {
			match call {
				RuntimeCall::EvmMigration(_)
				| RuntimeCall::EVM(_)
				| RuntimeCall::Ethereum(_)
				| RuntimeCall::Inflation(_)
				| RuntimeCall::Structure(_)
				| RuntimeCall::Unique(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				#[cfg(feature = "scheduler")]
				RuntimeCall::Scheduler(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				#[cfg(feature = "app-promotion")]
				RuntimeCall::AppPromotion(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}

				#[cfg(feature = "foreign-assets")]
				RuntimeCall::ForeignAssets(_) => {
					Err(TransactionValidityError::Invalid(InvalidTransaction::Call))
				}

				#[cfg(feature = "collator-selection")]
				RuntimeCall::CollatorSelection(_)
				| RuntimeCall::Session(_)
				| RuntimeCall::Identity(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				#[cfg(feature = "pallet-test-utils")]
				RuntimeCall::TestUtils(_) => Err(TransactionValidityError::Invalid(InvalidTransaction::Call)),

				_ => Ok(ValidTransaction::default()),
			}
		} else {
			Ok(ValidTransaction::default())
		}
	}

	fn pre_dispatch_unsigned(
		call: &Self::Call,
		info: &DispatchInfoOf<Self::Call>,
		len: usize,
	) -> Result<(), TransactionValidityError> {
		Self::validate_unsigned(call, info, len).map(|_| ())
	}

	fn validate_unsigned(
		call: &Self::Call,
		_info: &DispatchInfoOf<Self::Call>,
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
}
