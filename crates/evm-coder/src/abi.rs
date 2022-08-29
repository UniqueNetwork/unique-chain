// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

//! Implementation of EVM RLP reader/writer

#![allow(dead_code)]

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;
use evm_core::ExitError;
use primitive_types::{H160, U256};

use crate::{
	execution::{Error, ResultWithPostInfo, WithPostDispatchInfo},
	types::{string, self},
};
use crate::execution::Result;

const ABI_ALIGNMENT: usize = 32;

trait TypeHelper<T> {
	fn is_dynamic() -> bool;
}

/// View into RLP data, which provides method to read typed items from it
#[derive(Clone)]
pub struct AbiReader<'i> {
	buf: &'i [u8],
	subresult_offset: usize,
	offset: usize,
}
impl<'i> AbiReader<'i> {
	/// Start reading RLP buffer, assuming there is no padding bytes
	pub fn new(buf: &'i [u8]) -> Self {
		Self {
			buf,
			subresult_offset: 0,
			offset: 0,
		}
	}
	/// Start reading RLP buffer, parsing first 4 bytes as selector
	pub fn new_call(buf: &'i [u8]) -> Result<(types::bytes4, Self)> {
		if buf.len() < 4 {
			return Err(Error::Error(ExitError::OutOfOffset));
		}
		let mut method_id = [0; 4];
		method_id.copy_from_slice(&buf[0..4]);

		Ok((
			method_id,
			Self {
				buf,
				subresult_offset: 4,
				offset: 4,
			},
		))
	}

	fn read_pad<const S: usize>(
		buf: &[u8],
		offset: usize,
		pad_start: usize,
		pad_size: usize,
		block_start: usize,
		block_size: usize,
	) -> Result<[u8; S]> {
		if buf.len() - offset < ABI_ALIGNMENT {
			return Err(Error::Error(ExitError::OutOfOffset));
		}
		let mut block = [0; S];
		let is_pad_zeroed = buf[pad_start..pad_size].iter().all(|&v| v == 0);
		if !is_pad_zeroed {
			return Err(Error::Error(ExitError::InvalidRange));
		}
		block.copy_from_slice(&buf[block_start..block_size]);
		Ok(block)
	}

	fn read_padleft<const S: usize>(&mut self) -> Result<[u8; S]> {
		let offset = self.offset;
		self.offset += ABI_ALIGNMENT;
		Self::read_pad(
			self.buf,
			offset,
			offset,
			offset + ABI_ALIGNMENT - S,
			offset + ABI_ALIGNMENT - S,
			offset + ABI_ALIGNMENT,
		)
	}

	fn read_padright<const S: usize>(&mut self) -> Result<[u8; S]> {
		let offset = self.offset;
		self.offset += ABI_ALIGNMENT;
		Self::read_pad(
			self.buf,
			offset,
			offset + S,
			offset + ABI_ALIGNMENT,
			offset,
			offset + S,
		)
	}

	/// Read [`H160`] at current position, then advance
	pub fn address(&mut self) -> Result<H160> {
		Ok(H160(self.read_padleft()?))
	}

	/// Read [`bool`] at current position, then advance
	pub fn bool(&mut self) -> Result<bool> {
		let data: [u8; 1] = self.read_padleft()?;
		match data[0] {
			0 => Ok(false),
			1 => Ok(true),
			_ => Err(Error::Error(ExitError::InvalidRange)),
		}
	}

	/// Read [`[u8; 4]`] at current position, then advance
	pub fn bytes4(&mut self) -> Result<[u8; 4]> {
		self.read_padright()
	}

	/// Read [`Vec<u8>`] at current position, then advance
	pub fn bytes(&mut self) -> Result<Vec<u8>> {
		let mut subresult = self.subresult(None)?;
		let length = subresult.uint32()? as usize;
		if subresult.buf.len() < subresult.offset + length {
			return Err(Error::Error(ExitError::OutOfOffset));
		}
		Ok(subresult.buf[subresult.offset..subresult.offset + length].into())
	}

