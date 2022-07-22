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

//! # RMRK Core Proxy Pallet
//!
//! A pallet used as proxy for RMRK Core (<https://rmrk-team.github.io/rmrk-substrate/#/pallets/rmrk-core>).
//!
//! - [`Config`]
//! - [`Call`]
//! - [`Pallet`]
//!
//! ## Overview
//!
//! The RMRK Equip Proxy pallet mirrors the functionality of RMRK Equip,
//! binding its externalities to Unique's own underlying structure.
//! It is purposed to mimic RMRK Equip exactly, allowing seamless integrations
//! of solutions based on RMRK.
//!
//! RMRK Equip itself contains functionality to equip NFTs, and work with Bases,
//! Parts, and Themes. See [Proxy Implementation](#proxy-implementation) for details.
//!
//! Equip Proxy is responsible for a more specific area of RMRK, and heavily relies on the Core.
//! For a more foundational description of proxy implementation, please refer to [`pallet_rmrk_core`].
//!
//! *Note*, that while RMRK itself is subject to active development and restructuring,
//! the proxy may be caught temporarily out of date.
//!
//! ### What is RMRK?
//!
//! RMRK is a set of NFT standards which compose several "NFT 2.0 lego" primitives.
//! Putting these legos together allows a user to create NFT systems of arbitrary complexity.
//!
//! Meaning, RMRK NFTs are dynamic, able to nest into each other and form a hierarchy,
//! make use of specific changeable and partially shared metadata in the form of resources,
//! and more.
//!
//! Visit RMRK documentation and repositories to learn more:
//! - Docs: <https://docs.rmrk.app/getting-started/>
//! - FAQ: <https://coda.io/@rmrk/faq>
//! - Substrate code repository: <https://github.com/rmrk-team/rmrk-substrate>
//! - RMRK spec repository: <https://github.com/rmrk-team/rmrk-spec>
//!
//! ## Terminology
//!
//! For more information on RMRK, see RMRK's own documentation.
//!
//! ### Intro to RMRK
//!
//! - **Resource:** Additional piece of metadata of an NFT usually serving to add
//! a piece of media on top of the root metadata (NFT's own), be it a different wing
//! on the root template bird or something entirely unrelated.
//!
//! - **Base:** A list of possible "components" - Parts, a combination of which can
//! be appended/equipped to/on an NFT.
//!
//! - **Part:** Something that, together with other Parts, can constitute an NFT.
//! Parts are defined in the Base to which they belong. Parts can be either
//! of the `slot` type or `fixed` type. Slots are intended for equippables.
//! Note that "part of something" and "Part of a Base" can be easily confused,
//! and in this documentation these words are distinguished by the capital letter.
//!
//! - **Theme:** Named objects of variable => value pairs which get interpolated into
//! the Base's `themable` Parts. Themes can hold any value, but are often represented
//! in RMRK's examples as colors applied to visible Parts.
//!
//! ### Peculiarities in Unique
//!
//! - **Scoped properties:** Properties that are normally obscured from users.
//! Their purpose is to contain structured metadata that was not included in the Unique standard
//! for collections and tokens, meant to be operated on by proxies and other outliers.
//! Scoped properties are prefixed with `some-scope:`, where `some-scope` is
//! an arbitrary keyword, like "rmrk", and `:` is an unacceptable symbol in user-defined
//! properties, which, along with other safeguards, makes them impossible to tamper with.
//!
//! - **Auxiliary properties:** A slightly different structure of properties,
//! trading universality of use for more convenient storage, writes and access.
//! Meant to be inaccessible to end users.
//!
//! ## Proxy Implementation
//!
//! An external user is supposed to be able to utilize this proxy as they would
//! utilize RMRK, and get exactly the same results. Normally, Unique transactions
//! are off-limits to RMRK collections and tokens, and vice versa. However,
//! the information stored on chain can be freely interpreted by storage reads and RPCs.
//!
//! ### ID Mapping
//!
//! RMRK's collections' IDs are counted independently of Unique's and start at 0.
//! Note that tokens' IDs still start at 1.
//! The collections themselves, as well as tokens, are stored as Unique collections,
//! and thus RMRK IDs are mapped to Unique IDs (but not vice versa).
//!
//! ### External/Internal Collection Insulation
//!
//! A Unique transaction cannot target collections purposed for RMRK,
//! and they are flagged as `external` to specify that. On the other hand,
//! due to the mapping, RMRK transactions and RPCs simply cannot reach Unique collections.
//!
//! ### Native Properties
//!
//! Many of RMRK's native parameters are stored as scoped properties of a collection
//! or an NFT on the chain. Scoped properties are prefixed with `rmrk:`, where `:`
//! is an unacceptable symbol in user-defined properties, which, along with other safeguards,
//! makes them impossible to tamper with.
//!
//! ### Collection and NFT Types, and Base, Parts and Themes Handling
//!
//! RMRK introduces the concept of a Base, which is a catalgoue of Parts,
//! possible components of an NFT. Due to its similarity with the functionality
//! of a token collection, a Base is stored and handled as one, and the Base's Parts and Themes
//! are the collection's NFTs. See [`CollectionType`] and [`NftType`].
//!
//! ## Interface
//!
//! ### Dispatchables
//!
//! - `create_base` - Create a new Base.
//! - `theme_add` - Add a Theme to a Base.
//! - `equippable` - Update the array of Collections allowed to be equipped to a Base's specified Slot Part.

