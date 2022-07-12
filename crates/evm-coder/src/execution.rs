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

//! Contract execution related types

#[cfg(not(feature = "std"))]
use alloc::string::{String, ToString};
use evm_core::{ExitError, ExitFatal};
#[cfg(feature = "std")]
use std::string::{String, ToString};

use crate::Weight;

/// Execution error, should be convertible between EVM and Substrate.
#[derive(Debug, Clone)]
pub enum Error {
	/// Non-fatal contract error occured
	Revert(String),
	/// EVM fatal error
	Fatal(ExitFatal),
	/// EVM normal error
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

/// To be used in [`crate::solidity_interface`] implementation.
pub type Result<T> = core::result::Result<T, Error>;

/// Static information collected from [`crate::weight`].
pub struct DispatchInfo {
	/// Statically predicted call weight
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

/// Weight information that is only available post dispatch.
/// Note: This can only be used to reduce the weight or fee, not increase it.
#[derive(Default, Clone)]
pub struct PostDispatchInfo {
	/// Actual weight consumed by call
	actual_weight: Option<Weight>,
}

impl PostDispatchInfo {
	/// Calculate amount to be returned back to user
	pub fn calc_unspent(&self, info: &DispatchInfo) -> Weight {
		info.weight - self.calc_actual_weight(info)
	}

	/// Calculate actual cansumed weight, saturating to weight reported
	/// pre-dispatch
	pub fn calc_actual_weight(&self, info: &DispatchInfo) -> Weight {
		if let Some(actual_weight) = self.actual_weight {
			actual_weight.min(info.weight)
		} else {
			info.weight
		}
	}
}

/// Wrapper for PostDispatchInfo and any user-provided data
#[derive(Clone)]
pub struct WithPostDispatchInfo<T> {
	/// User provided data
	pub data: T,
	/// Info known after dispatch
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

/// Return type of items in [`crate::solidity_interface`] definition
pub type ResultWithPostInfo<T> =
	core::result::Result<WithPostDispatchInfo<T>, WithPostDispatchInfo<Error>>;