	/// Read [`string`] at current position, then advance
	pub fn string(&mut self) -> Result<string> {
		string::from_utf8(self.bytes()?).map_err(|_| Error::Error(ExitError::InvalidRange))
	}

	/// Read [`u8`] at current position, then advance
	pub fn uint8(&mut self) -> Result<u8> {
		Ok(self.read_padleft::<1>()?[0])
	}

	/// Read [`u32`] at current position, then advance
	pub fn uint32(&mut self) -> Result<u32> {
		Ok(u32::from_be_bytes(self.read_padleft()?))
	}

	/// Read [`u128`] at current position, then advance
	pub fn uint128(&mut self) -> Result<u128> {
		Ok(u128::from_be_bytes(self.read_padleft()?))
	}

	/// Read [`U256`] at current position, then advance
	pub fn uint256(&mut self) -> Result<U256> {
		let buf: [u8; 32] = self.read_padleft()?;
		Ok(U256::from_big_endian(&buf))
	}

	/// Read [`u64`] at current position, then advance
	pub fn uint64(&mut self) -> Result<u64> {
		Ok(u64::from_be_bytes(self.read_padleft()?))
	}

	/// Read [`usize`] at current position, then advance
	#[deprecated = "dangerous, as usize may have different width in wasm and native execution"]
	pub fn read_usize(&mut self) -> Result<usize> {
		Ok(usize::from_be_bytes(self.read_padleft()?))
	}

	/// Slice recursive buffer, advance one word for buffer offset
	/// If `size` is [`None`] then [`Self::offset`] and [`Self::subresult_offset`] evals from [`Self::buf`].
	fn subresult(&mut self, size: Option<usize>) -> Result<AbiReader<'i>> {
		let subresult_offset = self.subresult_offset;
		let offset = if let Some(size) = size {
			self.offset += size;
			self.subresult_offset += size;
			0
		} else {
			self.uint32()? as usize
		};

		if offset + self.subresult_offset > self.buf.len() {
			return Err(Error::Error(ExitError::InvalidRange));
		}

		let new_offset = offset + subresult_offset;
		Ok(AbiReader {
			buf: self.buf,
			subresult_offset: new_offset,
			offset: new_offset,
		})
	}

	/// Is this parser reached end of buffer?
	pub fn is_finished(&self) -> bool {
		self.buf.len() == self.offset
	}
}

/// Writer for RLP encoded data
#[derive(Default)]
pub struct AbiWriter {
	static_part: Vec<u8>,
	dynamic_part: Vec<(usize, AbiWriter)>,
	had_call: bool,
}
impl AbiWriter {
	/// Initialize internal buffers for output data, assuming no padding required
	pub fn new() -> Self {
		Self::default()
	}
	/// Initialize internal buffers, inserting method selector at beginning
	pub fn new_call(method_id: u32) -> Self {
		let mut val = Self::new();
		val.static_part.extend(&method_id.to_be_bytes());
		val.had_call = true;
		val
	}

	fn write_padleft(&mut self, block: &[u8]) {
		assert!(block.len() <= ABI_ALIGNMENT);
		self.static_part
			.extend(&[0; ABI_ALIGNMENT][0..ABI_ALIGNMENT - block.len()]);
		self.static_part.extend(block);
	}

	fn write_padright(&mut self, bytes: &[u8]) {
		assert!(bytes.len() <= ABI_ALIGNMENT);
		self.static_part.extend(bytes);
		self.static_part
			.extend(&[0; ABI_ALIGNMENT][0..ABI_ALIGNMENT - bytes.len()]);
	}

	/// Write [`H160`] to end of buffer
	pub fn address(&mut self, address: &H160) {
		self.write_padleft(&address.0)
	}

	/// Write [`bool`] to end of buffer
	pub fn bool(&mut self, value: &bool) {
		self.write_padleft(&[if *value { 1 } else { 0 }])
	}

