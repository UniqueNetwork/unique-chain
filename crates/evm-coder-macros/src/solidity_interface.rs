#![allow(dead_code)]

use quote::quote;
use darling::FromMeta;
use inflector::cases;
use std::fmt::Write;
use syn::{FnArg, Generics, Ident, ImplItem, ImplItemMethod, ItemImpl, Meta, NestedMeta, PatType, Path, ReturnType, Type, spanned::Spanned};

use crate::{
	fn_selector_str, parse_ident_from_pat, parse_ident_from_path, parse_ident_from_type,
	parse_result_ok, pascal_ident_to_call, pascal_ident_to_snake_call, snake_ident_to_pascal,
	snake_ident_to_screaming,
};

struct Is {
	name: Ident,
	pascal_call_name: Ident,
	snake_call_name: Ident,
}
impl Is {
	fn try_from(path: &Path) -> syn::Result<Self> {
		let name = parse_ident_from_path(path, false)?.clone();
		Ok(Self {
			pascal_call_name: pascal_ident_to_call(&name),
			snake_call_name: pascal_ident_to_snake_call(&name),
			name,
		})
	}

	fn expand_call_def(&self) -> proc_macro2::TokenStream {
		let name = &self.name;
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			#name(#pascal_call_name)
		}
	}

	fn expand_interface_id(&self) -> proc_macro2::TokenStream {
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			interface_id ^= #pascal_call_name::interface_id();
		}
	}

	fn expand_supports_interface(&self) -> proc_macro2::TokenStream {
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			#pascal_call_name::supports_interface(interface_id)
		}
	}

	fn expand_variant_call(&self) -> proc_macro2::TokenStream {
		let name = &self.name;
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			InternalCall::#name(call) => return <Self as ::evm_coder::Callable<#pascal_call_name>>::call(self, Msg {
				call,
				caller: c.caller,
				value: c.value,
			})
		}
	}

	fn expand_parse(&self) -> proc_macro2::TokenStream {
		let name = &self.name;
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			if let Some(parsed_call) = #pascal_call_name::parse(method_id, reader)? {
				return Ok(Some(Self::#name(parsed_call)))
			}
		}
	}
}

#[derive(Default)]
struct IsList(Vec<Is>);
impl FromMeta for IsList {
	fn from_list(items: &[NestedMeta]) -> darling::Result<Self> {
		let mut out = Vec::new();
		for item in items {
			match item {
				NestedMeta::Meta(Meta::Path(path)) => out.push(Is::try_from(path)?),
				_ => return Err(syn::Error::new(item.span(), "expected path").into()),
			}
		}
		Ok(Self(out))
	}
}

#[derive(FromMeta)]
pub struct InterfaceInfo {
	name: Ident,
	#[darling(default)]
	is: IsList,
	#[darling(default)]
	inline_is: IsList,
	#[darling(default)]
	events: IsList,
}

#[derive(FromMeta)]
struct MethodInfo {
	#[darling(default)]
	rename_selector: Option<String>,
}

struct MethodArg {
	name: Ident,
	ty: Ident,
}
impl MethodArg {
	fn try_from(value: &PatType) -> syn::Result<Self> {
		Ok(Self {
			name: parse_ident_from_pat(&value.pat)?.clone(),
			ty: parse_ident_from_type(&value.ty, false)?.clone(),
		})
	}
	fn is_value(&self) -> bool {
		self.ty == "value"
	}
	fn is_caller(&self) -> bool {
		self.ty == "caller"
	}
	fn is_special(&self) -> bool {
		self.is_value() || self.is_caller()
	}
	fn selector_ty(&self) -> &Ident {
		assert!(!self.is_special());
		&self.ty
	}

	fn expand_call_def(&self) -> proc_macro2::TokenStream {
		assert!(!self.is_special());
		let name = &self.name;
		let ty = &self.ty;

		quote! {
			#name: #ty
		}
	}

	fn expand_parse(&self) -> proc_macro2::TokenStream {
		assert!(!self.is_special());
		let name = &self.name;
		quote! {
			#name: reader.abi_read()?
		}
	}

	fn expand_call_arg(&self) -> proc_macro2::TokenStream {
		if self.is_value() {
			quote! {
				c.value.clone()
			}
		} else if self.is_caller() {
			quote! {
				c.caller.clone()
			}
		} else {
			let name = &self.name;
			quote! {
				#name
			}
		}
	}
}

#[derive(PartialEq)]
enum Mutability {
	Mutable,
	View,
	Pure,
}

