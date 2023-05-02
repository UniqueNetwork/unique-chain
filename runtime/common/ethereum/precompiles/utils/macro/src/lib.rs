#![crate_type = "proc-macro"]
extern crate proc_macro;

use proc_macro::TokenStream;
use proc_macro2::Literal;
use quote::{quote, quote_spanned};
use sha3::{Digest, Keccak256};
use std::convert::TryInto;
use syn::{parse_macro_input, spanned::Spanned, Expr, ExprLit, Ident, ItemEnum, Lit};

/// This macro allows to associate to each variant of an enumeration a discriminant (of type u32
/// whose value corresponds to the first 4 bytes of the Hash Keccak256 of the character string
///indicated by the user of this macro.
///
/// Usage:
///
/// ```ignore
/// #[generate_function_selector]
/// enum Action {
/// 	Toto = "toto()",
/// 	Tata = "tata()",
/// }
/// ```
///
/// Extanded to:
///
/// ```rust
/// #[repr(u32)]
/// enum Action {
/// 	Toto = 119097542u32,
/// 	Tata = 1414311903u32,
/// }
/// ```
///
#[proc_macro_attribute]
pub fn generate_function_selector(_: TokenStream, input: TokenStream) -> TokenStream {
	let item = parse_macro_input!(input as ItemEnum);

	let ItemEnum {
		attrs,
		vis,
		enum_token,
		ident,
		variants,
		..
	} = item;

	let mut ident_expressions: Vec<Ident> = vec![];
	let mut variant_expressions: Vec<Expr> = vec![];
	for variant in variants {
		match variant.discriminant {
			Some((_, Expr::Lit(ExprLit { lit, .. }))) => {
				if let Lit::Str(lit_str) = lit {
					let selector = u32::from_be_bytes(
						Keccak256::digest(lit_str.value().as_ref())[..4]
							.try_into()
							.unwrap(),
					);
					ident_expressions.push(variant.ident);
					variant_expressions.push(Expr::Lit(ExprLit {
						lit: Lit::Verbatim(Literal::u32_suffixed(selector)),
						attrs: Default::default(),
					}));
				} else {
					return quote_spanned! {
						lit.span() => compile_error("Expected literal string");
					}
					.into();
				}
			}
			Some((_eg, expr)) => {
				return quote_spanned! {
					expr.span() => compile_error("Expected literal");
				}
				.into()
			}
			None => {
				return quote_spanned! {
					variant.span() => compile_error("Each variant must have a discriminant");
				}
				.into()
			}
		}
	}

	(quote! {
		#(#attrs)*
		#[derive(num_enum::TryFromPrimitive, num_enum::IntoPrimitive)]
		#[repr(u32)]
		#vis #enum_token #ident {
			#(
				#ident_expressions = #variant_expressions,
			)*
		}
	})
	.into()
}
