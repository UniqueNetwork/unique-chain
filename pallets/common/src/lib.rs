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

//! # Common pallet
//!
//! The Common pallet provides functionality for handling collections.
//!
//! ## Overview
//!
//! The Common pallet provides an interface for common collection operations for different collection types
//! (see [CommonCollectionOperations]), as well as a generic dispatcher for these, see [dispatch] module.
//! It also provides this functionality to EVM, see [erc] and [eth] modules.
//!
//! The Common pallet provides functions for:
//!
//! - Setting and approving collection sponsor.
//! - Get\set\delete allow list.
//! - Get\set\delete collection properties.
//! - Get\set\delete collection property permissions.
//! - Get\set\delete token property permissions.
//! - Get\set\delete collection administrators.
//! - Checking access permissions.
//!
//! ### Terminology
//! **Collection sponsor** - For the collection, you can set a sponsor, at whose expense it will
//! be possible to mint tokens.
//!
//! **Allow list** - List of users who have the right to minting tokens.
//!
//! **Collection properties** - Collection properties are simply key-value stores where various
//! metadata can be placed.
//!
//! **Permissions on token properties** - For each property in the token can be set permission
//! to change, see [`PropertyPermission`].
//!
//! **Collection administrator** - For a collection, you can set administrators who have the right
//! to most actions on the collection.

#![warn(missing_docs)]
#![cfg_attr(not(feature = "std"), no_std)]
extern crate alloc;

use core::{
	ops::{Deref, DerefMut},
	slice::from_ref,
};
use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
use sp_std::vec::Vec;
use pallet_evm::{account::CrossAccountId, Pallet as PalletEvm};
use evm_coder::ToLog;
use frame_support::{
	dispatch::{DispatchErrorWithPostInfo, DispatchResultWithPostInfo, Weight, PostDispatchInfo},
	ensure,
	traits::{
		Get,
		fungible::{Balanced, Debt, Inspect},
		tokens::{Imbalance, Precision, Preservation},
	},
	dispatch::Pays,
	transactional, fail,
};
use pallet_evm::GasWeightMapping;
use up_data_structs::{
	AccessMode, COLLECTION_NUMBER_LIMIT, Collection, RpcCollection, CollectionFlags,
	RpcCollectionFlags, CollectionId, CreateItemData, MAX_TOKEN_PREFIX_LENGTH,
	COLLECTION_ADMINS_LIMIT, TokenId, TokenChild, CollectionStats, MAX_TOKEN_OWNERSHIP,
	CollectionMode, NFT_SPONSOR_TRANSFER_TIMEOUT, FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, MAX_SPONSOR_TIMEOUT, CUSTOM_DATA_LIMIT, CollectionLimits,
	CreateCollectionData, SponsorshipState, CreateItemExData, SponsoringRateLimit, budget::Budget,
	PhantomType, Property, CollectionProperties as CollectionPropertiesT, TokenProperties,
	PropertiesPermissionMap, PropertyKey, PropertyValue, PropertyPermission, PropertiesError,
	TokenOwnerError, PropertyKeyPermission, TokenData, TrySetProperty, PropertyScope,
	CollectionPermissions,
};
use up_pov_estimate_rpc::PovInfo;

pub use pallet::*;
use sp_core::H160;
use sp_runtime::{ArithmeticError, DispatchError, DispatchResult, traits::Zero};

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;
pub mod dispatch;
pub mod erc;
pub mod eth;
pub mod helpers;
#[allow(missing_docs)]
pub mod weights;
/// Weight info.
pub type SelfWeightOf<T> = <T as Config>::WeightInfo;

/// Collection handle contains information about collection data and id.
/// Also provides functionality to count consumed gas.
///
/// CollectionHandle is used as a generic wrapper for collections of all types.
/// It allows to perform common operations and queries on any collection type,
/// both completely general for all, as well as their respective implementations of [`CommonCollectionOperations`].
#[must_use = "Should call submit_logs or save, otherwise some data will be lost for evm side"]
pub struct CollectionHandle<T: Config> {
	/// Collection id
	pub id: CollectionId,
	collection: Collection<T::AccountId>,
	/// Substrate recorder for counting consumed gas
	pub recorder: SubstrateRecorder<T>,
}

impl<T: Config> WithRecorder<T> for CollectionHandle<T> {
	fn recorder(&self) -> &SubstrateRecorder<T> {
		&self.recorder
	}
	fn into_recorder(self) -> SubstrateRecorder<T> {
		self.recorder
	}
}

impl<T: Config> CollectionHandle<T> {
	/// Same as [CollectionHandle::new] but with an explicit gas limit.
	pub fn new_with_gas_limit(id: CollectionId, gas_limit: u64) -> Option<Self> {
		Self::new_with_recorder(id, SubstrateRecorder::new(gas_limit))
	}

	/// Same as [CollectionHandle::new] but with an existed [`SubstrateRecorder`].
	pub fn new_with_recorder(id: CollectionId, recorder: SubstrateRecorder<T>) -> Option<Self> {
		<CollectionById<T>>::get(id).map(|collection| Self {
			id,
			collection,
			recorder,
		})
	}

	/// Retrives collection data from storage and creates collection handle with default parameters.
	/// If collection not found return `None`
	pub fn new(id: CollectionId) -> Option<Self> {
		Self::new_with_gas_limit(id, u64::MAX)
	}

	/// Same as [`CollectionHandle::new`] but if collection not found [CollectionNotFound](Error::CollectionNotFound) returned.
	pub fn try_get(id: CollectionId) -> Result<Self, DispatchError> {
		Ok(Self::new(id).ok_or(<Error<T>>::CollectionNotFound)?)
	}

	/// Consume gas for reading.
	pub fn consume_store_reads(
		&self,
		reads: u64,
	) -> pallet_evm_coder_substrate::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
				<T as frame_system::Config>::DbWeight::get()
					.read
					.saturating_mul(reads),
				// TODO: measure proof
				0,
			)))
	}

	/// Consume gas for writing.
	pub fn consume_store_writes(
		&self,
		writes: u64,
	) -> pallet_evm_coder_substrate::execution::Result<()> {
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
				<T as frame_system::Config>::DbWeight::get()
					.write
					.saturating_mul(writes),
				// TODO: measure proof
				0,
			)))
	}

	/// Consume gas for reading and writing.
	pub fn consume_store_reads_and_writes(
		&self,
		reads: u64,
		writes: u64,
	) -> pallet_evm_coder_substrate::execution::Result<()> {
		let weight = <T as frame_system::Config>::DbWeight::get();
		let reads = weight.read.saturating_mul(reads);
		let writes = weight.read.saturating_mul(writes);
		self.recorder
			.consume_gas(T::GasWeightMapping::weight_to_gas(Weight::from_parts(
				reads.saturating_add(writes),
				// TODO: measure proof
				0,
			)))
	}

	/// Save collection to storage.
	pub fn save(&self) -> DispatchResult {
		<CollectionById<T>>::insert(self.id, &self.collection);
		Ok(())
	}

	/// Set collection sponsor.
	///
	/// Unique collections allows sponsoring for certain actions.
	/// This method allows you to set the sponsor of the collection.
	/// In order for sponsorship to become active, it must be confirmed through [`Self::confirm_sponsorship`].
	pub fn set_sponsor(
		&mut self,
		sender: &T::CrossAccountId,
		sponsor: T::AccountId,
	) -> DispatchResult {
		self.check_is_internal()?;
		self.check_is_owner_or_admin(sender)?;

		self.collection.sponsorship = SponsorshipState::Unconfirmed(sponsor.clone());

		<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorSet(self.id, sponsor));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		self.save()
	}

	/// Force set `sponsor`.
	///
	/// Differs from [`set_sponsor`][`Self::set_sponsor`] in that confirmation
	/// from the `sponsor` is not required.
	///
	/// # Arguments
	///
	/// * `sender`: Caller's account.
	/// * `sponsor`: ID of the account of the sponsor-to-be.
	pub fn force_set_sponsor(&mut self, sponsor: T::AccountId) -> DispatchResult {
		self.check_is_internal()?;

		self.collection.sponsorship = SponsorshipState::Confirmed(sponsor.clone());

		<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorSet(self.id, sponsor.clone()));
		<Pallet<T>>::deposit_event(Event::<T>::SponsorshipConfirmed(self.id, sponsor));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		self.save()
	}

	/// Confirm sponsorship
	///
	/// In order for the sponsorship to become active, the user set as the sponsor must confirm their participation.
	/// Before confirming sponsorship, the user must be specified as the sponsor of the collection via [`Self::set_sponsor`].
	pub fn confirm_sponsorship(&mut self, sender: &T::AccountId) -> DispatchResult {
		self.check_is_internal()?;
		ensure!(
			self.collection.sponsorship.pending_sponsor() == Some(sender),
			Error::<T>::ConfirmSponsorshipFail
		);

		self.collection.sponsorship = SponsorshipState::Confirmed(sender.clone());

		<Pallet<T>>::deposit_event(Event::<T>::SponsorshipConfirmed(self.id, sender.clone()));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		self.save()
	}

	/// Remove collection sponsor.
	pub fn remove_sponsor(&mut self, sender: &T::CrossAccountId) -> DispatchResult {
		self.check_is_internal()?;
		self.check_is_owner_or_admin(sender)?;

		self.collection.sponsorship = SponsorshipState::Disabled;

		<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorRemoved(self.id));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);
		self.save()
	}

	/// Force remove `sponsor`.
	///
	/// Differs from `remove_sponsor` in that
	/// it doesn't require consent from the `owner` of the collection.
	pub fn force_remove_sponsor(&mut self) -> DispatchResult {
		self.check_is_internal()?;

		self.collection.sponsorship = SponsorshipState::Disabled;

		<Pallet<T>>::deposit_event(Event::<T>::CollectionSponsorRemoved(self.id));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);
		self.save()
	}

	/// Checks that the collection was created with, and must be operated upon through **Unique API**.
	/// Now check only the `external` flag and if it's **true**, then return [`Error::CollectionIsExternal`] error.
	pub fn check_is_internal(&self) -> DispatchResult {
		if self.flags.external {
			return Err(<Error<T>>::CollectionIsExternal)?;
		}

		Ok(())
	}

	/// Checks that the collection was created with, and must be operated upon through an **assimilated API**.
	/// Now check only the `external` flag and if it's **false**, then return [`Error::CollectionIsInternal`] error.
	pub fn check_is_external(&self) -> DispatchResult {
		if !self.flags.external {
			return Err(<Error<T>>::CollectionIsInternal)?;
		}

		Ok(())
	}
}

