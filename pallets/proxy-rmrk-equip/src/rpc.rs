use super::*;
use pallet_rmrk_core::{misc, property::*};
use sp_std::vec::Vec;

pub fn base<T: Config>(
	base_id: RmrkBaseId,
) -> Result<Option<RmrkBaseInfo<T::AccountId>>, DispatchError> {
	let (collection, collection_id) =
		match <PalletCore<T>>::get_typed_nft_collection_mapped(base_id, misc::CollectionType::Base)
		{
			Ok(c) => c,
			Err(_) => return Ok(None),
		};

	Ok(Some(RmrkBaseInfo {
		issuer: collection.owner.clone(),
		base_type: <PalletCore<T>>::get_collection_property_decoded(
			collection_id,
			RmrkProperty::BaseType,
		)?,
		symbol: <PalletCore<T>>::rebind(&collection.token_prefix)?,
	}))
}

pub fn base_parts<T: Config>(base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
	use pallet_common::CommonCollectionOperations;

	let (collection, collection_id) =
		match <PalletCore<T>>::get_typed_nft_collection_mapped(base_id, misc::CollectionType::Base)
		{
			Ok(c) => c,
			Err(_) => return Ok(Vec::new()),
		};

	let parts = collection
		.collection_tokens()
		.into_iter()
		.filter_map(|token_id| {
			let nft_type = <PalletCore<T>>::get_nft_type(collection_id, token_id).ok()?;

			match nft_type {
				NftType::FixedPart => Some(RmrkPartType::FixedPart(RmrkFixedPart {
					id: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::ExternalPartId,
					)
					.ok()?,
					src: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::Src,
					)
					.ok()?,
					z: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::ZIndex,
					)
					.ok()?,
				})),
				NftType::SlotPart => Some(RmrkPartType::SlotPart(RmrkSlotPart {
					id: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::ExternalPartId,
					)
					.ok()?,
					src: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::Src,
					)
					.ok()?,
					z: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::ZIndex,
					)
					.ok()?,
					equippable: <PalletCore<T>>::get_nft_property_decoded(
						collection_id,
						token_id,
						RmrkProperty::EquippableList,
					)
					.ok()?,
				})),
				_ => None,
			}
		})
		.collect();

	Ok(parts)
}

pub fn theme_names<T: Config>(base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
	use pallet_common::CommonCollectionOperations;

	let (collection, collection_id) =
		match <PalletCore<T>>::get_typed_nft_collection_mapped(base_id, misc::CollectionType::Base)
		{
			Ok(c) => c,
			Err(_) => return Ok(Vec::new()),
		};

	let theme_names = collection
		.collection_tokens()
		.iter()
		.filter_map(|token_id| {
			let nft_type = <PalletCore<T>>::get_nft_type(collection_id, *token_id).ok()?;

			match nft_type {
				NftType::Theme => <PalletCore<T>>::get_nft_property_decoded(
					collection_id,
					*token_id,
					RmrkProperty::ThemeName,
				)
				.ok(),
				_ => None,
			}
		})
		.collect();

	Ok(theme_names)
}

pub fn theme<T: Config>(
	base_id: RmrkBaseId,
	theme_name: RmrkThemeName,
	filter_keys: Option<Vec<RmrkPropertyKey>>,
) -> Result<Option<RmrkTheme>, DispatchError> {
	use pallet_common::CommonCollectionOperations;

	let (collection, collection_id) =
		match <PalletCore<T>>::get_typed_nft_collection_mapped(base_id, misc::CollectionType::Base)
		{
			Ok(c) => c,
			Err(_) => return Ok(None),
		};

	let theme_info = collection
		.collection_tokens()
		.into_iter()
		.find_map(|token_id| {
			<PalletCore<T>>::ensure_nft_type(collection_id, token_id, NftType::Theme).ok()?;

			let name: RmrkString = <PalletCore<T>>::get_nft_property_decoded(
				collection_id,
				token_id,
				RmrkProperty::ThemeName,
			)
			.ok()?;

			if name == theme_name {
				Some((name, token_id))
			} else {
				None
			}
		});

	let (name, theme_id) = match theme_info {
		Some((name, theme_id)) => (name, theme_id),
		None => return Ok(None),
	};

	let properties = <PalletCore<T>>::filter_user_properties(
		collection_id,
		Some(theme_id),
		filter_keys,
		|key, value| RmrkThemeProperty { key, value },
	)?;

	let inherit = <PalletCore<T>>::get_nft_property_decoded(
		collection_id,
		theme_id,
		RmrkProperty::ThemeInherit,
	)?;

	let theme = RmrkTheme {
		name,
		properties,
		inherit,
	};

	Ok(Some(theme))
}
