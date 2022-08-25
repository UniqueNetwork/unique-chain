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

//! Implementation detail of [`crate::solidity_interface`] macro code-generation.
//! You should not rely on any public item from this module, as it is only intended to be used
//! by procedural macro, API and output format may be changed at any time.
//!
//! Purpose of this module is to receive solidity contract definition in module-specified
//! format, and then output string, representing interface of this contract in solidity language

#[cfg(not(feature = "std"))]
use alloc::{string::String, vec::Vec, collections::BTreeMap, format};
#[cfg(feature = "std")]
use std::collections::BTreeMap;
use core::{
	fmt::{self, Write},
	marker::PhantomData,
	cell::{Cell, RefCell},
	cmp::Reverse,
};
use impl_trait_for_tuples::impl_for_tuples;
use crate::types::*;

#[derive(Default)]
pub struct TypeCollector {
	/// Code => id
	/// id ordering is required to perform topo-sort on the resulting data
	structs: RefCell<BTreeMap<string, usize>>,
	anonymous: RefCell<BTreeMap<Vec<string>, usize>>,
	id: Cell<usize>,
}
impl TypeCollector {
	pub fn new() -> Self {
		Self::default()
	}
	pub fn collect(&self, item: string) {
		let id = self.next_id();
		self.structs.borrow_mut().insert(item, id);
	}
	pub fn next_id(&self) -> usize {
		let v = self.id.get();
		self.id.set(v + 1);
		v
	}
	pub fn collect_tuple<T: SolidityTupleType>(&self) -> String {
		let names = T::names(self);
		if let Some(id) = self.anonymous.borrow().get(&names).cloned() {
			return format!("Tuple{}", id);
		}
		let id = self.next_id();
		let mut str = String::new();
		writeln!(str, "/// @dev anonymous struct").unwrap();
		writeln!(str, "struct Tuple{} {{", id).unwrap();
		for (i, name) in names.iter().enumerate() {
			writeln!(str, "\t{} field_{};", name, i).unwrap();
		}
		writeln!(str, "}}").unwrap();
		self.collect(str);
		self.anonymous.borrow_mut().insert(names, id);
		format!("Tuple{}", id)
	}
	pub fn finish(self) -> Vec<string> {
		let mut data = self.structs.into_inner().into_iter().collect::<Vec<_>>();
		data.sort_by_key(|(_, id)| Reverse(*id));
		data.into_iter().map(|(code, _)| code).collect()
	}
}

pub trait SolidityTypeName: 'static {
	fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	/// "simple" types are stored inline, no `memory` modifier should be used in solidity
	fn is_simple() -> bool;
	fn solidity_default(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	/// Specialization
	fn is_void() -> bool {
		false
	}
}
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
	uint8 => "uint8" true = "0",
	uint32 => "uint32" true = "0",
	uint64 => "uint64" true = "0",
	uint128 => "uint128" true = "0",
	uint256 => "uint256" true = "0",
	bytes4 => "bytes4" true = "bytes4(0)",
	address => "address" true = "0x0000000000000000000000000000000000000000",
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

mod sealed {
	/// Not every type should be directly placed in vec.
	/// Vec encoding is not memory efficient, as every item will be padded
	/// to 32 bytes.
	/// Instead you should use specialized types (`bytes` in case of `Vec<u8>`)
	pub trait CanBePlacedInVec {}
}

impl sealed::CanBePlacedInVec for uint256 {}
impl sealed::CanBePlacedInVec for string {}
impl sealed::CanBePlacedInVec for address {}

impl<T: SolidityTypeName + sealed::CanBePlacedInVec> SolidityTypeName for Vec<T> {
	fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		T::solidity_name(writer, tc)?;
		write!(writer, "[]")
	}
	fn is_simple() -> bool {
		false
	}
	fn solidity_default(writer: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		write!(writer, "[]")
	}
}

pub trait SolidityTupleType {
	fn names(tc: &TypeCollector) -> Vec<String>;
	fn len() -> usize;
}

macro_rules! count {
    () => (0usize);
    ( $x:tt $($xs:tt)* ) => (1usize + count!($($xs)*));
}