impl<T: Config> Deref for CollectionHandle<T> {
	type Target = Collection<T::AccountId>;

	fn deref(&self) -> &Self::Target {
		&self.collection
	}
}

impl<T: Config> DerefMut for CollectionHandle<T> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.collection
	}
}

impl<T: Config> CollectionHandle<T> {
	/// Checks if the `user` is the owner of the collection.
	pub fn check_is_owner(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(*user.as_sub() == self.owner, <Error<T>>::NoPermission);
		Ok(())
	}

	/// Returns **true** if the `user` is the owner or administrator of the collection.
	pub fn is_owner_or_admin(&self, user: &T::CrossAccountId) -> bool {
		*user.as_sub() == self.owner || <IsAdmin<T>>::get((self.id, user))
	}

	/// Checks if the `user` is the owner or administrator of the collection.
	pub fn check_is_owner_or_admin(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(self.is_owner_or_admin(user), <Error<T>>::NoPermission);
		Ok(())
	}

	/// Returns **true** if
	/// * the `user`is a collection owner or admin
	/// * the collection limits allow the owner/admins to transfer/burn any collection token
	pub fn ignores_token_restrictions(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}

	/// Return **true** if `user` does not have enough token parts, and he can ignore such restrictions.
	pub fn ignores_owned_amount(&self, user: &T::CrossAccountId) -> bool {
		self.limits.owner_can_transfer() && self.is_owner_or_admin(user)
	}

	/// Checks if the user is in the allow list. If not [Error::AddressNotInAllowlist] returns.
	pub fn check_allowlist(&self, user: &T::CrossAccountId) -> DispatchResult {
		ensure!(
			<Allowlist<T>>::get((self.id, user)),
			<Error<T>>::AddressNotInAllowlist
		);
		Ok(())
	}

	/// Changes collection owner to another account
	/// #### Store read/writes
	/// 1 writes
	pub fn change_owner(
		&mut self,
		caller: T::CrossAccountId,
		new_owner: T::CrossAccountId,
	) -> DispatchResult {
		self.check_is_internal()?;
		self.check_is_owner(&caller)?;
		self.collection.owner = new_owner.as_sub().clone();

		<Pallet<T>>::deposit_event(Event::<T>::CollectionOwnerChanged(
			self.id,
			new_owner.as_sub().clone(),
		));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(self.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		self.save()
	}
}

#[frame_support::pallet]
pub mod pallet {

	use super::*;
	use dispatch::CollectionDispatch;
	use frame_support::{Blake2_128Concat, pallet_prelude::*, storage::Key, traits::StorageVersion};
	use up_data_structs::{TokenId, mapping::TokenAddressMapping};
	use scale_info::TypeInfo;
	use weights::WeightInfo;

	#[pallet::config]
	pub trait Config:
		frame_system::Config + pallet_evm_coder_substrate::Config + pallet_evm::Config + TypeInfo
	{
		/// Weight information for functions of this pallet.
		type WeightInfo: WeightInfo;

		/// Events compatible with [`frame_system::Config::Event`].
		type RuntimeEvent: IsType<<Self as frame_system::Config>::RuntimeEvent> + From<Event<Self>>;

		/// Handler of accounts and payment.
		type Currency: Balanced<Self::AccountId> + Inspect<Self::AccountId>;

		/// Set price to create a collection.
		#[pallet::constant]
		type CollectionCreationPrice: Get<
			<<Self as Config>::Currency as Inspect<Self::AccountId>>::Balance,
		>;

		/// Dispatcher of operations on collections.
		type CollectionDispatch: CollectionDispatch<Self>;

		/// Account which holds the chain's treasury.
		type TreasuryAccountId: Get<Self::AccountId>;

		/// Address under which the CollectionHelper contract would be available.
		#[pallet::constant]
		type ContractAddress: Get<H160>;

		/// Mapper for token addresses to Ethereum addresses.
		type EvmTokenAddressMapping: TokenAddressMapping<H160>;

		/// Mapper for token addresses to [`CrossAccountId`].
		type CrossTokenAddressMapping: TokenAddressMapping<Self::CrossAccountId>;
	}

	const STORAGE_VERSION: StorageVersion = StorageVersion::new(1);
	/// Collection id for native fungible collction.
	pub const NATIVE_FINGIBLE_COLLECTION_ID: CollectionId = CollectionId(0);

	#[pallet::pallet]
	#[pallet::storage_version(STORAGE_VERSION)]
	pub struct Pallet<T>(_);

	#[pallet::extra_constants]
	impl<T: Config> Pallet<T> {
		/// Maximum admins per collection.
		pub fn collection_admins_limit() -> u32 {
			COLLECTION_ADMINS_LIMIT
		}
	}

	#[pallet::genesis_config]
	pub struct GenesisConfig<T>(PhantomData<T>);

	#[cfg(feature = "std")]
	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self(Default::default())
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> GenesisBuild<T> for GenesisConfig<T> {
		fn build(&self) {
			StorageVersion::new(1).put::<Pallet<T>>();
		}
	}

	impl<T: Config> Pallet<T> {
		/// Helper function that handles deposit events
		pub fn deposit_event(event: Event<T>) {
			let event = <T as Config>::RuntimeEvent::from(event);
			let event = event.into();
			<frame_system::Pallet<T>>::deposit_event(event)
		}
	}

	#[pallet::event]
	pub enum Event<T: Config> {
		/// New collection was created
		CollectionCreated(
			/// Globally unique identifier of newly created collection.
			CollectionId,
			/// [`CollectionMode`] converted into _u8_.
			u8,
			/// Collection owner.
			T::AccountId,
		),

		/// New collection was destroyed
		CollectionDestroyed(
			/// Globally unique identifier of collection.
			CollectionId,
		),

		/// New item was created.
		ItemCreated(
			/// Id of the collection where item was created.
			CollectionId,
			/// Id of an item. Unique within the collection.
			TokenId,
			/// Owner of newly created item
			T::CrossAccountId,
			/// Always 1 for NFT
			u128,
		),