struct Method {
	name: Ident,
	camel_name: String,
	pascal_name: Ident,
	screaming_name: Ident,
	selector_str: String,
	selector: u32,
	args: Vec<MethodArg>,
	has_normal_args: bool,
	mutability: Mutability,
	result: Type,
}
impl Method {
	fn try_from(value: &ImplItemMethod) -> syn::Result<Self> {
		let mut info = MethodInfo {
			rename_selector: None,
		};
		for attr in &value.attrs {
			let ident = parse_ident_from_path(&attr.path, false)?;
			if ident == "solidity" {
				let args = attr.parse_meta().unwrap();
				info = MethodInfo::from_meta(&args).unwrap();
			} else if ident == "doc" {
				// TODO: Add docs to evm interfaces
			}
		}
		let ident = &value.sig.ident;
		let ident_str = ident.to_string();
		if !cases::snakecase::is_snake_case(&ident_str) {
			return Err(syn::Error::new(ident.span(), "method name should be snake_cased\nif alternative solidity name needs to be set - use #[solidity] attribute"));
		}

		let mut mutability = Mutability::Pure;

		if let Some(FnArg::Receiver(receiver)) = value
			.sig
			.inputs
			.iter()
			.find(|arg| matches!(arg, FnArg::Receiver(_)))
		{
			if receiver.reference.is_none() {
				return Err(syn::Error::new(
					receiver.span(),
					"receiver should be by ref",
				));
			}
			if receiver.mutability.is_some() {
				mutability = Mutability::Mutable;
			} else {
				mutability = Mutability::View;
			}
		}
		let mut args = Vec::new();
		for typ in value
			.sig
			.inputs
			.iter()
			.filter(|arg| matches!(arg, FnArg::Typed(_)))
		{
			let typ = match typ {
				FnArg::Typed(typ) => typ,
				_ => unreachable!(),
			};
			args.push(MethodArg::try_from(typ)?);
		}

		if mutability != Mutability::Mutable && args.iter().any(|arg| arg.is_value()) {
			return Err(syn::Error::new(
				args.iter().find(|arg| arg.is_value()).unwrap().ty.span(),
				"payable function should be mutable",
			));
		}

		let result = match &value.sig.output {
			ReturnType::Type(_, ty) => ty,
			_ => return Err(syn::Error::new(value.sig.output.span(), "interface method should return Result<value>\nif there is no value to return - specify void (which is alias to unit)")),
		};
		let result = parse_result_ok(result)?;

		let camel_name = info
			.rename_selector
			.unwrap_or_else(|| cases::camelcase::to_camel_case(&ident.to_string()));
		let mut selector_str = camel_name.clone();
		selector_str.push('(');
		let mut has_normal_args = false;
		for (i, arg) in args.iter().filter(|arg| !arg.is_special()).enumerate() {
			if i != 0 {
				selector_str.push(',');
			}
			write!(selector_str, "{}", arg.selector_ty()).unwrap();
			has_normal_args = true;
		}
		selector_str.push(')');
		let selector = fn_selector_str(&selector_str);

		Ok(Self {
			name: ident.clone(),
			camel_name,
			pascal_name: snake_ident_to_pascal(ident),
			screaming_name: snake_ident_to_screaming(ident),
			selector_str,
			selector,
			args,
			has_normal_args,
			mutability,
			result: result.clone(),
		})
	}
	fn expand_call_def(&self) -> proc_macro2::TokenStream {
		let defs = self
			.args
			.iter()
			.filter(|a| !a.is_special())
			.map(|a| a.expand_call_def());
		let pascal_name = &self.pascal_name;

		if self.has_normal_args {
			quote! {
				#pascal_name {
					#(
						#defs,
					)*
				}
			}
		} else {
			quote! {#pascal_name}
		}
	}

	fn expand_const(&self) -> proc_macro2::TokenStream {
		let screaming_name = &self.screaming_name;
		let selector = self.selector;
		let selector_str = &self.selector_str;
		quote! {
			#[doc = #selector_str]
			const #screaming_name: u32 = #selector;
		}
	}

	fn expand_interface_id(&self) -> proc_macro2::TokenStream {
		let screaming_name = &self.screaming_name;
		quote! {
			interface_id ^= Self::#screaming_name;
		}
	}

	fn expand_parse(&self) -> proc_macro2::TokenStream {
		let pascal_name = &self.pascal_name;
		let screaming_name = &self.screaming_name;
		if self.has_normal_args {
			let parsers = self
				.args
				.iter()
				.filter(|a| !a.is_special())
				.map(|a| a.expand_parse());
			quote! {
				Self::#screaming_name => return Ok(Some(Self::#pascal_name {
					#(
						#parsers,
					)*
				}))
			}
		} else {
			quote! { Self::#screaming_name => return Ok(Some(Self::#pascal_name)) }
		}
	}

	fn expand_variant_call(&self) -> proc_macro2::TokenStream {
		let pascal_name = &self.pascal_name;
		let name = &self.name;

		let matcher = if self.has_normal_args {
			let names = self
				.args
				.iter()
				.filter(|a| !a.is_special())
				.map(|a| &a.name);

			quote! {{
				#(
					#names,
				)*
			}}
		} else {
			quote! {}
		};

		let receiver = match self.mutability {
			Mutability::Mutable | Mutability::View => quote! {self.},
			Mutability::Pure => quote! {Self::},
		};
		let args = self.args.iter().map(|a| a.expand_call_arg());

		quote! {
			InternalCall::#pascal_name #matcher => {
				let result = #receiver #name(
					#(
						#args,
					)*
				)?;
				(&result).abi_write(&mut writer);
			}
		}
	}
}

