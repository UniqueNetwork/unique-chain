#![allow(dead_code)]
use std::str::from_utf8;

use evm_coder::{
	make_signature,
	custom_signature::{SignatureUnit, SIGNATURE_SIZE_LIMIT},
};

trait Name {
	const SIGNATURE: SignatureUnit;

	fn name() -> &'static str {
		from_utf8(&Self::SIGNATURE.data[..Self::SIGNATURE.len]).expect("bad utf-8")
	}
}

impl<T: Name> Name for Vec<T> {
	evm_coder::make_signature!(new nameof(T) fixed("[]"));
}

struct MaxSize();
impl Name for MaxSize {
	const SIGNATURE: SignatureUnit = SignatureUnit {
		data: [b'!'; SIGNATURE_SIZE_LIMIT],
		len: SIGNATURE_SIZE_LIMIT,
	};
}

const NAME: SignatureUnit = <Vec<MaxSize>>::SIGNATURE;

fn main() {
	assert!(false);
}