		/// Collection item was burned.
		ItemDestroyed(
			/// Id of the collection where item was destroyed.
			CollectionId,
			/// Identifier of burned NFT.
			TokenId,
			/// Which user has destroyed its tokens.
			T::CrossAccountId,
			/// Amount of token pieces destroed. Always 1 for NFT.
			u128,
		),

		/// Item was transferred
		Transfer(
			/// Id of collection to which item is belong.
			CollectionId,
			/// Id of an item.
			TokenId,
			/// Original owner of item.
			T::CrossAccountId,
			/// New owner of item.
			T::CrossAccountId,
			/// Amount of token pieces transfered. Always 1 for NFT.
			u128,
		),

		/// Amount pieces of token owned by `sender` was approved for `spender`.
		Approved(
			/// Id of collection to which item is belong.
			CollectionId,
			/// Id of an item.
			TokenId,
			/// Original owner of item.
			T::CrossAccountId,
			/// Id for which the approval was granted.
			T::CrossAccountId,
			/// Amount of token pieces transfered. Always 1 for NFT.
			u128,
		),

		/// A `sender` approves operations on all owned tokens for `spender`.
		ApprovedForAll(
			/// Id of collection to which item is belong.
			CollectionId,
			/// Owner of a wallet.
			T::CrossAccountId,
			/// Id for which operator status was granted or rewoked.
			T::CrossAccountId,
			/// Is operator status granted or revoked?
			bool,
		),

		/// The colletion property has been added or edited.
		CollectionPropertySet(
			/// Id of collection to which property has been set.
			CollectionId,
			/// The property that was set.
			PropertyKey,
		),

		/// The property has been deleted.
		CollectionPropertyDeleted(
			/// Id of collection to which property has been deleted.
			CollectionId,
			/// The property that was deleted.
			PropertyKey,
		),

		/// The token property has been added or edited.
		TokenPropertySet(
			/// Identifier of the collection whose token has the property set.
			CollectionId,
			/// The token for which the property was set.
			TokenId,
			/// The property that was set.
			PropertyKey,
		),

		/// The token property has been deleted.
		TokenPropertyDeleted(
			/// Identifier of the collection whose token has the property deleted.
			CollectionId,
			/// The token for which the property was deleted.
			TokenId,
			/// The property that was deleted.
			PropertyKey,
		),

		/// The token property permission of a collection has been set.
		PropertyPermissionSet(
			/// ID of collection to which property permission has been set.
			CollectionId,
			/// The property permission that was set.
			PropertyKey,
		),

		/// Address was added to the allow list.
		AllowListAddressAdded(
			/// ID of the affected collection.
			CollectionId,
			/// Address of the added account.
			T::CrossAccountId,
		),

		/// Address was removed from the allow list.
		AllowListAddressRemoved(
			/// ID of the affected collection.
			CollectionId,
			/// Address of the removed account.
			T::CrossAccountId,
		),

		/// Collection admin was added.
		CollectionAdminAdded(
			/// ID of the affected collection.
			CollectionId,
			/// Admin address.
			T::CrossAccountId,
		),

		/// Collection admin was removed.
		CollectionAdminRemoved(
			/// ID of the affected collection.
			CollectionId,
			/// Removed admin address.
			T::CrossAccountId,
		),

		/// Collection limits were set.
		CollectionLimitSet(
			/// ID of the affected collection.
			CollectionId,
		),

		/// Collection owned was changed.
		CollectionOwnerChanged(
			/// ID of the affected collection.
			CollectionId,
			/// New owner address.
			T::AccountId,
		),

		/// Collection permissions were set.
		CollectionPermissionSet(
			/// ID of the affected collection.
			CollectionId,
		),

		/// Collection sponsor was set.
		CollectionSponsorSet(
			/// ID of the affected collection.
			CollectionId,
			/// New sponsor address.
			T::AccountId,
		),

		/// New sponsor was confirm.
		SponsorshipConfirmed(
			/// ID of the affected collection.
			CollectionId,
			/// New sponsor address.
			T::AccountId,
		),

		/// Collection sponsor was removed.
		CollectionSponsorRemoved(
			/// ID of the affected collection.
			CollectionId,
		),
	}

	#[pallet::error]
	pub enum Error<T> {
		/// This collection does not exist.
		CollectionNotFound,
		/// Sender parameter and item owner must be equal.
		MustBeTokenOwner,
		/// No permission to perform action
		NoPermission,
		/// Destroying only empty collections is allowed
		CantDestroyNotEmptyCollection,
		/// Collection is not in mint mode.
		PublicMintingNotAllowed,
		/// Address is not in allow list.
		AddressNotInAllowlist,

		/// Collection name can not be longer than 63 char.
		CollectionNameLimitExceeded,
		/// Collection description can not be longer than 255 char.
		CollectionDescriptionLimitExceeded,
		/// Token prefix can not be longer than 15 char.
		CollectionTokenPrefixLimitExceeded,
		/// Total collections bound exceeded.
		TotalCollectionsLimitExceeded,
		/// Exceeded max admin count
		CollectionAdminCountExceeded,
		/// Collection limit bounds per collection exceeded
		CollectionLimitBoundsExceeded,
		/// Tried to enable permissions which are only permitted to be disabled
		OwnerPermissionsCantBeReverted,
		/// Collection settings not allowing items transferring
		TransferNotAllowed,
		/// Account token limit exceeded per collection
		AccountTokenLimitExceeded,
		/// Collection token limit exceeded
		CollectionTokenLimitExceeded,
		/// Metadata flag frozen
		MetadataFlagFrozen,

		/// Item does not exist
		TokenNotFound,
		/// Item is balance not enough
		TokenValueTooLow,
		/// Requested value is more than the approved
		ApprovedValueTooLow,
		/// Tried to approve more than owned
		CantApproveMoreThanOwned,
		/// Only spending from eth mirror could be approved
		AddressIsNotEthMirror,

		/// Can't transfer tokens to ethereum zero address
		AddressIsZero,

		/// The operation is not supported
		UnsupportedOperation,

		/// Insufficient funds to perform an action
		NotSufficientFounds,

		/// User does not satisfy the nesting rule
		UserIsNotAllowedToNest,
		/// Only tokens from specific collections may nest tokens under this one
		SourceCollectionIsNotAllowedToNest,

		/// Tried to store more data than allowed in collection field
		CollectionFieldSizeExceeded,

		/// Tried to store more property data than allowed
		NoSpaceForProperty,

		/// Tried to store more property keys than allowed
		PropertyLimitReached,

		/// Property key is too long
		PropertyKeyIsTooLong,

		/// Only ASCII letters, digits, and symbols `_`, `-`, and `.` are allowed
		InvalidCharacterInPropertyKey,

		/// Empty property keys are forbidden
		EmptyPropertyKey,

		/// Tried to access an external collection with an internal API
		CollectionIsExternal,

		/// Tried to access an internal collection with an external API
		CollectionIsInternal,

		/// This address is not set as sponsor, use setCollectionSponsor first.
		ConfirmSponsorshipFail,

		/// The user is not an administrator.
		UserIsNotCollectionAdmin,
	}

	/// Storage of the count of created collections. Essentially contains the last collection ID.
	#[pallet::storage]
	pub type CreatedCollectionCount<T> = StorageValue<Value = CollectionId, QueryKind = ValueQuery>;

	/// Storage of the count of deleted collections.
	#[pallet::storage]
	pub type DestroyedCollectionCount<T> =
		StorageValue<Value = CollectionId, QueryKind = ValueQuery>;

	/// Storage of collection info.
	#[pallet::storage]
	pub type CollectionById<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = Collection<<T as frame_system::Config>::AccountId>,
		QueryKind = OptionQuery,
	>;

	/// Storage of collection properties.
	#[pallet::storage]
	#[pallet::getter(fn collection_properties)]
	pub type CollectionProperties<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = CollectionPropertiesT,
		QueryKind = ValueQuery,
	>;

	/// Storage of token property permissions of a collection.
	#[pallet::storage]
	#[pallet::getter(fn property_permissions)]
	pub type CollectionPropertyPermissions<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = PropertiesPermissionMap,
		QueryKind = ValueQuery,
	>;

	/// Storage of the amount of collection admins.
	#[pallet::storage]
	pub type AdminAmount<T> = StorageMap<
		Hasher = Blake2_128Concat,
		Key = CollectionId,
		Value = u32,
		QueryKind = ValueQuery,
	>;

