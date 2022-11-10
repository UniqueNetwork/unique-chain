use quote::quote;

pub(crate) fn impl_abi_macro(ast: &syn::DeriveInput) -> proc_macro2::TokenStream {
	// dbg!(ast);
	let name = &ast.ident;
	let can_be_plcaed_in_vec = impl_can_be_placed_in_vec(name);
	let abi_type = impl_abi_type(ast);
	println!("{}", abi_type);
	quote! {
		#can_be_plcaed_in_vec
		#abi_type
	}
}

fn impl_can_be_placed_in_vec(ident: &syn::Ident) -> proc_macro2::TokenStream {
	quote! {
		impl ::evm_coder::abi::sealed::CanBePlacedInVec for #ident {}
	}
}

fn impl_abi_type(ast: &syn::DeriveInput) -> proc_macro2::TokenStream {
	let name = &ast.ident;
	let (fields, params_count) = match &ast.data {
		syn::Data::Struct(ds) => match ds.fields {
			syn::Fields::Named(ref fields) => (
				fields.named.iter().map(|field| &field.ty),
				fields.named.len(),
			),
			syn::Fields::Unnamed(_) => todo!(),
			syn::Fields::Unit => unimplemented!("Unit structs not supported"),
		},
		syn::Data::Enum(_) => unimplemented!("Enums not supported"),
		syn::Data::Union(_) => unimplemented!("Unions not supported"),
	};

	let mut params_signature = {
		let fields = fields.clone();
		quote!(
			#(nameof(<#fields as ::evm_coder::abi::AbiType>::SIGNATURE) fixed(","))*
		)
	};
	if params_count > 0 {
		params_signature.extend(quote!(shift_left(1)))
	};

	let fields_for_dynamic = fields.clone();

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
				0 #(+ <#fields as ::evm_coder::abi::AbiType>::size())*
			}
		}
	}
}
