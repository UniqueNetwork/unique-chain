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

#[cfg(not(feature = "std"))]
use sp_std::alloc::format;

use sp_std::{marker::PhantomData, prelude::*};

use frame_support::{
	pallet,
	traits::{ConstBool, ConstU32, Get},
	weights::{Weight, WeightToFeeCoefficient, WeightToFeeCoefficients, WeightToFeePolynomial},
};
pub use pallet::*;
use parity_scale_codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
use polkadot_core_primitives::BlockNumber as RelayChainBlockNumber;
use scale_info::TypeInfo;
use smallvec::smallvec;
use sp_arithmetic::{
	per_things::{PerThing, Perbill},
	traits::{BaseArithmetic, Unsigned},
};
use sp_core::{U256, crypto::KeyTypeId};

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;
pub mod weights;

pub const KEY_TYPE: KeyTypeId = KeyTypeId(*b"orcl");

/// Based on the above `KeyTypeId` we need to generate a pallet-specific crypto type wrappers.
/// We can use from supported crypto kinds (`sr25519`, `ed25519` and `ecdsa`) and augment
/// the types with this pallet-specific identifier.
pub mod crypto {
	use super::KEY_TYPE;
	use sp_core::sr25519::Signature as Sr25519Signature;
	use sp_runtime::{
		app_crypto::{app_crypto, sr25519},
		traits::Verify,
		MultiSignature, MultiSigner,
	};
	app_crypto!(sr25519, KEY_TYPE);

	pub struct AuthId;

	impl frame_system::offchain::AppCrypto<MultiSigner, MultiSignature> for AuthId {
		type RuntimeAppPublic = Public;
		type GenericSignature = sp_core::sr25519::Signature;
		type GenericPublic = sp_core::sr25519::Public;
	}

	// implemented for mock runtime in test
	impl frame_system::offchain::AppCrypto<<Sr25519Signature as Verify>::Signer, Sr25519Signature>
		for AuthId
	{
		type RuntimeAppPublic = Public;
		type GenericSignature = sp_core::sr25519::Signature;
		type GenericPublic = sp_core::sr25519::Public;
	}
}

#[pallet]
mod pallet {
	use core::fmt::Debug;

	use frame_support::{pallet_prelude::*, traits::Get};
	use frame_system::{ensure_root, offchain::{CreateSignedTransaction, SendSignedTransaction, Signer, SigningTypes}, pallet_prelude::*};
	use parity_scale_codec::Codec;
	use sp_arithmetic::{traits::AtLeast32BitUnsigned, FixedPointOperand, Permill};
	use sp_core::U256;
	use sp_runtime::{offchain::http, MultiSigner};
	use frame_system::offchain::AppCrypto;

	use super::*;
	pub use crate::weights::WeightInfo;
	use orml_oracle::WeightInfo as _;

	#[pallet::config]
	pub trait Config: frame_system::Config + orml_oracle::Config + CreateSignedTransaction<orml_oracle::Call<Self>> {
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

		type AccountId32: From<Self::AccountId> + AsRef<[u8; 32]>;
		type AuthorityId: AppCrypto<<Self as SigningTypes>::Public, <Self as SigningTypes>::Signature>;

		#[pallet::constant]
		type DefaultWeightToFeeCoefficient: Get<u64>;
		#[pallet::constant]
		type DefaultMinGasPrice: Get<u64>;

		#[pallet::constant]
		type MaxXcmAllowedLocations: Get<u32>;
		#[pallet::constant]
		type AppPromotionDailyRate: Get<Perbill>;
		#[pallet::constant]
		type DayRelayBlocks: Get<BlockNumberFor<Self>>;

		#[pallet::constant]
		type DefaultCollatorSelectionMaxCollators: Get<u32>;
		#[pallet::constant]
		type DefaultCollatorSelectionLicenseBond: Get<Self::Balance>;
		#[pallet::constant]
		type DefaultCollatorSelectionKickThreshold: Get<BlockNumberFor<Self>>;

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
			length_in_blocks: Option<BlockNumberFor<T>>,
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

