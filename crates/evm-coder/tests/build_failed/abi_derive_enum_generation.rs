use evm_coder_procedural::AbiCoder;

#[derive(AbiCoder)]
enum NonRepr {
	A,
	B,
	C,
}

#[derive(AbiCoder)]
#[repr(u32)]
enum NonReprU8 {
	A,
	B,
	C,
}

#[derive(AbiCoder)]
#[repr(u8)]
enum RustEnum {
	A(u128),
	B,
	C,
}

#[derive(AbiCoder)]
#[repr(u8)]
enum WithExplicit {
	A = 128,
	B,
	C,
}

fn main() {
	assert!(false);
}
