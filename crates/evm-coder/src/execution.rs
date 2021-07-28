#[cfg(not(feature = "std"))]
use alloc::string::{String, ToString};
use evm_core::{ExitError, ExitFatal};
#[cfg(feature = "std")]
use std::string::{String, ToString};

#[derive(Debug)]
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
