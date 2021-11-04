//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

#![recursion_limit = "1024"]
#![cfg_attr(not(feature = "std"), no_std)]
#![allow(
	clippy::too_many_arguments,
	clippy::unnecessary_mut_passed,
	clippy::unused_unit
)]

extern crate alloc;

pub use serde::{Serialize, Deserialize};

pub use frame_support::{
	construct_runtime, decl_module, decl_storage, decl_error,
	dispatch::DispatchResult,
	ensure, fail, parameter_types,
	traits::{
		ExistenceRequirement, Get, Imbalance, KeyOwnerProofSystem, OnUnbalanced, Randomness,
		IsSubType, WithdrawReasons,
	},
	weights::{
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight, WEIGHT_PER_SECOND},
		DispatchInfo, GetDispatchInfo, IdentityFee, Pays, PostDispatchInfo, Weight,
		WeightToFeePolynomial, DispatchClass,
	},
	StorageValue, transactional,
	pallet_prelude::DispatchResultWithPostInfo,
};
use scale_info::TypeInfo;
use frame_system::{self as system, ensure_signed};
use sp_runtime::{sp_std::prelude::Vec};
use nft_data_structs::{
	MAX_DECIMAL_POINTS, MAX_SPONSOR_TIMEOUT, MAX_TOKEN_OWNERSHIP, CUSTOM_DATA_LIMIT,
	VARIABLE_ON_CHAIN_SCHEMA_LIMIT, CONST_ON_CHAIN_SCHEMA_LIMIT, OFFCHAIN_SCHEMA_LIMIT,
	FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT, REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
	NFT_SPONSOR_TRANSFER_TIMEOUT, AccessMode, Collection, CreateItemData, CollectionLimits,
	CollectionId, CollectionMode, TokenId, SchemaVersion, SponsorshipState, MetaUpdatePermission,
};
use pallet_common::{
	account::CrossAccountId, CollectionHandle, IsAdmin, Pallet as PalletCommon,
	Error as CommonError, CommonWeightInfo, Allowlist,
};
use pallet_refungible::{Pallet as PalletRefungible, RefungibleHandle};
use pallet_fungible::{Pallet as PalletFungible, FungibleHandle};
use pallet_nonfungible::{Pallet as PalletNonfungible, NonfungibleHandle};

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

mod eth;
mod sponsorship;
pub use sponsorship::NftSponsorshipHandler;
pub use eth::sponsoring::NftEthSponsorshipHandler;

pub use eth::NftErcSupport;

pub mod common;
use common::CommonWeights;
pub mod dispatch;
use dispatch::dispatch_call;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;
use weights::WeightInfo;

decl_error! {
	/// Error for non-fungible-token module.
	pub enum Error for Module<T: Config> {
		/// Decimal_points parameter must be lower than MAX_DECIMAL_POINTS constant, currently it is 30.
		CollectionDecimalPointLimitExceeded,
		/// This address is not set as sponsor, use setCollectionSponsor first.
		ConfirmUnsetSponsorFail,
		/// Length of items properties must be greater than 0.
		EmptyArgument,
		/// Collection limit bounds per collection exceeded
		CollectionLimitBoundsExceeded,
		/// Tried to enable permissions which are only permitted to be disabled
		OwnerPermissionsCantBeReverted,
	}
}
pub trait Config:
	system::Config
	+ pallet_evm_coder_substrate::Config
	+ pallet_common::Config
	+ pallet_nonfungible::Config
	+ pallet_refungible::Config
	+ pallet_fungible::Config
	+ Sized
	+ TypeInfo
{
	/// Weight information for extrinsics in this pallet.
	type WeightInfo: WeightInfo;
}

type SelfWeightOf<T> = <T as Config>::WeightInfo;

