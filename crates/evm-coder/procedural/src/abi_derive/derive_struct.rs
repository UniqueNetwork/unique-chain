use super::extract_docs;
use quote::quote;
use syn::Field;

pub fn tuple_type<'a>(
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let field_types = field_types.map(|ty| quote!(#ty,));
	quote! {(#(#field_types)*)}
}

pub fn tuple_ref_type<'a>(
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let field_types = field_types.map(|ty| quote!(&#ty,));
	quote! {(#(#field_types)*)}
}

pub fn tuple_data_as_ref(
	is_named_fields: bool,
	field_names: impl Iterator<Item = syn::Ident> + Clone,
) -> proc_macro2::TokenStream {
	let field_names = field_names.enumerate().map(|(i, field)| {
		if is_named_fields {
			quote!(&self.#field,)
		} else {
			let field = proc_macro2::Literal::usize_unsuffixed(i);
			quote!(&self.#field,)
		}
	});
	quote! {(#(#field_names)*)}
}

pub fn tuple_names(
	is_named_fields: bool,
	field_names: impl Iterator<Item = syn::Ident> + Clone,
) -> proc_macro2::TokenStream {
	let field_names = field_names.enumerate().map(|(i, field)| {
		if is_named_fields {
			quote!(#field,)
		} else {
			let field = proc_macro2::Ident::new(
				format!("field{}", i).as_str(),
				proc_macro2::Span::call_site(),
			);
			quote!(#field,)
		}
	});
	quote! {(#(#field_names)*)}
}

pub fn struct_from_tuple(
	name: &syn::Ident,
	is_named_fields: bool,
	field_names: impl Iterator<Item = syn::Ident> + Clone,
) -> proc_macro2::TokenStream {
	let field_names = field_names.enumerate().map(|(i, field)| {
		if is_named_fields {
			quote!(#field,)
		} else {
			let field = proc_macro2::Ident::new(
				format!("field{}", i).as_str(),
				proc_macro2::Span::call_site(),
			);
			quote!(#field,)
		}
	});

	if is_named_fields {
		quote! {#name {#(#field_names)*}}
	} else {
		quote! {#name (#(#field_names)*)}
	}
}

pub fn map_field_to_name(field: (usize, &syn::Field)) -> syn::Ident {
	match field.1.ident.as_ref() {
		Some(name) => name.clone(),
		None => {
			let mut name = "field".to_string();
			name.push_str(field.0.to_string().as_str());
			syn::Ident::new(name.as_str(), proc_macro2::Span::call_site())
		}
	}
}

pub fn map_field_to_type(field: &syn::Field) -> &syn::Type {
	&field.ty
}

pub fn impl_can_be_placed_in_vec(ident: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::sealed::CanBePlacedInVec for #ident {}
	}
}

pub fn impl_struct_abi_type(
	name: &syn::Ident,
	tuple_type: proc_macro2::TokenStream,
) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::abi::AbiType for #name {
			const SIGNATURE: ::evm_coder::custom_signature::SignatureUnit = <#tuple_type as ::evm_coder::abi::AbiType>::SIGNATURE;
			fn is_dynamic() -> bool {
				<#tuple_type as ::evm_coder::abi::AbiType>::is_dynamic()
			}
			fn size() -> usize {
				<#tuple_type as ::evm_coder::abi::AbiType>::size()
			}
		}
	}
}

pub fn impl_struct_abi_read(
	name: &syn::Ident,
	tuple_type: proc_macro2::TokenStream,
	tuple_names: proc_macro2::TokenStream,
	struct_from_tuple: proc_macro2::TokenStream,
) -> proc_macro2::TokenStream {
	quote!(
		impl ::evm_coder::abi::AbiRead for #name {
			fn abi_read(reader: &mut ::evm_coder::abi::AbiReader) -> ::evm_coder::execution::Result<Self> {
				let #tuple_names = <#tuple_type as ::evm_coder::abi::AbiRead>::abi_read(reader)?;
				Ok(#struct_from_tuple)
			}
		}
	)
}

pub fn impl_struct_abi_write(
	name: &syn::Ident,
	_is_named_fields: bool,
	tuple_type: proc_macro2::TokenStream,
	tuple_data: proc_macro2::TokenStream,
) -> proc_macro2::TokenStream {
	quote!(
		impl ::evm_coder::abi::AbiWrite for #name {
			fn abi_write(&self, writer: &mut ::evm_coder::abi::AbiWriter) {
				<#tuple_type as ::evm_coder::abi::AbiWrite>::abi_write(&#tuple_data, writer)
			}
		}
	)
}

pub fn impl_struct_solidity_type<'a>(
	name: &syn::Ident,
	docs: Vec<String>,
	fields: impl Iterator<Item = &'a Field> + Clone,
) -> proc_macro2::TokenStream {
	let solidity_name = name.to_string();
	let solidity_fields = fields.enumerate().map(|(i, f)| {
		let name = f
			.ident
			.as_ref()
			.map(|i| i.to_string())
			.unwrap_or_else(|| format!("field_{i}"));
		let ty = &f.ty;
		let docs = extract_docs(&f.attrs).expect("TODO: handle bad docs");
		quote! {
			SolidityStructField::<#ty> {
				docs: &[#(#docs),*],
				name: #name,
				ty: ::core::marker::PhantomData,
			}
		}
	});
	quote! {
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityStructTy for #name {
			/// Generate solidity definitions for methods described in this struct
			fn generate_solidity_interface(tc: &evm_coder::solidity::TypeCollector) -> String {
				use evm_coder::solidity::*;
				use core::fmt::Write;
				let interface = SolidityStruct {
					docs: &[#(#docs),*],
					name: #solidity_name,
					fields: (#(
						#solidity_fields,
					)*),
				};
				let mut out = String::new();
				let _ = interface.format(&mut out, tc);
				tc.collect(out);
				#solidity_name.to_string()
			}
		}
	}
}

pub fn impl_struct_solidity_type_name<'a>(
	name: &syn::Ident,
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
	params_count: usize,
) -> proc_macro2::TokenStream {
	let arg_dafaults = field_types.enumerate().map(|(i, ty)| {
		let mut defult_value = quote!(<#ty as ::evm_coder::solidity::SolidityTypeName
			>::solidity_default(writer, tc)?;);
		let last_item = params_count - 1;
		if i != last_item {
			defult_value.extend(quote! {write!(writer, ",")?;})
		}
		defult_value
	});

	quote! {
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityTypeName for #name {
			fn solidity_name(
				writer: &mut impl ::core::fmt::Write,
				tc: &::evm_coder::solidity::TypeCollector,
			) -> ::core::fmt::Result {
				write!(writer, "{}", tc.collect_struct::<Self>())
			}

			fn is_simple() -> bool {
				false
			}

			fn solidity_default(
				writer: &mut impl ::core::fmt::Write,
				tc: &::evm_coder::solidity::TypeCollector,
			) -> ::core::fmt::Result {
				write!(writer, "{}(", tc.collect_struct::<Self>())?;

				#(#arg_dafaults)*

				write!(writer, ")")
			}
		}
	}
}
