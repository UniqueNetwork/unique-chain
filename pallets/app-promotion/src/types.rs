use codec::EncodeLike;
use frame_support::{traits::LockableCurrency, WeakBoundedVec, Parameter};
use pallet_balances::{BalanceLock, Config as BalancesConfig, Pallet as PalletBalances};

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
