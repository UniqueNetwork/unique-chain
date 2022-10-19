use core::str::from_utf8;

pub const SIGNATURE_SIZE_LIMIT: usize = 256;

pub trait Name {
	const SIGNATURE: [u8; SIGNATURE_SIZE_LIMIT];
	const SIGNATURE_LEN: usize;

	fn name() -> &'static str {
		from_utf8(&Self::SIGNATURE[..Self::SIGNATURE_LEN]).expect("bad utf-8")
	}
}

#[derive(Debug)]
pub struct FunctionSignature {
	pub signature: [u8; SIGNATURE_SIZE_LIMIT],
	pub signature_len: usize,
}

impl FunctionSignature {
	pub const fn new(name: &'static FunctionName) -> FunctionSignature {
		let mut signature = [0_u8; SIGNATURE_SIZE_LIMIT];
		let name_len = name.signature_len;
		let name = name.signature;
		let mut dst_offset = 0;
		let bracket_open = {
			let mut b = [0_u8; SIGNATURE_SIZE_LIMIT];
			b[0] = b"("[0];
			b
		};
		crate::make_signature!(@copy(name, signature, name_len, dst_offset));
		crate::make_signature!(@copy(bracket_open, signature, 1, dst_offset));
		FunctionSignature {
			signature,
			signature_len: dst_offset,
		}
	}

	pub const fn add_param(
		signature: FunctionSignature,
		param: ([u8; SIGNATURE_SIZE_LIMIT], usize),
	) -> FunctionSignature {
		let mut dst = signature.signature;
		let mut dst_offset = signature.signature_len;
		let (param_name, param_len) = param;
		let comma = {
			let mut b = [0_u8; SIGNATURE_SIZE_LIMIT];
			b[0] = b","[0];
			b
		};
		FunctionSignature {
			signature: {
				crate::make_signature!(@copy(param_name, dst, param_len, dst_offset));
				crate::make_signature!(@copy(comma, dst, 1, dst_offset));
				dst
			},
			signature_len: dst_offset,
		}
	}

	pub const fn done(signature: FunctionSignature, owerride: bool) -> FunctionSignature {
		let mut dst = signature.signature;
		let mut dst_offset = signature.signature_len - if owerride { 1 } else { 0 };
		let bracket_close = {
			let mut b = [0_u8; SIGNATURE_SIZE_LIMIT];
			b[0] = b")"[0];
			b
		};
		FunctionSignature {
			signature: {
				crate::make_signature!(@copy(bracket_close, dst, 1, dst_offset));
				dst
			},
			signature_len: dst_offset,
		}
	}

	// fn as_str(&self) -> &'static str {
	// 	from_utf8(&self.signature[..self.signature_len]).expect("bad utf-8")
	// }
}

#[derive(Debug)]
pub struct FunctionName {
	signature: [u8; SIGNATURE_SIZE_LIMIT],
	signature_len: usize,
}

impl FunctionName {
	pub const fn new(name: &'static str) -> FunctionName {
		let mut signature = [0_u8; SIGNATURE_SIZE_LIMIT];
		let name = name.as_bytes();
		let name_len = name.len();
		let mut dst_offset = 0;
		crate::make_signature!(@copy(name, signature, name_len, dst_offset));
		FunctionName {
			signature,
			signature_len: name_len,
		}
	}
}

