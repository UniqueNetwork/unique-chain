use evm_coder_procedural::AbiCoder;
use evm_coder::types::bytes;

#[test]
fn empty_struct() {
	let t = trybuild::TestCases::new();
	t.compile_fail("tests/build_failed/abi_derive_generation.rs");
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct1SimpleParam {
	_a: u8,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct1DynamicParam {
	_a: String,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2SimpleParam {
	_a: u8,
	_b: u32,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2DynamicParam {
	_a: String,
	_b: bytes,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2MixedParam {
	_a: u8,
	_b: bytes,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct1DerivedSimpleParam {
	_a: TypeStruct1SimpleParam,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2DerivedSimpleParam {
	_a: TypeStruct1SimpleParam,
	_b: TypeStruct2SimpleParam,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct1DerivedDynamicParam {
	_a: TypeStruct1DynamicParam,
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2DerivedDynamicParam {
	_a: TypeStruct1DynamicParam,
	_b: TypeStruct2DynamicParam,
}

#[derive(AbiCoder, PartialEq, Debug)]
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
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8)"
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(string)"
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8,uint32)"
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(string,bytes)"
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"(uint8,bytes)"
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8))"
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8),(uint8,uint32))"
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((string))"
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((string),(string,bytes))"
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		"((uint8),(string,bytes),(uint8,bytes))"
	);
}

#[test]
fn impl_abi_type_is_dynamic() {
	assert_eq!(
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		false
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::is_dynamic(),
		true
	);
}

#[test]
fn impl_abi_type_size() {
	const ABI_ALIGNMENT: usize = 32;
	assert_eq!(
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 2
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 3
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 3
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::size(),
		ABI_ALIGNMENT * 5
	);
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct1SimpleParam(u8);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct1DynamicParam(String);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2SimpleParam(u8, u32);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2DynamicParam(String, bytes);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2MixedParam(u8, bytes);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct1DerivedSimpleParam(TupleStruct1SimpleParam);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2DerivedSimpleParam(TupleStruct1SimpleParam, TupleStruct2SimpleParam);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct1DerivedDynamicParam(TupleStruct1DynamicParam);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2DerivedDynamicParam(TupleStruct1DynamicParam, TupleStruct2DynamicParam);

#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct3DerivedMixedParam(
	TupleStruct1SimpleParam,
	TupleStruct2DynamicParam,
	TupleStruct2MixedParam,
);

#[test]
fn impl_abi_type_signature_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2SimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap()
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2MixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
		<TupleStruct3DerivedMixedParam as evm_coder::abi::AbiType>::SIGNATURE
			.as_str()
			.unwrap(),
	);
}

#[test]
fn impl_abi_type_is_dynamic_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct1SimpleParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct1DynamicParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct2SimpleParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct2DynamicParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct2MixedParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::is_dynamic()
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::is_dynamic(),
		<TupleStruct3DerivedMixedParam as evm_coder::abi::AbiType>::is_dynamic()
	);
}

#[test]
fn impl_abi_type_size_same_for_structs() {
	assert_eq!(
		<TypeStruct1SimpleParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct1SimpleParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DynamicParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct1DynamicParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2SimpleParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct2SimpleParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DynamicParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct2DynamicParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2MixedParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct2MixedParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct1DerivedSimpleParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct2DerivedSimpleParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct1DerivedDynamicParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct2DerivedDynamicParam as evm_coder::abi::AbiType>::size()
	);
	assert_eq!(
		<TypeStruct3DerivedMixedParam as evm_coder::abi::AbiType>::size(),
		<TupleStruct3DerivedMixedParam as evm_coder::abi::AbiType>::size()
	);
}

const FUNCTION_IDENTIFIER: u32 = 0xdeadbeef;

