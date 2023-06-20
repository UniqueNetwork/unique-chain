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

//! # Structure Pallet
//!
//! The Structure pallet provides functionality for handling tokens nesting an unnesting.
//!
//! - [`Config`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! The Structure pallet provides functions for:
//!
//! - Searching for token parents, children and owners. Actual implementation of searching for
//!   parent/child is done by pallets corresponding to token's collection type.
//! - Nesting and unnesting tokens. Actual implementation of nesting is done by pallets corresponding
//!   to token's collection type.
//!
//! ### Terminology
//!
//! - **Nesting:** Setting up parent-child relationship between tokens. Nested tokens are inhereting
//!   owner from their parent. There could be multiple levels of nesting. Token couldn't be nested in
//!   it's child token i.e. parent-child relationship graph shouldn't have
//!
//! - **Parent:** Token that current token is nested in.
//!
//! - **Owner:** Account that owns the token and all nested tokens.
//!
//! ## Interface
//!
//! ### Available Functions
//!
//! - `find_parent` - Find parent of the token. It could be an account or another token.
//! - `parent_chain` - Find chain of parents of the token.
//! - `find_topmost_owner` - Find account or token in the end of the chain of parents.
//! - `check_nesting` - Check if the token could be nested in the other token
//! - `nest_if_sent_to_token` - Nest the token in the other token
//! - `unnest_if_nested` - Unnest the token from the other token

#![cfg_attr(not(feature = "std"), no_std)]

use pallet_common::CommonCollectionOperations;
use pallet_common::{erc::CrossAccountId, eth::is_collection};
use sp_std::collections::btree_set::BTreeSet;

use frame_support::dispatch::{DispatchError, DispatchResult, DispatchResultWithPostInfo};
use frame_support::fail;
pub use pallet::*;
use pallet_common::{dispatch::CollectionDispatch};
use up_data_structs::{
	CollectionId, TokenId, mapping::TokenAddressMapping, budget::Budget, TokenOwnerError,
};

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod weights;

pub type SelfWeightOf<T> = <T as crate::Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use frame_support::Parameter;
	use frame_support::dispatch::{GetDispatchInfo, UnfilteredDispatchable};
	use frame_support::pallet_prelude::*;

	use super::*;

	#[pallet::error]
	pub enum Error<T> {
		/// While nesting, encountered an already checked account, detecting a loop.
		OuroborosDetected,
		/// While nesting, reached the depth limit of nesting, exceeding the provided budget.
		DepthLimit,
		/// While nesting, reached the breadth limit of nesting, exceeding the provided budget.
		BreadthLimit,
		/// Couldn't find the token owner that is itself a token.
		TokenNotFound,
		/// Tried to nest token under collection contract address, instead of token address
		CantNestTokenUnderCollection,
	}

	#[pallet::event]
	pub enum Event<T> {
		/// Executed call on behalf of the token.
		Executed(DispatchResult),
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config {
		type WeightInfo: weights::WeightInfo;
		type RuntimeEvent: IsType<<Self as frame_system::Config>::RuntimeEvent> + From<Event<Self>>;
		type RuntimeCall: Parameter
			+ UnfilteredDispatchable<RuntimeOrigin = Self::RuntimeOrigin>
			+ GetDispatchInfo;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		// #[pallet::weight({
		// 	let dispatch_info = call.get_dispatch_info();

		// 	(
		// 		dispatch_info.weight
		// 			// Cost of dereferencing parent
		// 			.saturating_add(T::DbWeight::get().reads(2 * *max_depth as Weight))
		// 			.saturating_add(4000 * *max_depth as Weight),
		// 		dispatch_info.class)
		// })]
		// pub fn execute(
		// 	origin: OriginFor<T>,
		// 	call: Box<<T as Config>::Call>,
		// 	max_depth: u32,
		// ) -> DispatchResult {
	}
}

#[derive(PartialEq)]
pub enum Parent<CrossAccountId> {
	/// Token owned by a normal account.
	User(CrossAccountId),
	/// Could not find the token provided as the owner.
	TokenNotFound,
	/// Nested token has multiple owners.
	MultipleOwners,
	/// Token owner is another token (still, the target token may not exist).
	Token(CollectionId, TokenId),
}

