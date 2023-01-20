// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

use inflector::cases;
use syn::{Data, DeriveInput, Field, Fields, Ident, Variant, spanned::Spanned};
use quote::quote;

use crate::{parse_ident_from_path, parse_ident_from_type, snake_ident_to_screaming};

struct EventField {
	name: Ident,
	camel_name: String,
	ty: Ident,
	indexed: bool,
}

impl EventField {
	fn try_from(field: &Field) -> syn::Result<Self> {
		let name = field.ident.as_ref().unwrap();
		let ty = parse_ident_from_type(&field.ty, false)?;
		let mut indexed = false;
		for attr in &field.attrs {
			if let Ok(ident) = parse_ident_from_path(&attr.path, false) {
				if ident == "indexed" {
					indexed = true;
				}
			}
		}
		Ok(Self {
			name: name.to_owned(),
			camel_name: cases::camelcase::to_camel_case(&name.to_string()),
			ty: ty.to_owned(),
			indexed,
		})
	}
	fn expand_solidity_argument(&self) -> proc_macro2::TokenStream {
		let camel_name = &self.camel_name;
		let ty = &self.ty;
		let indexed = self.indexed;
		quote! {
			<SolidityEventArgument<#ty>>::new(#indexed, #camel_name)
		}
	}
}

struct Event {
	name: Ident,
	name_screaming: Ident,
	fields: Vec<EventField>,
	selector: proc_macro2::TokenStream,
}

impl Event {
	fn try_from(variant: &Variant) -> syn::Result<Self> {
		let name = &variant.ident;
		let name_lit = proc_macro2::Literal::string(name.to_string().as_str());
		let name_screaming = snake_ident_to_screaming(name);

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
			fields.push(EventField::try_from(field)?);
		}
		if fields.iter().filter(|f| f.indexed).count() > 3 {
			return Err(syn::Error::new(
				variant.fields.span(),
				"events can have at most 4 indexed fields (1 indexed field is reserved for event signature)"
			));
		}

		let args = fields.iter().map(|f| {
			let ty = &f.ty;
			quote! {nameof(<#ty as ::evm_coder::abi::AbiType>::SIGNATURE) fixed(",")}
		});
		// Remove trailing comma
		let shift = (!fields.is_empty()).then(|| quote! {shift_left(1)});

		let signature = quote! { ::evm_coder::make_signature!(new fixed(#name_lit) fixed("(") #(#args)* #shift fixed(")")) };
		let selector = quote! {
			{
				let signature = #signature;
				let mut sum = ::evm_coder::sha3_const::Keccak256::new();
				let mut pos = 0;
				while pos < signature.len {
					sum = sum.update(&[signature.data[pos]; 1]);
					pos += 1;
				}
				let a = sum.finalize();
				let mut selector_bytes = [0; 32];
				let mut i = 0;
				while i != 32 {
					selector_bytes[i] = a[i];
					i += 1;
				}
				selector_bytes
			}
		};

		Ok(Self {
			name: name.to_owned(),
			name_screaming,
			fields,
			selector,
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
				topics.push(::evm_coder::types::Topic::from(Self::#name_screaming));
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
		let selector = &self.selector;

		quote! {
			const #name_screaming: [u8; 32] = #selector;
		}
	}

	fn expand_solidity_function(&self) -> proc_macro2::TokenStream {
		let name = self.name.to_string();
		let args = self.fields.iter().map(EventField::expand_solidity_argument);
		quote! {
			SolidityEvent {
				name: #name,
				args: (
					#(
						#args,
					)*
				),
			}
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
		let solidity_name = self.name.to_string();
		let solidity_functions = self.events.iter().map(Event::expand_solidity_function);

		quote! {
			impl #name {
				#(
					#consts
				)*

				/// Generate solidity definitions for methods described in this interface
				#[cfg(feature = "stubgen")]
				pub fn generate_solidity_interface(tc: &evm_coder::solidity::TypeCollector, is_impl: bool) {
					use evm_coder::solidity::*;
					use core::fmt::Write;
					let interface = SolidityInterface {
						docs: &[],
						selector: [0; 4],
						name: #solidity_name,
						is: &[],
						functions: (#(
							#solidity_functions,
						)*),
					};
					let mut out = string::new();
					out.push_str("/// @dev inlined interface\n");
					let _ = interface.format(is_impl, &mut out, tc);
					tc.collect(out);
				}
			}

			#[automatically_derived]
			impl ::evm_coder::events::ToLog for #name {
				fn to_log(&self, contract: Address) -> ::ethereum::Log {
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
