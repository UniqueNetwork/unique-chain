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
#[cfg(feature = "std")]
use std::string::{String, ToString};

use evm_coder::ERC165Call;
pub use evm_coder_substrate_procedural::PreDispatch;
use evm_core::{ExitError, ExitFatal};
pub use frame_support::weights::Weight;

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
/// Return type of items in [`crate::solidity_interface`] definition
pub type ResultWithPostInfo<T> =
	core::result::Result<WithPostDispatchInfo<T>, WithPostDispatchInfo<Error>>;

pub trait PreDispatch {
	fn dispatch_info(&self) -> DispatchInfo;
}

impl PreDispatch for ERC165Call {
	fn dispatch_info(&self) -> DispatchInfo {
		DispatchInfo {
			// ERC165 impl should be cheap
			weight: Weight::from_parts(200, 0),
		}
	}
}

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
// TODO: use 2-dimensional weight after frontier upgrade
impl From<u64> for DispatchInfo {
	fn from(weight: u64) -> Self {
		Self {
			weight: Weight::from_parts(weight, 0),
		}
	}
}
impl From<()> for DispatchInfo {
	fn from(_: ()) -> Self {
		Self {
			weight: Weight::zero(),
		}
	}
}

/// Weight information that is only available post dispatch.
/// Note: This can only be used to reduce the weight or fee, not increase it.
#[derive(Default, Clone)]
pub struct PostDispatchInfo {
	/// Actual weight consumed by call
	pub actual_weight: Option<Weight>,
}

impl PostDispatchInfo {
	/// Calculate amount to be returned back to user
	pub fn calc_unspent(&self, info: &DispatchInfo) -> Weight {
		info.weight - self.calc_actual_weight(info)
	}

	/// Calculate actual consumed weight, saturating to weight reported
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
#[allow(clippy::crate_in_macro_def)]
#[macro_export]
macro_rules! frontier_contract {
	(
		macro_rules! $res:ident {...}
		impl$(<$($gen:ident $(: $($(+)? $bound:ty)*)?),+ $(,)?>)? Contract for $ty:ty {...}
	) => {
		/// Generate macro to convert function return value into Contract result
		macro_rules! $res {
			($i:expr) => {{
				pallet_evm_coder_substrate::spez! {
					for res = $i;
					match<T> ::pallet_evm_coder_substrate::execution::ResultWithPostInfo<T> -> ::pallet_evm_coder_substrate::execution::ResultWithPostInfo<T> {
						res
					}
					match<T> ::pallet_evm_coder_substrate::execution::Result<T> -> ::pallet_evm_coder_substrate::execution::ResultWithPostInfo<T> {
						res
							.map(pallet_evm_coder_substrate::execution::WithPostDispatchInfo::from)
							.map_err(pallet_evm_coder_substrate::execution::WithPostDispatchInfo::from)
					}
					match<T> T -> ::pallet_evm_coder_substrate::execution::ResultWithPostInfo<T> {
						Ok(pallet_evm_coder_substrate::execution::WithPostDispatchInfo::from(res))
					}
				}
			}};
		}
		impl $(<$($gen),+>)? $crate::Contract for $ty where T: crate::Config {
			type Error = ::pallet_evm_coder_substrate::execution::Error;
			type WithPostInfo<R> = ::pallet_evm_coder_substrate::execution::WithPostDispatchInfo<R>;
			type Result<R, E> = core::result::Result<R, E>;
			fn map_post<I, O>(
				v: Self::WithPostInfo<I>,
				mapper: impl FnOnce(I) -> O,
			) -> Self::WithPostInfo<O> {
				::pallet_evm_coder_substrate::execution::WithPostDispatchInfo {
					data: mapper(v.data),
					post_info: v.post_info,
				}
			}
			fn with_default_post<V>(v: V) -> Self::WithPostInfo<V> {
				::pallet_evm_coder_substrate::execution::WithPostDispatchInfo {
					data: v,
					post_info: ::pallet_evm_coder_substrate::execution::PostDispatchInfo {
						actual_weight: None,
					},
				}
			}
		}
	};
}
