use super::{AbiReader, AbiWriter};
use crate::{
	custom_signature::*,
	execution::{Result, ResultWithPostInfo},
};
use core::str::from_utf8;

/// Helper for type.
pub trait AbiType {
	/// Signature for Etherium ABI.
	const SIGNATURE: SignatureUnit;

	/// Signature as str.
	fn as_str() -> &'static str {
		from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
	}

	/// Is type dynamic sized.
	fn is_dynamic() -> bool;

	/// Size for type aligned to [`ABI_ALIGNMENT`].
	fn size() -> usize;
}

/// [`AbiReader`] implements reading of many types.
pub trait AbiRead {
	/// Read item from current position, advanding decoder
	fn abi_read(reader: &mut AbiReader) -> Result<Self>
	where
		Self: Sized;
}

/// For questions about inability to provide custom implementations,
/// see [`AbiRead`]
pub trait AbiWrite {
	/// Write value to end of specified encoder
	fn abi_write(&self, writer: &mut AbiWriter);
	/// Specialization for [`crate::solidity_interface`] implementation,
	/// see comment in `impl AbiWrite for ResultWithPostInfo`
	fn to_result(&self) -> ResultWithPostInfo<AbiWriter> {
		let mut writer = AbiWriter::new();
		self.abi_write(&mut writer);
		Ok(writer.into())
	}
}
