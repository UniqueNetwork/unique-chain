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

//! Realizations of RMRK RPCs (remote procedure calls) related to the Core pallet.

use super::*;

/// Get the latest created collection ID.
pub fn last_collection_idx<T: Config>() -> Result<RmrkCollectionId, DispatchError> {
	Ok(<Pallet<T>>::last_collection_idx())
}

/// Get collection info by ID.
pub fn collection_by_id<T: Config>(
	collection_id: RmrkCollectionId,
) -> Result<Option<RmrkCollectionInfo<T::AccountId>>, DispatchError> {
	let (collection, collection_id) = match <Pallet<T>>::get_typed_nft_collection_mapped(
		collection_id,
		misc::CollectionType::Regular,
	) {
		Ok(c) => c,
		Err(_) => return Ok(None),
	};

	let nfts_count = collection.total_supply();

	Ok(Some(RmrkCollectionInfo {
		issuer: collection.owner.clone(),
		metadata: <Pallet<T>>::get_collection_property_decoded(
			collection_id,
			RmrkProperty::Metadata,
		)?,
		max: collection.limits.token_limit,
		symbol: <Pallet<T>>::rebind(&collection.token_prefix)?,
		nfts_count,
	}))
}

/// Get NFT info by collection and NFT IDs.
pub fn nft_by_id<T: Config>(
	collection_id: RmrkCollectionId,
	nft_by_id: RmrkNftId,
) -> Result<Option<RmrkInstanceInfo<T::AccountId>>, DispatchError> {
	let (collection, collection_id) = match <Pallet<T>>::get_typed_nft_collection_mapped(
		collection_id,
		misc::CollectionType::Regular,
	) {
		Ok(c) => c,
		Err(_) => return Ok(None),
	};

	let nft_id = TokenId(nft_by_id);
	if !<Pallet<T>>::nft_exists(collection_id, nft_id) {
		return Ok(None);
	}

	let owner = match collection.token_owner(nft_id) {
		Some(owner) => match T::CrossTokenAddressMapping::address_to_token(&owner) {
			Some((col, tok)) => {
				let rmrk_collection = <Pallet<T>>::rmrk_collection_id(col)?;

				RmrkAccountIdOrCollectionNftTuple::CollectionAndNftTuple(rmrk_collection, tok.0)
			}
			None => RmrkAccountIdOrCollectionNftTuple::AccountId(owner.as_sub().clone()),
		},
		None => return Ok(None),
	};

	Ok(Some(RmrkInstanceInfo {
		owner: owner,
		royalty: <Pallet<T>>::get_nft_property_decoded(
			collection_id,
			nft_id,
			RmrkProperty::RoyaltyInfo,
		)?,
		metadata: <Pallet<T>>::get_nft_property_decoded(
			collection_id,
			nft_id,
			RmrkProperty::Metadata,
		)?,
		equipped: <Pallet<T>>::get_nft_property_decoded(
			collection_id,
			nft_id,
			RmrkProperty::Equipped,
		)?,
		pending: <Pallet<T>>::get_nft_property_decoded(
			collection_id,
			nft_id,
			RmrkProperty::PendingNftAccept,
		)?,
	}))
}

/// Get tokens owned by an account in a collection.
pub fn account_tokens<T: Config>(
	account_id: T::AccountId,
	collection_id: RmrkCollectionId,
) -> Result<Vec<RmrkNftId>, DispatchError> {
	let cross_account_id = CrossAccountId::from_sub(account_id);

	let (collection, collection_id) = match <Pallet<T>>::get_typed_nft_collection_mapped(
		collection_id,
		misc::CollectionType::Regular,
	) {
		Ok(c) => c,
		Err(_) => return Ok(Vec::new()),
	};

	let tokens = collection
		.account_tokens(cross_account_id)
		.into_iter()
		.filter(|token| {
			let is_pending = <Pallet<T>>::get_nft_property_decoded(
				collection_id,
				*token,
				RmrkProperty::PendingNftAccept,
			)
			.unwrap_or(true);

			!is_pending
		})
		.map(|token| token.0)
		.collect();

	Ok(tokens)
}

