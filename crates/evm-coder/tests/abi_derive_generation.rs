use evm_coder_procedural::AbiCoder;
use evm_coder::{
	types::*,
	abi::{AbiType},
};

#[derive(AbiCoder)]
struct TypeStructUnit {}

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
fn impl_abi_type_signature() {
	assert_eq!(
		<TypeStructUnit as AbiType>::SIGNATURE.as_str().unwrap(),
		"()"
	);
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
	assert_eq!(<TypeStructUnit as AbiType>::is_dynamic(), false);
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
	assert_eq!(<TypeStructUnit as AbiType>::size(), 0);
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
