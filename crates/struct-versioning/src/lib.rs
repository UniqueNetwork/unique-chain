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

#![doc = include_str!("../README.md")]

use proc_macro::TokenStream;
use quote::format_ident;
use syn::{
	parse::{Parse, ParseStream},
	Token, LitInt, parse_macro_input, ItemStruct, Error, Fields, Result, Field, Expr,
	parenthesized,
};
use quote::quote;

mod kw {
	syn::custom_keyword!(version);
	syn::custom_keyword!(first_version);
	syn::custom_keyword!(versions);
	syn::custom_keyword!(upper);
}

struct VersionedAttrs {
	current_version: u32,
	first_version: u32,
	upper: bool,
}

/// #[versioned(version = 2)]
impl Parse for VersionedAttrs {
	fn parse(input: ParseStream) -> Result<Self> {
		let mut current_version = None::<u32>;
		let mut first_version = None::<u32>;
		let mut upper = false;

		loop {
			if input.is_empty() {
				break;
			}
			let lookahead = input.lookahead1();
			if lookahead.peek(kw::version) {
				input.parse::<kw::version>()?;
				input.parse::<Token![=]>()?;
				let t = input.parse::<LitInt>()?;
				if current_version.is_some() {
					return Err(Error::new_spanned(t, "version is already set"));
				}
				current_version = Some(t.base10_parse()?)
			} else if lookahead.peek(kw::first_version) {
				input.parse::<kw::first_version>()?;
				input.parse::<Token![=]>()?;
				let t = input.parse::<LitInt>()?;
				if first_version.is_some() {
					return Err(Error::new_spanned(t, "first version is already set"));
				}
				first_version = Some(t.base10_parse()?)
			} else if lookahead.peek(kw::upper) {
				input.parse::<kw::upper>()?;
				upper = true;
			} else {
				return Err(lookahead.error());
			}

			if input.is_empty() {
				break;
			} else if input.peek(Token![,]) {
				input.parse::<Token![,]>()?;
				continue;
			} else {
				return Err(input.error("unexpected token"));
			}
		}
		let first_version = first_version.unwrap_or(1);
		let current_version = current_version.unwrap_or(first_version);

		if current_version == 0 || first_version == 0 || first_version > current_version {
			return Err(Error::new(input.span(), "1 <= first_version <= version"));
		}

		Ok(Self {
			current_version,
			first_version,
			upper,
		})
	}
}

/// #[version(..3)] - field vas removed in version 3 (i.e it was exist on version 2, but doesn't on version 3)
/// #[version(3..)] - field has appeared in version 3
/// #[version(2..4)] - field was on versions 2, 3
/// #[version(1..2, upper(old_field + 1))] - when updating struct from old version to new - calculate new field value from passed expression
struct VersionAttr {
	since: u32,
	before: Option<u32>,

	upper: Option<Expr>,
}
impl VersionAttr {
	fn exists_on(&self, version: u32) -> bool {
		version >= self.since && self.before.map_or(true, |before| version < before)
	}
}
impl Parse for VersionAttr {
	fn parse(input: ParseStream) -> Result<Self> {
		let mut since = None::<u32>;
		let mut before = None::<u32>;
		let lookahead = input.lookahead1();

		if lookahead.peek(LitInt) {
			let t: LitInt = input.parse()?;
			since = Some(t.base10_parse()?);
		} else if !lookahead.peek(Token![..]) {
			return Err(lookahead.error());
		}
		let range = input.parse::<Token![..]>()?;
		let lookahead = input.lookahead1();
		if lookahead.peek(LitInt) {
			let t: LitInt = input.parse()?;
			before = Some(t.base10_parse()?);
		} else if !input.is_empty() && !lookahead.peek(Token![,]) {
			return Err(lookahead.error());
		}

		let upper = if input.peek(Token![,]) {
			input.parse::<Token![,]>()?;
			input.parse::<kw::upper>()?;
			let expr;
			parenthesized!(expr in input);

			Some(Expr::parse(&expr)?)
		} else {
			None
		};

		if since.is_none() && before.is_none() {
			return Err(Error::new_spanned(
				range,
				"noop range, remove this version attribute",
			));
		}
		Ok(Self {
			since: since.unwrap_or(1),
			before,
			upper,
		})
	}
}
impl Default for VersionAttr {
	fn default() -> Self {
		Self {
			since: 1,
			before: None,
			upper: None,
		}
	}
}