/// Get tokens nested in an NFT - its direct children (not the children's children).
pub fn nft_children<T: Config>(
	collection_id: RmrkCollectionId,
	nft_id: RmrkNftId,
) -> Result<Vec<RmrkNftChild>, DispatchError> {
	let collection_id = match <Pallet<T>>::unique_collection_id(collection_id) {
		Ok(id) => id,
		Err(_) => return Ok(Vec::new()),
	};
	let nft_id = TokenId(nft_id);
	if !<Pallet<T>>::nft_exists(collection_id, nft_id) {
		return Ok(Vec::new());
	}

	Ok(
		pallet_nonfungible::TokenChildren::<T>::iter_prefix((collection_id, nft_id))
			.filter_map(|((child_collection, child_token), _)| {
				let rmrk_child_collection =
					<Pallet<T>>::rmrk_collection_id(child_collection).ok()?;

				Some(RmrkNftChild {
					collection_id: rmrk_child_collection,
					nft_id: child_token.0,
				})
			})
			.chain(
				<Pallet<T>>::iterate_pending_children(collection_id, nft_id)?.map(
					|(child_collection, child_nft_id)| RmrkNftChild {
						collection_id: child_collection,
						nft_id: child_nft_id,
					},
				),
			)
			.collect(),
	)
}

/// Get collection properties, created by the user - not the proxy-specific properties.
pub fn collection_properties<T: Config>(
	collection_id: RmrkCollectionId,
	filter_keys: Option<Vec<RmrkPropertyKey>>,
) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
	let collection_id = match <Pallet<T>>::unique_collection_id(collection_id) {
		Ok(id) => id,
		Err(_) => return Ok(Vec::new()),
	};
	if <Pallet<T>>::ensure_collection_type(collection_id, misc::CollectionType::Regular).is_err() {
		return Ok(Vec::new());
	}

	let properties = <Pallet<T>>::filter_user_properties(
		collection_id,
		/* token_id = */ None,
		filter_keys,
		|key, value| RmrkPropertyInfo { key, value },
	)?;

	Ok(properties)
}

/// Get NFT properties, created by the user - not the proxy-specific properties.
pub fn nft_properties<T: Config>(
	collection_id: RmrkCollectionId,
	nft_id: RmrkNftId,
	filter_keys: Option<Vec<RmrkPropertyKey>>,
) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
	let collection_id = match <Pallet<T>>::unique_collection_id(collection_id) {
		Ok(id) => id,
		Err(_) => return Ok(Vec::new()),
	};
	let token_id = TokenId(nft_id);

	if <Pallet<T>>::ensure_nft_type(collection_id, token_id, NftType::Regular).is_err() {
		return Ok(Vec::new());
	}

	let properties = <Pallet<T>>::filter_user_properties(
		collection_id,
		Some(token_id),
		filter_keys,
		|key, value| RmrkPropertyInfo { key, value },
	)?;

	Ok(properties)
}

/// Get data of resources of an NFT.
pub fn nft_resources<T: Config>(
	collection_id: RmrkCollectionId,
	nft_id: RmrkNftId,
) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
	let collection_id = match <Pallet<T>>::unique_collection_id(collection_id) {
		Ok(id) => id,
		Err(_) => return Ok(Vec::new()),
	};
	if <Pallet<T>>::ensure_collection_type(collection_id, misc::CollectionType::Regular).is_err() {
		return Ok(Vec::new());
	}

	let nft_id = TokenId(nft_id);
	if <Pallet<T>>::ensure_nft_type(collection_id, nft_id, NftType::Regular).is_err() {
		return Ok(Vec::new());
	}

	let resources = <pallet_nonfungible::Pallet<T>>::iterate_token_aux_properties(
		collection_id,
		nft_id,
		PropertyScope::Rmrk,
	)
	.filter_map(|(key, value)| {
		if !is_valid_key_prefix(&key, RESOURCE_ID_PREFIX) {
			return None;
		}

		let resource_info: RmrkResourceInfo = <Pallet<T>>::decode_property_value(&value).ok()?;

		Some(resource_info)
	})
	.collect();

	Ok(resources)
}

/// Get the priority of a resource in an NFT.
pub fn nft_resource_priority<T: Config>(
	collection_id: RmrkCollectionId,
	nft_id: RmrkNftId,
	resource_id: RmrkResourceId,
) -> Result<Option<u32>, DispatchError> {
	let collection_id = match <Pallet<T>>::unique_collection_id(collection_id) {
		Ok(id) => id,
		Err(_) => return Ok(None),
	};
	if <Pallet<T>>::ensure_collection_type(collection_id, misc::CollectionType::Regular).is_err() {
		return Ok(None);
	}

	let nft_id = TokenId(nft_id);
	if <Pallet<T>>::ensure_nft_type(collection_id, nft_id, NftType::Regular).is_err() {
		return Ok(None);
	}

	let priorities: Vec<_> = <Pallet<T>>::get_nft_property_decoded(
		collection_id,
		nft_id,
		RmrkProperty::ResourcePriorities,
	)?;
	Ok(priorities
		.into_iter()
		.enumerate()
		.find(|(_, id)| *id == resource_id)
		.map(|(priority, _): (usize, RmrkResourceId)| priority as u32))
}
