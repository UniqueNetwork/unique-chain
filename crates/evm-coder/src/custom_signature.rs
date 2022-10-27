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
//!
//! // Function signature settings
//! const SIGNATURE_PREFERENCES: SignaturePreferences = SignaturePreferences {
//!		open_name: Some(SignatureUnit::new("some_funk")),
//!		open_delimiter: Some(SignatureUnit::new("(")),
//!		param_delimiter: Some(SignatureUnit::new(",")),
//!		close_delimiter: Some(SignatureUnit::new(")")),
//!		close_name: None,
//!	};
//!
//! // Create functions signatures
//! fn make_func_without_args() {
//!		const SIG: FunctionSignature = make_signature!(
//!			new fn(SIGNATURE_PREFERENCES),
//!		);
//!		let name = SIG.as_str();
//!		similar_asserts::assert_eq!(name, "some_funk()");
//!	}
//!
//! fn make_func_with_3_args() {
//!		const SIG: FunctionSignature = make_signature!(
//!			new fn(SIGNATURE_PREFERENCES),
//!			(<u8>::SIGNATURE),
//!			(<u8>::SIGNATURE),
//!			(<Vec<u8>>::SIGNATURE),
//!		);
//!		let name = SIG.as_str();
//!		similar_asserts::assert_eq!(name, "some_funk(uint8,uint8,uint8[])");
//!	}
//! ```
use core::str::from_utf8;

/// The maximum length of the signature.
pub const SIGNATURE_SIZE_LIMIT: usize = 256;

/// Function signature formatting preferences.
#[derive(Debug)]
pub struct SignaturePreferences {
	/// The name of the function before the list of parameters: `*some*(param1,param2)func`
	pub open_name: Option<SignatureUnit>,
	/// Opening separator: `some*(*param1,param2)func`
	pub open_delimiter: Option<SignatureUnit>,
	/// Parameters separator: `some(param1*,*param2)func`
	pub param_delimiter: Option<SignatureUnit>,
	/// Closinging separator: `some(param1,param2*)*func`
	pub close_delimiter: Option<SignatureUnit>,
	/// The name of the function after the list of parameters: `some(param1,param2)*func*`
	pub close_name: Option<SignatureUnit>,
}

/// Constructs and stores the signature of the function.
#[derive(Debug)]
pub struct FunctionSignature {
	/// Storage for function signature.
	pub unit: SignatureUnit,
	preferences: SignaturePreferences,
}

impl FunctionSignature {
	/// Start constructing the signature. It is written to the storage
	/// [`SignaturePreferences::open_name`] and [`SignaturePreferences::open_delimiter`].
	pub const fn new(preferences: SignaturePreferences) -> FunctionSignature {
		let mut dst = [0_u8; SIGNATURE_SIZE_LIMIT];
		let mut dst_offset = 0;
		if let Some(ref name) = preferences.open_name {
			crate::make_signature!(@copy(name.data, dst, name.len, dst_offset));
		}
		if let Some(ref delimiter) = preferences.open_delimiter {
			crate::make_signature!(@copy(delimiter.data, dst, delimiter.len, dst_offset));
		}
		FunctionSignature {
			unit: SignatureUnit {
				data: dst,
				len: dst_offset,
			},
			preferences,
		}
	}

	/// Add a function parameter to the signature. It is written to the storage
	/// `param` [`SignatureUnit`] and [`SignaturePreferences::param_delimiter`].
	pub const fn add_param(
		signature: FunctionSignature,
		param: SignatureUnit,
	) -> FunctionSignature {
		let mut dst = signature.unit.data;
		let mut dst_offset = signature.unit.len;
		crate::make_signature!(@copy(param.data, dst, param.len, dst_offset));
		if let Some(ref delimiter) = signature.preferences.param_delimiter {
			crate::make_signature!(@copy(delimiter.data, dst, delimiter.len, dst_offset));
		}
		FunctionSignature {
			unit: SignatureUnit {
				data: dst,
				len: dst_offset,
			},
			..signature
		}
	}

