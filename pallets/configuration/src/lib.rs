// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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

#![cfg_attr(not(feature = "std"), no_std)]

use core::marker::PhantomData;

use frame_support::{
	pallet,
	weights::{WeightToFeePolynomial, WeightToFeeCoefficients, WeightToFeeCoefficient, Weight},
	traits::Get,
};
use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_arithmetic::{
	per_things::{Perbill, PerThing},
	traits::{BaseArithmetic, Unsigned},
};
use smallvec::smallvec;

pub use pallet::*;
use sp_core::U256;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

#[pallet]
mod pallet {
	use super::*;
	use frame_support::{
		traits::{Get, ReservableCurrency, Currency},
		pallet_prelude::{StorageValue, ValueQuery, DispatchResult, IsType},
		log,
	};
	use frame_system::{pallet_prelude::OriginFor, ensure_root, Config as SystemConfig};

	pub use crate::weights::WeightInfo;
	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as SystemConfig>::AccountId>>::Balance;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// The currency mechanism.
		type Currency: ReservableCurrency<Self::AccountId>;

		#[pallet::constant]
		type DefaultWeightToFeeCoefficient: Get<u64>;
		#[pallet::constant]
		type DefaultMinGasPrice: Get<u64>;

		#[pallet::constant]
		type MaxXcmAllowedLocations: Get<u32>;
		#[pallet::constant]
		type AppPromotionDailyRate: Get<Perbill>;
		#[pallet::constant]
		type DayRelayBlocks: Get<Self::BlockNumber>;

		#[pallet::constant]
		type DefaultCollatorSelectionMaxCollators: Get<u32>;
		#[pallet::constant]
		type DefaultCollatorSelectionLicenseBond: Get<BalanceOf<Self>>;
		#[pallet::constant]
		type DefaultCollatorSelectionKickThreshold: Get<Self::BlockNumber>;

		/// The weight information of this pallet.
		type WeightInfo: WeightInfo;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		NewDesiredCollators {
			desired_collators: Option<u32>,
		},
		NewCollatorLicenseBond {
			bond_cost: Option<BalanceOf<T>>,
		},
		NewCollatorKickThreshold {
			length_in_blocks: Option<T::BlockNumber>,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		InconsistentConfiguration,
	}

	#[pallet::storage]
	pub type WeightToFeeCoefficientOverride<T: Config> = StorageValue<
		Value = u64,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultWeightToFeeCoefficient,
	>;

	#[pallet::storage]
	pub type MinGasPriceOverride<T: Config> =
		StorageValue<Value = u64, QueryKind = ValueQuery, OnEmpty = T::DefaultMinGasPrice>;

	#[pallet::storage]
	pub type AppPromomotionConfigurationOverride<T: Config> =
		StorageValue<Value = AppPromotionConfiguration<T::BlockNumber>, QueryKind = ValueQuery>;

	#[pallet::storage]
	pub type CollatorSelectionDesiredCollatorsOverride<T: Config> = StorageValue<
		Value = u32,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultCollatorSelectionMaxCollators,
	>;

	#[pallet::storage]
	pub type CollatorSelectionLicenseBondOverride<T: Config> = StorageValue<
		Value = BalanceOf<T>,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultCollatorSelectionLicenseBond,
	>;

