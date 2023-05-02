use frame_support::{
	traits::{tokens::currency::Currency as CurrencyT, OnUnbalanced as OnUnbalancedT, Get},
	weights::WeightToFeePolynomial,
};
use sp_runtime::traits::{CheckedConversion, Zero, Convert};
use xcm::latest::{
	AssetId::{Concrete},
	Fungibility::Fungible as XcmFungible,
	MultiAsset, Error as XcmError, Weight,
	Junction::*,
	MultiLocation,
	Junctions::*,
};
use xcm_builder::{CurrencyAdapter, NativeAsset};
use xcm_executor::{
	Assets,
	traits::{MatchesFungible, WeightTrader},
};
use pallet_foreign_assets::{AssetIds, NativeCurrency};
use sp_std::marker::PhantomData;
use crate::{Balances, ParachainInfo};
use super::{LocationToAccountId, RelayLocation};

use up_common::types::{AccountId, Balance};

pub struct OnlySelfCurrency;
impl<B: TryFrom<u128>> MatchesFungible<B> for OnlySelfCurrency {
	fn matches_fungible(a: &MultiAsset) -> Option<B> {
		let paraid = Parachain(ParachainInfo::parachain_id().into());
		match (&a.id, &a.fun) {
			(
				Concrete(MultiLocation {
					parents: 1,
					interior: X1(loc),
				}),
				XcmFungible(ref amount),
			) if paraid == *loc => CheckedConversion::checked_from(*amount),
			(
				Concrete(MultiLocation {
					parents: 0,
					interior: Here,
				}),
				XcmFungible(ref amount),
			) => CheckedConversion::checked_from(*amount),
			_ => None,
		}
	}
}

/// Means for transacting assets on this chain.
pub type LocalAssetTransactor = CurrencyAdapter<
	// Use this currency:
	Balances,
	// Use this currency when it is a fungible asset matching the given location or name:
	OnlySelfCurrency,
	// Do a simple punn to convert an AccountId32 MultiLocation into a native chain account ID:
	LocationToAccountId,
	// Our chain's account ID type (we can't get away without mentioning it explicitly):
	AccountId,
	// We don't track any teleports.
	(),
>;

pub type AssetTransactor = LocalAssetTransactor;

pub type IsReserve = NativeAsset;

pub struct UsingOnlySelfCurrencyComponents<
	WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
	AssetId: Get<MultiLocation>,
	AccountId,
	Currency: CurrencyT<AccountId>,
	OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
>(
	Weight,
	Currency::Balance,
	PhantomData<(WeightToFee, AssetId, AccountId, Currency, OnUnbalanced)>,
);
impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> WeightTrader
	for UsingOnlySelfCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn new() -> Self {
		Self(0, Zero::zero(), PhantomData)
	}

	fn buy_weight(&mut self, _weight: Weight, payment: Assets) -> Result<Assets, XcmError> {
		Ok(payment)
	}
}
impl<
		WeightToFee: WeightToFeePolynomial<Balance = Currency::Balance>,
		AssetId: Get<MultiLocation>,
		AccountId,
		Currency: CurrencyT<AccountId>,
		OnUnbalanced: OnUnbalancedT<Currency::NegativeImbalance>,
	> Drop
	for UsingOnlySelfCurrencyComponents<WeightToFee, AssetId, AccountId, Currency, OnUnbalanced>
{
	fn drop(&mut self) {
		OnUnbalanced::on_unbalanced(Currency::issue(self.1));
	}
}

pub type Trader<T> = UsingOnlySelfCurrencyComponents<
	pallet_configuration::WeightToFee<T, Balance>,
	RelayLocation,
	AccountId,
	Balances,
	(),
>;

pub struct CurrencyIdConvert;
impl Convert<AssetIds, Option<MultiLocation>> for CurrencyIdConvert {
	fn convert(id: AssetIds) -> Option<MultiLocation> {
		match id {
			AssetIds::NativeAssetId(NativeCurrency::Here) => Some(MultiLocation::new(
				1,
				X1(Parachain(ParachainInfo::get().into())),
			)),
			_ => None,
		}
	}
}
