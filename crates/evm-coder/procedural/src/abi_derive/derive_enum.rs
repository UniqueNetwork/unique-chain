use quote::quote;

pub fn impl_solidity_option<'a>(
	name: &proc_macro2::Ident,
	enum_options: impl Iterator<Item = &'a syn::Ident>,
) -> proc_macro2::TokenStream {
	let enum_options = enum_options.map(|opt| {
		let s = name.to_string() + "." + opt.to_string().as_str();
		let as_string = proc_macro2::Literal::string(s.as_str());
		quote!(#name::#opt => #as_string,)
	});
	quote!(
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityEnum for #name {
			fn solidity_option(&self) -> &str {
				match self {
					#(#enum_options)*
				}
			}
		}
	)
}

pub fn impl_enum_from_u8<'a>(
	name: &proc_macro2::Ident,
	enum_options: impl Iterator<Item = &'a syn::Ident>,
) -> proc_macro2::TokenStream {
	let error_str = format!("Value not convertible into enum \"{name}\"");
	let error_str = proc_macro2::Literal::string(&error_str);
	let enum_options = enum_options.enumerate().map(|(i, opt)| {
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
				write!(writer, "{}", tc.collect_struct::<Self>())
			}

			fn is_simple() -> bool {
				true
			}

			fn solidity_default(
				writer: &mut impl ::core::fmt::Write,
				tc: &::evm_coder::solidity::TypeCollector,
			) -> ::core::fmt::Result {
				write!(writer, "{}", <#name as ::evm_coder::solidity::SolidityEnum>::solidity_option(&<#name>::default()))
			}
		}
	)
}

pub fn impl_enum_solidity_struct_collect<'a>(
	name: &syn::Ident,
	enum_options: impl Iterator<Item = &'a syn::Ident>,
	option_count: usize,
	enum_options_docs: impl Iterator<Item = syn::Result<Vec<proc_macro2::TokenStream>>>,
	docs: &[proc_macro2::TokenStream],
) -> proc_macro2::TokenStream {
	let string_name = name.to_string();
	let enum_options = enum_options
		.zip(enum_options_docs)
		.enumerate()
		.map(|(i, (opt, doc))| {
			let opt = proc_macro2::Literal::string(opt.to_string().as_str());
			let doc = doc.expect("Doc parsing error");
			let comma = if i != option_count - 1 { "," } else { "" };
			quote! {
				#(#doc)*
				writeln!(str, "\t{}{}", #opt, #comma).expect("Enum format option");
			}
		});

	quote!(
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::StructCollect for #name {
			fn name() -> String {
				#string_name.into()
			}

			fn declaration() -> String {
				use std::fmt::Write;

				let mut str = String::new();
				#(#docs)*
				writeln!(str, "enum {} {{", <Self as ::evm_coder::solidity::StructCollect>::name()).unwrap();
				#(#enum_options)*
				writeln!(str, "}}").unwrap();
				str
			}
		}
	)
}

pub fn check_and_count_options(de: &syn::DataEnum) -> syn::Result<usize> {
	let mut count = 0;
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
		} else {
			count += 1;
		}
	}

	Ok(count)
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