	#[pallet::storage]
	pub type CollatorSelectionKickThresholdOverride<T: Config> = StorageValue<
		Value = T::BlockNumber,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultCollatorSelectionKickThreshold,
	>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::set_weight_to_fee_coefficient_override())]
		pub fn set_weight_to_fee_coefficient_override(
			origin: OriginFor<T>,
			coeff: Option<u64>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(coeff) = coeff {
				<WeightToFeeCoefficientOverride<T>>::set(coeff);
			} else {
				<WeightToFeeCoefficientOverride<T>>::kill();
			}
			Ok(())
		}

		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::set_min_gas_price_override())]
		pub fn set_min_gas_price_override(
			origin: OriginFor<T>,
			coeff: Option<u64>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(coeff) = coeff {
				<MinGasPriceOverride<T>>::set(coeff);
			} else {
				<MinGasPriceOverride<T>>::kill();
			}
			Ok(())
		}

		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::set_app_promotion_configuration_override())]
		pub fn set_app_promotion_configuration_override(
			origin: OriginFor<T>,
			mut configuration: AppPromotionConfiguration<T::BlockNumber>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if configuration.interval_income.is_some() {
				return Err(<Error<T>>::InconsistentConfiguration.into());
			}

			configuration.interval_income = configuration.recalculation_interval.map(|b| {
				Perbill::from_rational(b, T::DayRelayBlocks::get())
					* T::AppPromotionDailyRate::get()
			});

			<AppPromomotionConfigurationOverride<T>>::set(configuration);

			Ok(())
		}

		#[pallet::call_index(4)]
		#[pallet::weight(T::WeightInfo::set_collator_selection_desired_collators())]
		pub fn set_collator_selection_desired_collators(
			origin: OriginFor<T>,
			max: Option<u32>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(max) = max {
				// we trust origin calls, this is just a for more accurate benchmarking
				if max > T::DefaultCollatorSelectionMaxCollators::get() {
					log::warn!("max > T::DefaultCollatorSelectionMaxCollators; you might need to run benchmarks again");
				}
				<CollatorSelectionDesiredCollatorsOverride<T>>::set(max);
			} else {
				<CollatorSelectionDesiredCollatorsOverride<T>>::kill();
			}
			Self::deposit_event(Event::NewDesiredCollators {
				desired_collators: max,
			});
			Ok(())
		}

		#[pallet::call_index(5)]
		#[pallet::weight(T::WeightInfo::set_collator_selection_license_bond())]
		pub fn set_collator_selection_license_bond(
			origin: OriginFor<T>,
			amount: Option<BalanceOf<T>>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(amount) = amount {
				<CollatorSelectionLicenseBondOverride<T>>::set(amount);
			} else {
				<CollatorSelectionLicenseBondOverride<T>>::kill();
			}
			Self::deposit_event(Event::NewCollatorLicenseBond { bond_cost: amount });
			Ok(())
		}

		#[pallet::call_index(6)]
		#[pallet::weight(T::WeightInfo::set_collator_selection_kick_threshold())]
		pub fn set_collator_selection_kick_threshold(
			origin: OriginFor<T>,
			threshold: Option<T::BlockNumber>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(threshold) = threshold {
				<CollatorSelectionKickThresholdOverride<T>>::set(threshold);
			} else {
				<CollatorSelectionKickThresholdOverride<T>>::kill();
			}
			Self::deposit_event(Event::NewCollatorKickThreshold {
				length_in_blocks: threshold,
			});
			Ok(())
		}
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);
}

pub struct WeightToFee<T, B>(PhantomData<(T, B)>);

impl<T, B> WeightToFeePolynomial for WeightToFee<T, B>
where
	T: Config,
	B: BaseArithmetic + From<u32> + From<u64> + Copy + Unsigned,
{
	type Balance = B;

	fn polynomial() -> WeightToFeeCoefficients<Self::Balance> {
		smallvec!(WeightToFeeCoefficient {
			coeff_integer: (<WeightToFeeCoefficientOverride<T>>::get() / Perbill::ACCURACY as u64)
				.into(),
			coeff_frac: Perbill::from_parts(
				(<WeightToFeeCoefficientOverride<T>>::get() % Perbill::ACCURACY as u64) as u32
			),
			negative: false,
			degree: 1,
		})
	}
}

pub struct FeeCalculator<T>(PhantomData<T>);
impl<T: Config> fp_evm::FeeCalculator for FeeCalculator<T> {
	fn min_gas_price() -> (U256, Weight) {
		(
			<MinGasPriceOverride<T>>::get().into(),
			T::DbWeight::get().reads(1),
		)
	}
}

#[derive(Encode, Decode, Clone, Debug, Default, TypeInfo, MaxEncodedLen, PartialEq, PartialOrd)]
pub struct AppPromotionConfiguration<BlockNumber> {
	/// In relay blocks.
	pub recalculation_interval: Option<BlockNumber>,
	/// In parachain blocks.
	pub pending_interval: Option<BlockNumber>,
	/// Value for `RecalculationInterval` based on 0.05% per 24h.
	pub interval_income: Option<Perbill>,
	/// Maximum allowable number of stakers calculated per call of the `app-promotion::PayoutStakers` extrinsic.
	pub max_stakers_per_calculation: Option<u8>,
}
