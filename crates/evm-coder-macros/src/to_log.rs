use syn::{Data, DeriveInput, Field, Fields, Ident, Variant, spanned::Spanned};
use std::fmt::Write;
use quote::quote;

use crate::{parse_ident_from_path, parse_ident_from_type, snake_ident_to_screaming};

struct EventField {
	name: Ident,
	ty: Ident,
	indexed: bool,
}

impl EventField {
	fn try_from(field: &Field) -> syn::Result<Self> {
		let name = field.ident.as_ref().unwrap();
		let ty = parse_ident_from_type(&field.ty)?;
		let mut indexed = false;
		for attr in &field.attrs {
			if let Ok(ident) = parse_ident_from_path(&attr.path) {
				if ident == "indexed" {
					indexed = true;
				}
			}
		}
		Ok(Self {
			name: name.to_owned(),
			ty: ty.to_owned(),
			indexed,
		})
	}
}

struct Event {
	name: Ident,
	name_screaming: Ident,
	fields: Vec<EventField>,
	selector: [u8; 32],
	selector_str: String,
}

impl Event {
	fn try_from(variant: &Variant) -> syn::Result<Self> {
		let name = &variant.ident;
		let name_screaming = snake_ident_to_screaming(&name);

		let named = match &variant.fields {
			Fields::Named(named) => named,
			_ => {
				return Err(syn::Error::new(
					variant.fields.span(),
					"expected named fields",
				))
			}
		};
		let mut fields = Vec::new();
		for field in &named.named {
			fields.push(EventField::try_from(&field)?);
		}
		let mut selector_str = format!("{}(", name);
		for (i, arg) in fields.iter().enumerate() {
			if i != 0 {
				write!(selector_str, ",").unwrap();
			}
			write!(selector_str, "{}", arg.ty).unwrap();
		}
		selector_str.push(')');
		let selector = crate::event_selector_str(&selector_str);

		Ok(Self {
			name: name.to_owned(),
			name_screaming,
			fields,
			selector,
			selector_str,
		})
	}

	fn expand_serializers(&self) -> proc_macro2::TokenStream {
		let name = &self.name;
		let name_screaming = &self.name_screaming;
		let fields = self.fields.iter().map(|f| &f.name);

		let indexed = self.fields.iter().filter(|f| f.indexed).map(|f| &f.name);
		let plain = self.fields.iter().filter(|f| !f.indexed).map(|f| &f.name);

		quote! {
			Self::#name {#(
				#fields,
			)*} => {
				topics.push(topic::from(Self::#name_screaming));
				#(
					topics.push(#indexed.to_topic());
				)*
				#(
					#plain.abi_write(&mut writer);
				)*
			}
		}
	}

	fn expand_consts(&self) -> proc_macro2::TokenStream {
		let name_screaming = &self.name_screaming;
		let selector_str = &self.selector_str;
		let selector = &self.selector;

		quote! {
			#[doc = #selector_str]
			const #name_screaming: [u8; 32] = [#(
				#selector,
			)*];
		}
	}
}

pub struct Events {
	name: Ident,
	events: Vec<Event>,
}

impl Events {
	pub fn try_from(data: &DeriveInput) -> syn::Result<Self> {
		let name = &data.ident;
		let en = match &data.data {
			Data::Enum(en) => en,
			_ => return Err(syn::Error::new(data.span(), "expected enum")),
		};
		let mut events = Vec::new();
		for variant in &en.variants {
			events.push(Event::try_from(variant)?);
		}
		Ok(Self {
			name: name.to_owned(),
			events,
		})
	}
	pub fn expand(&self) -> proc_macro2::TokenStream {
		let name = &self.name;

		let consts = self.events.iter().map(Event::expand_consts);
		let serializers = self.events.iter().map(Event::expand_serializers);

		quote! {
			impl #name {
				#(
					#consts
				)*
			}

			#[automatically_derived]
			impl ::evm_coder::events::ToLog for #name {
				fn to_log(&self, contract: address) -> ::ethereum::Log {
					use ::evm_coder::events::ToTopic;
					use ::evm_coder::abi::AbiWrite;
					let mut writer = ::evm_coder::abi::AbiWriter::new();
					let mut topics = Vec::new();
					match self {
						#(
							#serializers,
						)*
					}
					::ethereum::Log {
						address: contract,
						topics,
						data: writer.finish(),
					}
				}
			}
		}
	}
}
