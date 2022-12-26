mod derive_enum;
mod derive_struct;

use quote::quote;
use derive_struct::*;
use derive_enum::*;

pub(crate) fn impl_abi_macro(ast: &syn::DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;
	match &ast.data {
		syn::Data::Struct(ds) => expand_struct(ds, ast),
		syn::Data::Enum(de) => expand_enum(de, ast),
		syn::Data::Union(_) => Err(syn::Error::new(name.span(), "Unions not supported")),
	}
}

fn expand_struct(
	ds: &syn::DataStruct,
	ast: &syn::DeriveInput,
) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;
	let docs = extract_docs(&ast.attrs)?;
	let (is_named_fields, field_names, field_types, params_count) = match ds.fields {
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
	let abi_type = impl_struct_abi_type(name, tuple_type.clone());
	let abi_read = impl_struct_abi_read(name, tuple_type, tuple_names, struct_from_tuple);
	let abi_write = impl_struct_abi_write(name, is_named_fields, tuple_ref_type, tuple_data);
	let solidity_type = impl_struct_solidity_type(name, docs, ds.fields.iter());
	let solidity_type_name =
		impl_struct_solidity_type_name(name, field_types.clone(), params_count);

	Ok(quote! {
		#can_be_plcaed_in_vec
		#abi_type
		#abi_read
		#abi_write
		#solidity_type
		#solidity_type_name
	})
}

fn expand_enum(
	de: &syn::DataEnum,
	ast: &syn::DeriveInput,
) -> syn::Result<proc_macro2::TokenStream> {
	let name = &ast.ident;
	check_repr_u8(name, &ast.attrs)?;
	check_enum_fields(de)?;
	let docs = extract_docs(&ast.attrs)?;
	let enum_options = de.variants.iter();

	let from = impl_enum_from_u8(name, enum_options.clone());
	let solidity_option = impl_solidity_option(docs, name, enum_options.clone());
	let can_be_plcaed_in_vec = impl_can_be_placed_in_vec(name);
	let abi_type = impl_enum_abi_type(name);
	let abi_read = impl_enum_abi_read(name);
	let abi_write = impl_enum_abi_write(name);
	let solidity_type_name = impl_enum_solidity_type_name(name);

	Ok(quote! {
		#from
		#solidity_option
		#can_be_plcaed_in_vec
		#abi_type
		#abi_read
		#abi_write
		#solidity_type_name
	})
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