	/// Write [`u8`] to end of buffer
	pub fn uint8(&mut self, value: &u8) {
		self.write_padleft(&[*value])
	}

	/// Write [`u32`] to end of buffer
	pub fn uint32(&mut self, value: &u32) {
		self.write_padleft(&u32::to_be_bytes(*value))
	}

	/// Write [`u128`] to end of buffer
	pub fn uint128(&mut self, value: &u128) {
		self.write_padleft(&u128::to_be_bytes(*value))
	}

	/// Write [`U256`] to end of buffer
	pub fn uint256(&mut self, value: &U256) {
		let mut out = [0; 32];
		value.to_big_endian(&mut out);
		self.write_padleft(&out)
	}

	/// Write [`usize`] to end of buffer
	#[deprecated = "dangerous, as usize may have different width in wasm and native execution"]
	pub fn write_usize(&mut self, value: &usize) {
		self.write_padleft(&usize::to_be_bytes(*value))
	}

	/// Append recursive data, writing pending offset at end of buffer
	pub fn write_subresult(&mut self, result: Self) {
		self.dynamic_part.push((self.static_part.len(), result));
		// Empty block, to be filled later
		self.write_padleft(&[]);
	}

	fn memory(&mut self, value: &[u8]) {
		let mut sub = Self::new();
		sub.uint32(&(value.len() as u32));
		for chunk in value.chunks(ABI_ALIGNMENT) {
			sub.write_padright(chunk);
		}
		self.write_subresult(sub);
	}

	/// Append recursive [`str`] at end of buffer
	pub fn string(&mut self, value: &str) {
		self.memory(value.as_bytes())
	}

	/// Append recursive [`[u8]`] at end of buffer
	pub fn bytes(&mut self, value: &[u8]) {
		self.memory(value)
	}

	/// Finish writer, concatenating all internal buffers
	pub fn finish(mut self) -> Vec<u8> {
		for (static_offset, part) in self.dynamic_part {
			let part_offset = self.static_part.len() - self.had_call.then(|| 4).unwrap_or(0);

			let encoded_dynamic_offset = usize::to_be_bytes(part_offset);
			self.static_part[static_offset + ABI_ALIGNMENT - encoded_dynamic_offset.len()
				..static_offset + ABI_ALIGNMENT]
				.copy_from_slice(&encoded_dynamic_offset);
			self.static_part.extend(part.finish())
		}
		self.static_part
	}
}

/// [`AbiReader`] implements reading of many types, but it should
/// be limited to types defined in spec
///
/// As this trait can't be made sealed,
/// instead of having `impl AbiRead for T`, we have `impl AbiRead<T> for AbiReader`
pub trait AbiRead<T> {
	/// Read item from current position, advanding decoder
	fn abi_read(&mut self) -> Result<T>;

	/// Size for type aligned to [`ABI_ALIGNMENT`].
	fn size() -> usize;
}

macro_rules! impl_abi_readable {
	($ty:ty, $method:ident, $dynamic:literal) => {
		impl TypeHelper<$ty> for $ty {
			fn is_dynamic() -> bool {
				$dynamic
			}
		}
		impl AbiRead<$ty> for AbiReader<'_> {
			fn abi_read(&mut self) -> Result<$ty> {
				self.$method()
			}

			fn size() -> usize {
				ABI_ALIGNMENT
			}
		}
	};
}

impl_abi_readable!(u8, uint8, false);
impl_abi_readable!(u32, uint32, false);
impl_abi_readable!(u64, uint64, false);
impl_abi_readable!(u128, uint128, false);
impl_abi_readable!(U256, uint256, false);
impl_abi_readable!([u8; 4], bytes4, false);
impl_abi_readable!(H160, address, false);
impl_abi_readable!(Vec<u8>, bytes, true);
impl_abi_readable!(bool, bool, true);
impl_abi_readable!(string, string, true);

