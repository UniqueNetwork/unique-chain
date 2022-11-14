use evm_coder_procedural::AbiCoder;
use evm_coder::{
	types::*,
	abi::{AbiType},
};

// TODO: move to build_failed tests
// #[derive(AbiCoder)]
// struct TypeStructUnit {}

#[derive(AbiCoder)]
struct TypeStruct1SimpleParam {
	_a: u8,
}

#[derive(AbiCoder)]
struct TypeStruct1DynamicParam {
	_a: String,
}

#[derive(AbiCoder)]
struct TypeStruct2SimpleParam {
	_a: u8,
	_b: u32,
}

#[derive(AbiCoder)]
struct TypeStruct2DynamicParam {
	_a: String,
	_b: bytes,
}

#[derive(AbiCoder)]
struct TypeStruct2MixedParam {
	_a: u8,
	_b: bytes,
}

#[derive(AbiCoder)]
struct TypeStruct1DerivedSimpleParam {
	_a: TypeStruct1SimpleParam,
}

#[derive(AbiCoder)]
struct TypeStruct2DerivedSimpleParam {
	_a: TypeStruct1SimpleParam,
	_b: TypeStruct2SimpleParam,
}

#[derive(AbiCoder)]
struct TypeStruct1DerivedDynamicParam {
	_a: TypeStruct1DynamicParam,
}

#[derive(AbiCoder)]
struct TypeStruct2DerivedDynamicParam {
	_a: TypeStruct1DynamicParam,
	_b: TypeStruct2DynamicParam,
}

#[derive(AbiCoder)]
struct TypeStruct3DerivedMixedParam {
	_a: TypeStruct1SimpleParam,
	_b: TypeStruct2DynamicParam,
	_c: TypeStruct2MixedParam,
}

#[test]
fn empty() {}

#[test]
fn impl_abi_type_signature() {
	assert_eq!(
		<TypeStruct1SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8)"
	);
	assert_eq!(
		<TypeStruct1DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(string)"
	);
	assert_eq!(
		<TypeStruct2SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8,uint32)"
	);
	assert_eq!(
		<TypeStruct2DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(string,bytes)"
	);
	assert_eq!(
		<TypeStruct2MixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8,bytes)"
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8))"
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8),(uint8,uint32))"
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((string))"
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((string),(string,bytes))"
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8),(string,bytes),(uint8,bytes))"
	);
}

#[test]
fn impl_abi_type_is_dynamic() {
	assert_eq!(<TypeStruct1SimpleParam as AbiType>::is_dynamic(), false);
	assert_eq!(<TypeStruct1DynamicParam as AbiType>::is_dynamic(), true);
	assert_eq!(<TypeStruct2SimpleParam as AbiType>::is_dynamic(), false);
	assert_eq!(<TypeStruct2DynamicParam as AbiType>::is_dynamic(), true);
	assert_eq!(<TypeStruct2MixedParam as AbiType>::is_dynamic(), true);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::is_dynamic(),
		true
	);
}

#[test]
fn impl_abi_type_size() {
	const ABI_ALIGNMENT: usize = 32;
	assert_eq!(<TypeStruct1SimpleParam as AbiType>::size(), ABI_ALIGNMENT);
	assert_eq!(<TypeStruct1DynamicParam as AbiType>::size(), ABI_ALIGNMENT);
	assert_eq!(
		<TypeStruct2SimpleParam as AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct2DynamicParam as AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct2MixedParam as AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::size(),
		ABI_ALIGNMENT * 3
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::size(),
		ABI_ALIGNMENT * 3
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::size(),
		ABI_ALIGNMENT * 5
	);
}

#[derive(AbiCoder)]
struct TupleStruct1SimpleParam(u8);

#[derive(AbiCoder)]
struct TupleStruct1DynamicParam(String);

#[derive(AbiCoder)]
struct TupleStruct2SimpleParam(u8, u32);

#[derive(AbiCoder)]
struct TupleStruct2DynamicParam(String, bytes);

#[derive(AbiCoder)]
struct TupleStruct2MixedParam(u8, bytes);

#[derive(AbiCoder)]
struct TupleStruct1DerivedSimpleParam(TupleStruct1SimpleParam);

#[derive(AbiCoder)]
struct TupleStruct2DerivedSimpleParam(TupleStruct1SimpleParam, TupleStruct2SimpleParam);

#[derive(AbiCoder)]
struct TupleStruct1DerivedDynamicParam(TupleStruct1DynamicParam);

#[derive(AbiCoder)]
struct TupleStruct2DerivedDynamicParam(TupleStruct1DynamicParam, TupleStruct2DynamicParam);

#[derive(AbiCoder)]
struct TupleStruct3DerivedMixedParam(
	TupleStruct1SimpleParam,
	TupleStruct2DynamicParam,
	TupleStruct2MixedParam,
);

#[test]
fn impl_abi_type_signature_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2SimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2MixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2MixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DerivedSimpleParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DerivedDynamicParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct3DerivedMixedParam as AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
}

#[test]
fn impl_abi_type_is_dynamic_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as AbiType>::is_dynamic(),
		<TupleStruct1SimpleParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as AbiType>::is_dynamic(),
		<TupleStruct1DynamicParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as AbiType>::is_dynamic(),
		<TupleStruct2SimpleParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as AbiType>::is_dynamic(),
		<TupleStruct2DynamicParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2MixedParam as AbiType>::is_dynamic(),
		<TupleStruct2MixedParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::is_dynamic(),
		<TupleStruct1DerivedSimpleParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::is_dynamic(),
		<TupleStruct2DerivedSimpleParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::is_dynamic(),
		<TupleStruct1DerivedDynamicParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::is_dynamic(),
		<TupleStruct2DerivedDynamicParam as AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::is_dynamic(),
		<TupleStruct3DerivedMixedParam as AbiType>::is_dynamic()
	);
}

#[test]
fn impl_abi_type_size_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as AbiType>::size(),
		<TupleStruct1SimpleParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as AbiType>::size(),
		<TupleStruct1DynamicParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as AbiType>::size(),
		<TupleStruct2SimpleParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as AbiType>::size(),
		<TupleStruct2DynamicParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2MixedParam as AbiType>::size(),
		<TupleStruct2MixedParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as AbiType>::size(),
		<TupleStruct1DerivedSimpleParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as AbiType>::size(),
		<TupleStruct2DerivedSimpleParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as AbiType>::size(),
		<TupleStruct1DerivedDynamicParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as AbiType>::size(),
		<TupleStruct2DerivedDynamicParam as AbiType>::size()
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as AbiType>::size(),
		<TupleStruct3DerivedMixedParam as AbiType>::size()
	);
}

// #[test]
// fn impl_abi_read() {
// 	TypeStruct1SimpleParam::
// }
