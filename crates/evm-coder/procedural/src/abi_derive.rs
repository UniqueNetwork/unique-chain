use quote::quote;

pub(crate) fn impl_abi_macro(ast: &syn::DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;

	match &ast.data {
		syn::Data::Struct(ds) => {
			let docs = extract_docs(&ast.attrs)?;
			let (is_named_fields, field_names, field_types, field_docs, params_count) =
				match ds.fields {
					syn::Fields::Named(ref fields) => Ok((
						true,
						fields.named.iter().enumerate().map(map_field_to_name),
						fields.named.iter().map(map_field_to_type),
						fields.named.iter().map(map_field_to_doc),
						fields.named.len(),
					)),
					syn::Fields::Unnamed(ref fields) => Ok((
						false,
						fields.unnamed.iter().enumerate().map(map_field_to_name),
						fields.unnamed.iter().map(map_field_to_type),
						fields.unnamed.iter().map(map_field_to_doc),
						fields.unnamed.len(),
					)),
					syn::Fields::Unit => {
						Err(syn::Error::new(name.span(), "Unit structs not supported"))
					}
				}?;

			if params_count == 0 {
				return Err(syn::Error::new(name.span(), "Empty structs not supported"));
			};

			let tuple_type = tuple_type(field_types.clone());
			let tuple_ref_type = tuple_ref_type(field_types.clone());
			let tuple_data = tuple_data_as_ref(is_named_fields, field_names.clone());
			let tuple_names = tuple_names(is_named_fields, field_names.clone());
			let struct_from_tuple = struct_from_tuple(name, is_named_fields, field_names.clone());

			let can_be_plcaed_in_vec = impl_can_be_placed_in_vec(name);
			let abi_type = impl_abi_type(name, tuple_type.clone());
			let abi_read = impl_abi_read(name, tuple_type, tuple_names, struct_from_tuple);
			let abi_write = impl_abi_write(name, is_named_fields, tuple_ref_type, tuple_data);
			let solidity_type = impl_solidity_type(name, field_types.clone(), params_count);
			let solidity_type_name =
				impl_solidity_type_name(name, field_types.clone(), params_count);
			let solidity_struct_collect =
				impl_solidity_struct_collect(name, field_names, field_types, field_docs, &docs)?;

			Ok(quote! {
				#can_be_plcaed_in_vec
				#abi_type
				#abi_read
				#abi_write
				#solidity_type
				#solidity_type_name
				#solidity_struct_collect
			})
		}
		syn::Data::Enum(de) => {
			let _ = check_repr_u8(name, &ast.attrs)?;

			// dbg!(de);
			Ok(quote!())
		}
		syn::Data::Union(_) => Err(syn::Error::new(name.span(), "Unions not supported")),
	}
}

fn check_repr_u8(name: &syn::Ident, attrs: &Vec<syn::Attribute>) -> syn::Result<()> {
	let repr_u8 = attrs
		.iter()
		.filter_map(|attr| {
			if let Some(ps) = attr.path.segments.first() {
				if ps.ident == "repr" {
					let meta = match attr.parse_meta() {
						Ok(meta) => meta,
						Err(e) => return Some(Err(e)),
					};
					let is_repr_u8 = match meta {
						syn::Meta::List(p) => {
							p.nested
								.iter()
								.filter(|nm| match nm {
									syn::NestedMeta::Meta(m) => match m {
										syn::Meta::Path(p) => {
											p.segments.iter().filter(|ps| ps.ident == "u8").count()
												== 1
										}
										_ => false,
									},
									_ => false,
								})
								.count() == 1
						}
						_ => false,
					};

					if is_repr_u8 {
						return Some(Ok(()));
					};
				}
			}
			None::<syn::Result<()>>
		})
		.collect::<syn::Result<Vec<_>>>()?;

	if repr_u8.len() != 1 {
		return Err(syn::Error::new(name.span(), "Enum is not \"repr(u8)\""));
	};

	Ok(())
}