mod sealed {
	/// Not all types can be placed in vec, i.e `Vec<u8>` is restricted, `bytes` should be used instead
	pub trait CanBePlacedInVec {}
}

impl sealed::CanBePlacedInVec for U256 {}
impl sealed::CanBePlacedInVec for string {}
impl sealed::CanBePlacedInVec for H160 {}

impl<R: sealed::CanBePlacedInVec> AbiRead<Vec<R>> for AbiReader<'_>
where
	Self: AbiRead<R>,
{
	fn abi_read(&mut self) -> Result<Vec<R>> {
		let mut sub = self.subresult(None)?;
		let size = sub.uint32()? as usize;
		sub.subresult_offset = sub.offset;
		let mut out = Vec::with_capacity(size);
		for _ in 0..size {
			out.push(<Self as AbiRead<R>>::abi_read(&mut sub)?);
		}
		Ok(out)
	}

	fn size() -> usize {
		ABI_ALIGNMENT
	}
}

macro_rules! impl_tuples {
	($($ident:ident)+) => {
		impl<$($ident: TypeHelper<$ident>,)+> TypeHelper<($($ident,)+)> for ($($ident,)+) {
			fn is_dynamic() -> bool {
				false
				$(
					|| <$ident>::is_dynamic()
				)*
			}
		}
		impl<$($ident),+> sealed::CanBePlacedInVec for ($($ident,)+) {}
		impl<$($ident),+> AbiRead<($($ident,)+)> for AbiReader<'_>
		where
			$(
				Self: AbiRead<$ident>,
			)+
			($($ident,)+): TypeHelper<($($ident,)+)>,
		{
			fn abi_read(&mut self) -> Result<($($ident,)+)> {
				let size = if !<($($ident,)+)>::is_dynamic() { Some(<Self as AbiRead<($($ident,)+)>>::size()) } else { None };
				let mut subresult = self.subresult(size)?;
				Ok((
					$(<Self as AbiRead<$ident>>::abi_read(&mut subresult)?,)+
				))
			}

			fn size() -> usize {
				0 $(+ {let _ : $ident; ABI_ALIGNMENT})+
			}
		}
		#[allow(non_snake_case)]
		impl<$($ident),+> AbiWrite for &($($ident,)+)
		where
			$($ident: AbiWrite,)+
		{
			fn abi_write(&self, writer: &mut AbiWriter) {
				let ($($ident,)+) = self;
				$($ident.abi_write(writer);)+
			}
		}
	};
}

impl_tuples! {A}
impl_tuples! {A B}
impl_tuples! {A B C}
impl_tuples! {A B C D}
impl_tuples! {A B C D E}
impl_tuples! {A B C D E F}
impl_tuples! {A B C D E F G}
impl_tuples! {A B C D E F G H}
impl_tuples! {A B C D E F G H I}
impl_tuples! {A B C D E F G H I J}

/// For questions about inability to provide custom implementations,
/// see [`AbiRead`]
pub trait AbiWrite {
	/// Write value to end of specified encoder
	fn abi_write(&self, writer: &mut AbiWriter);
	/// Specialization for [`crate::solidity_interface`] implementation,
	/// see comment in `impl AbiWrite for ResultWithPostInfo`
	fn to_result(&self) -> ResultWithPostInfo<AbiWriter> {
		let mut writer = AbiWriter::new();
		self.abi_write(&mut writer);
		Ok(writer.into())
	}
}

/// This particular AbiWrite implementation should be split to another trait,
/// which only implements `to_result`, but due to lack of specialization feature
/// in stable Rust, we can't have blanket impl of this trait `for T where T: AbiWrite`,
/// so here we abusing default trait methods for it
impl<T: AbiWrite> AbiWrite for ResultWithPostInfo<T> {
	fn abi_write(&self, _writer: &mut AbiWriter) {
		debug_assert!(false, "shouldn't be called, see comment")
	}
	fn to_result(&self) -> ResultWithPostInfo<AbiWriter> {
		match self {
			Ok(v) => Ok(WithPostDispatchInfo {
				post_info: v.post_info.clone(),
				data: {
					let mut out = AbiWriter::new();
					v.data.abi_write(&mut out);
					out
				},
			}),
			Err(e) => Err(e.clone()),
		}
	}
}

