use codec::EncodeLike;
use frame_support::{
	traits::LockableCurrency, WeakBoundedVec, Parameter, dispatch::DispatchResult, ensure,
};

use pallet_balances::{BalanceLock, Config as BalancesConfig, Pallet as PalletBalances};
use pallet_common::CollectionHandle;
use pallet_unique::{Event as UniqueEvent, Error as UniqueError};
use sp_runtime::DispatchError;
use up_data_structs::{CollectionId, SponsorshipState};
use sp_std::borrow::ToOwned;


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

	fn get_sponsor(
		collection_id: Self::CollectionId,
	) -> Result<Option<Self::AccountId>, DispatchError>;
}

impl<T: pallet_unique::Config> CollectionHandler for pallet_unique::Pallet<T> {
	type CollectionId = CollectionId;

	type AccountId = T::AccountId;

	fn set_sponsor(
		sponsor_id: Self::AccountId,
		collection_id: Self::CollectionId,
	) -> DispatchResult {
		let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
		target_collection.check_is_internal()?;
		target_collection.set_sponsor(sponsor_id.clone())?;

		Self::deposit_event(UniqueEvent::<T>::CollectionSponsorSet(
			collection_id,
			sponsor_id.clone(),
		));

		ensure!(
			target_collection.confirm_sponsorship(&sponsor_id)?,
			UniqueError::<T>::ConfirmUnsetSponsorFail
		);

		Self::deposit_event(UniqueEvent::<T>::SponsorshipConfirmed(
			collection_id,
			sponsor_id,
		));

		target_collection.save()
	}

	fn remove_collection_sponsor(collection_id: Self::CollectionId) -> DispatchResult {
		let mut target_collection = <CollectionHandle<T>>::try_get(collection_id)?;
		target_collection.check_is_internal()?;
		target_collection.sponsorship = SponsorshipState::Disabled;

		Self::deposit_event(UniqueEvent::<T>::CollectionSponsorRemoved(collection_id));

		target_collection.save()
	}

	fn get_sponsor(
		collection_id: Self::CollectionId,
	) -> Result<Option<Self::AccountId>, DispatchError> {
		Ok(<CollectionHandle<T>>::try_get(collection_id)?
			.sponsorship
			.pending_sponsor()
			.map(|acc| acc.to_owned()))
	}
}
