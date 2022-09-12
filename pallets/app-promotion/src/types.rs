use codec::EncodeLike;
use frame_support::{traits::LockableCurrency, WeakBoundedVec, Parameter, dispatch::DispatchResult};

use pallet_balances::{BalanceLock, Config as BalancesConfig, Pallet as PalletBalances};
use pallet_common::CollectionHandle;

use sp_runtime::DispatchError;
use up_data_structs::{CollectionId};
use sp_std::borrow::ToOwned;
use pallet_evm_contract_helpers::{Pallet as EvmHelpersPallet, Config as EvmHelpersConfig};

pub trait ExtendedLockableCurrency<AccountId: Parameter>: LockableCurrency<AccountId> {
	fn locks<KArg>(who: KArg) -> WeakBoundedVec<BalanceLock<Self::Balance>, Self::MaxLocks>
	where
		KArg: EncodeLike<AccountId>;
}

impl<T: BalancesConfig<I>, I: 'static> ExtendedLockableCurrency<T::AccountId>
	for PalletBalances<T, I>
{
	fn locks<KArg>(who: KArg) -> WeakBoundedVec<BalanceLock<Self::Balance>, Self::MaxLocks>
	where
		KArg: EncodeLike<T::AccountId>,
	{
		Self::locks(who)
	}
}

pub trait CollectionHandler {
	type CollectionId;
	type AccountId;

	fn set_sponsor(
		sponsor_id: Self::AccountId,
		collection_id: Self::CollectionId,
	) -> DispatchResult;

	fn remove_collection_sponsor(collection_id: Self::CollectionId) -> DispatchResult;

	fn sponsor(collection_id: Self::CollectionId)
		-> Result<Option<Self::AccountId>, DispatchError>;
}

impl<T: pallet_unique::Config> CollectionHandler for pallet_unique::Pallet<T> {
	type CollectionId = CollectionId;

	type AccountId = T::AccountId;

	fn set_sponsor(
		sponsor_id: Self::AccountId,
		collection_id: Self::CollectionId,
	) -> DispatchResult {
		Self::force_set_sponsor(sponsor_id, collection_id)
	}

	fn remove_collection_sponsor(collection_id: Self::CollectionId) -> DispatchResult {
		Self::force_remove_collection_sponsor(collection_id)
	}

	fn sponsor(
		collection_id: Self::CollectionId,
	) -> Result<Option<Self::AccountId>, DispatchError> {
		Ok(<CollectionHandle<T>>::try_get(collection_id)?
			.sponsorship
			.sponsor()
			.map(|acc| acc.to_owned()))
	}
}

pub trait ContractHandler {
	type ContractId;
	type AccountId;

	fn set_sponsor(
		sponsor_id: Self::AccountId,
		contract_address: Self::ContractId,
	) -> DispatchResult;

	fn remove_contract_sponsor(contract_address: Self::ContractId) -> DispatchResult;

	fn sponsor(
		contract_address: Self::ContractId,
	) -> Result<Option<Self::AccountId>, DispatchError>;
}

impl<T: EvmHelpersConfig> ContractHandler for EvmHelpersPallet<T> {
	type ContractId = sp_core::H160;

	type AccountId = T::CrossAccountId;

	fn set_sponsor(
		sponsor_id: Self::AccountId,
		contract_address: Self::ContractId,
	) -> DispatchResult {
		Self::force_set_sponsor(contract_address, &sponsor_id)
	}

	fn remove_contract_sponsor(contract_address: Self::ContractId) -> DispatchResult {
		Self::force_remove_sponsor(contract_address)
	}

	fn sponsor(
		contract_address: Self::ContractId,
	) -> Result<Option<Self::AccountId>, DispatchError> {
		Ok(Self::get_sponsor(contract_address))
	}
}