// # Used definitions
//
// ## User control levels
//
// chain-controlled - key is uncontrolled by user
//                    i.e autoincrementing index
//                    can use non-cryptographic hash
// real - key is controlled by user
//        but it is hard to generate enough colliding values, i.e owner of signed txs
//        can use non-cryptographic hash
// controlled - key is completly controlled by users
//              i.e maps with mutable keys
//              should use cryptographic hash
//
// ## User control level downgrade reasons
//
// ?1 - chain-controlled -> controlled
//      collections/tokens can be destroyed, resulting in massive holes
// ?2 - chain-controlled -> controlled
//      same as ?1, but can be only added, resulting in easier exploitation
// ?3 - real -> controlled
//      no confirmation required, so addresses can be easily generated
decl_storage! {
	trait Store for Module<T: Config> as Nft {

		//#region Private members
		/// Used for migrations
		ChainVersion: u64;
		//#endregion

		//#region Tokens transfer rate limit baskets
		/// (Collection id (controlled?2), who created (real))
		/// TODO: Off chain worker should remove from this map when collection gets removed
		pub CreateItemBasket get(fn create_item_basket): map hasher(blake2_128_concat) (CollectionId, T::AccountId) => T::BlockNumber;
		/// Collection id (controlled?2), token id (controlled?2)
		pub NftTransferBasket get(fn nft_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => T::BlockNumber;
		/// Collection id (controlled?2), owning user (real)
		pub FungibleTransferBasket get(fn fungible_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(twox_64_concat) T::AccountId => T::BlockNumber;
		/// Collection id (controlled?2), token id (controlled?2)
		pub ReFungibleTransferBasket get(fn refungible_transfer_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => T::BlockNumber;
		//#endregion

		/// Variable metadata sponsoring
		/// Collection id (controlled?2), token id (controlled?2)
		pub VariableMetaDataBasket get(fn variable_meta_data_basket): double_map hasher(blake2_128_concat) CollectionId, hasher(blake2_128_concat) TokenId => Option<T::BlockNumber> = None;
	}
}

decl_module! {
	pub struct Module<T: Config> for enum Call
	where
		origin: T::Origin
	{
		type Error = Error<T>;

		fn on_initialize(_now: T::BlockNumber) -> Weight {
			0
		}

		/// This method creates a Collection of NFTs. Each Token may have multiple properties encoded as an array of bytes of certain length. The initial owner and admin of the collection are set to the address that signed the transaction. Both addresses can be changed later.
		///
		/// # Permissions
		///
		/// * Anyone.
		///
		/// # Arguments
		///
		/// * collection_name: UTF-16 string with collection name (limit 64 characters), will be stored as zero-terminated.
		///
		/// * collection_description: UTF-16 string with collection description (limit 256 characters), will be stored as zero-terminated.
		///
		/// * token_prefix: UTF-8 string with token prefix.
		///
		/// * mode: [CollectionMode] collection type and type dependent data.
		// returns collection ID
		#[weight = <SelfWeightOf<T>>::create_collection()]
		#[transactional]
		pub fn create_collection(origin,
								 collection_name: Vec<u16>,
								 collection_description: Vec<u16>,
								 token_prefix: Vec<u8>,
								 mode: CollectionMode) -> DispatchResult {

			// Anyone can create a collection
			let who = ensure_signed(origin)?;

			// Create new collection
			let new_collection = Collection::<T> {
				owner: who.clone(),
				name: collection_name,
				mode: mode.clone(),
				mint_mode: false,
				access: AccessMode::Normal,
				description: collection_description,
				token_prefix,
				offchain_schema: Vec::new(),
				schema_version: SchemaVersion::ImageURL,
				sponsorship: SponsorshipState::Disabled,
				variable_on_chain_schema: Vec::new(),
				const_on_chain_schema: Vec::new(),
				limits: Default::default(),
				meta_update_permission: Default::default(),
			};

			let _id = match mode {
				CollectionMode::NFT => {PalletNonfungible::init_collection(new_collection)?},
				CollectionMode::Fungible(decimal_points) => {
					// check params
					ensure!(decimal_points <= MAX_DECIMAL_POINTS, Error::<T>::CollectionDecimalPointLimitExceeded);
					PalletFungible::init_collection(new_collection)?
				}
				CollectionMode::ReFungible => {
					PalletRefungible::init_collection(new_collection)?
				}
			};

			Ok(())
		}

		/// **DANGEROUS**: Destroys collection and all NFTs within this collection. Users irrecoverably lose their assets and may lose real money.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: collection to destroy.
		#[weight = <SelfWeightOf<T>>::destroy_collection()]
		#[transactional]
		pub fn destroy_collection(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let collection = <CollectionHandle<T>>::try_get(collection_id)?;
			collection.check_is_owner(&sender)?;

			// =========

			match collection.mode {
				CollectionMode::ReFungible => PalletRefungible::destroy_collection(RefungibleHandle::cast(collection), &sender)?,
				CollectionMode::Fungible(_) => PalletFungible::destroy_collection(FungibleHandle::cast(collection), &sender)?,
				CollectionMode::NFT => PalletNonfungible::destroy_collection(NonfungibleHandle::cast(collection), &sender)?,
			}

			<NftTransferBasket<T>>::remove_prefix(collection_id, None);
			<FungibleTransferBasket<T>>::remove_prefix(collection_id, None);
			<ReFungibleTransferBasket<T>>::remove_prefix(collection_id, None);

			<VariableMetaDataBasket<T>>::remove_prefix(collection_id, None);

			Ok(())
		}

		/// Add an address to white list.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * address.
		#[weight = <SelfWeightOf<T>>::add_to_white_list()]
		#[transactional]
		pub fn add_to_white_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;

			<PalletCommon<T>>::toggle_allowlist(
				&collection,
				&sender,
				&address,
				true,
			)?;

			Ok(())
		}

		/// Remove an address from white list.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * address.
		#[weight = <SelfWeightOf<T>>::remove_from_white_list()]
		#[transactional]
		pub fn remove_from_white_list(origin, collection_id: CollectionId, address: T::CrossAccountId) -> DispatchResult{

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;

			<PalletCommon<T>>::toggle_allowlist(
				&collection,
				&sender,
				&address,
				false,
			)?;

			Ok(())
		}

		/// Toggle between normal and white list access for the methods with access for `Anyone`.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * mode: [AccessMode]
		#[weight = <SelfWeightOf<T>>::set_public_access_mode()]
		#[transactional]
		pub fn set_public_access_mode(origin, collection_id: CollectionId, mode: AccessMode) -> DispatchResult
		{
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;

			target_collection.access = mode;
			target_collection.save()
		}

		/// Allows Anyone to create tokens if:
		/// * White List is enabled, and
		/// * Address is added to white list, and
		/// * This method was called with True parameter
		///
		/// # Permissions
		/// * Collection Owner
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * mint_permission: Boolean parameter. If True, allows minting to Anyone with conditions above.
		#[weight = <SelfWeightOf<T>>::set_mint_permission()]
		#[transactional]
		pub fn set_mint_permission(origin, collection_id: CollectionId, mint_permission: bool) -> DispatchResult
		{
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;

			target_collection.mint_mode = mint_permission;
			target_collection.save()
		}

		/// Change the owner of the collection.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * new_owner.
		#[weight = <SelfWeightOf<T>>::change_collection_owner()]
		#[transactional]
		pub fn change_collection_owner(origin, collection_id: CollectionId, new_owner: T::AccountId) -> DispatchResult {

			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;

			target_collection.owner = new_owner;
			target_collection.save()
		}

		/// Adds an admin of the Collection.
		/// NFT Collection can be controlled by multiple admin addresses (some which can also be servers, for example). Admins can issue and burn NFTs, as well as add and remove other admins, but cannot change NFT or Collection ownership.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the Collection to add admin for.
		///
		/// * new_admin_id: Address of new admin to add.
		#[weight = <SelfWeightOf<T>>::add_collection_admin()]
		#[transactional]
		pub fn add_collection_admin(origin, collection_id: CollectionId, new_admin_id: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;

			<PalletCommon<T>>::toggle_admin(&collection, &sender, &new_admin_id, true)
		}

		/// Remove admin address of the Collection. An admin address can remove itself. List of admins may become empty, in which case only Collection Owner will be able to add an Admin.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the Collection to remove admin for.
		///
		/// * account_id: Address of admin to remove.
		#[weight = <SelfWeightOf<T>>::remove_collection_admin()]
		#[transactional]
		pub fn remove_collection_admin(origin, collection_id: CollectionId, account_id: T::CrossAccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let collection = <CollectionHandle<T>>::try_get(collection_id)?;

			<PalletCommon<T>>::toggle_admin(&collection, &sender, &account_id, false)
		}

		/// # Permissions
		///
		/// * Collection Owner
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * new_sponsor.
		#[weight = <SelfWeightOf<T>>::set_collection_sponsor()]
		#[transactional]
		pub fn set_collection_sponsor(origin, collection_id: CollectionId, new_sponsor: T::AccountId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;

			target_collection.sponsorship = SponsorshipState::Unconfirmed(new_sponsor);
			target_collection.save()
		}

		/// # Permissions
		///
		/// * Sponsor.
		///
		/// # Arguments
		///
		/// * collection_id.
		#[weight = <SelfWeightOf<T>>::confirm_sponsorship()]
		#[transactional]
		pub fn confirm_sponsorship(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			ensure!(
				target_collection.sponsorship.pending_sponsor() == Some(&sender),
				Error::<T>::ConfirmUnsetSponsorFail
			);

			target_collection.sponsorship = SponsorshipState::Confirmed(sender);
			target_collection.save()
		}

		/// Switch back to pay-per-own-transaction model.
		///
		/// # Permissions
		///
		/// * Collection owner.
		///
		/// # Arguments
		///
		/// * collection_id.
		#[weight = <SelfWeightOf<T>>::remove_collection_sponsor()]
		#[transactional]
		pub fn remove_collection_sponsor(origin, collection_id: CollectionId) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;

			target_collection.sponsorship = SponsorshipState::Disabled;
			target_collection.save()
		}

		/// This method creates a concrete instance of NFT Collection created with CreateCollection method.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Anyone if
		///     * White List is enabled, and
		///     * Address is added to white list, and
		///     * MintPermission is enabled (see SetMintPermission method)
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * owner: Address, initial owner of the NFT.
		///
		/// * data: Token data to store on chain.
		#[weight = <CommonWeights<T>>::create_item()]
		#[transactional]
		pub fn create_item(origin, collection_id: CollectionId, owner: T::CrossAccountId, data: CreateItemData) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.create_item(sender, owner, data))
		}

		/// This method creates multiple items in a collection created with CreateCollection method.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Anyone if
		///     * White List is enabled, and
		///     * Address is added to white list, and
		///     * MintPermission is enabled (see SetMintPermission method)
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * itemsData: Array items properties. Each property is an array of bytes itself, see [create_item].
		///
		/// * owner: Address, initial owner of the NFT.
		#[weight = <CommonWeights<T>>::create_multiple_items(items_data.len() as u32)]
		#[transactional]
		pub fn create_multiple_items(origin, collection_id: CollectionId, owner: T::CrossAccountId, items_data: Vec<CreateItemData>) -> DispatchResultWithPostInfo {
			ensure!(!items_data.is_empty(), Error::<T>::EmptyArgument);
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.create_multiple_items(sender, owner, items_data))
		}

		// TODO! transaction weight

		/// Set transfers_enabled value for particular collection
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * value: New flag value.
		#[weight = <SelfWeightOf<T>>::set_transfers_enabled_flag()]
		#[transactional]
		pub fn set_transfers_enabled_flag(origin, collection_id: CollectionId, value: bool) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;

			// =========

			target_collection.limits.transfers_enabled = Some(value);
			target_collection.save()
		}

		/// Destroys a concrete instance of NFT.
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Current NFT Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * item_id: ID of NFT to burn.
		#[weight = <CommonWeights<T>>::burn_item()]
		#[transactional]
		pub fn burn_item(origin, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.burn_item(sender, item_id, value))
		}

		/// Destroys a concrete instance of NFT on behalf of the owner
		/// See also: [`approve`]
		///
		/// # Permissions
		///
		/// * Collection Owner.
		/// * Collection Admin.
		/// * Current NFT Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * item_id: ID of NFT to burn.
		///
		/// * from: owner of item
		#[weight = <CommonWeights<T>>::burn_from()]
		#[transactional]
		pub fn burn_from(origin, collection_id: CollectionId, from: T::CrossAccountId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.burn_from(sender, from, item_id, value))
		}

		/// Change ownership of the token.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		///
		/// # Arguments
		///
		/// * recipient: Address of token recipient.
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item
		///     * Non-Fungible Mode: Required.
		///     * Fungible Mode: Ignored.
		///     * Re-Fungible Mode: Required.
		///
		/// * value: Amount to transfer.
		///     * Non-Fungible Mode: Ignored
		///     * Fungible Mode: Must specify transferred amount
		///     * Re-Fungible Mode: Must specify transferred portion (between 0 and 1)
		#[weight = <CommonWeights<T>>::transfer()]
		#[transactional]
		pub fn transfer(origin, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.transfer(sender, recipient, item_id, value))
		}

		/// Set, change, or remove approved address to transfer the ownership of the NFT.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		///
		/// # Arguments
		///
		/// * approved: Address that is approved to transfer this NFT or zero (if needed to remove approval).
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item.
		#[weight = <CommonWeights<T>>::approve()]
		#[transactional]
		pub fn approve(origin, spender: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, amount: u128) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.approve(sender, spender, item_id, amount))
		}

		/// Change ownership of a NFT on behalf of the owner. See Approve method for additional information. After this method executes, the approval is removed so that the approved address will not be able to transfer this NFT again from this owner.
		///
		/// # Permissions
		/// * Collection Owner
		/// * Collection Admin
		/// * Current NFT owner
		/// * Address approved by current NFT owner
		///
		/// # Arguments
		///
		/// * from: Address that owns token.
		///
		/// * recipient: Address of token recipient.
		///
		/// * collection_id.
		///
		/// * item_id: ID of the item.
		///
		/// * value: Amount to transfer.
		#[weight = <CommonWeights<T>>::transfer_from()]
		#[transactional]
		pub fn transfer_from(origin, from: T::CrossAccountId, recipient: T::CrossAccountId, collection_id: CollectionId, item_id: TokenId, value: u128 ) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.transfer_from(sender, from, recipient, item_id, value))
		}

		/// Set off-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the offchain data schema.
		#[weight = <CommonWeights<T>>::set_variable_metadata(data.len() as u32)]
		#[transactional]
		pub fn set_variable_meta_data (
			origin,
			collection_id: CollectionId,
			item_id: TokenId,
			data: Vec<u8>
		) -> DispatchResultWithPostInfo {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);

			dispatch_call::<T, _>(collection_id, |d| d.set_variable_metadata(sender, item_id, data))
		}

		/// Set meta_update_permission value for particular collection
		///
		/// # Permissions
		///
		/// * Collection Owner.
		///
		/// # Arguments
		///
		/// * collection_id: ID of the collection.
		///
		/// * value: New flag value.
		#[weight = <SelfWeightOf<T>>::set_meta_update_permission_flag()]
		#[transactional]
		pub fn set_meta_update_permission_flag(origin, collection_id: CollectionId, value: MetaUpdatePermission) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;

			ensure!(
				target_collection.meta_update_permission != MetaUpdatePermission::None,
				<CommonError<T>>::MetadataFlagFrozen,
			);
			target_collection.check_is_owner(&sender)?;

			target_collection.meta_update_permission = value;

			target_collection.save()
		}

		/// Set schema standard
		/// ImageURL
		/// Unique
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: SchemaVersion: enum
		#[weight = <SelfWeightOf<T>>::set_schema_version()]
		#[transactional]
		pub fn set_schema_version(
			origin,
			collection_id: CollectionId,
			version: SchemaVersion
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;
			target_collection.schema_version = version;
			target_collection.save()
		}

		/// Set off-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the offchain data schema.
		#[weight = <SelfWeightOf<T>>::set_offchain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_offchain_schema(
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= OFFCHAIN_SCHEMA_LIMIT, "");

			target_collection.offchain_schema = schema;
			target_collection.save()
		}

		/// Set const on-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the const on-chain data schema.
		#[weight = <SelfWeightOf<T>>::set_const_on_chain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_const_on_chain_schema (
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= CONST_ON_CHAIN_SCHEMA_LIMIT, "");

			target_collection.const_on_chain_schema = schema;
			target_collection.save()
		}

		/// Set variable on-chain data schema.
		///
		/// # Permissions
		///
		/// * Collection Owner
		/// * Collection Admin
		///
		/// # Arguments
		///
		/// * collection_id.
		///
		/// * schema: String representing the variable on-chain data schema.
		#[weight = <SelfWeightOf<T>>::set_const_on_chain_schema(schema.len() as u32)]
		#[transactional]
		pub fn set_variable_on_chain_schema (
			origin,
			collection_id: CollectionId,
			schema: Vec<u8>
		) -> DispatchResult {
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner_or_admin(&sender)?;

			// check schema limit
			ensure!(schema.len() as u32 <= VARIABLE_ON_CHAIN_SCHEMA_LIMIT, "");

			target_collection.variable_on_chain_schema = schema;
			target_collection.save()
		}

		#[weight = <SelfWeightOf<T>>::set_collection_limits()]
		#[transactional]
		pub fn set_collection_limits(
			origin,
			collection_id: CollectionId,
			new_limit: CollectionLimits,
		) -> DispatchResult {
			let mut new_limit = new_limit;
			let sender = T::CrossAccountId::from_sub(ensure_signed(origin)?);
			let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
			target_collection.check_is_owner(&sender)?;
			let old_limit = &target_collection.limits;

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

			limit_default!(old_limit, new_limit,
				account_token_ownership_limit => ensure!(
					new_limit <= MAX_TOKEN_OWNERSHIP,
					<Error<T>>::CollectionLimitBoundsExceeded,
				),
				sponsor_transfer_timeout(match target_collection.mode {
					CollectionMode::NFT => NFT_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::Fungible(_) => FUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
					CollectionMode::ReFungible => REFUNGIBLE_SPONSOR_TRANSFER_TIMEOUT,
				}) => ensure!(
					new_limit <= MAX_SPONSOR_TIMEOUT,
					<Error<T>>::CollectionLimitBoundsExceeded,
				),
				sponsored_data_size => ensure!(
					new_limit <= CUSTOM_DATA_LIMIT,
					<Error<T>>::CollectionLimitBoundsExceeded,
				),
				token_limit => ensure!(
					old_limit >= new_limit && new_limit > 0,
					<CommonError<T>>::CollectionTokenLimitExceeded
				),
				owner_can_transfer => ensure!(
					old_limit || !new_limit,
					<Error<T>>::OwnerPermissionsCantBeReverted,
				),
				owner_can_destroy => ensure!(
					old_limit || !new_limit,
					<Error<T>>::OwnerPermissionsCantBeReverted,
				),
				sponsored_data_rate_limit => {},
				transfers_enabled => {},
			);

			target_collection.limits = new_limit;

			target_collection.save()
		}
	}
}

// TODO: limit returned entries?
impl<T: Config> Pallet<T> {
	pub fn adminlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<IsAdmin<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}
	pub fn allowlist(collection: CollectionId) -> Vec<T::CrossAccountId> {
		<Allowlist<T>>::iter_prefix((collection,))
			.map(|(a, _)| a)
			.collect()
	}
}