fn test_impl<Tuple, TupleStruct, TypeStruct>(
	tuple_data: Tuple,
	tuple_struct_data: TupleStruct,
	type_struct_data: TypeStruct,
) where
	TypeStruct:
		evm_coder::abi::AbiWrite + evm_coder::abi::AbiRead + std::cmp::PartialEq + std::fmt::Debug,
	TupleStruct:
		evm_coder::abi::AbiWrite + evm_coder::abi::AbiRead + std::cmp::PartialEq + std::fmt::Debug,
	Tuple:
		evm_coder::abi::AbiWrite + evm_coder::abi::AbiRead + std::cmp::PartialEq + std::fmt::Debug,
{
	let encoded_type_struct = test_abi_write_impl(&type_struct_data);
	let encoded_tuple_struct = test_abi_write_impl(&tuple_struct_data);
	let encoded_tuple = test_abi_write_impl(&tuple_data);

	similar_asserts::assert_eq!(encoded_tuple, encoded_type_struct);
	similar_asserts::assert_eq!(encoded_tuple, encoded_tuple_struct);

	{
		let (_, mut decoder) = evm_coder::abi::AbiReader::new_call(&encoded_tuple).unwrap();
		let restored_struct_data = <TypeStruct>::abi_read(&mut decoder).unwrap();
		assert_eq!(restored_struct_data, type_struct_data);
	}
	{
		let (_, mut decoder) = evm_coder::abi::AbiReader::new_call(&encoded_tuple).unwrap();
		let restored_struct_data = <TupleStruct>::abi_read(&mut decoder).unwrap();
		assert_eq!(restored_struct_data, tuple_struct_data);
	}

	{
		let (_, mut decoder) = evm_coder::abi::AbiReader::new_call(&encoded_type_struct).unwrap();
		let restored_tuple_data = <Tuple>::abi_read(&mut decoder).unwrap();
		assert_eq!(restored_tuple_data, tuple_data);
	}
	{
		let (_, mut decoder) = evm_coder::abi::AbiReader::new_call(&encoded_tuple_struct).unwrap();
		let restored_tuple_data = <Tuple>::abi_read(&mut decoder).unwrap();
		assert_eq!(restored_tuple_data, tuple_data);
	}
}

fn test_abi_write_impl<A>(data: &A) -> Vec<u8>
where
	A: evm_coder::abi::AbiWrite + evm_coder::abi::AbiRead + std::cmp::PartialEq + std::fmt::Debug,
{
	let mut writer = evm_coder::abi::AbiWriter::new_call(FUNCTION_IDENTIFIER);
	data.abi_write(&mut writer);
	let encoded_tuple = writer.finish();
	encoded_tuple
}

#[test]
fn codec_struct_1_simple() {
	let _a = 0xff;
	test_impl::<(u8,), TupleStruct1SimpleParam, TypeStruct1SimpleParam>(
		(_a,),
		TupleStruct1SimpleParam(_a),
		TypeStruct1SimpleParam { _a },
	);
}

#[test]
fn codec_struct_1_dynamic() {
	let _a: String = "some string".into();
	test_impl::<(String,), TupleStruct1DynamicParam, TypeStruct1DynamicParam>(
		(_a.clone(),),
		TupleStruct1DynamicParam(_a.clone()),
		TypeStruct1DynamicParam { _a },
	);
}

#[test]
fn codec_struct_1_derived_simple() {
	let _a: u8 = 0xff;
	test_impl::<((u8,),), TupleStruct1DerivedSimpleParam, TypeStruct1DerivedSimpleParam>(
		((_a,),),
		TupleStruct1DerivedSimpleParam(TupleStruct1SimpleParam(_a)),
		TypeStruct1DerivedSimpleParam {
			_a: TypeStruct1SimpleParam { _a },
		},
	);
}

#[test]
fn codec_struct_1_derived_dynamic() {
	let _a: String = "some string".into();
	test_impl::<((String,),), TupleStruct1DerivedDynamicParam, TypeStruct1DerivedDynamicParam>(
		((_a.clone(),),),
		TupleStruct1DerivedDynamicParam(TupleStruct1DynamicParam(_a.clone())),
		TypeStruct1DerivedDynamicParam {
			_a: TypeStruct1DynamicParam { _a },
		},
	);
}

#[test]
fn codec_struct_2_simple() {
	let _a = 0xff;
	let _b = 0xbeefbaba;
	test_impl::<(u8, u32), TupleStruct2SimpleParam, TypeStruct2SimpleParam>(
		(_a, _b),
		TupleStruct2SimpleParam(_a, _b),
		TypeStruct2SimpleParam { _a, _b },
	);
}

