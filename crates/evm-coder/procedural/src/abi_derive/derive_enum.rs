use quote::quote;

use super::extract_docs;

pub fn impl_solidity_option<'a>(
	docs: Vec<String>,
	name: &proc_macro2::Ident,
	enum_options: impl Iterator<Item = &'a syn::Variant> + Clone,
) -> proc_macro2::TokenStream {
	let variant_names = enum_options.clone().map(|opt| {
		let opt = &opt.ident;
		let s = name.to_string() + "." + opt.to_string().as_str();
		let as_string = proc_macro2::Literal::string(s.as_str());
		quote!(#name::#opt => #as_string,)
	});
	let solidity_name = name.to_string();

	let solidity_fields = enum_options.map(|v| {
		let docs = extract_docs(&v.attrs).expect("TODO: handle bad docs");
		let name = v.ident.to_string();
		quote! {
			SolidityEnumVariant {
				docs: &[#(#docs),*],
				name: #name,
			}
		}
	});

	quote!(
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityEnumTy for #name {
			fn generate_solidity_interface(tc: &evm_coder::solidity::TypeCollector) -> String {
				use evm_coder::solidity::*;
				use core::fmt::Write;
				let interface = SolidityEnum {
					docs: &[#(#docs),*],
					name: #solidity_name,
					fields: &[#(
						#solidity_fields,
					)*],
				};
				let mut out = String::new();
				let _ = interface.format(&mut out, tc);
				tc.collect(out);
				#solidity_name.to_string()
			}
			fn solidity_option(&self) -> &str {
				match self {
					#(#variant_names)*
				}
			}
		}
	)
}

pub fn impl_enum_from_u8<'a>(
	name: &proc_macro2::Ident,
	enum_options: impl Iterator<Item = &'a syn::Variant>,
) -> proc_macro2::TokenStream {
	let error_str = format!("Value not convertible into enum \"{name}\"");
	let error_str = proc_macro2::Literal::string(&error_str);
	let enum_options = enum_options.enumerate().map(|(i, opt)| {
		let opt = &opt.ident;
		let n = proc_macro2::Literal::u8_suffixed(i as u8);
		quote! {#n => Ok(#name::#opt),}
	});

	quote!(
		impl TryFrom<u8> for #name {
			type Error = &'static str;

			fn try_from(value: u8) -> ::core::result::Result<Self, Self::Error> {
				const err: &'static str = #error_str;
				match value {
					#(#enum_options)*
					_ => Err(err)
				}
			}
		}
	)
}

pub fn impl_enum_abi_type(name: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::abi::AbiType for #name {
			const SIGNATURE: ::evm_coder::custom_signature::SignatureUnit = <u8 as ::evm_coder::abi::AbiType>::SIGNATURE;

			fn is_dynamic() -> bool {
				<u8 as ::evm_coder::abi::AbiType>::is_dynamic()
			}
			fn size() -> usize {
				<u8 as ::evm_coder::abi::AbiType>::size()
			}
		}
	}
}

pub fn impl_enum_abi_read(name: &syn::Ident) -> proc_macro2::TokenStream {
	quote!(
		impl ::evm_coder::abi::AbiRead for #name {
			fn abi_read(reader: &mut ::evm_coder::abi::AbiReader) -> ::evm_coder::execution::Result<Self> {
				Ok(
					<u8 as ::evm_coder::abi::AbiRead>::abi_read(reader)?
						.try_into()?
				)
			}
		}
	)
}

pub fn impl_enum_abi_write(name: &syn::Ident) -> proc_macro2::TokenStream {
	quote!(
		impl ::evm_coder::abi::AbiWrite for #name {
			fn abi_write(&self, writer: &mut ::evm_coder::abi::AbiWriter) {
				::evm_coder::abi::AbiWrite::abi_write(&(*self as u8), writer);
			}
		}
	)
}

pub fn impl_enum_solidity_type_name(name: &syn::Ident) -> proc_macro2::TokenStream {
	quote!(
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityTypeName for #name {
			fn solidity_name(
				writer: &mut impl ::core::fmt::Write,
				tc: &::evm_coder::solidity::TypeCollector,
			) -> ::core::fmt::Result {
				write!(writer, "{}", tc.collect_enum::<Self>())
			}

			fn is_simple() -> bool {
				true
			}

			fn solidity_default(
				writer: &mut impl ::core::fmt::Write,
				tc: &::evm_coder::solidity::TypeCollector,
			) -> ::core::fmt::Result {
				write!(writer, "{}", <#name as ::evm_coder::solidity::SolidityEnumTy>::solidity_option(&<#name>::default()))
			}
		}
	)
}

pub fn check_enum_fields(de: &syn::DataEnum) -> syn::Result<()> {
	for v in de.variants.iter() {
		if !v.fields.is_empty() {
			return Err(syn::Error::new(
				v.ident.span(),
				"Enumeration parameters should not have fields",
			));
		} else if v.discriminant.is_some() {
			return Err(syn::Error::new(
				v.ident.span(),
				"Enumeration options should not have an explicit specified value",
			));
		}
	}

	Ok(())
}

pub fn check_repr_u8(name: &syn::Ident, attrs: &[syn::Attribute]) -> syn::Result<()> {
	let mut has_repr = false;
	for attr in attrs.iter() {
		if attr.path.is_ident("repr") {
			has_repr = true;
			let meta = attr.parse_meta()?;
			check_meta_u8(&meta)?;
		}
	}

	if !has_repr {
		return Err(syn::Error::new(name.span(), "Enum is not \"repr(u8)\""));
	}

	Ok(())
}

fn check_meta_u8(meta: &syn::Meta) -> Result<(), syn::Error> {
	if let syn::Meta::List(p) = meta {
		for nm in p.nested.iter() {
			if let syn::NestedMeta::Meta(syn::Meta::Path(p)) = nm {
				if !p.is_ident("u8") {
					return Err(syn::Error::new(
						p.segments
							.first()
							.expect("repr segments are empty")
							.ident
							.span(),
						"Enum is not \"repr(u8)\"",
					));
				}
			}
		}
	}
	Ok(())
}