	/// List of collection admins.
	#[pallet::storage]
	pub type IsAdmin<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Allowlisted collection users.
	#[pallet::storage]
	pub type Allowlist<T: Config> = StorageNMap<
		Key = (
			Key<Blake2_128Concat, CollectionId>,
			Key<Blake2_128Concat, T::CrossAccountId>,
		),
		Value = bool,
		QueryKind = ValueQuery,
	>;

	/// Not used by code, exists only to provide some types to metadata.
	#[pallet::storage]
	pub type DummyStorageValue<T: Config> = StorageValue<
		Value = (
			CollectionStats,
			CollectionId,
			TokenId,
			TokenChild,
			PhantomType<(
				TokenData<T::CrossAccountId>,
				RpcCollection<T::AccountId>,
				// PoV Estimate Info
				PovInfo,
			)>,
		),
		QueryKind = OptionQuery,
	>;
}

impl<T: Config> Pallet<T> {
	/// Enshure that receiver address is correct.
	///
	/// Ethereum receiver 0x0000000000000000000000000000000000000000 is reserved, and shouldn't own tokens.
	pub fn ensure_correct_receiver(receiver: &T::CrossAccountId) -> DispatchResult {
		ensure!(
			&T::CrossAccountId::from_eth(H160([0; 20])) != receiver,
			<Error<T>>::AddressIsZero
		);
		Ok(())
	}

	/// Get a vector of collection admins.
	pub fn adminlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<IsAdmin<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}

	/// Get a vector of users allowed to mint tokens.
	pub fn allowlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<Allowlist<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}

	/// Is `user` allowed to mint token in `collection`.
	pub fn allowed(collection: CollectionId, user: T::CrossAccountId) -> bool {
		<Allowlist<T>>::get((collection, user))
	}

	/// Get statistics of collections.
	pub fn collection_stats() -> CollectionStats {
		let created = <CreatedCollectionCount<T>>::get();
		let destroyed = <DestroyedCollectionCount<T>>::get();
		CollectionStats {
			created: created.0,
			destroyed: destroyed.0,
			alive: created.0 - destroyed.0,
		}
	}

	/// Get the effective limits for the collection.
	pub fn effective_collection_limits(collection: CollectionId) -> Option<CollectionLimits> {
		let collection = <CollectionById<T>>::get(collection)?;
		let limits = collection.limits;
		let effective_limits = CollectionLimits {
			account_token_ownership_limit: Some(limits.account_token_ownership_limit()),
			sponsored_data_size: Some(limits.sponsored_data_size()),
			sponsored_data_rate_limit: Some(
				limits
					.sponsored_data_rate_limit
					.unwrap_or(SponsoringRateLimit::SponsoringDisabled),
			),
			token_limit: Some(limits.token_limit()),
			sponsor_transfer_timeout: Some(limits.sponsor_transfer_timeout(
				match collection.mode {
					CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				},
			)),
			sponsor_approve_timeout: Some(limits.sponsor_approve_timeout()),
			owner_can_transfer: Some(limits.owner_can_transfer()),
			owner_can_destroy: Some(limits.owner_can_destroy()),
			transfers_enabled: Some(limits.transfers_enabled()),
		};

		Some(effective_limits)
	}

	/// Returns information about the `collection` adapted for rpc.
	pub fn rpc_collection(collection: CollectionId) -> Option<RpcCollection<T::AccountId>> {
		let Collection {
			name,
			description,
			owner,
			mode,
			token_prefix,
			sponsorship,
			limits,
			permissions,
			flags,
		} = <CollectionById<T>>::get(collection)?;

		let token_property_permissions = <CollectionPropertyPermissions<T>>::get(collection)
			.into_iter()
			.map(|(key, permission)| PropertyKeyPermission { key, permission })
			.collect();

		let properties = <CollectionProperties<T>>::get(collection)
			.into_iter()
			.map(|(key, value)| Property { key, value })
			.collect();

		let permissions = CollectionPermissions {
			access: Some(permissions.access()),
			mint_mode: Some(permissions.mint_mode()),
			nesting: Some(permissions.nesting().clone()),
		};

		Some(RpcCollection {
			name: name.into_inner(),
			description: description.into_inner(),
			owner,
			mode,
			token_prefix: token_prefix.into_inner(),
			sponsorship,
			limits,
			permissions,
			token_property_permissions,
			properties,
			read_only: flags.external,

			flags: RpcCollectionFlags {
				foreign: flags.foreign,
				erc721metadata: flags.erc721metadata,
			},
		})
	}
}

macro_rules! limit_default {
	($old:ident, $new:ident, $($field:ident $(($arg:expr))? => $check:expr),* $(,)?) => {{
		$(
			if let Some($new) = $new.$field {
				let $old = $old.$field($($arg)?);
				let _ = $new;
				let _ = $old;
				$check
			} else {
				$new.$field = $old.$field
			}
		)*
	}};
}
macro_rules! limit_default_clone {
	($old:ident, $new:ident, $($field:ident $(($arg:expr))? => $check:expr),* $(,)?) => {{
		$(
			if let Some($new) = $new.$field.clone() {
				let $old = $old.$field($($arg)?);
				let _ = $new;
				let _ = $old;
				$check
			} else {
				$new.$field = $old.$field.clone()
			}
		)*
	}};
}

