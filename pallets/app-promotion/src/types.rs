use codec::EncodeLike;
use frame_support::{traits::LockableCurrency, WeakBoundedVec, Parameter, dispatch::DispatchResult};

use pallet_balances::{BalanceLock, Config as BalancesConfig, Pallet as PalletBalances};
use pallet_common::CollectionHandle;

use sp_runtime::{DispatchError, Perbill};
use up_data_structs::{CollectionId};
use sp_std::borrow::ToOwned;
use pallet_evm_contract_helpers::{Pallet as EvmHelpersPallet, Config as EvmHelpersConfig};
use pallet_configuration::{AppPromomotionConfigurationOverride};
use sp_core::Get;

const MAX_NUMBER_PAYOUTS: u8 = 100;
pub(crate) const DEFAULT_NUMBER_PAYOUTS: u8 = 20;

/// This trait was defined because `LockableCurrency`
/// has no way to know the state of the lock for an account.
pub trait ExtendedLockableCurrency<AccountId: Parameter>: LockableCurrency<AccountId> {
	/// Returns lock balance for an account. Allows to determine the cause of the lock.
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
/// Trait for interacting with collections.
pub trait CollectionHandler {
	type CollectionId;
	type AccountId;

	/// Sets sponsor for a collection.
	///
	/// - `sponsor_id`: the account of the sponsor-to-be.
	/// - `collection_id`: ID of the modified collection.
	fn set_sponsor(
		sponsor_id: Self::AccountId,
		collection_id: Self::CollectionId,
	) -> DispatchResult;

	/// Removes sponsor for a collection.
	///
	/// - `collection_id`: ID of the modified collection.
	fn remove_collection_sponsor(collection_id: Self::CollectionId) -> DispatchResult;

	/// Retuns the current sponsor for a collection if one is set.
	///
	/// - `collection_id`: ID of the collection.
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
/// Trait for interacting with contracts.
pub trait ContractHandler {
	type ContractId;
	type AccountId;

	/// Sets sponsor for a contract.
	///
	/// - `sponsor_id`: the account of the sponsor-to-be.
	/// - `contract_address`: the address of the modified contract.
	fn set_sponsor(
		sponsor_id: Self::AccountId,
		contract_address: Self::ContractId,
	) -> DispatchResult;

	/// Removes sponsor for a contract.
	///
	/// - `contract_address`: the address of the modified contract.
	fn remove_contract_sponsor(contract_address: Self::ContractId) -> DispatchResult;

	/// Retuns the current sponsor for a contract if one is set.
	///
	/// - `contract_address`: the contract address.
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
pub(crate) struct PalletConfiguration<T: crate::Config> {
	/// In relay blocks.
	pub recalculation_interval: T::BlockNumber,
	/// In parachain blocks.
	pub pending_interval: T::BlockNumber,
	/// Value for `RecalculationInterval` based on 0.05% per 24h.
	pub interval_income: Perbill,
	/// Maximum allowable number of stakers calculated per call of the `app-promotion::PayoutStakers` extrinsic.
	pub max_stakers_per_calculation: u8,
}
impl<T: crate::Config> PalletConfiguration<T> {
	pub fn get() -> Self {
		let config = <AppPromomotionConfigurationOverride<T>>::get();
		Self {
			recalculation_interval: config
				.recalculation_interval
				.unwrap_or_else(|| T::RecalculationInterval::get()),
			pending_interval: config
				.pending_interval
				.unwrap_or_else(|| T::PendingInterval::get()),
			interval_income: config
				.interval_income
				.unwrap_or_else(|| T::IntervalIncome::get()),
			max_stakers_per_calculation: config
				.max_stakers_per_calculation
				.unwrap_or_else(|| MAX_NUMBER_PAYOUTS),
		}
	}
} 
