use quote::quote;

pub(crate) fn impl_abi_macro(ast: &syn::DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;
	let (is_named_fields, field_names, field_types, params_count) = match &ast.data {
		syn::Data::Struct(ds) => match ds.fields {
			syn::Fields::Named(ref fields) => Ok((
				true,
				fields.named.iter().enumerate().map(map_field_to_name),
				fields.named.iter().map(map_field_to_type),
				fields.named.len(),
			)),
			syn::Fields::Unnamed(ref fields) => Ok((
				false,
				fields.unnamed.iter().enumerate().map(map_field_to_name),
				fields.unnamed.iter().map(map_field_to_type),
				fields.unnamed.len(),
			)),
			syn::Fields::Unit => Err(syn::Error::new(name.span(), "Unit structs not supported")),
		},
		syn::Data::Enum(_) => Err(syn::Error::new(name.span(), "Enums not supported")),
		syn::Data::Union(_) => Err(syn::Error::new(name.span(), "Unions not supported")),
	}?;

	if params_count == 0 {
		return Err(syn::Error::new(name.span(), "Empty structs not supported"));
	};

	let can_be_plcaed_in_vec = impl_can_be_placed_in_vec(name);
	let abi_type = impl_abi_type(name, field_types.clone());
	let abi_read = impl_abi_read(name, is_named_fields, field_names.clone(), field_types);
	let abi_write = impl_abi_write(name, is_named_fields, params_count, field_names);

	Ok(quote! {
		#can_be_plcaed_in_vec
		#abi_type
		#abi_read
		#abi_write
	})
}

fn impl_can_be_placed_in_vec(ident: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::sealed::CanBePlacedInVec for #ident {}
	}
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

fn map_field_to_type<'a>(field: &'a syn::Field) -> &'a syn::Type {
	&field.ty
}

fn impl_abi_type<'a>(
	name: &syn::Ident,
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let mut params_signature = {
		let types = field_types.clone();
		quote!(
			#(nameof(<#types as ::evm_coder::abi::AbiType>::SIGNATURE) fixed(","))*
		)
	};

	params_signature.extend(quote!(shift_left(1)));

	let fields_for_dynamic = field_types.clone();

	quote! {
		impl ::evm_coder::abi::AbiType for #name {
			const SIGNATURE: ::evm_coder::custom_signature::SignatureUnit = ::evm_coder::make_signature!(
				new fixed("(")
				#params_signature
				fixed(")")
			);
			fn is_dynamic() -> bool {
				false
				#(
					|| <#fields_for_dynamic as ::evm_coder::abi::AbiType>::is_dynamic()
				)*
			}
			fn size() -> usize {
				0 #(+ <#field_types as ::evm_coder::abi::AbiType>::size())*
			}
		}
	}
}

fn impl_abi_read<'a>(
	name: &syn::Ident,
	is_named_fields: bool,
	field_names: impl Iterator<Item = proc_macro2::Ident> + Clone,
	field_types: impl Iterator<Item = &'a syn::Type> + Clone,
) -> proc_macro2::TokenStream {
	let field_names1 = field_names.clone();

	let struct_constructor = if is_named_fields {
		quote!(Ok(Self { #(#field_names1),* }))
	} else {
		quote!(Ok(Self ( #(#field_names1),* )))
	};
	quote!(
		impl ::evm_coder::abi::AbiRead for #name {
			fn abi_read(reader: &mut ::evm_coder::abi::AbiReader) -> ::evm_coder::execution::Result<Self> {
				let is_dynamic = <Self as ::evm_coder::abi::AbiType>::is_dynamic();
				let size = if !is_dynamic {
					Some(<Self as ::evm_coder::abi::AbiType>::size())
				} else {
					None
				};
				let mut subresult = reader.subresult(size)?;
				#(
					let #field_names = {
						let value = <#field_types as ::evm_coder::abi::AbiRead>::abi_read(&mut subresult)?;
						if !is_dynamic {subresult.bytes_read(<#field_types as ::evm_coder::abi::AbiType>::size())};
						value
					};
				)*

				#struct_constructor
			}
		}
	)
}

fn impl_abi_write<'a>(
	name: &syn::Ident,
	is_named_fields: bool,
	params_count: usize,
	field_names: impl Iterator<Item = proc_macro2::Ident> + Clone,
) -> proc_macro2::TokenStream {
	let abi_write = if is_named_fields {
		quote!(
			#(
				::evm_coder::abi::AbiWrite::abi_write(&self.#field_names, sub);
			)*
		)
	} else {
		let field_names = (0..params_count)
			.into_iter()
			.map(proc_macro2::Literal::usize_unsuffixed);
		quote!(
			#(
				::evm_coder::abi::AbiWrite::abi_write(&self.#field_names, sub);
			)*
		)
	};
	quote!(
		impl ::evm_coder::abi::AbiWrite for #name {
			fn abi_write(&self, writer: &mut ::evm_coder::abi::AbiWriter) {
				if <Self as ::evm_coder::abi::AbiType>::is_dynamic() {
					let mut sub = ::evm_coder::abi::AbiWriter::new();
					{
						let sub = &mut sub;
						#abi_write
					}
					writer.write_subresult(sub);
				} else {
					let sub = writer;
					#abi_write
				}
			}
		}
	)
}
