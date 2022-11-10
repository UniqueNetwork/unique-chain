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

#![allow(dead_code)]

use inflector::cases;
use proc_macro::TokenStream;
use quote::quote;
use sha3::{Digest, Keccak256};
use syn::{
	DeriveInput, GenericArgument, Ident, ItemImpl, Pat, Path, PathArguments, PathSegment, Type,
	parse_macro_input, spanned::Spanned,
};

mod abi_derive;
mod solidity_interface;
mod to_log;

fn fn_selector_str(input: &str) -> u32 {
	let mut hasher = Keccak256::new();
	hasher.update(input.as_bytes());
	let result = hasher.finalize();

	let mut selector_bytes = [0; 4];
	selector_bytes.copy_from_slice(&result[0..4]);

	u32::from_be_bytes(selector_bytes)
}

/// Returns solidity function selector (first 4 bytes of hash) by its
/// textual representation
///
/// ```ignore
/// use evm_coder_macros::fn_selector;
///
/// assert_eq!(fn_selector!(transfer(address, uint256)), 0xa9059cbb);
/// ```
#[proc_macro]
pub fn fn_selector(input: TokenStream) -> TokenStream {
	let input = input.to_string().replace(' ', "");
	let selector = fn_selector_str(&input);

	(quote! {
		#selector
	})
	.into()
}

fn event_selector_str(input: &str) -> [u8; 32] {
	let mut hasher = Keccak256::new();
	hasher.update(input.as_bytes());
	let result = hasher.finalize();

	let mut selector_bytes = [0; 32];
	selector_bytes.copy_from_slice(&result[0..32]);
	selector_bytes
}

/// Returns solidity topic (hash) by its textual representation
///
/// ```ignore
/// use evm_coder_macros::event_topic;
///
/// assert_eq!(
///     format!("{:x}", event_topic!(Transfer(address, address, uint256))),
///     "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
/// );
/// ```
#[proc_macro]
pub fn event_topic(stream: TokenStream) -> TokenStream {
	let input = stream.to_string().replace(' ', "");
	let selector_bytes = event_selector_str(&input);

	(quote! {
		::primitive_types::H256([#(
			#selector_bytes,
		)*])
	})
	.into()
}

fn parse_path(ty: &Type) -> syn::Result<&Path> {
	match &ty {
		syn::Type::Path(pat) => {
			if let Some(qself) = &pat.qself {
				return Err(syn::Error::new(qself.ty.span(), "no receiver expected"));
			}
			Ok(&pat.path)
		}
		_ => Err(syn::Error::new(ty.span(), "expected ty to be path")),
	}
}

fn parse_path_segment(path: &Path) -> syn::Result<&PathSegment> {
	if path.segments.len() != 1 {
		return Err(syn::Error::new(
			path.span(),
			"expected path to have only one segment",
		));
	}
	let last_segment = &path.segments.last().unwrap();
	Ok(last_segment)
}

fn parse_ident_from_pat(pat: &Pat) -> syn::Result<&Ident> {
	match pat {
		Pat::Ident(i) => Ok(&i.ident),
		_ => Err(syn::Error::new(pat.span(), "expected pat ident")),
	}
}

fn parse_ident_from_segment(segment: &PathSegment, allow_generics: bool) -> syn::Result<&Ident> {
	if segment.arguments != PathArguments::None && !allow_generics {
		return Err(syn::Error::new(
			segment.arguments.span(),
			"unexpected generic type",
		));
	}
	Ok(&segment.ident)
}

fn parse_ident_from_path(path: &Path, allow_generics: bool) -> syn::Result<&Ident> {
	let segment = parse_path_segment(path)?;
	parse_ident_from_segment(segment, allow_generics)
}

fn parse_ident_from_type(ty: &Type, allow_generics: bool) -> syn::Result<&Ident> {
	let path = parse_path(ty)?;
	parse_ident_from_path(path, allow_generics)
}

// Gets T out of Result<T>
fn parse_result_ok(ty: &Type) -> syn::Result<&Type> {
	let path = parse_path(ty)?;
	let segment = parse_path_segment(path)?;

	if segment.ident != "Result" {
		return Err(syn::Error::new(
			ty.span(),
			"expected Result as return type (no renamed aliases allowed)",
		));
	}
	let args = match &segment.arguments {
		PathArguments::AngleBracketed(e) => e,
		_ => {
			return Err(syn::Error::new(
				segment.arguments.span(),
				"missing Result generics",
			))
		}
	};

	let args = &args.args;
	let arg = args.first().unwrap();

	let ty = match arg {
		GenericArgument::Type(ty) => ty,
		_ => {
			return Err(syn::Error::new(
				arg.span(),
				"expected first generic to be type",
			))
		}
	};

	Ok(ty)
}

fn pascal_ident_to_call(ident: &Ident) -> Ident {
	let name = format!("{}Call", ident);
	Ident::new(&name, ident.span())
}
fn snake_ident_to_pascal(ident: &Ident) -> Ident {
	let name = ident.to_string();
	let name = cases::pascalcase::to_pascal_case(&name);
	Ident::new(&name, ident.span())
}
fn snake_ident_to_screaming(ident: &Ident) -> Ident {
	let name = ident.to_string();
	let name = cases::screamingsnakecase::to_screaming_snake_case(&name);
	Ident::new(&name, ident.span())
}
fn pascal_ident_to_snake_call(ident: &Ident) -> Ident {
	let name = ident.to_string();
	let name = cases::snakecase::to_snake_case(&name);
	let name = format!("call_{}", name);
	Ident::new(&name, ident.span())
}

/// See documentation for this proc-macro reexported in `evm-coder` crate
#[proc_macro_attribute]
pub fn solidity_interface(args: TokenStream, stream: TokenStream) -> TokenStream {
	let args = parse_macro_input!(args as solidity_interface::InterfaceInfo);

	let input: ItemImpl = match syn::parse(stream) {
		Ok(t) => t,
		Err(e) => return e.to_compile_error().into(),
	};

	let expanded = match solidity_interface::SolidityInterface::try_from(args, &input) {
		Ok(v) => v.expand(),
		Err(e) => e.to_compile_error(),
	};

	(quote! {
		#input

		#expanded
	})
	.into()
}

#[proc_macro_attribute]
pub fn solidity(_args: TokenStream, stream: TokenStream) -> TokenStream {
	stream
}
#[proc_macro_attribute]
pub fn weight(_args: TokenStream, stream: TokenStream) -> TokenStream {
	stream
}

/// See documentation for this proc-macro reexported in `evm-coder` crate
#[proc_macro_derive(ToLog, attributes(indexed))]
pub fn to_log(value: TokenStream) -> TokenStream {
	let input = parse_macro_input!(value as DeriveInput);

	match to_log::Events::try_from(&input) {
		Ok(e) => e.expand(),
		Err(e) => e.to_compile_error(),
	}
	.into()
}

#[proc_macro_derive(AbiCoder)]
pub fn abi_derive(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
	let ast = syn::parse(input).unwrap();
	let ts = match abi_derive::impl_abi_macro(&ast) {
		Ok(e) => e,
		Err(e) => e.to_compile_error(),
	};
	// println!("{}", &ts);
	ts.into()
}