macro_rules! impl_tuples {
	($($ident:ident)+) => {
		impl<$($ident),+> sealed::CanBePlacedInVec for ($($ident,)+) {}
		impl<$($ident: SolidityTypeName + 'static),+> SolidityTupleType for ($($ident,)+) {
			fn names(tc: &TypeCollector) -> Vec<string> {
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

pub trait SolidityArguments {
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result;
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	fn is_empty(&self) -> bool {
		self.len() == 0
	}
	fn len(&self) -> usize;
}

#[derive(Default)]
pub struct UnnamedArgument<T>(PhantomData<*const T>);

impl<T: SolidityTypeName> SolidityArguments for UnnamedArgument<T> {
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		if !T::is_void() {
			T::solidity_name(writer, tc)?;
			if !T::is_simple() {
				write!(writer, " memory")?;
			}
			Ok(())
		} else {
			Ok(())
		}
	}
	fn solidity_get(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		T::solidity_default(writer, tc)
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
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		if !T::is_void() {
			T::solidity_name(writer, tc)?;
			if !T::is_simple() {
				write!(writer, " memory")?;
			}
			write!(writer, " {}", self.0)
		} else {
			Ok(())
		}
	}
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		writeln!(writer, "\t\t{};", self.0)
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		T::solidity_default(writer, tc)
	}
	fn len(&self) -> usize {
		if T::is_void() {
			0
		} else {
			1
		}
	}
}

pub struct SolidityEventArgument<T>(pub bool, &'static str, PhantomData<*const T>);

impl<T> SolidityEventArgument<T> {
	pub fn new(indexed: bool, name: &'static str) -> Self {
		Self(indexed, name, Default::default())
	}
}

impl<T: SolidityTypeName> SolidityArguments for SolidityEventArgument<T> {
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		if !T::is_void() {
			T::solidity_name(writer, tc)?;
			if self.0 {
				write!(writer, " indexed")?;
			}
			write!(writer, " {}", self.1)
		} else {
			Ok(())
		}
	}
	fn solidity_get(&self, writer: &mut impl fmt::Write) -> fmt::Result {
		writeln!(writer, "\t\t{};", self.1)
	}
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		T::solidity_default(writer, tc)
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
	fn solidity_name(&self, _writer: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		Ok(())
	}
	fn solidity_get(&self, _writer: &mut impl fmt::Write) -> fmt::Result {
		Ok(())
	}
	fn solidity_default(&self, _writer: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		Ok(())
	}
	fn len(&self) -> usize {
		0
	}
}

#[impl_for_tuples(1, 12)]
impl SolidityArguments for Tuple {
	for_tuples!( where #( Tuple: SolidityArguments ),* );

	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		let mut first = true;
		for_tuples!( #(
            if !Tuple.is_empty() {
                if !first {
                    write!(writer, ", ")?;
                }
                first = false;
                Tuple.solidity_name(writer, tc)?;
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
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		if self.is_empty() {
			Ok(())
		} else if self.len() == 1 {
			for_tuples!( #(
				Tuple.solidity_default(writer, tc)?;
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
					Tuple.solidity_default(writer, tc)?;
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
	fn solidity_name(
		&self,
		is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result;
}

pub enum SolidityMutability {
	Pure,
	View,
	Mutable,
}
pub struct SolidityFunction<A, R> {
	pub docs: &'static [&'static str],
	pub selector_str: &'static str,
	pub selector: u32,
	pub name: &'static str,
	pub args: A,
	pub result: R,
	pub mutability: SolidityMutability,
}
impl<A: SolidityArguments, R: SolidityArguments> SolidityFunctions for SolidityFunction<A, R> {
	fn solidity_name(
		&self,
		is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result {
		for doc in self.docs {
			writeln!(writer, "\t///{}", doc)?;
		}
		writeln!(
			writer,
			"\t/// @dev EVM selector for this function is: 0x{:0>8x},",
			self.selector
		)?;
		writeln!(writer, "\t///  or in textual repr: {}", self.selector_str)?;
		write!(writer, "\tfunction {}(", self.name)?;
		self.args.solidity_name(writer, tc)?;
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
			self.result.solidity_name(writer, tc)?;
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
				self.result.solidity_default(writer, tc)?;
				writeln!(writer, ";")?;
			}
			writeln!(writer, "\t}}")?;
		} else {
			writeln!(writer, ";")?;
		}
		Ok(())
	}
}

#[impl_for_tuples(0, 48)]
impl SolidityFunctions for Tuple {
	for_tuples!( where #( Tuple: SolidityFunctions ),* );

	fn solidity_name(
		&self,
		is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result {
		let mut first = false;
		for_tuples!( #(
            Tuple.solidity_name(is_impl, writer, tc)?;
        )* );
		Ok(())
	}
}

pub struct SolidityInterface<F: SolidityFunctions> {
	pub docs: &'static [&'static str],
	pub selector: bytes4,
	pub name: &'static str,
	pub is: &'static [&'static str],
	pub functions: F,
}

impl<F: SolidityFunctions> SolidityInterface<F> {
	pub fn format(
		&self,
		is_impl: bool,
		out: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result {
		const ZERO_BYTES: [u8; 4] = [0; 4];
		for doc in self.docs {
			writeln!(out, "///{}", doc)?;
		}
		if self.selector != ZERO_BYTES {
			writeln!(
				out,
				"/// @dev the ERC-165 identifier for this interface is 0x{:0>8x}",
				u32::from_be_bytes(self.selector)
			)?;
		}
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
		self.functions.solidity_name(is_impl, out, tc)?;
		writeln!(out, "}}")?;
		Ok(())
	}
}

pub struct SolidityEvent<A> {
	pub name: &'static str,
	pub args: A,
}

impl<A: SolidityArguments> SolidityFunctions for SolidityEvent<A> {
	fn solidity_name(
		&self,
		_is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result {
		write!(writer, "\tevent {}(", self.name)?;
		self.args.solidity_name(writer, tc)?;
		writeln!(writer, ");")
	}
}
