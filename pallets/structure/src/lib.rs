#![cfg_attr(not(feature = "std"), no_std)]

use pallet_common::CommonCollectionOperations;
use sp_std::collections::btree_set::BTreeSet;

use frame_support::dispatch::{DispatchError, DispatchResult, DispatchResultWithPostInfo};
use frame_support::fail;
pub use pallet::*;
use pallet_common::{dispatch::CollectionDispatch, CollectionHandle};
use up_data_structs::{CollectionId, TokenId, mapping::TokenAddressMapping, budget::Budget};

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
		/// While searched for owner, got already checked account
		OuroborosDetected,
		/// While searched for owner, encountered depth limit
		DepthLimit,
		/// While iterating over children, encountered breadth limit
		BreadthLimit,
		/// While searched for owner, found token owner by not-yet-existing token
		TokenNotFound,
	}

	#[pallet::event]
	pub enum Event<T> {
		/// Executed call on behalf of token
		Executed(DispatchResult),
	}

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_common::Config {
		type WeightInfo: weights::WeightInfo;
		type Event: IsType<<Self as frame_system::Config>::Event> + From<Event<Self>>;
		type Call: Parameter + UnfilteredDispatchable<Origin = Self::Origin> + GetDispatchInfo;
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
	/// Token owned by normal account
	User(CrossAccountId),
	/// Passed token not found
	TokenNotFound,
	/// Token owner is another token (target token still may not exist)
	Token(CollectionId, TokenId),
}

impl<T: Config> Pallet<T> {
	pub fn find_parent(
		collection: CollectionId,
		token: TokenId,
	) -> Result<Parent<T::CrossAccountId>, DispatchError> {
		// TODO: Reduce cost by not reading collection config
		let handle = match CollectionHandle::try_get(collection) {
			Ok(v) => v,
			Err(_) => return Ok(Parent::TokenNotFound),
		};
		let handle = T::CollectionDispatch::dispatch(handle);
		let handle = handle.as_dyn();

		Ok(match handle.token_owner(token) {
			Some(owner) => match T::CrossTokenAddressMapping::address_to_token(&owner) {
				Some((collection, token)) => Parent::Token(collection, token),
				None => Parent::User(owner),
			},
			None => Parent::TokenNotFound,
		})
	}

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
	pub fn find_topmost_owner(
		collection: CollectionId,
		token: TokenId,
		budget: &dyn Budget,
	) -> Result<T::CrossAccountId, DispatchError> {
		let owner = Self::parent_chain(collection, token)
			.take_while(|_| budget.consume())
			.find(|p| matches!(p, Ok(Parent::User(_) | Parent::TokenNotFound)))
			.ok_or(<Error<T>>::DepthLimit)??;

		Ok(match owner {
			Parent::User(v) => v,
			_ => fail!(<Error<T>>::TokenNotFound),
		})
	}

	/// Check if token indirectly owned by specified user
	pub fn check_indirectly_owned(
		user: T::CrossAccountId,
		collection: CollectionId,
		token: TokenId,
		for_nest: Option<(CollectionId, TokenId)>,
		budget: &dyn Budget,
	) -> Result<bool, DispatchError> {
		let target_parent = match T::CrossTokenAddressMapping::address_to_token(&user) {
			Some((collection, token)) => Self::find_topmost_owner(collection, token, budget)?,
			None => user,
		};

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
				// Found needed parent, token is indirecty owned
				Parent::User(user) if user == target_parent => return Ok(true),
				// Token is owned by other user
				Parent::User(_) => return Ok(false),
				Parent::TokenNotFound => return Err(<Error<T>>::TokenNotFound.into()),
				// Continue parent chain
				Parent::Token(_, _) => {}
			}
		}

		Err(<Error<T>>::DepthLimit.into())
	}

	pub fn burn_item_recursively(
		from: T::CrossAccountId,
		collection: CollectionId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo {
		let handle = <CollectionHandle<T>>::try_get(collection)?;
		let dispatch = T::CollectionDispatch::dispatch(handle);
		let dispatch = dispatch.as_dyn();
		dispatch.burn_item_recursively(from.clone(), token, self_budget, breadth_budget)
	}

	pub fn check_nesting(
		from: T::CrossAccountId,
		under: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::try_exec_if_owner_is_valid_nft(under, |collection, parent_id| {
			collection.check_nesting(from, (collection_id, token_id), parent_id, nesting_budget)
		})
	}

	pub fn nest_if_sent_to_token(
		from: T::CrossAccountId,
		under: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
		nesting_budget: &dyn Budget,
	) -> DispatchResult {
		Self::try_exec_if_owner_is_valid_nft(under, |collection, parent_id| {
			collection.check_nesting(from, (collection_id, token_id), parent_id, nesting_budget)?;

			collection.nest(parent_id, (collection_id, token_id));

			Ok(())
		})
	}

	pub fn nest_if_sent_to_token_unchecked(
		owner: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
	) {
		Self::exec_if_owner_is_valid_nft(owner, |collection, parent_id| {
			collection.nest(parent_id, (collection_id, token_id))
		});
	}

	pub fn unnest_if_nested(
		owner: &T::CrossAccountId,
		collection_id: CollectionId,
		token_id: TokenId,
	) {
		Self::exec_if_owner_is_valid_nft(owner, |collection, parent_id| {
			collection.unnest(parent_id, (collection_id, token_id))
		});
	}

	fn exec_if_owner_is_valid_nft(
		account: &T::CrossAccountId,
		action: impl FnOnce(&dyn CommonCollectionOperations<T>, TokenId),
	) {
		Self::try_exec_if_owner_is_valid_nft(account, |collection, id| {
			action(collection, id);
			Ok(())
		})
		.unwrap();
	}

	fn try_exec_if_owner_is_valid_nft(
		account: &T::CrossAccountId,
		action: impl FnOnce(&dyn CommonCollectionOperations<T>, TokenId) -> DispatchResult,
	) -> DispatchResult {
		let account = T::CrossTokenAddressMapping::address_to_token(account);

		if account.is_none() {
			return Ok(());
		}

		let account = account.unwrap();

		let handle = <CollectionHandle<T>>::try_get(account.0);

		if handle.is_err() {
			return Ok(());
		}

		let handle = handle.unwrap();

		let dispatch = T::CollectionDispatch::dispatch(handle);
		let dispatch = dispatch.as_dyn();

		action(dispatch, account.1)
	}
}
