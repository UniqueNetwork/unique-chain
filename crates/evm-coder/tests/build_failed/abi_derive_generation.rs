use evm_coder_procedural::AbiCoder;

#[derive(AbiCoder, PartialEq, Debug)]
struct EmptyStruct {}

#[derive(AbiCoder, PartialEq, Debug)]
struct EmptyTupleStruct();

fn main() {
	assert!(false);
}
