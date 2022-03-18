#![cfg_attr(not(feature = "std"), no_std)]

use sp_std::collections::btree_set::BTreeSet;

use frame_support::dispatch::DispatchError;
use frame_support::fail;
pub use pallet::*;
use pallet_common::{dispatch::CollectionDispatch, CollectionHandle};
use up_data_structs::{CollectionId, TokenId, mapping::TokenAddressMapping};

#[frame_support::pallet]
pub mod pallet {
	use frame_support::Parameter;
	use frame_support::dispatch::{GetDispatchInfo, UnfilteredDispatchable};
	use frame_support::pallet_prelude::*;
	use frame_system::pallet_prelude::*;

	use super::*;

	#[pallet::error]
	pub enum Error<T> {
		/// While searched for owner, got already checked account
		OuroborosDetected,
		/// While searched for owner, encountered depth limit
		DepthLimit,
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
	Normal(CrossAccountId),
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
				None => Parent::Normal(owner),
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
		max_depth: u32,
	) -> Result<T::CrossAccountId, DispatchError> {
		let owner = Self::parent_chain(collection, token)
			.take(max_depth as usize)
			.find(|p| matches!(p, Ok(Parent::Normal(_) | Parent::TokenNotFound)))
			.ok_or(<Error<T>>::DepthLimit)??;

		Ok(match owner {
			Parent::Normal(v) => v,
			_ => fail!(<Error<T>>::TokenNotFound),
		})
	}

	/// Check if token indirectly owned by specified user
	pub fn indirectly_owned(
		user: T::CrossAccountId,
		collection: CollectionId,
		token: TokenId,
		max_depth: u32,
	) -> Result<bool, DispatchError> {
		let target_parent = match T::CrossTokenAddressMapping::address_to_token(&user) {
			Some((collection, token)) => Parent::Token(collection, token),
			None => Parent::Normal(user),
		};

		Ok(Self::parent_chain(collection, token)
			.take(max_depth as usize)
			.any(|parent| Ok(&target_parent) == parent.as_ref()))
	}
}
