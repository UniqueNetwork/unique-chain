#![allow(dead_code)]

use quote::quote;
use darling::{FromMeta, ToTokens};
use inflector::cases;
use std::fmt::Write;
use syn::{
	Expr, FnArg, GenericArgument, Generics, Ident, ImplItem, ImplItemMethod, ItemImpl, Lit, Meta,
	NestedMeta, PatType, Path, PathArguments, ReturnType, Type, spanned::Spanned,
};

use crate::{
	fn_selector_str, parse_ident_from_pat, parse_ident_from_path, parse_path, parse_path_segment,
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

	fn expand_generator(&self) -> proc_macro2::TokenStream {
		let pascal_call_name = &self.pascal_call_name;
		quote! {
			#pascal_call_name::generate_solidity_interface(tc, is_impl);
		}
	}

	fn expand_event_generator(&self) -> proc_macro2::TokenStream {
		let name = &self.name;
		quote! {
			#name::generate_solidity_interface(tc, is_impl);
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

enum AbiType {
	// type
	Plain(Ident),
	// (type1,type2)
	Tuple(Vec<AbiType>),
	// type[]
	Vec(Box<AbiType>),
	// type[20]
	Array(Box<AbiType>, usize),
}
impl AbiType {
	fn try_from(value: &Type) -> syn::Result<Self> {
		let value = Self::try_maybe_special_from(value)?;
		if value.is_special() {
			return Err(syn::Error::new(value.span(), "unexpected special type"));
		}
		Ok(value)
	}
	fn try_maybe_special_from(value: &Type) -> syn::Result<Self> {
		match value {
			Type::Array(arr) => {
				let wrapped = AbiType::try_from(&arr.elem)?;
				match &arr.len {
					Expr::Lit(l) => match &l.lit {
						Lit::Int(i) => {
							let num = i.base10_parse::<usize>()?;
							Ok(AbiType::Array(Box::new(wrapped), num as usize))
						}
						_ => Err(syn::Error::new(arr.len.span(), "should be int literal")),
					},
					_ => Err(syn::Error::new(arr.len.span(), "should be literal")),
				}
			}
			Type::Path(_) => {
				let path = parse_path(value)?;
				let segment = parse_path_segment(path)?;
				if segment.ident == "Vec" {
					let args = match &segment.arguments {
						PathArguments::AngleBracketed(e) => e,
						_ => {
							return Err(syn::Error::new(
								segment.arguments.span(),
								"missing Vec generic",
							))
						}
					};
					let args = &args.args;
					if args.len() != 1 {
						return Err(syn::Error::new(
							args.span(),
							"expected only one generic for vec",
						));
					}
					let arg = args.first().unwrap();

					let ty = match arg {
						GenericArgument::Type(ty) => ty,
						_ => {
							return Err(syn::Error::new(
								arg.span(),
								"expected first generic to be type",
							))
						}
					};

					let wrapped = AbiType::try_from(ty)?;
					Ok(Self::Vec(Box::new(wrapped)))
				} else {
					if !segment.arguments.is_empty() {
						return Err(syn::Error::new(
							segment.arguments.span(),
							"unexpected generic arguments for non-vec type",
						));
					}
					Ok(Self::Plain(segment.ident.clone()))
				}
			}
			Type::Tuple(t) => {
				let mut out = Vec::with_capacity(t.elems.len());
				for el in t.elems.iter() {
					out.push(AbiType::try_from(el)?)
				}
				Ok(Self::Tuple(out))
			}
			_ => Err(syn::Error::new(
				value.span(),
				"unexpected type, only arrays, plain types and tuples are supported",
			)),
		}
	}
	fn is_value(&self) -> bool {
		match self {
			Self::Plain(v) if v == "value" => true,
			_ => false,
		}
	}
	fn is_caller(&self) -> bool {
		match self {
			Self::Plain(v) if v == "caller" => true,
			_ => false,
		}
	}
	fn is_special(&self) -> bool {
		self.is_caller() || self.is_value()
	}
	fn selector_ty_buf(&self, buf: &mut String) -> std::fmt::Result {
		match self {
			AbiType::Plain(t) => {
				write!(buf, "{}", t)
			}
			AbiType::Tuple(t) => {
				write!(buf, "(")?;
				for (i, t) in t.iter().enumerate() {
					if i != 0 {
						write!(buf, ",")?;
					}
					t.selector_ty_buf(buf)?;
				}
				write!(buf, ")")
			}
			AbiType::Vec(v) => {
				v.selector_ty_buf(buf)?;
				write!(buf, "[]")
			}
			AbiType::Array(v, len) => {
				v.selector_ty_buf(buf)?;
				write!(buf, "[{}]", len)
			}
		}
	}
	fn selector_ty(&self) -> String {
		let mut out = String::new();
		self.selector_ty_buf(&mut out).expect("no fmt error");
		out
	}
}
impl ToTokens for AbiType {
	fn to_tokens(&self, tokens: &mut proc_macro2::TokenStream) {
		match self {
			AbiType::Plain(t) => tokens.extend(quote! {#t}),
			AbiType::Tuple(t) => {
				tokens.extend(quote! {(
					#(#t),*
				)});
			}
			AbiType::Vec(v) => tokens.extend(quote! {Vec<#v>}),
			AbiType::Array(v, l) => tokens.extend(quote! {[#v; #l]}),
		}
	}
}

struct MethodArg {
	name: Ident,
	camel_name: String,
	ty: AbiType,
}
impl MethodArg {
	fn try_from(value: &PatType) -> syn::Result<Self> {
		let name = parse_ident_from_pat(&value.pat)?.clone();
		Ok(Self {
			camel_name: cases::camelcase::to_camel_case(&name.to_string()),
			name,
			ty: AbiType::try_maybe_special_from(&value.ty)?,
		})
	}
	fn is_value(&self) -> bool {
		self.ty.is_value()
	}
	fn is_caller(&self) -> bool {
		self.ty.is_caller()
	}
	fn is_special(&self) -> bool {
		self.ty.is_special()
	}
	fn selector_ty(&self) -> String {
		assert!(!self.is_special());
		self.ty.selector_ty()
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

	fn expand_solidity_argument(&self) -> proc_macro2::TokenStream {
		let camel_name = &self.camel_name.to_string();
		let ty = &self.ty;
		quote! {
			<NamedArgument<#ty>>::new(#camel_name)
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

	fn expand_solidity_function(&self) -> proc_macro2::TokenStream {
		let camel_name = &self.camel_name;
		let mutability = match self.mutability {
			Mutability::Mutable => quote! {SolidityMutability::Mutable},
			Mutability::View => quote! { SolidityMutability::View },
			Mutability::Pure => quote! {SolidityMutability::Pure},
		};
		let result = &self.result;

		let args = self
			.args
			.iter()
			.filter(|a| !a.is_special())
			.map(MethodArg::expand_solidity_argument);
		let selector = format!("{} {:0>8x}", self.selector_str, self.selector);

		quote! {
			SolidityFunction {
				selector: #selector,
				name: #camel_name,
				mutability: #mutability,
				args: (
					#(
						#args,
					)*
				),
				result: <UnnamedArgument<#result>>::default(),
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

		let solidity_name = self.info.name.to_string();
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
		let solidity_functions = self.methods.iter().map(Method::expand_solidity_function);

		// TODO: Inline inline_is
		let solidity_is = self
			.info
			.is
			.0
			.iter()
			.chain(self.info.inline_is.0.iter())
			.map(|is| is.name.to_string());
		let solidity_events_is = self.info.events.0.iter().map(|is| is.name.to_string());
		let solidity_generators = self
			.info
			.is
			.0
			.iter()
			.chain(self.info.inline_is.0.iter())
			.map(Is::expand_generator);
		let solidity_event_generators = self.info.events.0.iter().map(Is::expand_event_generator);

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
				pub fn generate_solidity_interface(tc: &evm_coder::solidity::TypeCollector, is_impl: bool) {
					use evm_coder::solidity::*;
					use core::fmt::Write;
					let interface = SolidityInterface {
						name: #solidity_name,
						is: &["Dummy", #(
							#solidity_is,
						)* #(
							#solidity_events_is,
						)* ],
						functions: (#(
							#solidity_functions,
						)*),
					};
					if is_impl {
						tc.collect("// Common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\n".into());
					} else {
						tc.collect("// Common stubs holder\ninterface Dummy {\n}\n".into());
					}
					#(
						#solidity_generators
					)*
					#(
						#solidity_event_generators
					)*

					let mut out = string::new();
					// In solidity interface usage (is) should be preceeded by interface definition
					// This comment helps to sort it in a set
					if #solidity_name.starts_with("Inline") {
						out.push_str("// Inline\n");
					}
					let _ = interface.format(is_impl, &mut out, tc);
					tc.collect(out);
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
