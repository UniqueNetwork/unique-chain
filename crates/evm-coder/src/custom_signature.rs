//! # A module for custom signature support.
//!
//! ## Overview
//! This module allows you to create arbitrary signatures for types and functions in compile time.
//!
//! ### Type signatures
//! To create the desired type signature, you need to create your own trait with the `SIGNATURE` constant.
//! Then in the implementation, for the required type, use the macro [`make_signature`]
//! #### Example
//! ```
//! use std::str::from_utf8;
//! use evm_coder::make_signature;
//! use evm_coder::custom_signature::{
//! 	SignatureUnit,
//! 	SIGNATURE_SIZE_LIMIT
//! };
//!
//! // Create trait for our signature
//! trait SoliditySignature {
//!		const SIGNATURE: SignatureUnit;
//!
//!		fn name() -> &'static str {
//!			from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
//!		}
//!	}
//!
//! // Make signatures for some types
//!	impl SoliditySignature for u8 {
//!		make_signature!(new fixed("uint8"));
//!	}
//!	impl SoliditySignature for u32 {
//!		make_signature!(new fixed("uint32"));
//!	}
//!	impl<T: SoliditySignature> SoliditySignature for Vec<T> {
//!		make_signature!(new nameof(T) fixed("[]"));
//!	}
//!	impl<A: SoliditySignature, B: SoliditySignature> SoliditySignature for (A, B) {
//!		make_signature!(new fixed("(") nameof(A) fixed(",") nameof(B) fixed(")"));
//!	}
//!	impl<A: SoliditySignature> SoliditySignature for (A,) {
//!		make_signature!(new fixed("(") nameof(A) fixed(",") shift_left(1) fixed(")"));
//!	}
//!
//! assert_eq!(u8::name(), "uint8");
//! assert_eq!(<Vec<u8>>::name(), "uint8[]");
//! assert_eq!(<(u32, u8)>::name(), "(uint32,uint8)");
//! ```
//!
//! ### Function signatures
//! To create a function signature, the macro [`make_signature`] is also used, which accepts
//! settings for the function format [`SignaturePreferences`] and function parameters [`SignatureUnit`]
//! #### Example
//! ```
//! use core::str::from_utf8;
//! use evm_coder::{
//!		make_signature,
//!		custom_signature::{
//!			SIGNATURE_SIZE_LIMIT, SignatureUnit, SignaturePreferences, FunctionSignature,
//!		},
//!	};
//! // Trait for our signature
//! trait SoliditySignature {
//!		const SIGNATURE: SignatureUnit;
//!
//!		fn name() -> &'static str {
//!			from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
//!		}
//!	}
//!
//! // Make signatures for some types
//!	impl SoliditySignature for u8 {
//!		make_signature!(new fixed("uint8"));
//!	}
//!	impl<T: SoliditySignature> SoliditySignature for Vec<T> {
//!		make_signature!(new nameof(T) fixed("[]"));
//!	}
//! ```

/// The maximum length of the signature.
pub const SIGNATURE_SIZE_LIMIT: usize = 256;

/// Storage for the signature or its elements.
#[derive(Debug)]
pub struct SignatureUnit {
	/// Signature data.
	pub data: [u8; SIGNATURE_SIZE_LIMIT],
	/// The actual size of the data.
	pub len: usize,
}

impl SignatureUnit {
	/// Create a signature from `&str'.
	pub const fn new(name: &'static str) -> SignatureUnit {
		let mut signature = [0_u8; SIGNATURE_SIZE_LIMIT];
		let name = name.as_bytes();
		let name_len = name.len();
		let mut dst_offset = 0;
		crate::make_signature!(@copy(name, signature, name_len, dst_offset));
		SignatureUnit {
			data: signature,
			len: name_len,
		}
	}
	/// String conversion
	pub fn as_str(&self) -> Option<&str> {
		core::str::from_utf8(&self.data[0..self.len]).ok()
	}
}