macro_rules! impl_abi_writeable {
	($ty:ty, $method:ident) => {
		impl AbiWrite for $ty {
			fn abi_write(&self, writer: &mut AbiWriter) {
				writer.$method(&self)
			}
		}
	};
}

impl_abi_writeable!(u8, uint8);
impl_abi_writeable!(u32, uint32);
impl_abi_writeable!(u128, uint128);
impl_abi_writeable!(U256, uint256);
impl_abi_writeable!(H160, address);
impl_abi_writeable!(bool, bool);
impl_abi_writeable!(&str, string);
impl AbiWrite for &string {
	fn abi_write(&self, writer: &mut AbiWriter) {
		writer.string(self)
	}
}
impl AbiWrite for &Vec<u8> {
	fn abi_write(&self, writer: &mut AbiWriter) {
		writer.bytes(self)
	}
}

impl AbiWrite for () {
	fn abi_write(&self, _writer: &mut AbiWriter) {}
}

/// Helper macros to parse reader into variables
#[deprecated]
#[macro_export]
macro_rules! abi_decode {
	($reader:expr, $($name:ident: $typ:ident),+ $(,)?) => {
		$(
			let $name = $reader.$typ()?;
		)+
	}
}

/// Helper macros to construct RLP-encoded buffer
#[deprecated]
#[macro_export]
macro_rules! abi_encode {
	($($typ:ident($value:expr)),* $(,)?) => {{
		#[allow(unused_mut)]
		let mut writer = ::evm_coder::abi::AbiWriter::new();
		$(
			writer.$typ($value);
		)*
		writer
	}};
	(call $val:expr; $($typ:ident($value:expr)),* $(,)?) => {{
		#[allow(unused_mut)]
		let mut writer = ::evm_coder::abi::AbiWriter::new_call($val);
		$(
			writer.$typ($value);
		)*
		writer
	}}
}

#[cfg(test)]
pub mod test {
	use crate::{
		abi::AbiRead,
		types::{string, uint256},
	};

	use super::{AbiReader, AbiWriter};
	use hex_literal::hex;

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
	fn mint_bulk() {
		let (call, mut decoder) = AbiReader::new_call(&hex!(
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
		))
		.unwrap();
		assert_eq!(call, u32::to_be_bytes(0x36543006));
		let _ = decoder.address().unwrap();
		let data =
			<AbiReader<'_> as AbiRead<Vec<(uint256, string)>>>::abi_read(&mut decoder).unwrap();
		assert_eq!(
			data,
			vec![
				(1.into(), "Test URI 0".to_string()),
				(11.into(), "Test URI 1".to_string()),
				(12.into(), "Test URI 2".to_string())
			]
		);
	}

	#[test]
	fn parse_vec_with_simple_type() {
		use crate::types::address;
		use primitive_types::{H160, U256};

		let (call, mut decoder) = AbiReader::new_call(&hex!(
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
		))
		.unwrap();
		assert_eq!(call, u32::to_be_bytes(0x1ACF2D55));
		let data =
			<AbiReader<'_> as AbiRead<Vec<(address, uint256)>>>::abi_read(&mut decoder).unwrap();
		assert_eq!(data.len(), 3);
		assert_eq!(
			data,
			vec![
				(
					H160(hex!("2D2FF76104B7BACB2E8F6731D5BFC184EBECDDBC")),
					U256([10, 0, 0, 0])
				),
				(
					H160(hex!("AB8E3D9134955566483B11E6825C9223B6737B10")),
					U256([20, 0, 0, 0])
				),
				(
					H160(hex!("8C582BDF2953046705FC56F189385255EFC1BE18")),
					U256([30, 0, 0, 0])
				),
			]
		);
	}
}