impl<T: Config> Pallet<T> {
	/// Create new collection.
	///
	/// * `owner` - The owner of the collection.
	/// * `data` - Description of the created collection.
	/// * `flags` - Extra flags to store.
	pub fn init_collection(
		owner: T::CrossAccountId,
		payer: T::CrossAccountId,
		data: CreateCollectionData<T::AccountId>,
		flags: CollectionFlags,
	) -> Result<CollectionId, DispatchError> {
		{
			ensure!(
				data.token_prefix.len() <= MAX_TOKEN_PREFIX_LENGTH as usize,
				Error::<T>::CollectionTokenPrefixLimitExceeded
			);
		}

		let created_count = <CreatedCollectionCount<T>>::get()
			.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;
		let destroyed_count = <DestroyedCollectionCount<T>>::get().0;
		let id = CollectionId(created_count);

		// bound Total number of collections
		ensure!(
			created_count - destroyed_count <= COLLECTION_NUMBER_LIMIT,
			<Error<T>>::TotalCollectionsLimitExceeded
		);

		// =========

		let collection = Collection {
			owner: owner.as_sub().clone(),
			name: data.name,
			mode: data.mode.clone(),
			description: data.description,
			token_prefix: data.token_prefix,
			sponsorship: data
				.pending_sponsor
				.map(SponsorshipState::Unconfirmed)
				.unwrap_or_default(),
			limits: data
				.limits
				.map(|limits| Self::clamp_limits(data.mode.clone(), &Default::default(), limits))
				.unwrap_or_else(|| Ok(CollectionLimits::default()))?,
			permissions: data
				.permissions
				.map(|permissions| {
					Self::clamp_permissions(data.mode.clone(), &Default::default(), permissions)
				})
				.unwrap_or_else(|| Ok(CollectionPermissions::default()))?,
			flags,
		};

		let mut collection_properties = CollectionPropertiesT::new();
		collection_properties
			.try_set_from_iter(data.properties.into_iter())
			.map_err(<Error<T>>::from)?;

		CollectionProperties::<T>::insert(id, collection_properties);

		let mut token_props_permissions = PropertiesPermissionMap::new();
		token_props_permissions
			.try_set_from_iter(data.token_property_permissions.into_iter())
			.map_err(<Error<T>>::from)?;

		CollectionPropertyPermissions::<T>::insert(id, token_props_permissions);

		// Take a (non-refundable) deposit of collection creation
		{
			let mut imbalance = <Debt<T::AccountId, <T as Config>::Currency>>::zero();
			imbalance.subsume(<T as Config>::Currency::deposit(
				&T::TreasuryAccountId::get(),
				T::CollectionCreationPrice::get(),
				Precision::Exact,
			)?);
			let credit =
				<T as Config>::Currency::settle(payer.as_sub(), imbalance, Preservation::Preserve)
					.map_err(|_| Error::<T>::NotSufficientFounds)?;

			debug_assert!(credit.peek().is_zero())
		}

		<CreatedCollectionCount<T>>::put(created_count);
		<Pallet<T>>::deposit_event(Event::CollectionCreated(
			id,
			data.mode.id(),
			owner.as_sub().clone(),
		));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionCreated {
				owner: *owner.as_eth(),
				collection_id: eth::collection_id_to_address(id),
			}
			.to_log(T::ContractAddress::get()),
		);
		<CollectionById<T>>::insert(id, collection);
		Ok(id)
	}

	/// Destroy collection.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	pub fn destroy_collection(
		collection: CollectionHandle<T>,
		sender: &T::CrossAccountId,
	) -> DispatchResult {
		ensure!(
			collection.limits.owner_can_destroy(),
			<Error<T>>::NoPermission,
		);
		collection.check_is_owner(sender)?;

		let destroyed_collections = <DestroyedCollectionCount<T>>::get()
			.0
			.checked_add(1)
			.ok_or(ArithmeticError::Overflow)?;

		// =========

		<DestroyedCollectionCount<T>>::put(destroyed_collections);
		<CollectionById<T>>::remove(collection.id);
		<AdminAmount<T>>::remove(collection.id);
		let _ = <IsAdmin<T>>::clear_prefix((collection.id,), u32::MAX, None);
		let _ = <Allowlist<T>>::clear_prefix((collection.id,), u32::MAX, None);
		<CollectionProperties<T>>::remove(collection.id);

		<Pallet<T>>::deposit_event(Event::CollectionDestroyed(collection.id));

		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionDestroyed {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);
		Ok(())
	}

	/// This function sets or removes a collection properties according to
	/// `properties_updates` contents:
	/// * sets a property under the <key> with the value provided `(<key>, Some(<value>))`
	/// * removes a property under the <key> if the value is `None` `(<key>, None)`.
	///
	/// This function fires an event for each property change.
	/// In case of an error, all the changes (including the events) will be reverted
	/// since the function is transactional.
	#[transactional]
	fn modify_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		properties_updates: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		let mut stored_properties = <CollectionProperties<T>>::get(collection.id);

		for (key, value) in properties_updates {
			match value {
				Some(value) => {
					stored_properties
						.try_set(key.clone(), value)
						.map_err(<Error<T>>::from)?;

					Self::deposit_event(Event::CollectionPropertySet(collection.id, key));
					<PalletEvm<T>>::deposit_log(
						erc::CollectionHelpersEvents::CollectionChanged {
							collection_id: eth::collection_id_to_address(collection.id),
						}
						.to_log(T::ContractAddress::get()),
					);
				}
				None => {
					stored_properties.remove(&key).map_err(<Error<T>>::from)?;

					Self::deposit_event(Event::CollectionPropertyDeleted(collection.id, key));
					<PalletEvm<T>>::deposit_log(
						erc::CollectionHelpersEvents::CollectionChanged {
							collection_id: eth::collection_id_to_address(collection.id),
						}
						.to_log(T::ContractAddress::get()),
					);
				}
			}
		}

		<CollectionProperties<T>>::set(collection.id, stored_properties);

		Ok(())
	}

	/// A batch operation to add, edit or remove properties for a token.
	/// It sets or removes a token's properties according to
	/// `properties_updates` contents:
	/// * sets a property under the <key> with the value provided `(<key>, Some(<value>))`
	/// * removes a property under the <key> if the value is `None` `(<key>, None)`.
	///
	/// - `nesting_budget`: Limit for searching parents in-depth to check ownership.
	/// - `is_token_create`: Indicates that method is called during token initialization.
	///   Allows to bypass ownership check.
	///
	/// All affected properties should have `mutable` permission
	/// to be **deleted** or to be **set more than once**,
	/// and the sender should have permission to edit those properties.
	///
	/// This function fires an event for each property change.
	/// In case of an error, all the changes (including the events) will be reverted
	/// since the function is transactional.
	pub fn modify_token_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		token_id: TokenId,
		properties_updates: impl Iterator<Item = (PropertyKey, Option<PropertyValue>)>,
		is_token_create: bool,
		mut stored_properties: TokenProperties,
		is_token_owner: impl Fn() -> Result<bool, DispatchError>,
		set_token_properties: impl FnOnce(TokenProperties),
		log: evm_coder::ethereum::Log,
	) -> DispatchResult {
		let is_collection_admin = collection.is_owner_or_admin(sender);
		let permissions = Self::property_permissions(collection.id);

		let mut token_owner_result = None;
		let mut is_token_owner = || -> Result<bool, DispatchError> {
			*token_owner_result.get_or_insert_with(&is_token_owner)
		};

		for (key, value) in properties_updates {
			let permission = permissions
				.get(&key)
				.cloned()
				.unwrap_or_else(PropertyPermission::none);

			let is_property_exists = stored_properties.get(&key).is_some();

			match permission {
				PropertyPermission { mutable: false, .. } if is_property_exists => {
					return Err(<Error<T>>::NoPermission.into());
				}

				PropertyPermission {
					collection_admin,
					token_owner,
					..
				} => {
					//TODO: investigate threats during public minting.
					let is_token_create =
						is_token_create && (collection_admin || token_owner) && value.is_some();
					if !(is_token_create
						|| (collection_admin && is_collection_admin)
						|| (token_owner && is_token_owner()?))
					{
						fail!(<Error<T>>::NoPermission);
					}
				}
			}

			match value {
				Some(value) => {
					stored_properties
						.try_set(key.clone(), value)
						.map_err(<Error<T>>::from)?;

					Self::deposit_event(Event::TokenPropertySet(collection.id, token_id, key));
				}
				None => {
					stored_properties.remove(&key).map_err(<Error<T>>::from)?;

					Self::deposit_event(Event::TokenPropertyDeleted(collection.id, token_id, key));
				}
			}

			<PalletEvm<T>>::deposit_log(log.clone());
		}

		set_token_properties(stored_properties);

		Ok(())
	}

	/// Sets or unsets the approval of a given operator.
	///
	/// The `operator` is allowed to transfer all token pieces of the `owner` on their behalf.
	/// - `owner`: Token owner
	/// - `operator`: Operator
	/// - `approve`: Should operator status be granted or revoked?
	pub fn set_allowance_for_all(
		collection: &CollectionHandle<T>,
		owner: &T::CrossAccountId,
		operator: &T::CrossAccountId,
		approve: bool,
		set_allowance: impl FnOnce(),
		log: evm_coder::ethereum::Log,
	) -> DispatchResult {
		if collection.permissions.access() == AccessMode::AllowList {
			collection.check_allowlist(owner)?;
			collection.check_allowlist(operator)?;
		}

		Self::ensure_correct_receiver(operator)?;

		set_allowance();

		<PalletEvm<T>>::deposit_log(log);
		Self::deposit_event(Event::ApprovedForAll(
			collection.id,
			owner.clone(),
			operator.clone(),
			approve,
		));
		Ok(())
	}

	/// Set collection property.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property` - The property to set.
	pub fn set_collection_property(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property: Property,
	) -> DispatchResult {
		Self::set_collection_properties(collection, sender, [property].into_iter())
	}

	/// Set a scoped collection property, where the scope is a special prefix
	/// prohibiting a user access to change the property directly.
	///
	/// * `collection_id` - ID of the collection for which the property is being set.
	/// * `scope` - Property scope.
	/// * `property` - The property to set.
	pub fn set_scoped_collection_property(
		collection_id: CollectionId,
		scope: PropertyScope,
		property: Property,
	) -> DispatchResult {
		CollectionProperties::<T>::try_mutate(collection_id, |properties| {
			properties.try_scoped_set(scope, property.key, property.value)
		})
		.map_err(<Error<T>>::from)?;

		Ok(())
	}

	/// Set scoped collection properties, where the scope is a special prefix
	/// prohibiting a user access to change the properties directly.
	///
	/// * `collection_id` - ID of the collection for which the properties is being set.
	/// * `scope` - Property scope.
	/// * `properties` - The properties to set.
	pub fn set_scoped_collection_properties(
		collection_id: CollectionId,
		scope: PropertyScope,
		properties: impl Iterator<Item = Property>,
	) -> DispatchResult {
		CollectionProperties::<T>::try_mutate(collection_id, |stored_properties| {
			stored_properties.try_scoped_set_from_iter(scope, properties)
		})
		.map_err(<Error<T>>::from)?;

		Ok(())
	}

	/// Set collection properties.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `properties` - The properties to set.
	pub fn set_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		properties: impl Iterator<Item = Property>,
	) -> DispatchResult {
		Self::modify_collection_properties(
			collection,
			sender,
			properties.map(|property| (property.key, Some(property.value))),
		)
	}

	/// Delete collection property.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property` - The property to delete.
	pub fn delete_collection_property(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_key: PropertyKey,
	) -> DispatchResult {
		Self::delete_collection_properties(collection, sender, [property_key].into_iter())
	}

	/// Delete collection properties.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `properties` - The properties to delete.
	pub fn delete_collection_properties(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_keys: impl Iterator<Item = PropertyKey>,
	) -> DispatchResult {
		Self::modify_collection_properties(collection, sender, property_keys.map(|key| (key, None)))
	}

	/// Set collection propetry permission without any checks.
	///
	/// Used for migrations.
	///
	/// * `collection` - Collection handler.
	/// * `property_permissions` - Property permissions.
	pub fn set_property_permission_unchecked(
		collection: CollectionId,
		property_permission: PropertyKeyPermission,
	) -> DispatchResult {
		<CollectionPropertyPermissions<T>>::try_mutate(collection, |permissions| {
			permissions.try_set(property_permission.key, property_permission.permission)
		})
		.map_err(<Error<T>>::from)?;
		Ok(())
	}

	/// Set collection property permission.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property_permission` - Property permission.
	pub fn set_property_permission(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permission: PropertyKeyPermission,
	) -> DispatchResult {
		Self::set_scoped_property_permission(
			collection,
			sender,
			PropertyScope::None,
			property_permission,
		)
	}

	/// Set collection property permission with scope.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `scope` - Property scope.
	/// * `property_permission` - Property permission.
	pub fn set_scoped_property_permission(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		scope: PropertyScope,
		property_permission: PropertyKeyPermission,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		let all_permissions = CollectionPropertyPermissions::<T>::get(collection.id);
		let current_permission = all_permissions.get(&property_permission.key);
		if matches![
			current_permission,
			Some(PropertyPermission { mutable: false, .. })
		] {
			return Err(<Error<T>>::NoPermission.into());
		}

		CollectionPropertyPermissions::<T>::try_mutate(collection.id, |permissions| {
			let property_permission = property_permission.clone();
			permissions.try_scoped_set(
				scope,
				property_permission.key,
				property_permission.permission,
			)
		})
		.map_err(<Error<T>>::from)?;

		Self::deposit_event(Event::PropertyPermissionSet(
			collection.id,
			property_permission.key,
		));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		Ok(())
	}

	/// Set token property permission.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `property_permissions` - Property permissions.
	#[transactional]
	pub fn set_token_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		Self::set_scoped_token_property_permissions(
			collection,
			sender,
			PropertyScope::None,
			property_permissions,
		)
	}

	/// Set token property permission with scope.
	///
	/// * `collection` - Collection handler.
	/// * `sender` - The owner or administrator of the collection.
	/// * `scope` - Property scope.
	/// * `property_permissions` - Property permissions.
	#[transactional]
	pub fn set_scoped_token_property_permissions(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		scope: PropertyScope,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResult {
		for prop_pemission in property_permissions {
			Self::set_scoped_property_permission(collection, sender, scope, prop_pemission)?;
		}

		Ok(())
	}

	/// Get collection property.
	pub fn get_collection_property(
		collection_id: CollectionId,
		key: &PropertyKey,
	) -> Option<PropertyValue> {
		Self::collection_properties(collection_id).get(key).cloned()
	}

	/// Convert byte vector to property key vector.
	pub fn bytes_keys_to_property_keys(
		keys: Vec<Vec<u8>>,
	) -> Result<Vec<PropertyKey>, DispatchError> {
		keys.into_iter()
			.map(|key| -> Result<PropertyKey, DispatchError> {
				key.try_into()
					.map_err(|_| <Error<T>>::PropertyKeyIsTooLong.into())
			})
			.collect::<Result<Vec<PropertyKey>, DispatchError>>()
	}

	/// Get properties according to given keys.
	pub fn filter_collection_properties(
		collection_id: CollectionId,
		keys: Option<Vec<PropertyKey>>,
	) -> Result<Vec<Property>, DispatchError> {
		let properties = Self::collection_properties(collection_id);

		let properties = keys
			.map(|keys| {
				keys.into_iter()
					.filter_map(|key| {
						properties.get(&key).map(|value| Property {
							key,
							value: value.clone(),
						})
					})
					.collect()
			})
			.unwrap_or_else(|| {
				properties
					.into_iter()
					.map(|(key, value)| Property { key, value })
					.collect()
			});

		Ok(properties)
	}

	/// Get property permissions according to given keys.
	pub fn filter_property_permissions(
		collection_id: CollectionId,
		keys: Option<Vec<PropertyKey>>,
	) -> Result<Vec<PropertyKeyPermission>, DispatchError> {
		let permissions = Self::property_permissions(collection_id);

		let key_permissions = keys
			.map(|keys| {
				keys.into_iter()
					.filter_map(|key| {
						permissions
							.get(&key)
							.map(|permission| PropertyKeyPermission {
								key,
								permission: permission.clone(),
							})
					})
					.collect()
			})
			.unwrap_or_else(|| {
				permissions
					.into_iter()
					.map(|(key, permission)| PropertyKeyPermission { key, permission })
					.collect()
			});

		Ok(key_permissions)
	}

	/// Toggle `user` participation in the `collection`'s allow list.
	/// #### Store read/writes
	/// 1 writes
	pub fn toggle_allowlist(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		user: &T::CrossAccountId,
		allowed: bool,
	) -> DispatchResult {
		collection.check_is_owner_or_admin(sender)?;

		// =========

		if allowed {
			<Allowlist<T>>::insert((collection.id, user), true);
			Self::deposit_event(Event::<T>::AllowListAddressAdded(
				collection.id,
				user.clone(),
			));
		} else {
			<Allowlist<T>>::remove((collection.id, user));
			Self::deposit_event(Event::<T>::AllowListAddressRemoved(
				collection.id,
				user.clone(),
			));
		}

		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		Ok(())
	}

	/// Toggle `user` participation in the `collection`'s admin list.
	/// #### Store read/writes
	/// 2 reads, 2 writes
	pub fn toggle_admin(
		collection: &CollectionHandle<T>,
		sender: &T::CrossAccountId,
		user: &T::CrossAccountId,
		admin: bool,
	) -> DispatchResult {
		collection.check_is_internal()?;
		collection.check_is_owner(sender)?;

		let is_admin = <IsAdmin<T>>::get((collection.id, user));
		if is_admin == admin {
			if admin {
				return Ok(());
			} else {
				return Err(Error::<T>::UserIsNotCollectionAdmin.into());
			}
		}
		let amount = <AdminAmount<T>>::get(collection.id);

		// =========

		if admin {
			let amount = amount
				.checked_add(1)
				.ok_or(<Error<T>>::CollectionAdminCountExceeded)?;
			ensure!(
				amount <= Self::collection_admins_limit(),
				<Error<T>>::CollectionAdminCountExceeded,
			);

			<AdminAmount<T>>::insert(collection.id, amount);
			<IsAdmin<T>>::insert((collection.id, user), true);

			Self::deposit_event(Event::<T>::CollectionAdminAdded(
				collection.id,
				user.clone(),
			));
		} else {
			<AdminAmount<T>>::insert(collection.id, amount.saturating_sub(1));
			<IsAdmin<T>>::remove((collection.id, user));

			Self::deposit_event(Event::<T>::CollectionAdminRemoved(
				collection.id,
				user.clone(),
			));
		}

		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		Ok(())
	}

	/// Update collection limits.
	pub fn update_limits(
		user: &T::CrossAccountId,
		collection: &mut CollectionHandle<T>,
		new_limit: CollectionLimits,
	) -> DispatchResult {
		collection.check_is_internal()?;
		collection.check_is_owner_or_admin(user)?;

		collection.limits =
			Self::clamp_limits(collection.mode.clone(), &collection.limits, new_limit)?;

		Self::deposit_event(Event::<T>::CollectionLimitSet(collection.id));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		collection.save()
	}

	/// Merge set fields from `new_limit` to `old_limit`.
	fn clamp_limits(
		mode: CollectionMode,
		old_limit: &CollectionLimits,
		mut new_limit: CollectionLimits,
	) -> Result<CollectionLimits, DispatchError> {
		let limits = old_limit;
		limit_default!(old_limit, new_limit,
			account_token_ownership_limit => ensure!(
				new_limit <= MAX_TOKEN_OWNERSHIP,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsored_data_size => ensure!(
				new_limit <= CUSTOM_DATA_LIMIT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),

			sponsored_data_rate_limit => {},
			token_limit => ensure!(
				old_limit >= new_limit && new_limit > 0,
				<Error<T>>::CollectionTokenLimitExceeded
			),

			sponsor_transfer_timeout(match mode {
				CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
			}) => ensure!(
				new_limit <= MAX_SPONSOR_TIMEOUT,
				<Error<T>>::CollectionLimitBoundsExceeded,
			),
			sponsor_approve_timeout => {},
			owner_can_transfer => ensure!(
				!limits.owner_can_transfer_instaled() ||
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			owner_can_destroy => ensure!(
				old_limit || !new_limit,
				<Error<T>>::OwnerPermissionsCantBeReverted,
			),
			transfers_enabled => {},
		);
		Ok(new_limit)
	}

	/// Update collection permissions.
	pub fn update_permissions(
		user: &T::CrossAccountId,
		collection: &mut CollectionHandle<T>,
		new_permission: CollectionPermissions,
	) -> DispatchResult {
		collection.check_is_internal()?;
		collection.check_is_owner_or_admin(user)?;
		collection.permissions = Self::clamp_permissions(
			collection.mode.clone(),
			&collection.permissions,
			new_permission,
		)?;

		Self::deposit_event(Event::<T>::CollectionPermissionSet(collection.id));
		<PalletEvm<T>>::deposit_log(
			erc::CollectionHelpersEvents::CollectionChanged {
				collection_id: eth::collection_id_to_address(collection.id),
			}
			.to_log(T::ContractAddress::get()),
		);

		collection.save()
	}

	/// Merge set fields from `new_permission` to `old_permission`.
	fn clamp_permissions(
		_mode: CollectionMode,
		old_permission: &CollectionPermissions,
		mut new_permission: CollectionPermissions,
	) -> Result<CollectionPermissions, DispatchError> {
		limit_default_clone!(old_permission, new_permission,
			access => {},
			mint_mode => {},
			nesting => { /* todo check for permissive, if only it gets out of benchmarks */ },
		);
		Ok(new_permission)
	}

	/// Repair possibly broken properties of a collection.
	pub fn repair_collection(collection_id: CollectionId) -> DispatchResult {
		CollectionProperties::<T>::mutate(collection_id, |properties| {
			properties.recompute_consumed_space();
		});

		Ok(())
	}
}

/// Indicates unsupported methods by returning [Error::UnsupportedOperation].
#[macro_export]
macro_rules! unsupported {
	($runtime:path) => {
		Err($crate::Error::<$runtime>::UnsupportedOperation.into())
	};
}

/// Return weights for various worst-case operations.
pub trait CommonWeightInfo<CrossAccountId> {
	/// Weight of item creation.
	fn create_item(data: &CreateItemData) -> Weight {
		Self::create_multiple_items(from_ref(data))
	}

	/// Weight of items creation.
	fn create_multiple_items(amount: &[CreateItemData]) -> Weight;

	/// Weight of items creation.
	fn create_multiple_items_ex(cost: &CreateItemExData<CrossAccountId>) -> Weight;

	/// The weight of the burning item.
	fn burn_item() -> Weight;

	/// Property setting weight.
	///
	/// * `amount`- The number of properties to set.
	fn set_collection_properties(amount: u32) -> Weight;

	/// Collection property deletion weight.
	///
	/// * `amount`- The number of properties to set.
	fn delete_collection_properties(amount: u32) -> Weight;

	/// Token property setting weight.
	///
	/// * `amount`- The number of properties to set.
	fn set_token_properties(amount: u32) -> Weight;

	/// Token property deletion weight.
	///
	/// * `amount`- The number of properties to delete.
	fn delete_token_properties(amount: u32) -> Weight;

	/// Token property permissions set weight.
	///
	/// * `amount`- The number of property permissions to set.
	fn set_token_property_permissions(amount: u32) -> Weight;

	/// Transfer price of the token or its parts.
	fn transfer() -> Weight;

	/// The price of setting the permission of the operation from another user.
	fn approve() -> Weight;

	/// The price of setting the permission of the operation from another user for eth mirror.
	fn approve_from() -> Weight;

	/// Transfer price from another user.
	fn transfer_from() -> Weight;

	/// The price of burning a token from another user.
	fn burn_from() -> Weight;

	/// Differs from burn_item in case of Fungible and Refungible, as it should burn
	/// whole users's balance.
	///
	/// This method shouldn't be used directly, as it doesn't count breadth price, use [burn_recursively](CommonWeightInfo::burn_recursively) instead
	fn burn_recursively_self_raw() -> Weight;

	/// Cost of iterating over `amount` children while burning, without counting child burning itself.
	///
	/// This method shouldn't be used directly, as it doesn't count depth price, use [burn_recursively](CommonWeightInfo::burn_recursively) instead
	fn burn_recursively_breadth_raw(amount: u32) -> Weight;

	/// The price of recursive burning a token.
	///
	/// `max_selfs` - The maximum burning weight of the token itself.
	/// `max_breadth` - The maximum number of nested tokens to burn.
	fn burn_recursively(max_selfs: u32, max_breadth: u32) -> Weight {
		Self::burn_recursively_self_raw()
			.saturating_mul(max_selfs.max(1) as u64)
			.saturating_add(Self::burn_recursively_breadth_raw(max_breadth))
	}

	/// The price of retrieving token owner
	fn token_owner() -> Weight;

	/// The price of setting approval for all
	fn set_allowance_for_all() -> Weight;

	/// The price of repairing an item.
	fn force_repair_item() -> Weight;
}

/// Weight info extension trait for refungible pallet.
pub trait RefungibleExtensionsWeightInfo {
	/// Weight of token repartition.
	fn repartition() -> Weight;
}

/// Common collection operations.
///
/// It wraps methods in Fungible, Nonfungible and Refungible pallets
/// and adds weight info.
pub trait CommonCollectionOperations<T: Config> {
	/// Create token.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_item(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: CreateItemData,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Create multiple tokens.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_multiple_items(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		data: Vec<CreateItemData>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Create multiple tokens.
	///
	/// * `sender` - The user who mint the token and pays for the transaction.
	/// * `to` - The user who will own the token.
	/// * `data` - Token data.
	/// * `nesting_budget` - A budget that can be spent on nesting tokens.
	fn create_multiple_items_ex(
		&self,
		sender: T::CrossAccountId,
		data: CreateItemExData<T::CrossAccountId>,
		nesting_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Burn token.
	///
	/// * `sender` - The user who owns the token.
	/// * `token` - Token id that will burned.
	/// * `amount` - The number of parts of the token that will be burned.
	fn burn_item(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	/// Burn token and all nested tokens recursievly.
	///
	/// * `sender` - The user who owns the token.
	/// * `token` - Token id that will burned.
	/// * `self_budget` - The budget that can be spent on burning tokens.
	/// * `breadth_budget` - The budget that can be spent on burning nested tokens.
	fn burn_item_recursively(
		&self,
		sender: T::CrossAccountId,
		token: TokenId,
		self_budget: &dyn Budget,
		breadth_budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Set collection properties.
	///
	/// * `sender` - Must be either the owner of the collection or its admin.
	/// * `properties` - Properties to be set.
	fn set_collection_properties(
		&self,
		sender: T::CrossAccountId,
		properties: Vec<Property>,
	) -> DispatchResultWithPostInfo;

	/// Delete collection properties.
	///
	/// * `sender` - Must be either the owner of the collection or its admin.
	/// * `properties` - The properties to be removed.
	fn delete_collection_properties(
		&self,
		sender: &T::CrossAccountId,
		property_keys: Vec<PropertyKey>,
	) -> DispatchResultWithPostInfo;

	/// Set token properties.
	///
	/// The appropriate [`PropertyPermission`] for the token property
	/// must be set with [`Self::set_token_property_permissions`].
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being set.
	/// * `properties` - Properties to be set.
	/// * `budget` - Budget for setting properties.
	fn set_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		properties: Vec<Property>,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Remove token properties.
	///
	/// The appropriate [`PropertyPermission`] for the token property
	/// must be set with [`Self::set_token_property_permissions`].
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being remove.
	/// * `property_keys` - Keys to remove corresponding properties.
	/// * `budget` - Budget for removing properties.
	fn delete_token_properties(
		&self,
		sender: T::CrossAccountId,
		token_id: TokenId,
		property_keys: Vec<PropertyKey>,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Set token property permissions.
	///
	/// * `sender` - Must be either the owner of the token or its admin.
	/// * `token_id` - The token for which the properties are being set.
	/// * `property_permissions` - Property permissions to be set.
	/// * `budget` - Budget for setting properties.
	fn set_token_property_permissions(
		&self,
		sender: &T::CrossAccountId,
		property_permissions: Vec<PropertyKeyPermission>,
	) -> DispatchResultWithPostInfo;

	/// Transfer amount of token pieces.
	///
	/// * `sender` - Donor user.
	/// * `to` - Recepient user.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the transfer.
	fn transfer(
		&self,
		sender: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Grant access to another account to transfer parts of the token owned by the calling user via [Self::transfer_from].
	///
	/// * `sender` - The user who grants access to the token.
	/// * `spender` - The user to whom the rights are granted.
	/// * `token` - The token to which access is granted.
	/// * `amount` - The amount of pieces that another user can dispose of.
	fn approve(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	/// Grant access to another account to transfer parts of the token owned by the calling user's eth mirror via [Self::transfer_from].
	///
	/// * `sender` - The user who grants access to the token.
	/// * `from` - Spender's eth mirror.
	/// * `to` - The user to whom the rights are granted.
	/// * `token` - The token to which access is granted.
	/// * `amount` - The amount of pieces that another user can dispose of.
	fn approve_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;

	/// Send parts of a token owned by another user.
	///
	/// Before calling this method, you must grant rights to the calling user via [`Self::approve`].
	///
	/// * `sender` - The user who must have access to the token (see [`Self::approve`]).
	/// * `from` - The user who owns the token.
	/// * `to` - Recepient user.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the transfer.
	fn transfer_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		to: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Burn parts of a token owned by another user.
	///
	/// Before calling this method, you must grant rights to the calling user via [`Self::approve`].
	///
	/// * `sender` - The user who must have access to the token (see [`Self::approve`]).
	/// * `from` - The user who owns the token.
	/// * `token` - The token of which parts are being sent.
	/// * `amount` - The number of parts of the token that will be transferred.
	/// * `budget` - The maximum budget that can be spent on the burn.
	fn burn_from(
		&self,
		sender: T::CrossAccountId,
		from: T::CrossAccountId,
		token: TokenId,
		amount: u128,
		budget: &dyn Budget,
	) -> DispatchResultWithPostInfo;

	/// Check permission to nest token.
	///
	/// * `sender` - The user who initiated the check.
	/// * `from` - The token that is checked for embedding.
	/// * `under` - Token under which to check.
	/// * `budget` - The maximum budget that can be spent on the check.
	fn check_nesting(
		&self,
		sender: T::CrossAccountId,
		from: (CollectionId, TokenId),
		under: TokenId,
		budget: &dyn Budget,
	) -> DispatchResult;

	/// Nest one token into another.
	///
	/// * `under` - Token holder.
	/// * `to_nest` - Nested token.
	fn nest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	/// Unnest token.
	///
	/// * `under` - Token holder.
	/// * `to_nest` - Token to unnest.
	fn unnest(&self, under: TokenId, to_nest: (CollectionId, TokenId));

	/// Get all user tokens.
	///
	/// * `account` - Account for which you need to get tokens.
	fn account_tokens(&self, account: T::CrossAccountId) -> Vec<TokenId>;

	/// Get all the tokens in the collection.
	fn collection_tokens(&self) -> Vec<TokenId>;

	/// Check if the token exists.
	///
	/// * `token` - Id token to check.
	fn token_exists(&self, token: TokenId) -> bool;

	/// Get the id of the last minted token.
	fn last_token_id(&self) -> TokenId;

	/// Get the owner of the token.
	///
	/// * `token` - The token for which you need to find out the owner.
	fn token_owner(&self, token: TokenId) -> Result<T::CrossAccountId, TokenOwnerError>;

	/// Returns 10 tokens owners in no particular order.
	///
	/// * `token` - The token for which you need to find out the owners.
	fn token_owners(&self, token: TokenId) -> Vec<T::CrossAccountId>;

	/// Get the value of the token property by key.
	///
	/// * `token` - Token with the property to get.
	/// * `key` - Property name.
	fn token_property(&self, token_id: TokenId, key: &PropertyKey) -> Option<PropertyValue>;

	/// Get a set of token properties by key vector.
	///
	/// * `token` - Token with the property to get.
	/// * `keys` - Vector of property keys. If this parameter is [None](sp_std::result::Result),
	/// then all properties are returned.
	fn token_properties(&self, token: TokenId, keys: Option<Vec<PropertyKey>>) -> Vec<Property>;

	/// Amount of unique collection tokens
	fn total_supply(&self) -> u32;

	/// Amount of different tokens account has.
	///
	/// * `account` - The account for which need to get the balance.
	fn account_balance(&self, account: T::CrossAccountId) -> u32;

	/// Amount of specific token account have.
	fn balance(&self, account: T::CrossAccountId, token: TokenId) -> u128;

	/// Amount of token pieces
	fn total_pieces(&self, token: TokenId) -> Option<u128>;

	/// Get the number of parts of the token that a trusted user can manage.
	///
	/// * `sender` - Trusted user.
	/// * `spender` - Owner of the token.
	/// * `token` - The token for which to get the value.
	fn allowance(
		&self,
		sender: T::CrossAccountId,
		spender: T::CrossAccountId,
		token: TokenId,
	) -> u128;

	/// Get extension for RFT collection.
	fn refungible_extensions(&self) -> Option<&dyn RefungibleExtensions<T>>;

	/// The `operator` is allowed to transfer all tokens of the `owner` on their behalf.
	/// * `owner` - Token owner
	/// * `operator` - Operator
	/// * `approve` - Should operator status be granted or revoked?
	fn set_allowance_for_all(
		&self,
		owner: T::CrossAccountId,
		operator: T::CrossAccountId,
		approve: bool,
	) -> DispatchResultWithPostInfo;

	/// Tells whether the given `owner` approves the `operator`.
	fn allowance_for_all(&self, owner: T::CrossAccountId, operator: T::CrossAccountId) -> bool;

	/// Repairs a possibly broken item.
	fn repair_item(&self, token: TokenId) -> DispatchResultWithPostInfo;
}

/// Extension for RFT collection.
pub trait RefungibleExtensions<T>
where
	T: Config,
{
	/// Change the number of parts of the token.
	///
	/// When the value changes down, this function is equivalent to burning parts of the token.
	///
	/// * `sender` - The user calling the repartition operation. Must be the owner of the token.
	/// * `token` - The token for which you want to change the number of parts.
	/// * `amount` - The new value of the parts of the token.
	fn repartition(
		&self,
		sender: &T::CrossAccountId,
		token: TokenId,
		amount: u128,
	) -> DispatchResultWithPostInfo;
}

/// Merge [`DispatchResult`] with [`Weight`] into [`DispatchResultWithPostInfo`].
///
/// Used for [`CommonCollectionOperations`] implementations and flexible enough to do so.
pub fn with_weight(res: DispatchResult, weight: Weight) -> DispatchResultWithPostInfo {
	let post_info = PostDispatchInfo {
		actual_weight: Some(weight),
		pays_fee: Pays::Yes,
	};
	match res {
		Ok(()) => Ok(post_info),
		Err(error) => Err(DispatchErrorWithPostInfo { post_info, error }),
	}
}

impl<T: Config> From<PropertiesError> for Error<T> {
	fn from(error: PropertiesError) -> Self {
		match error {
			PropertiesError::NoSpaceForProperty => Self::NoSpaceForProperty,
			PropertiesError::PropertyLimitReached => Self::PropertyLimitReached,
			PropertiesError::InvalidCharacterInPropertyKey => Self::InvalidCharacterInPropertyKey,
			PropertiesError::PropertyKeyIsTooLong => Self::PropertyKeyIsTooLong,
			PropertiesError::EmptyPropertyKey => Self::EmptyPropertyKey,
		}
	}
}