	/// Complete signature construction. It is written to the storage
	/// [`SignaturePreferences::close_delimiter`] and [`SignaturePreferences::close_name`].
	pub const fn done(signature: FunctionSignature, owerride: bool) -> FunctionSignature {
		let mut dst = signature.unit.data;
		let mut dst_offset = signature.unit.len - if owerride { 1 } else { 0 };
		if let Some(ref delimiter) = signature.preferences.close_delimiter {
			crate::make_signature!(@copy(delimiter.data, dst, delimiter.len, dst_offset));
		}
		if let Some(ref name) = signature.preferences.close_name {
			crate::make_signature!(@copy(name.data, dst, name.len, dst_offset));
		}
		FunctionSignature {
			unit: SignatureUnit {
				data: dst,
				len: dst_offset,
			},
			..signature
		}
	}

	/// Represent the signature as `&str'.
	pub fn as_str(&self) -> &str {
		from_utf8(&self.unit.data[..self.unit.len]).expect("bad utf-8")
	}
}

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
}

/// ### Macro to create signatures of types and functions.
///
/// Format for creating a type of signature:
/// ```ignore
/// make_signature!(new fixed("uint8")); // Simple type
/// make_signature!(new fixed("(") nameof(u8) fixed(",") nameof(u8) fixed(")")); // Composite type
/// ```
/// Format for creating a function of the function:
/// ```ignore
/// const SIG: FunctionSignature = make_signature!(
///		new fn(SIGNATURE_PREFERENCES),
///		(u8::SIGNATURE),
///		(<(u8,u8)>::SIGNATURE),
///	);
/// ```
#[macro_export]
macro_rules! make_signature {
	(new fn($func:expr)$(,)+) => {
		{
			let fs = FunctionSignature::new($func);
			let fs = FunctionSignature::done(fs, false);
			fs
		}
	};
	(new fn($func:expr), $($tt:tt,)*) => {
		{
			let fs = FunctionSignature::new($func);
			let fs = make_signature!(@param; fs, $($tt),*);
			fs
		}
	};

	(@param; $func:expr) => {
		FunctionSignature::done($func, true)
	};
	(@param; $func:expr, $param:expr) => {
		make_signature!(@param; FunctionSignature::add_param($func, $param))
	};
	(@param; $func:expr, $param:expr, $($tt:tt),*) => {
		make_signature!(@param; FunctionSignature::add_param($func, $param), $($tt),*)
	};

    (new $($tt:tt)*) => {
        const SIGNATURE: SignatureUnit = SignatureUnit {
			data: {
				let mut out = [0u8; SIGNATURE_SIZE_LIMIT];
				let mut dst_offset = 0;
				make_signature!(@data(out, dst_offset); $($tt)*);
				out
			},
			len: {0 + make_signature!(@size; $($tt)*)},
        };
    };

    (@size;) => {
        0
    };
    (@size; fixed($expr:expr) $($tt:tt)*) => {
        $expr.len() + make_signature!(@size; $($tt)*)
    };
    (@size; nameof($expr:ty) $($tt:tt)*) => {
		<$expr>::SIGNATURE.len + make_signature!(@size; $($tt)*)
    };
	(@size; shift_left($expr:expr) $($tt:tt)*) => {
		make_signature!(@size; $($tt)*) - $expr
	};

    (@data($dst:ident, $dst_offset:ident);) => {};
    (@data($dst:ident, $dst_offset:ident); fixed($expr:expr) $($tt:tt)*) => {
        {
            let data = $expr.as_bytes();
			let data_len = data.len();
			make_signature!(@copy(data, $dst, data_len, $dst_offset));
        }
        make_signature!(@data($dst, $dst_offset); $($tt)*)
    };
    (@data($dst:ident, $dst_offset:ident); nameof($expr:ty) $($tt:tt)*) => {
        {
            make_signature!(@copy(&<$expr>::SIGNATURE.data, $dst, <$expr>::SIGNATURE.len, $dst_offset));
        }
        make_signature!(@data($dst, $dst_offset); $($tt)*)
    };
	(@data($dst:ident, $dst_offset:ident); shift_left($expr:expr) $($tt:tt)*) => {
        $dst_offset -= $expr;
        make_signature!(@data($dst, $dst_offset); $($tt)*)
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

	use super::{SIGNATURE_SIZE_LIMIT, SignatureUnit, FunctionSignature, SignaturePreferences};

	trait Name {
		const SIGNATURE: SignatureUnit;

		fn name() -> &'static str {
			from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
		}
	}

	impl Name for u8 {
		make_signature!(new fixed("uint8"));
	}
	impl Name for u32 {
		make_signature!(new fixed("uint32"));
	}
	impl<T: Name> Name for Vec<T> {
		make_signature!(new nameof(T) fixed("[]"));
	}
	impl<A: Name, B: Name> Name for (A, B) {
		make_signature!(new fixed("(") nameof(A) fixed(",") nameof(B) fixed(")"));
	}
	impl<A: Name> Name for (A,) {
		make_signature!(new fixed("(") nameof(A) fixed(",") shift_left(1) fixed(")"));
	}

	struct MaxSize();
	impl Name for MaxSize {
		const SIGNATURE: SignatureUnit = SignatureUnit {
			data: [b'!'; SIGNATURE_SIZE_LIMIT],
			len: SIGNATURE_SIZE_LIMIT,
		};
	}

	const SIGNATURE_PREFERENCES: SignaturePreferences = SignaturePreferences {
		open_name: Some(SignatureUnit::new("some_funk")),
		open_delimiter: Some(SignatureUnit::new("(")),
		param_delimiter: Some(SignatureUnit::new(",")),
		close_delimiter: Some(SignatureUnit::new(")")),
		close_name: None,
	};

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

	// This test must NOT compile with "index out of bounds"!
	// #[test]
	// fn over_max_size() {
	// 	assert_eq!(
	// 		<Vec<MaxSize>>::name(),
	// 		"!".repeat(SIGNATURE_SIZE_LIMIT) + "[]"
	// 	);
	// }

	#[test]
	fn make_func_without_args() {
		const SIG: FunctionSignature = make_signature!(
			new fn(SIGNATURE_PREFERENCES),
		);
		let name = SIG.as_str();
		similar_asserts::assert_eq!(name, "some_funk()");
	}

	#[test]
	fn make_func_with_1_args() {
		const SIG: FunctionSignature = make_signature!(
			new fn(SIGNATURE_PREFERENCES),
			(<u8>::SIGNATURE),
		);
		let name = SIG.as_str();
		similar_asserts::assert_eq!(name, "some_funk(uint8)");
	}

	#[test]
	fn make_func_with_2_args() {
		const SIG: FunctionSignature = make_signature!(
			new fn(SIGNATURE_PREFERENCES),
			(u8::SIGNATURE),
			(<Vec<u32>>::SIGNATURE),
		);
		let name = SIG.as_str();
		similar_asserts::assert_eq!(name, "some_funk(uint8,uint32[])");
	}

	#[test]
	fn make_func_with_3_args() {
		const SIG: FunctionSignature = make_signature!(
			new fn(SIGNATURE_PREFERENCES),
			(<u8>::SIGNATURE),
			(<u32>::SIGNATURE),
			(<Vec<u32>>::SIGNATURE),
		);
		let name = SIG.as_str();
		similar_asserts::assert_eq!(name, "some_funk(uint8,uint32,uint32[])");
	}

	#[test]
	fn make_slice_from_signature() {
		const SIG: FunctionSignature = make_signature!(
			new fn(SIGNATURE_PREFERENCES),
			(<u8>::SIGNATURE),
			(<u32>::SIGNATURE),
			(<Vec<u32>>::SIGNATURE),
		);
		const NAME: [u8; SIG.unit.len] = {
			let mut name: [u8; SIG.unit.len] = [0; SIG.unit.len];
			let mut i = 0;
			while i < SIG.unit.len {
				name[i] = SIG.unit.data[i];
				i += 1;
			}
			name
		};
		similar_asserts::assert_eq!(&NAME, b"some_funk(uint8,uint32,uint32[])");
	}

	#[test]
	fn shift() {
		assert_eq!(<(u32,)>::name(), "(uint32)");
	}
}