#[test]
fn codec_struct_2_dynamic() {
	let _a: String = "some string".into();
	let _b: bytes = bytes(vec![0x11, 0x22, 0x33]);
	test_impl::<(String, bytes), TupleStruct2DynamicParam, TypeStruct2DynamicParam>(
		(_a.clone(), _b.clone()),
		TupleStruct2DynamicParam(_a.clone(), _b.clone()),
		TypeStruct2DynamicParam { _a, _b },
	);
}

#[test]
fn codec_struct_2_mixed() {
	let _a: u8 = 0xff;
	let _b: bytes = bytes(vec![0x11, 0x22, 0x33]);
	test_impl::<(u8, bytes), TupleStruct2MixedParam, TypeStruct2MixedParam>(
		(_a.clone(), _b.clone()),
		TupleStruct2MixedParam(_a.clone(), _b.clone()),
		TypeStruct2MixedParam { _a, _b },
	);
}

#[test]
fn codec_struct_2_derived_simple() {
	let _a = 0xff;
	let _b = 0xbeefbaba;
	test_impl::<((u8,), (u8, u32)), TupleStruct2DerivedSimpleParam, TypeStruct2DerivedSimpleParam>(
		((_a,), (_a, _b)),
		TupleStruct2DerivedSimpleParam(
			TupleStruct1SimpleParam(_a),
			TupleStruct2SimpleParam(_a, _b),
		),
		TypeStruct2DerivedSimpleParam {
			_a: TypeStruct1SimpleParam { _a },
			_b: TypeStruct2SimpleParam { _a, _b },
		},
	);
}

#[test]
fn codec_struct_2_derived_dynamic() {
	let _a = "some string".to_string();
	let _b = bytes(vec![0x11, 0x22, 0x33]);
	test_impl::<
		((String,), (String, bytes)),
		TupleStruct2DerivedDynamicParam,
		TypeStruct2DerivedDynamicParam,
	>(
		((_a.clone(),), (_a.clone(), _b.clone())),
		TupleStruct2DerivedDynamicParam(
			TupleStruct1DynamicParam(_a.clone()),
			TupleStruct2DynamicParam(_a.clone(), _b.clone()),
		),
		TypeStruct2DerivedDynamicParam {
			_a: TypeStruct1DynamicParam { _a: _a.clone() },
			_b: TypeStruct2DynamicParam { _a, _b },
		},
	);
}

#[test]
fn codec_struct_3_derived_mixed() {
	let int = 0xff;
	let by = bytes(vec![0x11, 0x22, 0x33]);
	let string = "some string".to_string();
	test_impl::<
		((u8,), (String, bytes), (u8, bytes)),
		TupleStruct3DerivedMixedParam,
		TypeStruct3DerivedMixedParam,
	>(
		((int,), (string.clone(), by.clone()), (int, by.clone())),
		TupleStruct3DerivedMixedParam(
			TupleStruct1SimpleParam(int),
			TupleStruct2DynamicParam(string.clone(), by.clone()),
			TupleStruct2MixedParam(int, by.clone()),
		),
		TypeStruct3DerivedMixedParam {
			_a: TypeStruct1SimpleParam { _a: int },
			_b: TypeStruct2DynamicParam {
				_a: string.clone(),
				_b: by.clone(),
			},
			_c: TypeStruct2MixedParam { _a: int, _b: by },
		},
	);
}

#[derive(AbiCoder, PartialEq, Debug)]
struct TypeStruct2SimpleStruct1Simple {
	_a: TypeStruct2SimpleParam,
	_b: TypeStruct2SimpleParam,
	_c: u8,
}
#[derive(AbiCoder, PartialEq, Debug)]
struct TupleStruct2SimpleStruct1Simple(TupleStruct2SimpleParam, TupleStruct2SimpleParam, u8);

#[test]
fn codec_struct_2_struct_simple_1_simple() {
	let _a = 0xff;
	let _b = 0xbeefbaba;
	test_impl::<
		((u8, u32), (u8, u32), u8),
		TupleStruct2SimpleStruct1Simple,
		TypeStruct2SimpleStruct1Simple,
	>(
		((_a, _b), (_a, _b), _a),
		TupleStruct2SimpleStruct1Simple(
			TupleStruct2SimpleParam(_a, _b),
			TupleStruct2SimpleParam(_a, _b),
			_a,
		),
		TypeStruct2SimpleStruct1Simple {
			_a: TypeStruct2SimpleParam { _a, _b },
			_b: TypeStruct2SimpleParam { _a, _b },
			_c: _a,
		},
	);
}
