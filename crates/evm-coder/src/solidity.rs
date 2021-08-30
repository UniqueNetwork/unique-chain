#[cfg(not(feature = "std"))]
use alloc::{string::String};
use core::{fmt, marker::PhantomData};
use impl_trait_for_tuples::impl_for_tuples;
use crate::types::*;

pub trait SolidityTypeName: 'static {
	fn solidity_name(writer: &mut impl fmt::Write) -> fmt::Result;
	fn solidity_default(writer: &mut impl fmt::Write) -> fmt::Result;
	fn is_void() -> bool {
		false
	}
}

macro_rules! solidity_type_name {
    ($($ty:ident => $name:literal = $default:literal),* $(,)?) => {
        $(
            impl SolidityTypeName for $ty {
                fn solidity_name(writer: &mut impl core::fmt::Write) -> core::fmt::Result {
                    write!(writer, $name)
                }
				fn solidity_default(writer: &mut impl core::fmt::Write) -> core::fmt::Result {
					write!(writer, $default)
				}
            }
        )*
    };
}

solidity_type_name! {
	uint8 => "uint8" = "0",
	uint32 => "uint32" = "0",
	uint128 => "uint128" = "0",
	uint256 => "uint256" = "0",
	address => "address" = "0x0000000000000000000000000000000000000000",
	string => "string memory" = "\"\"",
	bytes => "bytes memory" = "hex\"\"",
	bool => "bool" = "false",
}
impl SolidityTypeName for void {
	fn solidity_name(_writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_default(_writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn is_void() -> bool {
		true
	}
}

pub trait SolidityArguments {
	fn solidity_name(&self, writer: &mut impl fmt::Write) -> fmt::Result;
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result;
	fn solidity_default(&self, writer: &mut impl fmt::Write) -> fmt::Result;
	fn is_empty(&self) -> bool {
		self.len() == 0
	}
	fn len(&self) -> usize;
}

#[derive(Default)]
pub struct UnnamedArgument<T>(PhantomData<*const T>);

impl<T: SolidityTypeName> SolidityArguments for UnnamedArgument<T> {
	fn solidity_name(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		if !T::is_void() {
			T::solidity_name(writer)
		} else {
			Ok(())
		}
	}
	fn solidity_get(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		T::solidity_default(writer)
	}
	fn len(&self) -> usize {
		if T::is_void() {
			0
		} else {
			1
		}
	}
}

pub struct NamedArgument<T>(&'static str, PhantomData<*const T>);

impl<T> NamedArgument<T> {
	pub fn new(name: &'static str) -> Self {
		Self(name, Default::default())
	}
}

impl<T: SolidityTypeName> SolidityArguments for NamedArgument<T> {
	fn solidity_name(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		if !T::is_void() {
			T::solidity_name(writer)?;
			write!(writer, " {}", self.0)
		} else {
			Ok(())
		}
	}
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		writeln!(writer, "\t\t{};", self.0)
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		T::solidity_default(writer)
	}
	fn len(&self) -> usize {
		if T::is_void() {
			0
		} else {
			1
		}
	}
}

impl SolidityArguments for () {
	fn solidity_name(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_get(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_default(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn len(&self) -> usize {
		0
	}
}

#[impl_for_tuples(1, 5)]
impl SolidityArguments for Tuple {
	for_tuples!( where #( Tuple: SolidityArguments ),* );

	fn solidity_name(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		let mut first = true;
		for_tuples!( #(
            if !Tuple.is_empty() {
                if !first {
                    write!(writer, ", ")?;
                }
                first = false;
                Tuple.solidity_name(writer)?;
            }
        )* );
		Ok(())
	}
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		for_tuples!( #(
            Tuple.solidity_get(writer)?;
        )* );
		Ok(())
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		if self.is_empty() {
			Ok(())
		} else if self.len() == 1 {
			for_tuples!( #(
				Tuple.solidity_default(writer)?;
			)* );
			Ok(())
		} else {
			write!(writer, "(")?;
			let mut first = true;
			for_tuples!( #(
				if !Tuple.is_empty() {
					if !first {
						write!(writer, ", ")?;
					}
					first = false;
					Tuple.solidity_name(writer)?;
				}
			)* );
			write!(writer, ")")?;
			Ok(())
		}
	}
	fn len(&self) -> usize {
		for_tuples!( #( Tuple.len() )+* )
	}
}

pub trait SolidityFunctions {
	fn solidity_name(&self, is_impl: bool, writer: &mut impl fmt::Write) -> fmt::Result;
}

pub enum SolidityMutability {
	Pure,
	View,
	Mutable,
}
pub struct SolidityFunction<A, R> {
	pub name: &'static str,
	pub args: A,
	pub result: R,
	pub mutability: SolidityMutability,
}
impl<A: SolidityArguments, R: SolidityArguments> SolidityFunctions for SolidityFunction<A, R> {
	fn solidity_name(&self, is_impl: bool, writer: &mut impl fmt::Write) -> fmt::Result {
		write!(writer, "\tfunction {}(", self.name)?;
		self.args.solidity_name(writer)?;
		write!(writer, ")")?;
		if is_impl {
			write!(writer, " public")?;
		} else {
			write!(writer, " external")?;
		}
		match &self.mutability {
			SolidityMutability::Pure => write!(writer, " pure")?,
			SolidityMutability::View => write!(writer, " view")?,
			SolidityMutability::Mutable => {}
		}
		if !self.result.is_empty() {
			write!(writer, " returns (")?;
			self.result.solidity_name(writer)?;
			write!(writer, ")")?;
		}
		if is_impl {
			writeln!(writer, " {{")?;
			writeln!(writer, "\t\trequire(false, stub_error);")?;
			self.args.solidity_get(writer)?;
			match &self.mutability {
				SolidityMutability::Pure => {}
				SolidityMutability::View => writeln!(writer, "\t\tdummy;")?,
				SolidityMutability::Mutable => writeln!(writer, "\t\tdummy = 0;")?,
			}
			if !self.result.is_empty() {
				write!(writer, "\t\treturn ")?;
				self.result.solidity_default(writer)?;
				writeln!(writer, ";")?;
			}
			writeln!(writer, "\t}}")?;
		} else {
			writeln!(writer, ";")?;
		}
		Ok(())
	}
}

#[impl_for_tuples(0, 12)]
impl SolidityFunctions for Tuple {
	for_tuples!( where #( Tuple: SolidityFunctions ),* );

	fn solidity_name(&self, is_impl: bool, writer: &mut impl fmt::Write) -> fmt::Result {
		let mut first = false;
		for_tuples!( #(
            Tuple.solidity_name(is_impl, writer)?;
        )* );
		Ok(())
	}
}

pub struct SolidityInterface<F: SolidityFunctions> {
	pub name: &'static str,
	pub is: &'static [&'static str],
	pub functions: F,
}

impl<F: SolidityFunctions> SolidityInterface<F> {
	pub fn format(&self, is_impl: bool, out: &mut impl fmt::Write) -> fmt::Result {
		if is_impl {
			write!(out, "contract ")?;
		} else {
			write!(out, "interface ")?;
		}
		write!(out, "{}", self.name)?;
		if !self.is.is_empty() {
			write!(out, " is")?;
			for (i, n) in self.is.iter().enumerate() {
				if i != 0 {
					write!(out, ",")?;
				}
				write!(out, " {}", n)?;
			}
		}
		writeln!(out, " {{")?;
		self.functions.solidity_name(is_impl, out)?;
		writeln!(out, "}}")?;
		Ok(())
	}
}

pub struct SolidityEvent<A> {
	pub name: &'static str,
	pub args: A,
}

impl<A: SolidityArguments> SolidityFunctions for SolidityEvent<A> {
	fn solidity_name(&self, _is_impl: bool, writer: &mut impl fmt::Write) -> fmt::Result {
		write!(writer, "\tevent {}(", self.name)?;
		self.args.solidity_name(writer)?;
		writeln!(writer, ");")
	}
}