	fn fetch_rate() -> Result<f64, http::Error> {
		// let deadline = timestamp().add(Duration::from_millis(2_000));
		// let request = http::Request::get("https://api.exchangerate.host/latest?base=USD&symbols=EUR");
		// let pending = request.deadline(deadline).send().map_err(|_| http::Error::IoError)?;
		// let response = pending.try_wait(deadline).map_err(|_| http::Error::DeadlineReached)??;

		// if response.code != 200 {
		// 	log::warn!("Unexpected status code: {}", response.code);
		// 	return Err(http::Error::Unknown);
		// }

		// let body = response.body().collect::<Vec<u8>>();
		// let body_str = sp_std::str::from_utf8(&body).map_err(|_| http::Error::Unknown)?;

		// // Parse JSON, e.g. {"rates":{"EUR":0.85}}
		// //let v: serde_json::Value = serde_json::from_str(body_str).map_err(|_| http::Error::Unknown)?;
		// Ok(v["rates"]["EUR"].as_f64().ok_or(http::Error::Unknown)?)

		let unq_storage_key = "0x99971b5749ac43e0235e41b0d37869188ee7418a6531173d60d1f6a82d8f4d51512f6eaaf236595bff0193f47dc14ef9d7a3d484f8388e304ae0e53869d8443c8f31c951596896e9b942a2e924cc2cf2e99190c148ccde2019000000";
		let dot_storage_key = "0x99971b5749ac43e0235e41b0d37869188ee7418a6531173d60d1f6a82d8f4d51512f6eaaf236595bff0193f47dc14ef9d7a3d484f8388e304ae0e53869d8443c8f31c951596896e9b942a2e924cc2cf239b9d2792f8bd4c305000000";
		let body = format!(r#"{{"id":1, "jsonrpc":"2.0", "method": "state_getStorage", "params": ["{unq_storage_key}", "latest"]}}"#);

		let request = http::Request::post("https://hydration.ibp.network", vec![body.as_bytes().to_vec()])
			.add_header("Content-Type", "application/json")
			.send().map_err(|e| {
				match e {
					sp_core::offchain::HttpError::DeadlineReached => http::Error::DeadlineReached,
					sp_core::offchain::HttpError::IoError => http::Error::IoError,
					sp_core::offchain::HttpError::Invalid => http::Error::Unknown,
				}
			})?;

		let response = request.wait()?;
		let body = response.body().collect::<Vec<u8>>();
		let body_str = sp_std::str::from_utf8(&body).map_err(|_| http::Error::Unknown)?;

		log::info!("TEST {body_str}");

		Ok(1.)
	}

	/// We update our default weights on every release
	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T>
	where T: Config,
		T::OracleKey: From<BoundedVec<u8, ConstU32<3>>>,
		T::OracleValue: From<u64>,
		<T as SigningTypes>::Public: From<MultiSigner>,
	{
		fn on_initialize(_n: BlockNumberFor<T>) -> Weight {
			log::info!("TEST Configuration on_initialize");
			Weight::zero()
		}

		fn on_runtime_upgrade() -> Weight {
			update_base_fee::<T>();
			T::DbWeight::get().reads_writes(1, 2)
		}

		fn offchain_worker(block_number: BlockNumberFor<T>) {
			let block_number: U256 = block_number.into();
			if block_number.as_u128() % 100 != 1 {
				return;
			}
			log::info!("TEST offchain_worker 1");
			let oracles = OracleMembers::<T>::get().into_iter().flat_map(|account_id: T::AccountId| [
				MultiSigner::Ed25519(T::AccountId32::as_ref(&T::AccountId32::from(account_id.clone())).clone().into()).into(),
				MultiSigner::Sr25519(T::AccountId32::as_ref(&T::AccountId32::from(account_id)).clone().into()).into(),
			]).collect::<Vec<<T as SigningTypes>::Public>>();
			log::info!("TEST offchain_worker 2");
			let signer = Signer::<T, T::AuthorityId>::any_account().with_filter(oracles);
			log::info!("TEST offchain_worker 3");
			if !signer.can_sign() {
			log::info!("TEST offchain_worker 4");
				Signer::<T, T::AuthorityId>::keystore_accounts().for_each(|account| {
					log::info!("No signer is available for exchange rate offchain worker {:?}", account.public);
				});
				return;
			}
			log::info!("TEST offchain_worker 5");
			// Fetch external data (e.g., exchange rate)
			if let Ok(rate) = fetch_rate() {
				log::info!("TEST offchain_worker 6");
				// Use any available signer to submit a signed extrinsic
				if let Some((account, result)) = signer.send_signed_transaction(|_acct| {
					let scaled_rate = T::OracleValue::from((rate * 1_000_000f64) as u64);
					let key = BoundedVec::<u8, ConstU32<3>>::truncate_from("DOT".as_bytes().to_vec()).into();
					let values = BoundedVec::truncate_from(vec![(key, scaled_rate)]);
					orml_oracle::Call::<T>::feed_values { values }
				}) {
					if result.is_ok() {
						log::info!("Signed tx successfully submitted");
					} else {
						log::error!("Signed tx submission failed");
					}
				} else {
					log::error!("No local account available for signing");
				}
			}
		}
	}

	#[pallet::genesis_config]
	pub struct GenesisConfig<T>(PhantomData<T>);

	impl<T: Config> Default for GenesisConfig<T> {
		fn default() -> Self {
			Self(Default::default())
		}
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			update_base_fee::<T>();
		}
	}