/// ### Macro to create signatures of types and functions.
///
/// Format for creating a type of signature:
/// ```ignore
/// make_signature!(new fixed("uint8")); // Simple type
/// make_signature!(new fixed("(") nameof(u8) fixed(",") nameof(u8) fixed(")")); // Composite type
/// ```
#[macro_export]
macro_rules! make_signature {
	(new $($tt:tt)*) => {
		($crate::custom_signature::SignatureUnit {
			data: {
				let mut out = [0u8; $crate::custom_signature::SIGNATURE_SIZE_LIMIT];
				let mut dst_offset = 0;
				$crate::make_signature!(@data(out, dst_offset); $($tt)*);
				out
			},
			len: {0 + $crate::make_signature!(@size; $($tt)*)},
		})
	};

	(@size;) => {
		0
	};
	(@size; fixed($expr:expr) $($tt:tt)*) => {
		$expr.len() + $crate::make_signature!(@size; $($tt)*)
	};
	(@size; nameof($expr:ty) $($tt:tt)*) => {
		<$expr>::SIGNATURE.len + $crate::make_signature!(@size; $($tt)*)
	};
	(@size; shift_left($expr:expr) $($tt:tt)*) => {
		$crate::make_signature!(@size; $($tt)*) - $expr
	};

	(@data($dst:ident, $dst_offset:ident);) => {};
	(@data($dst:ident, $dst_offset:ident); fixed($expr:expr) $($tt:tt)*) => {
		{
			let data = $expr.as_bytes();
			let data_len = data.len();
			$crate::make_signature!(@copy(data, $dst, data_len, $dst_offset));
		}
		$crate::make_signature!(@data($dst, $dst_offset); $($tt)*)
	};
	(@data($dst:ident, $dst_offset:ident); nameof($expr:ty) $($tt:tt)*) => {
		{
			$crate::make_signature!(@copy(&<$expr>::SIGNATURE.data, $dst, <$expr>::SIGNATURE.len, $dst_offset));
		}
		$crate::make_signature!(@data($dst, $dst_offset); $($tt)*)
	};
	(@data($dst:ident, $dst_offset:ident); shift_left($expr:expr) $($tt:tt)*) => {
		$dst_offset -= $expr;
		$crate::make_signature!(@data($dst, $dst_offset); $($tt)*)
	};

	(@copy($src:expr, $dst:expr, $src_len:expr, $dst_offset:ident)) => {
		{
			let mut src_offset = 0;
			let src_len: usize = $src_len;
			while src_offset < src_len {
				$dst[$dst_offset] = $src[src_offset];
				$dst_offset += 1;
				src_offset += 1;
			}
		}
	}
}

#[cfg(test)]
mod test {
	use core::str::from_utf8;

	use super::{SIGNATURE_SIZE_LIMIT, SignatureUnit};

	trait Name {
		const SIGNATURE: SignatureUnit;

		fn name() -> &'static str {
			from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
		}
	}

	impl Name for u8 {
		const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint8"));
	}
	impl Name for u32 {
		const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint32"));
	}
	impl<T: Name> Name for Vec<T> {
		const SIGNATURE: SignatureUnit = make_signature!(new nameof(T) fixed("[]"));
	}
	impl<A: Name, B: Name> Name for (A, B) {
		const SIGNATURE: SignatureUnit =
			make_signature!(new fixed("(") nameof(A) fixed(",") nameof(B) fixed(")"));
	}
	impl<A: Name> Name for (A,) {
		const SIGNATURE: SignatureUnit =
			make_signature!(new fixed("(") nameof(A) fixed(",") shift_left(1) fixed(")"));
	}

	struct MaxSize();
	impl Name for MaxSize {
		const SIGNATURE: SignatureUnit = SignatureUnit {
			data: [b'!'; SIGNATURE_SIZE_LIMIT],
			len: SIGNATURE_SIZE_LIMIT,
		};
	}

	#[test]
	fn simple() {
		assert_eq!(u8::name(), "uint8");
		assert_eq!(u32::name(), "uint32");
	}

	#[test]
	fn vector_of_simple() {
		assert_eq!(<Vec<u8>>::name(), "uint8[]");
		assert_eq!(<Vec<u32>>::name(), "uint32[]");
	}

	#[test]
	fn vector_of_vector() {
		assert_eq!(<Vec<Vec<u8>>>::name(), "uint8[][]");
	}

	#[test]
	fn tuple_of_simple() {
		assert_eq!(<(u32, u8)>::name(), "(uint32,uint8)");
	}

	#[test]
	fn tuple_of_tuple() {
		assert_eq!(
			<((u32, u8), (u8, u32))>::name(),
			"((uint32,uint8),(uint8,uint32))"
		);
	}

	#[test]
	fn vector_of_tuple() {
		assert_eq!(<Vec<(u32, u8)>>::name(), "(uint32,uint8)[]");
	}

	#[test]
	fn tuple_of_vector() {
		assert_eq!(<(Vec<u32>, u8)>::name(), "(uint32[],uint8)");
	}

	#[test]
	fn complex() {
		assert_eq!(
			<(Vec<u32>, (u32, Vec<u8>))>::name(),
			"(uint32[],(uint32,uint8[]))"
		);
	}

	#[test]
	fn max_size() {
		assert_eq!(<MaxSize>::name(), "!".repeat(SIGNATURE_SIZE_LIMIT));
	}

	#[test]
	fn shift() {
		assert_eq!(<(u32,)>::name(), "(uint32)");
	}

	#[test]
	fn over_max_size() {
		let t = trybuild::TestCases::new();
		t.compile_fail("tests/build_failed/custom_signature_over_max_size.rs");
	}
}
