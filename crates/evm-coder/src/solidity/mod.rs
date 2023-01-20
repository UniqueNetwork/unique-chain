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

mod traits;
pub use traits::*;
mod impls;

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
use crate::{types::*, custom_signature::SignatureUnit};

#[derive(Default)]
pub struct TypeCollector {
	/// Code => id
	/// id ordering is required to perform topo-sort on the resulting data
	structs: RefCell<BTreeMap<string, usize>>,
	anonymous: RefCell<BTreeMap<Vec<string>, usize>>,
	// generic: RefCell<BTreeMap<string, usize>>,
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
	/// Collect typle, deduplicating it by type, and returning generated name
	pub fn collect_tuple<T: SolidityTupleTy>(&self) -> String {
		let names = T::fields(self);
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
	pub fn collect_struct<T: SolidityStructTy>(&self) -> String {
		T::generate_solidity_interface(self)
	}
	pub fn collect_enum<T: SolidityEnumTy>(&self) -> String {
		T::generate_solidity_interface(self)
	}
	pub fn finish(self) -> Vec<string> {
		let mut data = self.structs.into_inner().into_iter().collect::<Vec<_>>();
		data.sort_by_key(|(_, id)| Reverse(*id));
		data.into_iter().map(|(code, _)| code).collect()
	}
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
	fn solidity_get(&self, _prefix: &str, _writer: &mut impl fmt::Write) -> fmt::Result {
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
	fn solidity_get(&self, prefix: &str, writer: &mut impl fmt::Write) -> fmt::Result {
		writeln!(writer, "\t{prefix}\t{};", self.0)
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
	fn solidity_get(&self, prefix: &str, writer: &mut impl fmt::Write) -> fmt::Result {
		writeln!(writer, "\t{prefix}\t{};", self.1)
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
	fn solidity_get(&self, _prefix: &str, _writer: &mut impl fmt::Write) -> fmt::Result {
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
	fn solidity_get(&self, prefix: &str, writer: &mut impl fmt::Write) -> fmt::Result {
		for_tuples!( #(
            Tuple.solidity_get(prefix, writer)?;
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

pub enum SolidityMutability {
	Pure,
	View,
	Mutable,
}
pub struct SolidityFunction<A, R> {
	pub docs: &'static [&'static str],
	pub selector: u32,
	pub hide: bool,
	pub custom_signature: SignatureUnit,
	pub name: &'static str,
	pub args: A,
	pub result: R,
	pub mutability: SolidityMutability,
	pub is_payable: bool,
}
impl<A: SolidityArguments, R: SolidityArguments> SolidityFunctions for SolidityFunction<A, R> {
	fn solidity_name(
		&self,
		is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result {
		let hide_comment = self.hide.then_some("// ").unwrap_or("");
		for doc in self.docs {
			writeln!(writer, "\t{hide_comment}///{}", doc)?;
		}
		writeln!(
			writer,
			"\t{hide_comment}/// @dev EVM selector for this function is: 0x{:0>8x},",
			self.selector
		)?;
		writeln!(
			writer,
			"\t{hide_comment}///  or in textual repr: {}",
			self.custom_signature.as_str().expect("bad utf-8")
		)?;
		write!(writer, "\t{hide_comment}function {}(", self.name)?;
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
		if self.is_payable {
			write!(writer, " payable")?;
		}
		if !self.result.is_empty() {
			write!(writer, " returns (")?;
			self.result.solidity_name(writer, tc)?;
			write!(writer, ")")?;
		}
		if is_impl {
			writeln!(writer, " {{")?;
			writeln!(writer, "\t{hide_comment}\trequire(false, stub_error);")?;
			self.args.solidity_get(hide_comment, writer)?;
			match &self.mutability {
				SolidityMutability::Pure => {}
				SolidityMutability::View => writeln!(writer, "\t{hide_comment}\tdummy;")?,
				SolidityMutability::Mutable => writeln!(writer, "\t{hide_comment}\tdummy = 0;")?,
			}
			if !self.result.is_empty() {
				write!(writer, "\t{hide_comment}\treturn ")?;
				self.result.solidity_default(writer, tc)?;
				writeln!(writer, ";")?;
			}
			writeln!(writer, "\t{hide_comment}}}")?;
		} else {
			writeln!(writer, ";")?;
		}
		if self.hide {
			writeln!(writer, "// FORMATTING: FORCE NEWLINE")?;
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

#[impl_for_tuples(0, 48)]
impl SolidityItems for Tuple {
	for_tuples!( where #( Tuple: SolidityItems ),* );

	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		for_tuples!( #(
            Tuple.solidity_name(writer, tc)?;
        )* );
		Ok(())
	}
}

pub struct SolidityStructField<T> {
	pub docs: &'static [&'static str],
	pub name: &'static str,
	pub ty: PhantomData<*const T>,
}

impl<T> SolidityItems for SolidityStructField<T>
where
	T: SolidityTypeName,
{
	fn solidity_name(&self, out: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		for doc in self.docs {
			writeln!(out, "///{}", doc)?;
		}
		write!(out, "\t")?;
		T::solidity_name(out, tc)?;
		writeln!(out, " {};", self.name)?;
		Ok(())
	}
}
pub struct SolidityStruct<'a, F> {
	pub docs: &'a [&'a str],
	// pub generics:
	pub name: &'a str,
	pub fields: F,
}
impl<F> SolidityStruct<'_, F>
where
	F: SolidityItems,
{
	pub fn format(&self, out: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		for doc in self.docs {
			writeln!(out, "///{}", doc)?;
		}
		writeln!(out, "struct {} {{", self.name)?;
		self.fields.solidity_name(out, tc)?;
		writeln!(out, "}}")?;
		Ok(())
	}
}

pub struct SolidityEnumVariant {
	pub docs: &'static [&'static str],
	pub name: &'static str,
}
impl SolidityItems for SolidityEnumVariant {
	fn solidity_name(&self, out: &mut impl fmt::Write, _tc: &TypeCollector) -> fmt::Result {
		for doc in self.docs {
			writeln!(out, "///{}", doc)?;
		}
		write!(out, "\t{}", self.name)?;
		Ok(())
	}
}
pub struct SolidityEnum {
	pub docs: &'static [&'static str],
	pub name: &'static str,
	pub fields: &'static [SolidityEnumVariant],
}
impl SolidityEnum {
	pub fn format(&self, out: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result {
		for doc in self.docs {
			writeln!(out, "///{}", doc)?;
		}
		write!(out, "enum {} {{", self.name)?;
		for (i, field) in self.fields.iter().enumerate() {
			if i != 0 {
				write!(out, ",")?;
			}
			writeln!(out)?;
			field.solidity_name(out, tc)?;
		}
		writeln!(out)?;
		writeln!(out, "}}")?;
		Ok(())
	}
}