#[macro_export]
#[allow(missing_docs)]
macro_rules! make_signature { // May be "define_signature"?
	(new fn($func:expr)$(,)+) => {
		{
			let fs = FunctionSignature::new(& $func);
			let fs = FunctionSignature::done(fs, false);
			fs
		}
	};
	(new fn($func:expr), $($tt:tt)*) => {
		{
			let fs = FunctionSignature::new(& $func);
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
        const SIGNATURE: [u8; SIGNATURE_SIZE_LIMIT] = {
            let mut out = [0u8; SIGNATURE_SIZE_LIMIT];
            let mut dst_offset = 0;
            make_signature!(@data(out, dst_offset); $($tt)*);
            out
        };
        const SIGNATURE_LEN: usize = 0 + make_signature!(@size; $($tt)*);
    };

	// (@bytes)

    (@size;) => {
        0
    };
    (@size; fixed($expr:expr) $($tt:tt)*) => {
        $expr.len() + make_signature!(@size; $($tt)*)
    };
    (@size; nameof($expr:ty) $($tt:tt)*) => {
        <$expr>::SIGNATURE_LEN + make_signature!(@size; $($tt)*)
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
			let data = &<$expr>::SIGNATURE;
			let data_len = <$expr>::SIGNATURE_LEN;
            make_signature!(@copy(data, $dst, data_len, $dst_offset));
        }
        make_signature!(@data($dst, $dst_offset); $($tt)*)
    };

	(@copy($src:ident, $dst:ident, $src_len:expr, $dst_offset:ident)) => {
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

	use frame_support::sp_runtime::app_crypto::sp_core::hexdisplay::AsBytesRef;

	use super::{Name, SIGNATURE_SIZE_LIMIT, FunctionName, FunctionSignature};

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

	struct MaxSize();
	impl Name for MaxSize {
		const SIGNATURE: [u8; SIGNATURE_SIZE_LIMIT] = [b'!'; SIGNATURE_SIZE_LIMIT];
		const SIGNATURE_LEN: usize = SIGNATURE_SIZE_LIMIT;
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

	// This test must NOT compile!
	// #[test]
	// fn over_max_size() {
	// 	assert_eq!(<Vec<MaxSize>>::name(), "!".repeat(SIZE_LIMIT) + "[]");
	// }

	#[test]
	fn make_func_without_args() {
		const SOME_FUNK_NAME: FunctionName = FunctionName::new("some_funk");
		const SIG: FunctionSignature = make_signature!(
			new fn(&SOME_FUNK_NAME),
		);
		let name = from_utf8(&SIG.signature[..SIG.signature_len]).unwrap();
		assert_eq!(name, "some_funk()");
	}

	#[test]
	fn make_func_with_1_args() {
		const SOME_FUNK_NAME: FunctionName = FunctionName::new("some_funk");
		const SIG: FunctionSignature = make_signature!(
			new fn(&SOME_FUNK_NAME),
			(u8::SIGNATURE, u8::SIGNATURE_LEN)
		);
		let name = from_utf8(&SIG.signature[..SIG.signature_len]).unwrap();
		assert_eq!(name, "some_funk(uint8)");
	}

	#[test]
	fn make_func_with_2_args() {
		const SOME_FUNK_NAME: FunctionName = FunctionName::new("some_funk");
		const SIG: FunctionSignature = make_signature!(
			new fn(&SOME_FUNK_NAME),
			(u8::SIGNATURE, u8::SIGNATURE_LEN)
			(<Vec<u32>>::SIGNATURE, <Vec<u32>>::SIGNATURE_LEN)
		);
		let name = from_utf8(&SIG.signature[..SIG.signature_len]).unwrap();
		assert_eq!(name, "some_funk(uint8,uint32[])");
	}

	#[test]
	fn make_func_with_3_args() {
		const SOME_FUNK_NAME: FunctionName = FunctionName::new("some_funk");
		const SIG: FunctionSignature = make_signature!(
			new fn(&SOME_FUNK_NAME),
			(u8::SIGNATURE, u8::SIGNATURE_LEN)
			(u32::SIGNATURE, u32::SIGNATURE_LEN)
			(<Vec<u32>>::SIGNATURE, <Vec<u32>>::SIGNATURE_LEN)
		);
		let name = from_utf8(&SIG.signature[..SIG.signature_len]).unwrap();
		assert_eq!(name, "some_funk(uint8,uint32,uint32[])");
	}

	#[test]
	fn make_slice_from_signature() {
		const SOME_FUNK_NAME: FunctionName = FunctionName::new("some_funk");
		const SIG: FunctionSignature = make_signature!(
			new fn(&SOME_FUNK_NAME),
			(u8::SIGNATURE, u8::SIGNATURE_LEN)
			(u32::SIGNATURE, u32::SIGNATURE_LEN)
			(<Vec<u32>>::SIGNATURE, <Vec<u32>>::SIGNATURE_LEN)
		);
		const NAME: [u8; SIG.signature_len] = {
			let mut name: [u8; SIG.signature_len] = [0; SIG.signature_len];
			let mut i = 0;
			while i < SIG.signature_len {
				name[i] = SIG.signature[i];
				i += 1;
			}
			name
		};
		assert_eq!(&NAME, b"some_funk(uint8,uint32,uint32[])");
	}
}
