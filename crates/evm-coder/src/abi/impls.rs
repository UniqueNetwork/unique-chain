use crate::{
	custom_signature::SignatureUnit,
	execution::{Result, ResultWithPostInfo, WithPostDispatchInfo},
	make_signature, sealed,
	types::*,
};
use super::{traits::*, ABI_ALIGNMENT, AbiReader, AbiWriter};
use primitive_types::{U256, H160};

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

macro_rules! impl_abi_type {
	($ty:ty, $name:ident, $dynamic:literal) => {
		impl sealed::CanBePlacedInVec for $ty {}

		impl AbiType for $ty {
			const SIGNATURE: SignatureUnit = make_signature!(new fixed(stringify!($name)));
			const FIELDS_COUNT: usize = 1;

			fn is_dynamic() -> bool {
				$dynamic
			}

			fn size() -> usize {
				ABI_ALIGNMENT
			}
		}
	};
}

macro_rules! impl_abi_readable {
	($ty:ty, $method:ident) => {
		impl AbiRead for $ty {
			fn abi_read(reader: &mut AbiReader) -> Result<$ty> {
				reader.$method()
			}
		}
	};
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

macro_rules! impl_abi {
	($ty:ty, $method:ident, $dynamic:literal) => {
		impl_abi_type!($ty, $method, $dynamic);
		impl_abi_readable!($ty, $method);
		impl_abi_writeable!($ty, $method);
	};
}

impl_abi!(bool, bool, false);
impl_abi!(u8, uint8, false);
impl_abi!(u32, uint32, false);
impl_abi!(u64, uint64, false);
impl_abi!(u128, uint128, false);
impl_abi!(U256, uint256, false);
impl_abi!(H160, address, false);
impl_abi!(string, string, true);

impl_abi_writeable!(&str, string);

impl_abi_type!(bytes, bytes, true);

impl AbiRead for bytes {
	fn abi_read(reader: &mut AbiReader) -> Result<bytes> {
		Ok(bytes(reader.bytes()?))
	}
}

impl AbiWrite for bytes {
	fn abi_write(&self, writer: &mut AbiWriter) {
		writer.bytes(self.0.as_slice())
	}
}

impl_abi_type!(bytes4, bytes4, false);
impl AbiRead for bytes4 {
	fn abi_read(reader: &mut AbiReader) -> Result<bytes4> {
		reader.bytes4()
	}
}

impl<T: AbiWrite> AbiWrite for &T {
	fn abi_write(&self, writer: &mut AbiWriter) {
		T::abi_write(self, writer);
	}
}

impl<T: AbiType> AbiType for &T {
	const SIGNATURE: SignatureUnit = T::SIGNATURE;
	const FIELDS_COUNT: usize = T::FIELDS_COUNT;

	fn is_dynamic() -> bool {
		T::is_dynamic()
	}

	fn size() -> usize {
		T::size()
	}
}

impl<T: AbiType + AbiRead + sealed::CanBePlacedInVec> AbiRead for Vec<T> {
	fn abi_read(reader: &mut AbiReader) -> Result<Vec<T>> {
		let mut sub = reader.subresult(None)?;
		let size = sub.uint32()? as usize;
		sub.subresult_offset = sub.offset;
		let is_dynamic = <T as AbiType>::is_dynamic();
		let mut out = Vec::with_capacity(size);
		for _ in 0..size {
			out.push(<T as AbiRead>::abi_read(&mut sub)?);
			if !is_dynamic {
				sub.bytes_read(<T as AbiType>::size());
			};
		}
		Ok(out)
	}
}

impl<T: AbiType> AbiType for Vec<T> {
	const SIGNATURE: SignatureUnit = make_signature!(new nameof(T::SIGNATURE) fixed("[]"));
	const FIELDS_COUNT: usize = 1;

	fn is_dynamic() -> bool {
		true
	}

	fn size() -> usize {
		ABI_ALIGNMENT
	}
}

impl sealed::CanBePlacedInVec for Property {}

impl AbiType for Property {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("(string,bytes)"));
	const FIELDS_COUNT: usize = 2;

	fn is_dynamic() -> bool {
		string::is_dynamic() || bytes::is_dynamic()
	}

	fn size() -> usize {
		<string as AbiType>::size() + <bytes as AbiType>::size()
	}
}

impl AbiRead for Property {
	fn abi_read(reader: &mut AbiReader) -> Result<Property> {
		let size = if !Property::is_dynamic() {
			Some(<Property as AbiType>::size())
		} else {
			None
		};
		let mut subresult = reader.subresult(size)?;
		let key = <string>::abi_read(&mut subresult)?;
		let value = <bytes>::abi_read(&mut subresult)?;

		Ok(Property { key, value })
	}
}

impl AbiWrite for Property {
	fn abi_write(&self, writer: &mut AbiWriter) {
		(&self.key, &self.value).abi_write(writer);
	}
}

impl<T: AbiWrite + AbiType> AbiWrite for Vec<T> {
	fn abi_write(&self, writer: &mut AbiWriter) {
		let is_dynamic = T::is_dynamic();
		let mut sub = if is_dynamic {
			AbiWriter::new_dynamic(is_dynamic)
		} else {
			AbiWriter::new()
		};

		// Write items count
		(self.len() as u32).abi_write(&mut sub);

		for item in self {
			item.abi_write(&mut sub);
		}
		writer.write_subresult(sub);
	}
}

impl AbiWrite for () {
	fn abi_write(&self, _writer: &mut AbiWriter) {}
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

macro_rules! impl_tuples {
	($($ident:ident)+) => {
		impl<$($ident: AbiType,)+> AbiType for ($($ident,)+)
		where
        $(
            $ident: AbiType,
        )+
		{
            const SIGNATURE: SignatureUnit = make_signature!(
                new fixed("(")
                $(nameof(<$ident>::SIGNATURE) fixed(","))+
                shift_left(1)
                fixed(")")
            );
			const FIELDS_COUNT: usize = 0 $(+ {let _ = <$ident as AbiType>::FIELDS_COUNT; 1})+;

			fn is_dynamic() -> bool {
				false
				$(
					|| <$ident>::is_dynamic()
				)*
			}

			fn size() -> usize {
				0 $(+ <$ident>::size())+
			}
		}

		impl<$($ident),+> sealed::CanBePlacedInVec for ($($ident,)+) {}

		impl<$($ident),+> AbiRead for ($($ident,)+)
		where
			Self: AbiType,
			$($ident: AbiRead + AbiType,)+
		{
			fn abi_read(reader: &mut AbiReader) -> Result<($($ident,)+)> {
				let is_dynamic = <Self>::is_dynamic();
				let size = if !is_dynamic { Some(<Self>::size()) } else { None };
				let mut subresult = reader.subresult(size)?;
				Ok((
					$({
						let value = <$ident>::abi_read(&mut subresult)?;
						if !is_dynamic {subresult.bytes_read(<$ident as AbiType>::size())};
						value
					},)+
				))
			}
		}

		#[allow(non_snake_case)]
		impl<$($ident),+> AbiWrite for ($($ident,)+)
		where
			$($ident: AbiWrite + AbiType,)+
		{
			fn abi_write(&self, writer: &mut AbiWriter) {
				let ($($ident,)+) = self;
				if <Self as AbiType>::is_dynamic() {
					let mut sub = AbiWriter::new();
					$($ident.abi_write(&mut sub);)+
					writer.write_subresult(sub);
				} else {
					$($ident.abi_write(writer);)+
				}
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
