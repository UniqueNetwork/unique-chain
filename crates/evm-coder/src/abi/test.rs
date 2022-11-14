use crate::{
	abi::{AbiRead, AbiWrite},
	types::*,
};

use super::{AbiReader, AbiWriter};
use hex_literal::hex;
use primitive_types::{H160, U256};

fn test_impl<T>(function_identifier: u32, decoded_data: T, encoded_data: &[u8])
where
	T: AbiWrite + AbiRead + std::cmp::PartialEq + std::fmt::Debug,
{
	let (call, mut decoder) = AbiReader::new_call(encoded_data).unwrap();
	assert_eq!(call, u32::to_be_bytes(function_identifier));
	let data = <T>::abi_read(&mut decoder).unwrap();
	assert_eq!(data, decoded_data);

	let mut writer = AbiWriter::new_call(function_identifier);
	decoded_data.abi_write(&mut writer);
	let ed = writer.finish();
	similar_asserts::assert_eq!(encoded_data, ed.as_slice());
}

macro_rules! test_impl_uint {
	($type:ident) => {
		test_impl::<$type>(
			0xdeadbeef,
			255 as $type,
			&hex!(
				"
                    deadbeef
                    00000000000000000000000000000000000000000000000000000000000000ff
                "
			),
		);
	};
}

#[test]
fn encode_decode_uint8() {
	test_impl_uint!(uint8);
}

#[test]
fn encode_decode_uint32() {
	test_impl_uint!(uint32);
}

#[test]
fn encode_decode_uint128() {
	test_impl_uint!(uint128);
}

#[test]
fn encode_decode_uint256() {
	test_impl::<uint256>(
		0xdeadbeef,
		U256([255, 0, 0, 0]),
		&hex!(
			"
                deadbeef
                00000000000000000000000000000000000000000000000000000000000000ff
            "
		),
	);
}

#[test]
fn encode_decode_string() {
	test_impl::<String>(
		0xdeadbeef,
		"some string".to_string(),
		&hex!(
			"
                deadbeef
                0000000000000000000000000000000000000000000000000000000000000020
                000000000000000000000000000000000000000000000000000000000000000b
                736f6d6520737472696e67000000000000000000000000000000000000000000
            "
		),
	);
}

#[test]
fn encode_decode_tuple_string() {
	test_impl::<(String,)>(
		0xdeadbeef,
		("some string".to_string(),),
		&hex!(
			"
                deadbeef
                0000000000000000000000000000000000000000000000000000000000000020
                0000000000000000000000000000000000000000000000000000000000000020
                000000000000000000000000000000000000000000000000000000000000000b
                736f6d6520737472696e67000000000000000000000000000000000000000000
            "
		),
	);
}

#[test]
fn encode_decode_vec_tuple_address_uint256() {
	test_impl::<Vec<(address, uint256)>>(
        0x1ACF2D55,
        vec![
            (
                H160(hex!("2D2FF76104B7BACB2E8F6731D5BFC184EBECDDBC")),
                U256([10, 0, 0, 0]),
            ),
            (
                H160(hex!("AB8E3D9134955566483B11E6825C9223B6737B10")),
                U256([20, 0, 0, 0]),
            ),
            (
                H160(hex!("8C582BDF2953046705FC56F189385255EFC1BE18")),
                U256([30, 0, 0, 0]),
            ),
        ],
        &hex!(
            "
                1ACF2D55
                0000000000000000000000000000000000000000000000000000000000000020 // offset of (address, uint256)[]
                0000000000000000000000000000000000000000000000000000000000000003 // length of (address, uint256)[]

                0000000000000000000000002D2FF76104B7BACB2E8F6731D5BFC184EBECDDBC // address
                000000000000000000000000000000000000000000000000000000000000000A // uint256

                000000000000000000000000AB8E3D9134955566483B11E6825C9223B6737B10 // address
                0000000000000000000000000000000000000000000000000000000000000014 // uint256

                0000000000000000000000008C582BDF2953046705FC56F189385255EFC1BE18 // address
                000000000000000000000000000000000000000000000000000000000000001E // uint256
            "
        )
    );
}

