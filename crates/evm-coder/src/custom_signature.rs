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
//! use evm_coder::{custom_signature::SignatureUnit, make_signature};
//!
//! // Create trait for our signature
//! trait SoliditySignature {
//!     const SIGNATURE: SignatureUnit;
//!
//!     fn name() -> &'static str {
//!         from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
//!     }
//! }
//!
//! // Make signatures for some types
//! impl SoliditySignature for u8 {
//!     const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint8"));
//! }
//! impl SoliditySignature for u32 {
//!     const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint32"));
//! }
//! impl<T: SoliditySignature> SoliditySignature for Vec<T> {
//!     const SIGNATURE: SignatureUnit = make_signature!(new nameof(T::SIGNATURE) fixed("[]"));
//! }
//! impl<A: SoliditySignature, B: SoliditySignature> SoliditySignature for (A, B) {
//!     const SIGNATURE: SignatureUnit = make_signature!(new fixed("(") nameof(A::SIGNATURE) fixed(",") nameof(B::SIGNATURE) fixed(")"));
//! }
//! impl<A: SoliditySignature> SoliditySignature for (A,) {
//!     const SIGNATURE: SignatureUnit = make_signature!(new fixed("(") nameof(A::SIGNATURE) fixed(",") shift_left(1) fixed(")"));
//! }
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
//! use evm_coder::{custom_signature::SignatureUnit, make_signature};
//! // Trait for our signature
//! trait SoliditySignature {
//!     const SIGNATURE: SignatureUnit;
//!
//!     fn name() -> &'static str {
//!         from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
//!     }
//! }
//!
//! // Make signatures for some types
//! impl SoliditySignature for u8 {
//!     const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint8"));
//! }
//! impl<T: SoliditySignature> SoliditySignature for Vec<T> {
//!     const SIGNATURE: SignatureUnit = make_signature!(new nameof(T::SIGNATURE) fixed("[]"));
//! }
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
	(@size; nameof($expr:expr) $($tt:tt)*) => {
		$expr.len + $crate::make_signature!(@size; $($tt)*)
	};
	(@size; numof($expr:expr) $($tt:tt)*) => {
		{
			let mut out = 0;
			let mut v = $expr;
			if v == 0 {
				out = 1;
			} else {
				while v > 0 {
					out += 1;
					v /= 10;
				}
			}
			out
		} + $crate::make_signature!(@size; $($tt)*)
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
	(@data($dst:ident, $dst_offset:ident); nameof($expr:expr) $($tt:tt)*) => {
		{
			$crate::make_signature!(@copy(&$expr.data, $dst, $expr.len, $dst_offset));
		}
		$crate::make_signature!(@data($dst, $dst_offset); $($tt)*)
	};
	(@data($dst:ident, $dst_offset:ident); numof($expr:expr) $($tt:tt)*) => {
		{
			let mut v = $expr;
			let mut need_to_swap = 0;
			if v == 0 {
				$dst[$dst_offset] = b'0';
				$dst_offset += 1;
			} else {
				while v > 0 {
					let n = (v % 10) as u8;
					$dst[$dst_offset] = b'0' + n;
					v /= 10;
					need_to_swap += 1;
					$dst_offset += 1;
				}
			}
			let mut i = 0;
			#[allow(clippy::manual_swap)]
			while i < need_to_swap / 2 {
				let a = $dst_offset - i - 1;
				let b = $dst_offset - need_to_swap + i;
				let v = $dst[a];
				$dst[a] = $dst[b];
				$dst[b] = v;
				i += 1;
			}
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
		const NAME: SignatureUnit;

		fn name() -> &'static str {
			from_utf8(&Self::NAME.data[..Self::NAME.len]).expect("bad utf-8")
		}
	}

	impl Name for u8 {
		const NAME: SignatureUnit = make_signature!(new fixed("uint8"));
	}
	impl Name for u32 {
		const NAME: SignatureUnit = make_signature!(new fixed("uint32"));
	}
	impl<T: Name> Name for Vec<T> {
		const NAME: SignatureUnit = make_signature!(new nameof(T::NAME) fixed("[]"));
	}
	impl<A: Name, B: Name> Name for (A, B) {
		const NAME: SignatureUnit =
			make_signature!(new fixed("(") nameof(A::NAME) fixed(",") nameof(B::NAME) fixed(")"));
	}
	impl<A: Name> Name for (A,) {
		const NAME: SignatureUnit =
			make_signature!(new fixed("(") nameof(A::NAME) fixed(",") shift_left(1) fixed(")"));
	}
	impl<A: Name, const SIZE: usize> Name for [A; SIZE] {
		const NAME: SignatureUnit =
			make_signature!(new nameof(A::NAME) fixed("[") numof(SIZE) fixed("]"));
	}

	struct MaxSize();
	impl Name for MaxSize {
		const NAME: SignatureUnit = SignatureUnit {
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
	fn num() {
		assert_eq!(<[u8; 0]>::name(), "uint8[0]");
		assert_eq!(<[u8; 1234]>::name(), "uint8[1234]");
		assert_eq!(<[u8; 12345]>::name(), "uint8[12345]");
	}

	#[test]
	fn over_max_size() {
		let t = trybuild::TestCases::new();
		t.compile_fail("tests/build_failed/custom_signature_over_max_size.rs");
	}
}
