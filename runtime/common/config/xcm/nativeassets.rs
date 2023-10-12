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

use cumulus_primitives_core::XcmContext;
use frame_support::{
	traits::{tokens::currency::Currency as CurrencyT, Get, OnUnbalanced as OnUnbalancedT},
	weights::WeightToFeePolynomial,
};
use pallet_foreign_assets::{AssetIds, NativeCurrency};
use sp_runtime::traits::{CheckedConversion, Convert, Zero};
use sp_std::marker::PhantomData;
use staging_xcm::latest::{
	AssetId::Concrete, Error as XcmError, Fungibility::Fungible as XcmFungible, Junction::*,
	Junctions::*, MultiAsset, MultiLocation, Weight,
};
use staging_xcm_builder::{CurrencyAdapter, NativeAsset};
use staging_xcm_executor::{
	traits::{MatchesFungible, WeightTrader},
	Assets,
};
use up_common::types::{AccountId, Balance};

use super::{LocationToAccountId, RelayLocation};
use crate::{Balances, ParachainInfo};

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
		// FIXME: benchmark
		Self(Weight::from_parts(0, 0), Zero::zero(), PhantomData)
	}

	fn buy_weight(
		&mut self,
		_weight: Weight,
		payment: Assets,
		_xcm: &XcmContext,
	) -> Result<Assets, XcmError> {
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
