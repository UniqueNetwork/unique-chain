#[cfg(not(feature = "std"))]
use alloc::string::{String, ToString};
use evm_core::{ExitError, ExitFatal};
#[cfg(feature = "std")]
use std::string::{String, ToString};

use crate::Weight;

#[derive(Debug, Clone)]
pub enum Error {
	Revert(String),
	Fatal(ExitFatal),
	Error(ExitError),
}

impl<E> From<E> for Error
where
	E: ToString,
{
	fn from(e: E) -> Self {
		Self::Revert(e.to_string())
	}
}

pub type Result<T> = core::result::Result<T, Error>;

pub struct DispatchInfo {
	pub weight: Weight,
}

impl From<Weight> for DispatchInfo {
	fn from(weight: Weight) -> Self {
		Self { weight }
	}
}
impl From<()> for DispatchInfo {
	fn from(_: ()) -> Self {
		Self { weight: 0 }
	}
}

#[derive(Default, Clone)]
pub struct PostDispatchInfo {
	actual_weight: Option<Weight>,
}

impl PostDispatchInfo {
	pub fn calc_unspent(&self, info: &DispatchInfo) -> Weight {
		info.weight - self.calc_actual_weight(info)
	}

	pub fn calc_actual_weight(&self, info: &DispatchInfo) -> Weight {
		if let Some(actual_weight) = self.actual_weight {
			actual_weight.min(info.weight)
		} else {
			info.weight
		}
	}
}

#[derive(Clone)]
pub struct WithPostDispatchInfo<T> {
	pub data: T,
	pub post_info: PostDispatchInfo,
}

impl<T> From<T> for WithPostDispatchInfo<T> {
	fn from(data: T) -> Self {
		Self {
			data,
			post_info: Default::default(),
		}
	}
}

pub type ResultWithPostInfo<T> =
	core::result::Result<WithPostDispatchInfo<T>, WithPostDispatchInfo<Error>>;