impl<T: Config> Pallet<T> {
	/// Find account owning the `token` or a token that the `token` is nested in.
	///
	/// Returns the enum that have three variants:
	/// - [`User`](crate::Parent<T>::User): Contains account.
	/// - [`Token`](crate::Parent<T>::Token): Contains token id and collection id.
	/// - [`TokenNotFound`](crate::Parent<T>::TokenNotFound): Indicates that parent was not found
	pub fn find_parent(
		collection: CollectionId,
		token: TokenId,
	) -> Result<Parent<T::CrossAccountId>, DispatchError> {
		// TODO: Reduce cost by not reading collection config
		let handle = match T::CollectionDispatch::dispatch(collection) {
			Ok(v) => v,
			Err(_) => return Ok(Parent::TokenNotFound),
		};
		let handle = handle.as_dyn();

		Ok(match handle.token_owner(token) {
			Ok(owner) => match T::CrossTokenAddressMapping::address_to_token(&owner) {
				Some((collection, token)) => Parent::Token(collection, token),
				None => Parent::User(owner),
			},
			Err(TokenOwnerError::MultipleOwners) => Parent::MultipleOwners,
			Err(TokenOwnerError::NotFound) => Parent::TokenNotFound,
		})
	}

	/// Get the chain of parents of a token in the nesting hierarchy
	///
	/// Returns an iterator of addresses of the owning tokens and the owning account,
	/// starting from the immediate parent token, ending with the account.
	/// Returns error if cycle is detected.
	pub fn parent_chain(
		mut collection: CollectionId,
		mut token: TokenId,
	) -> impl Iterator<Item = Result<Parent<T::CrossAccountId>, DispatchError>> {
		let mut finished = false;
		let mut visited = BTreeSet::new();
		visited.insert((collection, token));
		core::iter::from_fn(move || {
			if finished {
				return None;
			}
			let parent = Self::find_parent(collection, token);
			match parent {
				Ok(Parent::Token(new_collection, new_token)) => {
					collection = new_collection;
					token = new_token;
					if !visited.insert((new_collection, new_token)) {
						finished = true;
						return Some(Err(<Error<T>>::OuroborosDetected.into()));
					}
				}
				_ => finished = true,
			}
			Some(parent as Result<_, DispatchError>)
		})
	}

	/// Try to dereference address, until finding top level owner
	///
	/// May return token address if parent token not yet exists
	///
	/// Returns `None` if the token has multiple owners.
	///
	/// - `budget`: Limit for searching parents in depth.
	pub fn find_topmost_owner(
		collection: CollectionId,
		token: TokenId,
		budget: &dyn Budget,
	) -> Result<Option<T::CrossAccountId>, DispatchError> {
		let owner = Self::parent_chain(collection, token)
			.take_while(|_| budget.consume())
			.find(|p| {
				matches!(
					p,
					Ok(Parent::User(_) | Parent::TokenNotFound | Parent::MultipleOwners)
				)
			})
			.ok_or(<Error<T>>::DepthLimit)??;

		Ok(match owner {
			Parent::User(v) => Some(v),
			Parent::MultipleOwners => None,
			_ => fail!(<Error<T>>::TokenNotFound),
		})
	}

	/// Find the topmost parent and check that assigning `for_nest` token as a child for
	/// `token` wouldn't create a cycle.
	///
	/// Returns `None` if the token has multiple owners.
	///
	/// - `budget`: Limit for searching parents in depth.
	pub fn get_checked_topmost_owner(
		collection: CollectionId,
		token: TokenId,
		for_nest: Option<(CollectionId, TokenId)>,
		budget: &dyn Budget,
	) -> Result<Option<T::CrossAccountId>, DispatchError> {
		// Tried to nest token in itself
		if Some((collection, token)) == for_nest {
			return Err(<Error<T>>::OuroborosDetected.into());
		}

		for parent in Self::parent_chain(collection, token).take_while(|_| budget.consume()) {
			match parent? {
				// Tried to nest token in chain, which has this token as one of parents
				Parent::Token(collection, token) if Some((collection, token)) == for_nest => {
					return Err(<Error<T>>::OuroborosDetected.into())
				}
				// Token is owned by other user
				Parent::User(user) => return Ok(Some(user)),
				Parent::TokenNotFound => return Err(<Error<T>>::TokenNotFound.into()),
				Parent::MultipleOwners => return Ok(None),
				// Continue parent chain
				Parent::Token(_, _) => {}
			}
		}

		Err(<Error<T>>::DepthLimit.into())
	}

