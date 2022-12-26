use super::TypeCollector;
use core::fmt;

pub trait SolidityTypeName: 'static {
	fn solidity_name(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	/// "simple" types are stored inline, no `memory` modifier should be used in solidity
	fn is_simple() -> bool;
	fn solidity_default(writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	/// Specialization
	fn is_void() -> bool {
		false
	}
}

pub trait SolidityTupleTy: 'static {
	fn fields(tc: &TypeCollector) -> Vec<String>;
	fn len() -> usize;
}
pub trait SolidityStructTy: 'static {
	fn generate_solidity_interface(tc: &TypeCollector) -> String;
}
pub trait SolidityEnumTy: 'static {
	fn generate_solidity_interface(tc: &TypeCollector) -> String;
	fn solidity_option(&self) -> &str;
}

pub trait SolidityArguments {
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	fn solidity_get(&self, prefix: &str, writer: &mut impl fmt::Write) -> fmt::Result;
	fn solidity_default(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	fn is_empty(&self) -> bool {
		self.len() == 0
	}
	fn len(&self) -> usize;
}

pub trait SolidityFunctions {
	fn solidity_name(
		&self,
		is_impl: bool,
		writer: &mut impl fmt::Write,
		tc: &TypeCollector,
	) -> fmt::Result;
}

pub trait SolidityItems {
	fn solidity_name(&self, writer: &mut impl fmt::Write, tc: &TypeCollector) -> fmt::Result;
	// For PhantomData fields
	// fn is_void()
}