/// Generate versioned variants of a struct
///
/// `#[versioned(version = 1[, first_version = 1][, upper][, versions])]`
/// - *version* - current version of a struct
/// - *first_version* - allows to skip generation of structs, which predates first supported version
/// - *upper* - generate From impls, which converts old version of structs to new
/// - *versions* - generate enum, which contains all possible versions of struct
///
/// Each field may have version attribute
/// `#[version([1]..[2][, upper(old)])]`
/// - *1* - version, on which this field is appeared
/// - *2* - version, in which this field was removed
/// (i.e if set to 2, this field was exist on version 1, and no longer exist on version 2)
/// - *upper* - code, which should be executed to transform old value to new/create new value
#[proc_macro_attribute]
pub fn versioned(attr: TokenStream, input: TokenStream) -> TokenStream {
	let attr = parse_macro_input!(attr as VersionedAttrs);
	let input = parse_macro_input!(input as ItemStruct);

	let fields = match input.fields {
		Fields::Named(named) => named.named,
		_ => {
			return Error::new_spanned(input, "expected named fields")
				.into_compile_error()
				.into()
		}
	};
	let fields = fields
		.iter()
		.map(|field| {
			let version_attr = match field.attrs.iter().find(|a| a.path.is_ident("version")) {
				Some(v) => v.parse_args::<VersionAttr>()?,
				None => return Ok((VersionAttr::default(), field.clone())),
			};
			let mut field = field.clone();
			field.attrs.retain(|a| !a.path.is_ident("version"));
			Ok((version_attr, field))
		})
		.collect::<Result<Vec<(VersionAttr, Field)>>>();
	let fields = match fields {
		Ok(f) => f,
		Err(e) => return e.into_compile_error().into(),
	};

	let attrs = input.attrs;
	let vis = input.vis;
	let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();
	let mut out = Vec::new();
	for version in attr.first_version..=attr.current_version {
		let name = if version == attr.current_version {
			input.ident.clone()
		} else {
			format_ident!("{}Version{}", &input.ident, version)
		};
		let current_fields = fields
			.iter()
			.filter_map(|(ver, field)| ver.exists_on(version).then(|| field));

		let mut doc = Vec::new();
		if version > attr.first_version {
			doc.push(" # Versioning".into());
			doc.push(format!(" Changes between {} and {}:", version - 1, version));
			for (ver, field) in fields.iter() {
				match (ver.exists_on(version - 1), ver.exists_on(version)) {
					(true, false) => {
						let ty = &field.ty;
						doc.push(format!(
							" - {}: {} was removed",
							field.ident.as_ref().unwrap(),
							quote! {#ty}
						))
					}
					(false, true) => {
						let ty = &field.ty;
						doc.push(format!(
							" - [`{}`]: {} was added",
							field.ident.as_ref().unwrap(),
							quote! {#ty}
						))
					}
					_ => {}
				}
			}
		}

		let upper = if attr.upper && version > attr.first_version {
			let prev_version = format_ident!("{}Version{}", &input.ident, version - 1);
			let removed_fields = fields
				.iter()
				.filter(|(v, _)| v.exists_on(version - 1) && !v.exists_on(version))
				.map(|(_, f)| f.ident.as_ref().unwrap())
				.collect::<Vec<_>>();
			let added_fields = fields
				.iter()
				.filter(|(v, _)| !v.exists_on(version - 1) && v.exists_on(version))
				.map(|(v, f)| {
					let name = f.ident.as_ref().unwrap();
					let value = v.upper.clone().unwrap_or_else(|| {
						Expr::Verbatim(
							Error::new_spanned(f, "missing upper declaration").to_compile_error(),
						)
					});
					quote! { #name: #value }
				});
			let passed_fields = fields
				.iter()
				.filter(|(v, _)| v.exists_on(version - 1) && v.exists_on(version))
				.map(|(_, f)| f.ident.as_ref().unwrap())
				.collect::<Vec<_>>();
			// let added_fields = fields;
			quote! {
				impl #impl_generics From<#prev_version #ty_generics> for #name #ty_generics #where_clause {
					fn from(old: #prev_version #ty_generics) -> Self {
						let #prev_version {
							#(#removed_fields,)*
							#(#passed_fields,)*
						} = old;
						#(let _ = &#removed_fields;)*
						Self {
							#(#added_fields,)*
							#(#passed_fields,)*
						}
					}
				}
			}
		} else {
			quote! {}
		};

		out.push(quote! {
			#(#attrs)*
			#(#[doc = #doc])*
			#vis struct #name #impl_generics #where_clause {
				#(#current_fields,)*
			}

			#upper
		});
	}

	let ident = &input.ident;
	let last_version = format_ident!("{}Version{}", input.ident, attr.current_version);

	quote! {
		#(#out)*

		#vis type #last_version #ty_generics = #ident #ty_generics;
	}
	.into()
}
