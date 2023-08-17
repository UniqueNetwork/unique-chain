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

#![cfg_attr(not(feature = "std"), no_std)]

use core::marker::PhantomData;

use frame_support::{
	pallet,
	weights::{WeightToFeePolynomial, WeightToFeeCoefficients, WeightToFeeCoefficient, Weight},
	traits::Get,
	Parameter,
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
		traits::Get,
		pallet_prelude::*,
		log,
		dispatch::{Codec, fmt::Debug},
	};
	use frame_system::{pallet_prelude::OriginFor, ensure_root, pallet_prelude::*};
	use sp_arithmetic::{FixedPointOperand, traits::AtLeast32BitUnsigned, Permill};
	pub use crate::weights::WeightInfo;

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Overarching event type.
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		type Balance: Parameter
			+ Member
			+ AtLeast32BitUnsigned
			+ From<up_common::types::Balance>
			+ Codec
			+ Default
			+ Copy
			+ MaybeSerializeDeserialize
			+ Debug
			+ MaxEncodedLen
			+ TypeInfo
			+ FixedPointOperand;

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
		type DefaultCollatorSelectionLicenseBond: Get<Self::Balance>;
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
			bond_cost: Option<T::Balance>,
		},
		NewCollatorKickThreshold {
			length_in_blocks: Option<T::BlockNumber>,
		},
	}

	fn update_base_fee<T: Config>() {
		let base_fee_per_gas: U256 = <MinGasPriceOverride<T>>::get().into();
		let elasticity: Permill = Permill::zero();
		// twox_128(BaseFee) ++ twox_128(BaseFeePerGas)
		sp_io::storage::set(
			&hex_literal::hex!("c1fef3b7207c11a52df13c12884e77263864ade243c642793ebcfe9e16f454ca"),
			&base_fee_per_gas.encode(),
		);
		// twox_128(BaseFee) ++ twox_128(Elasticity)
		sp_io::storage::set(
			&hex_literal::hex!("c1fef3b7207c11a52df13c12884e772609bc3a1e532c9cb85d57feed02cbff8e"),
			&elasticity.encode(),
		);
	}

	/// We update our default weights on every release
	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn on_runtime_upgrade() -> Weight {
			update_base_fee::<T>();
			T::DbWeight::get().reads_writes(1, 2)
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
			update_base_fee::<T>();
		}
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
		Value = T::Balance,
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
			// This code should not be called in production, but why keep development in the
			// inconsistent state
			update_base_fee::<T>();
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
			amount: Option<<T as Config>::Balance>,
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
