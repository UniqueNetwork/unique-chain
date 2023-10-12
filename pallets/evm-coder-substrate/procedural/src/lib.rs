use std::result;

use proc_macro2::{Ident, TokenStream};
use quote::quote;
use syn::{
	parenthesized,
	parse::{Parse, ParseBuffer},
	spanned::Spanned,
	Attribute, Data, DeriveInput, Error, Expr,
};

type Result<T = TokenStream, E = syn::Error> = result::Result<T, E>;

fn parse_attr<A: Parse, I>(attrs: &[Attribute], ident: I) -> Result<Option<A>>
where
	Ident: PartialEq<I>,
{
	let attrs = attrs
		.iter()
		.filter(|a| a.path.is_ident(&ident))
		.collect::<Vec<_>>();
	if attrs.len() > 1 {
		return Err(Error::new(
			attrs[1].span(),
			"this attribute may be specified only once",
		));
	} else if attrs.is_empty() {
		return Ok(None);
	}
	let attr = attrs[0];

	let parsed = syn::parse2(attr.tokens.clone())?;
	Ok(Some(parsed))
}

struct WeightAttr {
	handler: Expr,
}
impl Parse for WeightAttr {
	fn parse(input: &ParseBuffer) -> Result<Self> {
		let expr;
		parenthesized!(expr in input);
		let handler = Expr::parse(&expr)?;

		Ok(Self { handler })
	}
}

#[proc_macro_derive(PreDispatch, attributes(pre_dispatch, weight))]
pub fn derive_predispatch(item: proc_macro::TokenStream) -> proc_macro::TokenStream {
	fn inner(input: DeriveInput) -> Result {
		let (impl_generics, ty_generics, _where_clause) = input.generics.split_for_impl();
		let ident = &input.ident;
		let Data::Enum(data) = &input.data else {
			return Err(Error::new_spanned(input, "PreDispatch input is enum"));
		};

		let matching = data
			.variants
			.iter()
			.map(|var| {
				let name = &var.ident;
				let handler = match &var.fields {
					syn::Fields::Named(named) => {
						if let Some(weight) = parse_attr::<WeightAttr, _>(&var.attrs, "weight")? {
							let weight = &weight.handler;
							let fields = named.named.iter().flat_map(|n| &n.ident);
							quote! {
								{#(#fields,)*} => {
									::pallet_evm_coder_substrate::execution::DispatchInfo {
										weight: ::pallet_evm_coder_substrate::execution::Weight::from(#weight),
									}
								}
							}
						} else {
							quote! {
								{..} => {
									::pallet_evm_coder_substrate::execution::DispatchInfo {
										weight: ::pallet_evm_coder_substrate::execution::Weight::zero()
									}
								}
							}
						}
					}
					syn::Fields::Unit => {
						if let Some(weight) = parse_attr::<WeightAttr, _>(&var.attrs, "weight")? {
							let weight = &weight.handler;
							quote! {
								=> {
									::pallet_evm_coder_substrate::execution::DispatchInfo {
										weight: ::pallet_evm_coder_substrate::execution::Weight::from(#weight),
									}
								}
							}
						} else {
							quote! {
								=> {
									::pallet_evm_coder_substrate::execution::DispatchInfo {
										weight: ::pallet_evm_coder_substrate::execution::Weight::zero()
									}
								}
							}
						}
					}
					syn::Fields::Unnamed(_) => {
						quote! {
							(call, ..) => {
								call.dispatch_info()
							}
						}
					}
				};
				Ok(quote! {
					Self::#name #handler,
				})
			})
			.collect::<Result>()?;

		Ok(quote! {
			#[allow(unused_variables)]
			impl #impl_generics ::pallet_evm_coder_substrate::execution::PreDispatch for #ident #ty_generics where T: crate::Config {
				fn dispatch_info(&self) -> ::pallet_evm_coder_substrate::execution::DispatchInfo {
					match self {
						#matching
					}
				}
			}
		})
	}
	let item = syn::parse_macro_input!(item as DeriveInput);
	match inner(item) {
		Ok(o) => o.into(),
		Err(e) => e.into_compile_error().into(),
	}
}