fn tuple_type<'a>(
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let field_types = field_types.map(|ty| quote!(#ty,));
	quote! {(#(#field_types)*)}
}

fn tuple_ref_type<'a>(
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let field_types = field_types.map(|ty| quote!(&#ty,));
	quote! {(#(#field_types)*)}
}

fn tuple_data_as_ref(
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

fn tuple_names(
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

fn struct_from_tuple(
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

fn extract_docs(attrs: &[syn::Attribute]) -> syn::Result<Vec<String>> {
	attrs
		.iter()
		.filter_map(|attr| {
			if let Some(ps) = attr.path.segments.first() {
				if ps.ident == "doc" {
					let meta = match attr.parse_meta() {
						Ok(meta) => meta,
						Err(e) => return Some(Err(e)),
					};
					match meta {
						syn::Meta::NameValue(mnv) => match &mnv.lit {
							syn::Lit::Str(ls) => return Some(Ok(ls.value())),
							_ => unreachable!(),
						},
						_ => unreachable!(),
					}
				}
			}
			None
		})
		.collect()
}

fn map_field_to_name(field: (usize, &syn::Field)) -> syn::Ident {
	match field.1.ident.as_ref() {
		Some(name) => name.clone(),
		None => {
			let mut name = "field".to_string();
			name.push_str(field.0.to_string().as_str());
			syn::Ident::new(name.as_str(), proc_macro2::Span::call_site())
		}
	}
}

fn map_field_to_type(field: &syn::Field) -> &syn::Type {
	&field.ty
}

fn map_field_to_doc(field: &syn::Field) -> Result<Vec<std::string::String>, syn::Error> {
	extract_docs(&field.attrs)
}

fn impl_can_be_placed_in_vec(ident: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::sealed::CanBePlacedInVec for #ident {}
	}
}

fn impl_abi_type(
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

fn impl_abi_read(
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

fn impl_abi_write(
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

fn impl_solidity_type<'a>(
	name: &syn::Ident,
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
	params_count: usize,
) -> proc_macro2::TokenStream {
	let len = proc_macro2::Literal::usize_suffixed(params_count);
	quote! {
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::SolidityType for #name {
			fn names(tc: &::evm_coder::solidity::TypeCollector) -> Vec<String> {
				let mut collected =
					Vec::with_capacity(<Self as ::evm_coder::solidity::SolidityType>::len());
				#({
					let mut out = String::new();
					<#field_types as ::evm_coder::solidity::SolidityTypeName>::solidity_name(&mut out, tc)
						.expect("no fmt error");
					collected.push(out);
				})*
				collected
			}

			fn len() -> usize {
				#len
			}
		}
	}
}

fn impl_solidity_type_name<'a>(
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

fn impl_solidity_struct_collect<'a>(
	name: &syn::Ident,
	field_names: impl Iterator<Item = proc_macro2::Ident> + Clone,
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
	field_docs: impl Iterator<Item = syn::Result<Vec<String>>> + Clone,
	docs: &[String],
) -> syn::Result<proc_macro2::TokenStream> {
	let string_name = name.to_string();
	let name_type = field_names
		.into_iter()
		.zip(field_types)
		.zip(field_docs)
		.map(|((name, ty), doc)| {
			let field_docs = match doc {
				Ok(doc) => doc.into_iter().enumerate().map(|(i, doc)| {
					let doc = doc.trim();
					let dev = if i == 0 { " @dev" } else { "" };
					quote! {
						writeln!(str, "\t///{} {}", #dev, #doc).unwrap();
					}
				}),
				Err(e) => unreachable!("{:?}", e),
			};
			let name = format!("{}", name);
			quote!(
				#(#field_docs)*
				write!(str, "\t{} ", <#ty as ::evm_coder::solidity::StructCollect>::name()).unwrap();
				writeln!(str, "{};", #name).unwrap();
			)
		});
	let docs = docs.iter().enumerate().map(|(i, doc)| {
		let doc = doc.trim();
		let dev = if i == 0 { " @dev" } else { "" };
		quote! {
			writeln!(str, "///{} {}", #dev, #doc).unwrap();
		}
	});

	Ok(quote! {
		#[cfg(feature = "stubgen")]
		impl ::evm_coder::solidity::StructCollect for #name {
			fn name() -> String {
				#string_name.into()
			}

			fn declaration() -> String {
				use std::fmt::Write;

				let mut str = String::new();
				#(#docs)*
				writeln!(str, "struct {} {{", Self::name()).unwrap();
				#(#name_type)*
				writeln!(str, "}}").unwrap();
				str
			}
		}
	})
}
