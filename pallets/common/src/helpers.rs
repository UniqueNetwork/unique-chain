//! # Helpers module
//!
//! The module contains helpers.
//!
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, PostDispatchInfo},
	pallet_prelude::DispatchResultWithPostInfo,
	weights::Weight,
};

/// Add weight for a `DispatchResultWithPostInfo`
///
/// - `target`: DispatchResultWithPostInfo to which weight will be added
/// - `additional_weight`: Weight to be added
pub fn add_weight_to_post_info(target: &mut DispatchResultWithPostInfo, additional_weight: Weight) {
	match target {
		Ok(PostDispatchInfo {
			actual_weight: Some(weight),
			..
		})
		| Err(DispatchErrorWithPostInfo {
			post_info: PostDispatchInfo {
				actual_weight: Some(weight),
				..
			},
			..
		}) => *weight += additional_weight,
		_ => {}
	}
}
