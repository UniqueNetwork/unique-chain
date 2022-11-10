use quote::quote;

pub(crate) fn impl_abi_macro(ast: &syn::DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
	// dbg!(ast);
	let name = &ast.ident;
	let can_be_plcaed_in_vec = impl_can_be_placed_in_vec(name);
	let abi_type = impl_abi_type(ast)?;
	// println!("{}", abi_type);
	Ok(quote! {
		#can_be_plcaed_in_vec
		#abi_type
	})
}

fn impl_can_be_placed_in_vec(ident: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::abi::sealed::CanBePlacedInVec for #ident {}
	}
}

fn map_field_to_type<'a>(field: &'a syn::Field) -> &'a syn::Type {
	&field.ty
}

fn impl_abi_type(ast: &syn::DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;
	let (fields, params_count) = match &ast.data {
		syn::Data::Struct(ds) => match ds.fields {
			syn::Fields::Named(ref fields) => Ok((
				fields.named.iter().map(map_field_to_type),
				fields.named.len(),
			)),
			syn::Fields::Unnamed(ref fields) => Ok((
				fields.unnamed.iter().map(map_field_to_type),
				fields.unnamed.len(),
			)),
			syn::Fields::Unit => Err(syn::Error::new(name.span(), "Unit structs not supported")),
		},
		syn::Data::Enum(_) => Err(syn::Error::new(name.span(), "Enums not supported")),
		syn::Data::Union(_) => Err(syn::Error::new(name.span(), "Unions not supported")),
	}?;

	let mut params_signature = {
		let fields = fields.clone();
		quote!(
			#(nameof(<#fields as ::evm_coder::abi::AbiType>::SIGNATURE) fixed(","))*
		)
	};

	if params_count == 0 {
		return Err(syn::Error::new(name.span(), "Empty structs not supported"));
	};

	params_signature.extend(quote!(shift_left(1)));

	let fields_for_dynamic = fields.clone();

	Ok(quote! {
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
				0 #(+ <#fields as ::evm_coder::abi::AbiType>::size())*
			}
		}
	})
}
