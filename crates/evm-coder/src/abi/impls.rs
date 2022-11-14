use crate::{
	execution::{Result, ResultWithPostInfo, WithPostDispatchInfo},
	types::*,
	make_signature,
	custom_signature::SignatureUnit,
};
use super::{traits::*, ABI_ALIGNMENT, AbiReader, AbiWriter};
use primitive_types::{U256, H160};

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

macro_rules! impl_abi_readable {
	($ty:ty, $method:ident, $dynamic:literal) => {
		impl sealed::CanBePlacedInVec for $ty {}

		impl AbiType for $ty {
			const SIGNATURE: SignatureUnit = make_signature!(new fixed(stringify!($ty)));

			fn is_dynamic() -> bool {
				$dynamic
			}

			fn size() -> usize {
				ABI_ALIGNMENT
			}
		}

		impl AbiRead for $ty {
			fn abi_read(reader: &mut AbiReader) -> Result<$ty> {
				reader.$method()
			}
		}
	};
}

impl_abi_readable!(uint32, uint32, false);
impl_abi_readable!(uint64, uint64, false);
impl_abi_readable!(uint128, uint128, false);
impl_abi_readable!(uint256, uint256, false);
impl_abi_readable!(bytes4, bytes4, false);
impl_abi_readable!(address, address, false);
impl_abi_readable!(string, string, true);

impl sealed::CanBePlacedInVec for bool {}

impl AbiType for bool {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("bool"));

	fn is_dynamic() -> bool {
		false
	}
	fn size() -> usize {
		ABI_ALIGNMENT
	}
}
impl AbiRead for bool {
	fn abi_read(reader: &mut AbiReader) -> Result<bool> {
		reader.bool()
	}
}

impl AbiType for uint8 {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("uint8"));

	fn is_dynamic() -> bool {
		false
	}
	fn size() -> usize {
		ABI_ALIGNMENT
	}
}
impl AbiRead for uint8 {
	fn abi_read(reader: &mut AbiReader) -> Result<uint8> {
		reader.uint8()
	}
}

impl AbiType for bytes {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("bytes"));

	fn is_dynamic() -> bool {
		true
	}
	fn size() -> usize {
		ABI_ALIGNMENT
	}
}
impl AbiRead for bytes {
	fn abi_read(reader: &mut AbiReader) -> Result<bytes> {
		Ok(bytes(reader.bytes()?))
	}
}

impl<R: AbiRead + sealed::CanBePlacedInVec> AbiRead for Vec<R> {
	fn abi_read(reader: &mut AbiReader) -> Result<Vec<R>> {
		let mut sub = reader.subresult(None)?;
		let size = sub.uint32()? as usize;
		sub.subresult_offset = sub.offset;
		let mut out = Vec::with_capacity(size);
		for _ in 0..size {
			out.push(<R>::abi_read(&mut sub)?);
		}
		Ok(out)
	}
}

impl<R: AbiType> AbiType for Vec<R> {
	const SIGNATURE: SignatureUnit = make_signature!(new nameof(R::SIGNATURE) fixed("[]"));

	fn is_dynamic() -> bool {
		true
	}

	fn size() -> usize {
		ABI_ALIGNMENT
	}
}

impl sealed::CanBePlacedInVec for EthCrossAccount {}

impl AbiType for EthCrossAccount {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("(address,uint256)"));

	fn is_dynamic() -> bool {
		address::is_dynamic() || uint256::is_dynamic()
	}

	fn size() -> usize {
		<address as AbiType>::size() + <uint256 as AbiType>::size()
	}
}

impl AbiRead for EthCrossAccount {
	fn abi_read(reader: &mut AbiReader) -> Result<EthCrossAccount> {
		let size = if !EthCrossAccount::is_dynamic() {
			Some(<EthCrossAccount as AbiType>::size())
		} else {
			None
		};
		let mut subresult = reader.subresult(size)?;
		let eth = <address>::abi_read(&mut subresult)?;
		let sub = <uint256>::abi_read(&mut subresult)?;

		Ok(EthCrossAccount { eth, sub })
	}
}

impl AbiWrite for EthCrossAccount {
	fn abi_write(&self, writer: &mut AbiWriter) {
		self.eth.abi_write(writer);
		self.sub.abi_write(writer);
	}
}

impl sealed::CanBePlacedInVec for Property {}

impl AbiType for Property {
	const SIGNATURE: SignatureUnit = make_signature!(new fixed("(string,bytes)"));

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

impl AbiWrite for string {
	fn abi_write(&self, writer: &mut AbiWriter) {
		writer.string(self)
	}
}

impl AbiWrite for bytes {
	fn abi_write(&self, writer: &mut AbiWriter) {
		writer.bytes(self.0.as_slice())
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
			$($ident: AbiRead,)+
			($($ident,)+): AbiType,
		{
			fn abi_read(reader: &mut AbiReader) -> Result<($($ident,)+)> {
				let size = if !<($($ident,)+)>::is_dynamic() { Some(<($($ident,)+)>::size()) } else { None };
				let mut subresult = reader.subresult(size)?;
				Ok((
					$(<$ident>::abi_read(&mut subresult)?,)+
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
