use super::{TypeCollector, SolidityTypeName, SolidityTupleTy};
use crate::{sealed, types::*};
use core::fmt;
use primitive_types::{U256, H160};

macro_rules! solidity_type_name {
    ($($ty:ty => $name:literal $simple:literal = $default:literal),* $(,)?) => {
        $(
            impl SolidityTypeName for $ty {
                fn solidity_name(writer: &mut impl core::fmt::Write, _tc: &TypeCollector) -> core::fmt::Result {
                    write!(writer, $name)
                }
				fn is_simple() -> bool {
					$simple
				}
				fn solidity_default(writer: &mut impl core::fmt::Write, _tc: &TypeCollector) -> core::fmt::Result {
					write!(writer, $default)
				}
            }
        )*
    };
}

solidity_type_name! {
	u8 => "uint8" true = "0",
	u32 => "uint32" true = "0",
	u64 => "uint64" true = "0",
	u128 => "uint128" true = "0",
	U256 => "uint256" true = "0",
	bytes4 => "bytes4" true = "bytes4(0)",
	H160 => "address" true = "0x0000000000000000000000000000000000000000",
	string => "string" false = "\"\"",
	bytes => "bytes" false = "hex\"\"",
	bool => "bool" true = "false",
}

impl SolidityTypeName for void {
	fn solidity_name(_writer: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		Ok(())
	}
	fn is_simple() -> bool {
		true
	}
	fn solidity_default(_writer: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		Ok(())
	}
	fn is_void() -> bool {
		true
	}
}

impl<T: SolidityTypeName + sealed::CanBePlacedInVec> SolidityTypeName for Vec<T> {
	fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		T::solidity_name(writer, tc)?;
		write!(writer, "[]")
	}
	fn is_simple() -> bool {
		false
	}
	fn solidity_default(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		write!(writer, "new ")?;
		T::solidity_name(writer, tc)?;
		write!(writer, "[](0)")
	}
}

macro_rules! count {
    () => (0usize);
    ( $x:tt $($xs:tt)* ) => (1usize + count!($($xs)*));
}

macro_rules! impl_tuples {
	($($ident:ident)+) => {
		impl<$($ident: SolidityTypeName + 'static),+> SolidityTupleTy for ($($ident,)+) {
			fn fields(tc: &TypeCollector) -> Vec<string> {
				let mut collected = Vec::with_capacity(Self::len());
				$({
					let mut out = string::new();
					$ident::solidity_name(&mut out, tc).expect("no fmt error");
					collected.push(out);
				})*;
				collected
			}

			fn len() -> usize {
				count!($($ident)*)
			}
		}
		impl<$($ident: SolidityTypeName + 'static),+> SolidityTypeName for ($($ident,)+) {
			fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
				write!(writer, "{}", tc.collect_tuple::<Self>())
			}
			fn is_simple() -> bool {
				false
			}
			#[allow(unused_assignments)]
			fn solidity_default(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
				write!(writer, "{}(", tc.collect_tuple::<Self>())?;
				let mut first = true;
				$(
					if !first {
						write!(writer, ",")?;
					} else {
						first = false;
					}
					<$ident>::solidity_default(writer, tc)?;
				)*
				write!(writer, ")")
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

//----- impls for Option -----
impl<T: SolidityTypeName + 'static> SolidityTypeName for Option<T> {
	fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		write!(writer, "{}", tc.collect_struct::<Self>())
	}
	fn is_simple() -> bool {
		false
	}
	fn solidity_default(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		write!(writer, "{}(", tc.collect_struct::<Self>())?;
		bool::solidity_default(writer, tc)?;
		write!(writer, ", ");
		T::solidity_default(writer, tc)?;
		write!(writer, ")")
	}
}

impl<T: SolidityTypeName> super::SolidityStructTy for Option<T> {
	fn generate_solidity_interface(tc: &TypeCollector) -> String {
		const option_name: &str = "Option";
		const option_name_len: usize = option_name.len();

		let to_upper_case_generic_type_name = |s: &mut String| {
			let c = s
				.chars()
				.skip(option_name_len)
				.next()
				.expect("Ethereum name must be presented");
			if c.is_ascii_uppercase() {
				return;
			}
			let uc = String::from(c.to_ascii_uppercase());
			s.replace_range(option_name_len..option_name_len + 1, uc.as_str());
		};

		let mut solidity_name = option_name.to_string();
		T::solidity_name(&mut solidity_name, tc);
		to_upper_case_generic_type_name(&mut solidity_name);

		let interface = super::SolidityStruct {
			docs: &[" Optional value"],
			name: solidity_name.as_str(),
			fields: (
				super::SolidityStructField::<bool> {
					docs: &[" Shows the status of accessibility of value"],
					name: "status",
					ty: ::core::marker::PhantomData,
				},
				super::SolidityStructField::<T> {
					docs: &[" Actual value if `status` is true"],
					name: "value",
					ty: ::core::marker::PhantomData,
				},
			),
		};

		let mut out = String::new();
		let _ = interface.format(&mut out, tc);
		tc.collect(out);

		solidity_name.to_string()
	}
}