	/// Burn token and all of it's nested tokens
	///
	/// - `self_budget`: Limit for searching children in depth.
	/// - `breadth_budget`: Limit of breadth of searching children.
	pub fn burn_item_recursively(
		from: T::CrossAccountId,
		collection: CollectionId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let dispatch = T::CollectionDispatch::dispatch(collection)?;
		let dispatch = dispatch.as_dyn();
		dispatch.burn_item_recursively(from.clone(), token, self_budget, breadth_budget)
	}

	/// Check if `token` indirectly owned by `user`
	///
	/// Returns `true` if `user` is `token`'s owner. Or If token is provided as `user` then
	/// check that `user` and `token` have same owner.
	/// Checks that assigning `for_nest` token as a child for `token` wouldn't create a cycle.
	///
	/// - `budget`: Limit for searching parents in depth.
	pub fn check_indirectly_owned(
		user: T::CrossAccountId,
		collection: CollectionId,
		token: TokenId,
		for_nest: Option<(CollectionId, TokenId)>,
		budget: &dyn Budget,
	) -> Result<bool, DispatchError> {
		let target_parent = match T::CrossTokenAddressMapping::address_to_token(&user) {
			Some((collection, token)) => match Self::find_topmost_owner(collection, token, budget)?
			{
				Some(topmost_owner) => topmost_owner,
				None => return Ok(false),
			},
			None => user,
		};

		Self::get_checked_topmost_owner(collection, token, for_nest, budget).map(|indirect_owner| {
			indirect_owner.map_or(false, |indirect_owner| indirect_owner == target_parent)
		})
	}

	/// Checks that `under` is valid token and that `token_id` could be nested under it
	/// and that `from` is `under`'s owner
	///
	/// Returns OK if `under` is not a token
	///
	/// - `nesting_budget`: Limit for searching parents in depth.
	pub fn check_nesting(
		from: T::CrossAccountId,
		under: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::try_exec_if_token(under, |collection, parent_id| {
			collection.check_nesting(from, (collection_id, token_id), parent_id, nesting_budget)
		})
	}

	/// Nests `token_id` under `under` token
	///
	/// Returns OK if `under` is not a token. Checks that nesting is possible.
	///
	/// - `nesting_budget`: Limit for searching parents in depth.
	pub fn nest_if_sent_to_token(
		from: T::CrossAccountId,
		under: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::try_exec_if_token(under, |collection, parent_id| {
			collection.check_nesting(from, (collection_id, token_id), parent_id, nesting_budget)?;

			collection.nest(parent_id, (collection_id, token_id));

			Ok(())
		})
	}

	/// Nests `token_id` under `owner` token
	///
	/// Caller should check that nesting wouldn't cause recursion in nesting
	pub fn nest_if_sent_to_token_unchecked(
		owner: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
	) {
		Self::exec_if_token(owner, |collection, parent_id| {
			collection.nest(parent_id, (collection_id, token_id))
		});
	}

	/// Unnests `token_id` from `owner`.
	pub fn unnest_if_nested(
		owner: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
	) {
		if let Err(e) = Self::try_exec_if_token(owner, |collection, parent_id| {
			collection.unnest(parent_id, (collection_id, token_id));
			Ok(())
		}) {
			log::warn!("unnest precondition failed: {e:?}")
		}
	}

	/// # Panics
	/// If [`Self::try_exec_if_token`] fails
	fn exec_if_token(
		account: &T::CrossAccountId,
		action: impl FnOnce(&dyn CommonCollectionOperations<T>, TokenId),
	) {
		Self::try_exec_if_token(account, |collection, id| {
			action(collection, id);
			Ok(())
		})
		.unwrap();
	}

	/// If `account` is a token address, execute `action` providing found collection as an argument
	/// Token may not exist, it is expected it will be checked in the callback.
	fn try_exec_if_token(
		account: &T::CrossAccountId,
		action: impl FnOnce(&dyn CommonCollectionOperations<T>, TokenId) -> DispatchResult,
	) -> DispatchResult {
		if is_collection(&account.as_eth()) {
			fail!(<Error<T>>::CantNestTokenUnderCollection);
		}
		let Some((collection, token)) = T::CrossTokenAddressMapping::address_to_token(account) else {
			return Ok(())
		};

		let dispatch = T::CollectionDispatch::dispatch(collection)?;
		let dispatch = dispatch.as_dyn();

		action(dispatch, token)
	}
}
