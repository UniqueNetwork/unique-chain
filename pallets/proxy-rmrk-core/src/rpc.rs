use super::*;

pub fn last_collection_idx<T: Config>() -> Result<RmrkCollectionId, DispatchError> {
	Ok(<Pallet<T>>::last_collection_idx())
}

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
				let is_pending = <Pallet<T>>::get_nft_property_decoded(
					child_collection,
					child_token,
					RmrkProperty::PendingNftAccept,
				)
				.ok()?;

				if is_pending {
					return None;
				}

				let rmrk_child_collection =
					<Pallet<T>>::rmrk_collection_id(child_collection).ok()?;

				Some(RmrkNftChild {
					collection_id: rmrk_child_collection,
					nft_id: child_token.0,
				})
			})
			.collect(),
	)
}

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
	.filter_map(|(_, value)| {
		let resource_info: RmrkResourceInfo = <Pallet<T>>::decode_property(&value).ok()?;

		Some(resource_info)
	})
	.collect();

	Ok(resources)
}

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
