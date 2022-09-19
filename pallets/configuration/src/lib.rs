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
};
use sp_arithmetic::traits::{BaseArithmetic, Unsigned};
use smallvec::smallvec;

pub use pallet::*;
use sp_core::U256;
use sp_runtime::Perbill;

#[pallet]
mod pallet {
	use super::*;
	use frame_support::{
		traits::Get,
		pallet_prelude::{StorageValue, ValueQuery, DispatchResult},
	};
	use frame_system::{pallet_prelude::OriginFor, ensure_root};

	#[pallet::config]
	pub trait Config: frame_system::Config {
		#[pallet::constant]
		type DefaultWeightToFeeCoefficient: Get<u32>;
		#[pallet::constant]
		type DefaultMinGasPrice: Get<u64>;
	}

	#[pallet::storage]
	pub type WeightToFeeCoefficientOverride<T: Config> = StorageValue<
		Value = u32,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultWeightToFeeCoefficient,
	>;

	#[pallet::storage]
	pub type MinGasPriceOverride<T: Config> =
		StorageValue<Value = u64, QueryKind = ValueQuery, OnEmpty = T::DefaultMinGasPrice>;

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::weight(T::DbWeight::get().writes(1))]
		pub fn set_weight_to_fee_coefficient_override(
			origin: OriginFor<T>,
			coeff: Option<u32>,
		) -> DispatchResult {
			ensure_root(origin)?;
			if let Some(coeff) = coeff {
				<WeightToFeeCoefficientOverride<T>>::set(coeff);
			} else {
				<WeightToFeeCoefficientOverride<T>>::kill();
			}
			Ok(())
		}

		#[pallet::weight(T::DbWeight::get().writes(1))]
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
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);
}

pub struct WeightToFee<T, B>(PhantomData<(T, B)>);

impl<T, B> WeightToFeePolynomial for WeightToFee<T, B>
where
	T: Config,
	B: BaseArithmetic + From<u32> + Copy + Unsigned,
{
	type Balance = B;

	fn polynomial() -> WeightToFeeCoefficients<Self::Balance> {
		smallvec!(WeightToFeeCoefficient {
			coeff_integer: <WeightToFeeCoefficientOverride<T>>::get().into(),
			coeff_frac: Perbill::zero(),
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