	#[pallet::error]
	pub enum Error<T> {
		InconsistentConfiguration,
		OracleMembersCapacityExceeded,
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
		StorageValue<Value = AppPromotionConfiguration<BlockNumberFor<T>>, QueryKind = ValueQuery>;

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
		Value = BlockNumberFor<T>,
		QueryKind = ValueQuery,
		OnEmpty = T::DefaultCollatorSelectionKickThreshold,
	>;

	#[pallet::storage]
	pub type RelayBlockNumberChecks<T: Config> =
		StorageValue<Value = bool, QueryKind = ValueQuery, OnEmpty = ConstBool<true>>;

	#[pallet::storage]
	pub type OracleMembers<T: Config> = StorageValue<
		_,
		BoundedVec<T::AccountId, ConstU32<10>>, //TODO oracle: replace with a constant
		ValueQuery
	>;

	#[pallet::call]
	impl<T: Config> Pallet<T> where T: orml_oracle::Config {
		#[pallet::call_index(0)]
		#[pallet::weight(<T as Config>::WeightInfo::set_weight_to_fee_coefficient_override())]
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
		#[pallet::weight(<T as Config>::WeightInfo::set_min_gas_price_override())]
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
		#[pallet::weight(<T as Config>::WeightInfo::set_app_promotion_configuration_override())]
		pub fn set_app_promotion_configuration_override(
			origin: OriginFor<T>,
			configuration: AppPromotionConfiguration<BlockNumberFor<T>>,
		) -> DispatchResult {
			ensure_root(origin)?;

			<AppPromomotionConfigurationOverride<T>>::set(configuration);

			Ok(())
		}

		#[pallet::call_index(4)]
		#[pallet::weight(<T as Config>::WeightInfo::set_collator_selection_desired_collators())]
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
		#[pallet::weight(<T as Config>::WeightInfo::set_collator_selection_license_bond())]
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
		#[pallet::weight(<T as Config>::WeightInfo::set_collator_selection_kick_threshold())]
		pub fn set_collator_selection_kick_threshold(
			origin: OriginFor<T>,
			threshold: Option<BlockNumberFor<T>>,
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

		#[pallet::call_index(7)]
		#[pallet::weight(<T as Config>::WeightInfo::set_collator_selection_kick_threshold())]
		pub fn set_relay_block_number_checks(
			origin: OriginFor<T>,
			enabled: bool,
		) -> DispatchResult {
			ensure_root(origin)?;
			if enabled {
				<RelayBlockNumberChecks<T>>::kill();
			} else {
				<RelayBlockNumberChecks<T>>::set(false);
			}
			Ok(())
		}

		#[pallet::call_index(8)]
		#[pallet::weight(<T as Config>::WeightInfo::add_oracle_member())]
		pub fn add_oracle_member(origin: OriginFor<T>, account_id: T::AccountId) -> DispatchResult {
			ensure_root(origin)?; //TODO oracle: allow `council`` etc..
			OracleMembers::<T>::mutate(|members| {
				members.try_push(account_id).map_err(|_| Error::<T>::OracleMembersCapacityExceeded)
			})?;
			Ok(())
		}

		#[pallet::call_index(9)]
		#[pallet::weight(<T as Config>::WeightInfo::remove_oracle_member())]
		pub fn remove_oracle_member(origin: OriginFor<T>, account_id: T::AccountId) -> DispatchResult {
			ensure_root(origin)?;
			OracleMembers::<T>::mutate(|members| {
				members.retain(|x| *x != account_id);
			});
			Ok(())
		}

		#[pallet::call_index(10)]
		#[pallet::weight(<T as orml_oracle::Config>::WeightInfo::feed_values(values.len() as u32))]
		pub fn feed_values(
			origin: OriginFor<T>,
			values: BoundedVec<(T::OracleKey, T::OracleValue), T::MaxFeedValues>,
		) -> DispatchResultWithPostInfo {
			orml_oracle::Pallet::<T>::feed_values(origin, values)
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

#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Clone,
	Debug,
	Default,
	TypeInfo,
	MaxEncodedLen,
	PartialEq,
	PartialOrd,
)]
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

pub struct CheckAssociatedRelayNumber<T>(PhantomData<T>);
impl<T: Config> cumulus_pallet_parachain_system::CheckAssociatedRelayNumber
	for CheckAssociatedRelayNumber<T>
{
	fn check_associated_relay_number(
		current: RelayChainBlockNumber,
		previous: RelayChainBlockNumber,
	) {
		if <RelayBlockNumberChecks<T>>::get() {
			cumulus_pallet_parachain_system::RelayNumberMonotonicallyIncreases::check_associated_relay_number(current, previous)
		}
	}
}