#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{pallet_prelude::*, transactional, BoundedVec, dispatch::DispatchResult};
use frame_system::{pallet_prelude::*, ensure_signed};
use sp_runtime::DispatchError;
use up_data_structs::*;
use pallet_common::{Pallet as PalletCommon, Error as CommonError};
use pallet_rmrk_core::{
	Pallet as PalletCore, Error as CoreError,
	misc::{self, *},
	property::RmrkProperty::*,
};
use pallet_nonfungible::{Pallet as PalletNft, NonfungibleHandle};
use pallet_evm::account::CrossAccountId;
use weights::WeightInfo;

pub use pallet::*;

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod rpc;
pub mod weights;

pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
	use super::*;

	#[pallet::config]
	pub trait Config: frame_system::Config + pallet_rmrk_core::Config {
		/// Overarching event type.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;

		/// The weight information of this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Map of a Base ID and a Part ID to an NFT in the Base collection serving as the Part.
	#[pallet::storage]
	#[pallet::getter(fn internal_part_id)]
	pub type InernalPartId<T: Config> =
		StorageDoubleMap<_, Twox64Concat, CollectionId, Twox64Concat, RmrkPartId, TokenId>;

	/// Checkmark that a Base has a Theme NFT named "default".
	#[pallet::storage]
	#[pallet::getter(fn base_has_default_theme)]
	pub type BaseHasDefaultTheme<T: Config> =
		StorageMap<_, Twox64Concat, CollectionId, bool, ValueQuery>;

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		BaseCreated {
			issuer: T::AccountId,
			base_id: RmrkBaseId,
		},
		EquippablesUpdated {
			base_id: RmrkBaseId,
			slot_id: RmrkSlotId,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// No permission to perform action.
		PermissionError,
		/// Could not find an ID for a Base collection. It is likely there were too many collections created on the chain, causing an overflow.
		NoAvailableBaseId,
		/// Could not find a suitable ID for a Part, likely too many Part tokens were created in the Base, causing an overflow
		NoAvailablePartId,
		/// Base collection linked to this ID does not exist.
		BaseDoesntExist,
		/// No Theme named "default" is associated with the Base.
		NeedsDefaultThemeFirst,
		/// Part linked to this ID does not exist.
		PartDoesntExist,
		/// Cannot assign equippables to a fixed Part.
		NoEquippableOnFixedPart,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a new Base.
		///
		/// Modeled after the [Base interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/base.md)
		///
		/// # Permissions
		/// - Anyone - will be assigned as the issuer of the Base.
		///
		/// # Arguments:
		/// - `base_type`: Arbitrary media type, e.g. "svg".
		/// - `symbol`: Arbitrary client-chosen symbol.
		/// - `parts`: Array of Fixed and Slot Parts composing the Base,
		/// confined in length by [`RmrkPartsLimit`](up_data_structs::RmrkPartsLimit).
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::create_base(parts.len() as u32))]
		pub fn create_base(
			origin: OriginFor<T>,
			base_type: RmrkString,
			symbol: RmrkBaseSymbol,
			parts: BoundedVec<RmrkPartType, RmrkPartsLimit>,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let cross_sender = T::CrossAccountId::from_sub(sender.clone());

			let data = CreateCollectionData {
				limits: None,
				token_prefix: symbol
					.into_inner()
					.try_into()
					.map_err(|_| <CommonError<T>>::CollectionTokenPrefixLimitExceeded)?,
				..Default::default()
			};

			let collection_id_res =
				<PalletNft<T>>::init_collection(cross_sender.clone(), data, true);

			if let Err(DispatchError::Arithmetic(_)) = &collection_id_res {
				return Err(<Error<T>>::NoAvailableBaseId.into());
			}

			let collection_id = collection_id_res?;

			<PalletCommon<T>>::set_scoped_collection_properties(
				collection_id,
				PropertyScope::Rmrk,
				[
					<PalletCore<T>>::encode_rmrk_property(
						CollectionType,
						&misc::CollectionType::Base,
					)?,
					<PalletCore<T>>::encode_rmrk_property(BaseType, &base_type)?,
				]
				.into_iter(),
			)?;

			let collection = <PalletCore<T>>::get_nft_collection(collection_id)?;

			for part in parts {
				Self::create_part(&cross_sender, &collection, part)?;
			}

			Self::deposit_event(Event::BaseCreated {
				issuer: sender,
				base_id: collection_id.0,
			});

			Ok(())
		}

		/// Add a Theme to a Base.
		/// A Theme named "default" is required prior to adding other Themes.
		///
		/// Modeled after [Themeadd interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/themeadd.md).
		///
		/// # Permissions:
		/// - Base issuer
		///
		/// # Arguments:
		/// - `base_id`: Base ID containing the Theme to be updated.
		/// - `theme`: Theme to add to the Base.  A Theme has a name and properties, which are an
		///   array of [key, value, inherit].
		///   - `key`: Arbitrary BoundedString, defined by client.
		///   - `value`: Arbitrary BoundedString, defined by client.
		///   - `inherit`: Optional bool.
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::theme_add(theme.properties.len() as u32))]
		pub fn theme_add(
			origin: OriginFor<T>,
			base_id: RmrkBaseId,
			theme: RmrkBoundedTheme,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let sender = T::CrossAccountId::from_sub(sender);
			let owner = &sender;

			let collection_id: CollectionId = base_id.into();

			let collection = Self::get_base(collection_id)?;

			if theme.name.as_slice() == b"default" {
				<BaseHasDefaultTheme<T>>::insert(collection_id, true);
			} else if !Self::base_has_default_theme(collection_id) {
				return Err(<Error<T>>::NeedsDefaultThemeFirst.into());
			}

			let token_id = <PalletCore<T>>::create_nft(
				&sender,
				owner,
				&collection,
				[
					<PalletCore<T>>::encode_rmrk_property(TokenType, &NftType::Theme)?,
					<PalletCore<T>>::encode_rmrk_property(ThemeName, &theme.name)?,
					<PalletCore<T>>::encode_rmrk_property(ThemeInherit, &theme.inherit)?,
				]
				.into_iter(),
			)
			.map_err(|_| <Error<T>>::PermissionError)?;

			for property in theme.properties {
				<PalletNft<T>>::set_scoped_token_property(
					collection_id,
					token_id,
					PropertyScope::Rmrk,
					<PalletCore<T>>::encode_rmrk_property(
						UserProperty(property.key.as_slice()),
						&property.value,
					)?,
				)?;
			}

			Ok(())
		}

		/// Update the array of Collections allowed to be equipped to a Base's specified Slot Part.
		///
		/// Modeled after [equippable interaction](https://github.com/rmrk-team/rmrk-spec/blob/master/standards/rmrk2.0.0/interactions/equippable.md).
		///
		/// # Permissions:
		/// - Base issuer
		///
		/// # Arguments:
		/// - `base_id`: Base containing the Slot Part to be updated.
		/// - `part_id`: Slot Part whose Equippable List is being updated.
		/// - `equippables`: List of equippables that will override the current Equippables list.
		#[transactional]
		#[pallet::weight(<SelfWeightOf<T>>::equippable())]
		pub fn equippable(
			origin: OriginFor<T>,
			base_id: RmrkBaseId,
			slot_id: RmrkSlotId,
			equippables: RmrkEquippableList,
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let base_collection_id = base_id.into();
			let collection = Self::get_base(base_collection_id)?;

			<PalletCore<T>>::check_collection_owner(
				&collection,
				&T::CrossAccountId::from_sub(sender),
			)
			.map_err(|err| {
				if err == <CoreError<T>>::NoPermission.into() {
					<Error<T>>::PermissionError.into()
				} else {
					err
				}
			})?;

			let part_id = Self::internal_part_id(base_collection_id, slot_id)
				.ok_or(<Error<T>>::PartDoesntExist)?;

			let nft_type = <PalletCore<T>>::get_nft_type(base_collection_id, part_id)
				.map_err(|_| <Error<T>>::PartDoesntExist)?;

			match nft_type {
				NftType::Regular | NftType::Theme => return Err(<Error<T>>::PermissionError.into()),
				NftType::FixedPart => return Err(<Error<T>>::NoEquippableOnFixedPart.into()),
				NftType::SlotPart => {
					<PalletNft<T>>::set_scoped_token_property(
						base_collection_id,
						part_id,
						PropertyScope::Rmrk,
						<PalletCore<T>>::encode_rmrk_property(EquippableList, &equippables)?,
					)?;
				}
			}

			Self::deposit_event(Event::EquippablesUpdated { base_id, slot_id });

			Ok(())
		}
	}
}