#[test]
fn encode_decode_vec_tuple_uint256_string() {
	test_impl::<Vec<(uint256, string)>>(
        0xdeadbeef,
        vec![
            (1.into(), "Test URI 0".to_string()),
            (11.into(), "Test URI 1".to_string()),
            (12.into(), "Test URI 2".to_string()),
        ],
        &hex!(
            "
                deadbeef
                0000000000000000000000000000000000000000000000000000000000000020 // offset of (uint256, string)[]
                0000000000000000000000000000000000000000000000000000000000000003 // length of (uint256, string)[]

                0000000000000000000000000000000000000000000000000000000000000060 // offset of first elem
                00000000000000000000000000000000000000000000000000000000000000e0 // offset of second elem
                0000000000000000000000000000000000000000000000000000000000000160 // offset of third elem

                0000000000000000000000000000000000000000000000000000000000000001 // first token id?   					#60
                0000000000000000000000000000000000000000000000000000000000000040 // offset of string
                000000000000000000000000000000000000000000000000000000000000000a // size of string
                5465737420555249203000000000000000000000000000000000000000000000 // string

                000000000000000000000000000000000000000000000000000000000000000b // second token id? Why ==11?			#e0
                0000000000000000000000000000000000000000000000000000000000000040 // offset of string
                000000000000000000000000000000000000000000000000000000000000000a // size of string
                5465737420555249203100000000000000000000000000000000000000000000 // string

                000000000000000000000000000000000000000000000000000000000000000c // third token id?  Why ==12?			#160
                0000000000000000000000000000000000000000000000000000000000000040 // offset of string
                000000000000000000000000000000000000000000000000000000000000000a // size of string
                5465737420555249203200000000000000000000000000000000000000000000 // string
            "
        )
    );
}

#[test]
fn dynamic_after_static() {
	let mut encoder = AbiWriter::new();
	encoder.bool(&true);
	encoder.string("test");
	let encoded = encoder.finish();

	let mut encoder = AbiWriter::new();
	encoder.bool(&true);
	// Offset to subresult
	encoder.uint32(&(32 * 2));
	// Len of "test"
	encoder.uint32(&4);
	encoder.write_padright(&[b't', b'e', b's', b't']);
	let alternative_encoded = encoder.finish();

	assert_eq!(encoded, alternative_encoded);

	let mut decoder = AbiReader::new(&encoded);
	assert!(decoder.bool().unwrap());
	assert_eq!(decoder.string().unwrap(), "test");
}

#[test]
fn mint_sample() {
	let (call, mut decoder) = AbiReader::new_call(&hex!(
		"
            50bb4e7f
            000000000000000000000000ad2c0954693c2b5404b7e50967d3481bea432374
            0000000000000000000000000000000000000000000000000000000000000001
            0000000000000000000000000000000000000000000000000000000000000060
            0000000000000000000000000000000000000000000000000000000000000008
            5465737420555249000000000000000000000000000000000000000000000000
        "
	))
	.unwrap();
	assert_eq!(call, u32::to_be_bytes(0x50bb4e7f));
	assert_eq!(
		format!("{:?}", decoder.address().unwrap()),
		"0xad2c0954693c2b5404b7e50967d3481bea432374"
	);
	assert_eq!(decoder.uint32().unwrap(), 1);
	assert_eq!(decoder.string().unwrap(), "Test URI");
}