pub struct SolidityInterface {
    generics: Generics,
	name: Box<syn::Type>,
	info: InterfaceInfo,
	methods: Vec<Method>,
}
impl SolidityInterface {
	pub fn try_from(info: InterfaceInfo, value: &ItemImpl) -> syn::Result<Self> {
		let mut methods = Vec::new();

		for item in &value.items {
			if let ImplItem::Method(method) = item {
				methods.push(Method::try_from(method)?)
			}
		}
		Ok(Self {
            generics: value.generics.clone(),
			name: value.self_ty.clone(),
			info,
			methods,
		})
	}
	pub fn expand(self) -> proc_macro2::TokenStream {
		let name = self.name;

		let call_name = pascal_ident_to_call(&self.info.name);
        let generics = self.generics;

		let call_sub = self
			.info
			.inline_is
			.0
			.iter()
			.chain(self.info.is.0.iter())
			.map(Is::expand_call_def);
		let call_parse = self
			.info
			.inline_is
			.0
			.iter()
			.chain(self.info.is.0.iter())
			.map(Is::expand_parse);
		let call_variants = self
			.info
			.inline_is
			.0
			.iter()
			.chain(self.info.is.0.iter())
			.map(Is::expand_variant_call);

		let inline_interface_id = self.info.inline_is.0.iter().map(Is::expand_interface_id);
		let supports_interface = self.info.is.0.iter().map(Is::expand_supports_interface);

		let calls = self.methods.iter().map(Method::expand_call_def);
		let consts = self.methods.iter().map(Method::expand_const);
		let interface_id = self.methods.iter().map(Method::expand_interface_id);
		let parsers = self.methods.iter().map(Method::expand_parse);
		let call_variants_this = self.methods.iter().map(Method::expand_variant_call);

		// let methods = self.methods.iter().map(Method::solidity_def);

		quote! {
			#[derive(Debug)]
			pub enum #call_name {
				#(
					#calls,
				)*
				#(
					#call_sub,
				)*
			}
			impl #call_name {
				#(
					#consts
				)*
				pub const fn interface_id() -> u32 {
					let mut interface_id = 0;
					#(#interface_id)*
					#(#inline_interface_id)*
					interface_id
				}
				pub fn supports_interface(interface_id: u32) -> bool {
					interface_id != 0xffffff && (
						interface_id == Self::interface_id()
						#(
							|| #supports_interface
						)*
					)
				}
			}
			impl ::evm_coder::Call for #call_name {
				fn parse(method_id: u32, reader: &mut ::evm_coder::abi::AbiReader) -> ::evm_coder::execution::Result<Option<Self>> {
					use ::evm_coder::abi::AbiRead;
					match method_id {
						#(
							#parsers,
						)*
						_ => {},
					}
					#(
						#call_parse
					)else*
					return Ok(None);
				}
			}
			impl #generics ::evm_coder::Callable<#call_name> for #name {
				#[allow(unreachable_code)] // In case of no inner calls
				fn call(&mut self, c: Msg<#call_name>) -> Result<::evm_coder::abi::AbiWriter> {
					use ::evm_coder::abi::AbiWrite;
					type InternalCall = #call_name;
					match c.call {
						#(
							#call_variants,
						)*
						_ => {},
					}
					let mut writer = ::evm_coder::abi::AbiWriter::default();
					match c.call {
						#(
							#call_variants_this,
						)*
						_ => unreachable!()
					}
					Ok(writer)
				}
			}
		}
	}
}