impl<T: Config> Pallet<T> {
	/// Create or renew an NFT serving as a Part inside a collection serving as a Base.
	fn create_part(
		sender: &T::CrossAccountId,
		collection: &NonfungibleHandle<T>,
		part: RmrkPartType,
	) -> DispatchResult {
		let owner = sender;

		let part_id = part.id();
		let src = part.src();
		let z_index = part.z_index();

		let nft_type = match part {
			RmrkPartType::FixedPart(_) => NftType::FixedPart,
			RmrkPartType::SlotPart(_) => NftType::SlotPart,
		};

		let token_id = match Self::internal_part_id(collection.id, part_id) {
			Some(token_id) => token_id,
			None => {
				let token_id =
					<PalletCore<T>>::create_nft(sender, owner, collection, [].into_iter())
						.map_err(|err| match err {
							DispatchError::Arithmetic(_) => <Error<T>>::NoAvailablePartId.into(),
							err => err,
						})?;

				<InernalPartId<T>>::insert(collection.id, part_id, token_id);

				<PalletNft<T>>::set_scoped_token_property(
					collection.id,
					token_id,
					PropertyScope::Rmrk,
					<PalletCore<T>>::encode_rmrk_property(ExternalPartId, &part_id)?,
				)?;

				token_id
			}
		};

		<PalletNft<T>>::set_scoped_token_properties(
			collection.id,
			token_id,
			PropertyScope::Rmrk,
			[
				<PalletCore<T>>::encode_rmrk_property(TokenType, &nft_type)?,
				<PalletCore<T>>::encode_rmrk_property(Src, &src)?,
				<PalletCore<T>>::encode_rmrk_property(ZIndex, &z_index)?,
			]
			.into_iter(),
		)?;

		if let RmrkPartType::SlotPart(part) = part {
			<PalletNft<T>>::set_scoped_token_property(
				collection.id,
				token_id,
				PropertyScope::Rmrk,
				<PalletCore<T>>::encode_rmrk_property(EquippableList, &part.equippable)?,
			)?;
		}

		Ok(())
	}

	/// Ensure that the collection under the Base ID is a Base collection,
	/// and fetch it.
	fn get_base(base_id: CollectionId) -> Result<NonfungibleHandle<T>, DispatchError> {
		let collection =
			<PalletCore<T>>::get_typed_nft_collection(base_id, misc::CollectionType::Base)
				.map_err(|err| {
					if err == <CoreError<T>>::CollectionUnknown.into() {
						<Error<T>>::BaseDoesntExist.into()
					} else {
						err
					}
				})?;
		collection.check_is_external()?;

		Ok(collection)
	}
}
