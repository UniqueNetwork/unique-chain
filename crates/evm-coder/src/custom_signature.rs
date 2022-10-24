use core::str::from_utf8;

pub const SIGNATURE_SIZE_LIMIT: usize = 256;

#[derive(Debug)]
pub struct SignaturePreferences {
	pub open_name: Option<SignatureUnit>,
	pub open_delimiter: Option<SignatureUnit>,
	pub param_delimiter: Option<SignatureUnit>,
	pub close_delimiter: Option<SignatureUnit>,
	pub close_name: Option<SignatureUnit>,
}

#[derive(Debug)]
pub struct FunctionSignature {
	pub data: [u8; SIGNATURE_SIZE_LIMIT],
	pub len: usize,

	preferences: SignaturePreferences,
}

impl FunctionSignature {
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
			data: dst,
			len: dst_offset,
			preferences,
		}
	}

	pub const fn add_param(
		signature: FunctionSignature,
		param: SignatureUnit,
	) -> FunctionSignature {
		let mut dst = signature.data;
		let mut dst_offset = signature.len;
		crate::make_signature!(@copy(param.data, dst, param.len, dst_offset));
		if let Some(ref delimiter) = signature.preferences.param_delimiter {
			crate::make_signature!(@copy(delimiter.data, dst, delimiter.len, dst_offset));
		}
		FunctionSignature {
			data: dst,
			len: dst_offset,
			..signature
		}
	}

	pub const fn done(signature: FunctionSignature, owerride: bool) -> FunctionSignature {
		let mut dst = signature.data;
		let mut dst_offset = signature.len - if owerride { 1 } else { 0 };
		if let Some(ref delimiter) = signature.preferences.close_delimiter {
			crate::make_signature!(@copy(delimiter.data, dst, delimiter.len, dst_offset));
		}
		if let Some(ref name) = signature.preferences.close_name {
			crate::make_signature!(@copy(name.data, dst, name.len, dst_offset));
		}
		FunctionSignature {
			data: dst,
			len: dst_offset,
			..signature
		}
	}

	pub fn as_str(&self) -> &str {
		from_utf8(&self.data[..self.len]).expect("bad utf-8")
	}
}

#[derive(Debug)]
pub struct SignatureUnit {
	pub data: [u8; SIGNATURE_SIZE_LIMIT],
	pub len: usize,
}

impl SignatureUnit {
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

#[macro_export]
#[allow(missing_docs)]
macro_rules! make_signature { // May be "define_signature"?
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

	// This test must NOT compile!
	// #[test]
	// fn over_max_size() {
	// 	assert_eq!(<Vec<MaxSize>>::name(), "!".repeat(SIZE_LIMIT) + "[]");
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
		const NAME: [u8; SIG.len] = {
			let mut name: [u8; SIG.len] = [0; SIG.len];
			let mut i = 0;
			while i < SIG.len {
				name[i] = SIG.data[i];
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