#[test]
fn parse_vec_with_dynamic_type() {
	let decoded_data = (
		0x36543006,
		vec![
			(1.into(), "Test URI 0".to_string()),
			(11.into(), "Test URI 1".to_string()),
			(12.into(), "Test URI 2".to_string()),
		],
	);

	let encoded_data = &hex!(
        "
            36543006
            00000000000000000000000053744e6da587ba10b32a2554d2efdcd985bc27a3 // address
            0000000000000000000000000000000000000000000000000000000000000040 // offset of (uint256, string)[]
            0000000000000000000000000000000000000000000000000000000000000003 // length of (uint256, string)[]

            0000000000000000000000000000000000000000000000000000000000000060 // offset of first elem
            00000000000000000000000000000000000000000000000000000000000000e0 // offset of second elem
            0000000000000000000000000000000000000000000000000000000000000160 // offset of third elem

            0000000000000000000000000000000000000000000000000000000000000001 // first token id?   					#60
            0000000000000000000000000000000000000000000000000000000000000040 // offset of string
            000000000000000000000000000000000000000000000000000000000000000a // size of string
            5465737420555249203000000000000000000000000000000000000000000000 // string

            000000000000000000000000000000000000000000000000000000000000000b // second token id? Why ==11?			#e0
            0000000000000000000000000000000000000000000000000000000000000040 // offset of string
            000000000000000000000000000000000000000000000000000000000000000a // size of string
            5465737420555249203100000000000000000000000000000000000000000000 // string

            000000000000000000000000000000000000000000000000000000000000000c // third token id?  Why ==12?			#160
            0000000000000000000000000000000000000000000000000000000000000040 // offset of string
            000000000000000000000000000000000000000000000000000000000000000a // size of string
            5465737420555249203200000000000000000000000000000000000000000000 // string
        "
    );

	let (call, mut decoder) = AbiReader::new_call(encoded_data).unwrap();
	assert_eq!(call, u32::to_be_bytes(decoded_data.0));
	let address = decoder.address().unwrap();
	let data = <Vec<(uint256, string)>>::abi_read(&mut decoder).unwrap();
	assert_eq!(data, decoded_data.1);

	let mut writer = AbiWriter::new_call(decoded_data.0);
	address.abi_write(&mut writer);
	decoded_data.1.abi_write(&mut writer);
	let ed = writer.finish();
	similar_asserts::assert_eq!(encoded_data, ed.as_slice());
}

#[test]
fn encode_decode_vec_tuple_string_bytes() {
	test_impl::<Vec<(string, bytes)>>(
		0xdeadbeef,
		vec![
			(
				"Test URI 0".to_string(),
				bytes(vec![
					0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
					0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
					0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
					0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
				]),
			),
			(
				"Test URI 1".to_string(),
				bytes(vec![
					0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
					0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
					0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
					0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
				]),
			),
			("Test URI 2".to_string(), bytes(vec![0x33, 0x33])),
		],
		&hex!(
			"
                deadbeef
                0000000000000000000000000000000000000000000000000000000000000020
                0000000000000000000000000000000000000000000000000000000000000003

                0000000000000000000000000000000000000000000000000000000000000060
                0000000000000000000000000000000000000000000000000000000000000140
                0000000000000000000000000000000000000000000000000000000000000220

                0000000000000000000000000000000000000000000000000000000000000040
                0000000000000000000000000000000000000000000000000000000000000080
                000000000000000000000000000000000000000000000000000000000000000a
                5465737420555249203000000000000000000000000000000000000000000000
                0000000000000000000000000000000000000000000000000000000000000030
                1111111111111111111111111111111111111111111111111111111111111111
                1111111111111111111111111111111100000000000000000000000000000000

                0000000000000000000000000000000000000000000000000000000000000040
                0000000000000000000000000000000000000000000000000000000000000080
                000000000000000000000000000000000000000000000000000000000000000a
                5465737420555249203100000000000000000000000000000000000000000000
                000000000000000000000000000000000000000000000000000000000000002f
                2222222222222222222222222222222222222222222222222222222222222222
                2222222222222222222222222222220000000000000000000000000000000000

                0000000000000000000000000000000000000000000000000000000000000040
                0000000000000000000000000000000000000000000000000000000000000080
                000000000000000000000000000000000000000000000000000000000000000a
                5465737420555249203200000000000000000000000000000000000000000000
                0000000000000000000000000000000000000000000000000000000000000002
                3333000000000000000000000000000000000000000000000000000000000000
            "
		),
	);
}
