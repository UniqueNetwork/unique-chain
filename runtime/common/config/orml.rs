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

use frame_support::{parameter_types, traits::{ConstU32, ConstU64, Everything, SortedMembers}, BoundedVec};
use frame_system::EnsureSigned;
use orml_oracle::DefaultCombineData;
use orml_traits::{location::AbsoluteReserveProvider, parameter_type_with_key};
use pallet_configuration::OracleMembers;
use pallet_foreign_assets::CurrencyIdConvert;
use parity_scale_codec::Encode;
use sp_runtime::traits::{Convert, SaturatedConversion, Verify};
use sp_statement_store::Statement;
use sp_std::{marker::PhantomData, vec::Vec};
use staging_xcm::latest::prelude::*;
use staging_xcm_executor::XcmExecutor;
use up_common::{
	constants::*,
	types::{AccountId, Balance, Signature},
};
use up_data_structs::CollectionId;
use crate::{
	identity, maintenance, runtime_common::{
		config::{
			substrate::BlockHashCount, xcm::{SelfLocation, UniversalLocation, Weigher, XcmExecutorConfig}
		},
		generic,
		UncheckedExtrinsic
	}, FeeCoefficientApplier, RelayChainBlockNumberProvider, Runtime, RuntimeCall, RuntimeEvent, TxExtension
};

// Signed version of balance
pub type Amount = i128;

parameter_types! {
	pub const MinVestedTransfer: Balance = 10 * UNIQUE;
	pub const MaxVestingSchedules: u32 = 28;

	pub const BaseXcmWeight: Weight = Weight::from_parts(100_000_000, 1000); // ? TODO: recheck this
	pub const MaxAssetsForTransfer: usize = 2;
}

parameter_type_with_key! {
	pub ParachainMinFee: |_location: Location| -> Option<u128> {
		Some(100_000_000_000)
	};
}

pub struct AccountIdToLocation;
impl Convert<AccountId, Location> for AccountIdToLocation {
	fn convert(account: AccountId) -> Location {
		AccountId32 {
			network: None,
			id: account.into(),
		}
		.into()
	}
}

impl orml_vesting::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = pallet_balances::Pallet<Runtime>;
	type MinVestedTransfer = MinVestedTransfer;
	type VestedTransferOrigin = EnsureSigned<AccountId>;
	type WeightInfo = ();
	type MaxVestingSchedules = MaxVestingSchedules;
	type BlockNumberProvider = RelayChainBlockNumberProvider<Runtime>;
}

impl orml_xtokens::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type CurrencyId = CollectionId;
	type CurrencyIdConvert = CurrencyIdConvert<Self>;
	type AccountIdToLocation = AccountIdToLocation;
	type SelfLocation = SelfLocation;
	type XcmExecutor = XcmExecutor<XcmExecutorConfig<Self>>;
	type Weigher = Weigher;
	type BaseXcmWeight = BaseXcmWeight;
	type MaxAssetsForTransfer = MaxAssetsForTransfer;
	type MinXcmFee = ParachainMinFee;
	type LocationsFilter = Everything;
	type ReserveProvider = AbsoluteReserveProvider;
	type UniversalLocation = UniversalLocation;
	type RateLimiter = ();
	type RateLimiterId = ();
}

type Key = BoundedVec<u8, ConstU32<3>>;
type Value = u64;

pub struct Members;

impl SortedMembers<AccountId> for Members {
	fn sorted_members() -> Vec<AccountId> {
		let mut result = OracleMembers::<Runtime>::get().to_vec();
		result.sort();
		result
	}

	#[cfg(feature = "runtime-benchmarks")]
	fn add(who: &AccountId) {
    	use frame_system::RawOrigin;
		pallet_configuration::Pallet::<Runtime>::add_oracle_member(RawOrigin::Root.into(), who.clone()).unwrap();
	}
}

parameter_types! {
	pub const RootOperatorAccountId: AccountId = AccountId::new([0u8; 32]);
	pub const MaxFeedValues: u32 = 5;
}

impl orml_oracle::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
	type OnNewData = ();
	type CombineData = DefaultCombineData<Self, ConstU32<1>, ConstU64<600>>;
	type Time = crate::Timestamp;
	type OracleKey = Key;
	type OracleValue = Value;
	type RootOperatorAccountId = RootOperatorAccountId;
	type Members = Members;
	type WeightInfo = ();
	type MaxHasDispatchedSize = ConstU32<100>;
	type MaxFeedValues = MaxFeedValues;
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = ();
}


impl frame_system::offchain::SigningTypes for Runtime {
	type Public = <Signature as Verify>::Signer;
	type Signature = Signature;
}

impl<C> frame_system::offchain::CreateTransactionBase<C> for Runtime
where
	RuntimeCall: From<C>,
{
	type RuntimeCall = RuntimeCall;
	type Extrinsic = UncheckedExtrinsic;
}

impl<LocalCall> frame_system::offchain::CreateSignedTransaction<LocalCall> for Runtime
where
	RuntimeCall: From<LocalCall>,
{
	fn create_signed_transaction<
		C: frame_system::offchain::AppCrypto<Self::Public, Self::Signature>,
	>(
		call: RuntimeCall,
		public: <Signature as Verify>::Signer,
		account: AccountId,
		nonce: <Runtime as frame_system::Config>::Nonce,
	) -> Option<UncheckedExtrinsic> {
		use sp_runtime::traits::StaticLookup;
		// take the biggest period possible.
		let period =
			BlockHashCount::get().checked_next_power_of_two().map(|c| c / 2).unwrap_or(2) as u64;

		let current_block = crate::System::block_number()
			.saturated_into::<u64>()
			// The `System::block_number` is initialized with `n+1`,
			// so the actual block number is `n`.
			.saturating_sub(1);
		let tip = 0;
		let tx_ext: TxExtension = (
			frame_system::CheckSpecVersion::<Runtime>::new(),
			frame_system::CheckTxVersion::<Runtime>::new(),
			frame_system::CheckGenesis::<Runtime>::new(),
			frame_system::CheckEra::<Runtime>::from(generic::Era::mortal(
				period,
				current_block,
			)),
			pallet_charge_transaction::CheckNonce::<Runtime>::from(nonce),
			frame_system::CheckWeight::<Runtime>::new(),
			maintenance::CheckMaintenance,
			identity::DisableIdentityCalls,
			pallet_charge_transaction::ChargeTransactionPayment::<Runtime, FeeCoefficientApplier>::new(tip, None),
			//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
			pallet_ethereum::FakeTransactionFinalizer::<Runtime>::new(),
			cumulus_primitives_storage_weight_reclaim::StorageWeightReclaim::<Runtime>::new(),
			frame_metadata_hash_extension::CheckMetadataHash::<Runtime>::new(true),
		).into();
		let raw_payload = generic::SignedPayload::new(call, tx_ext)
			.map_err(|e| {
				log::warn!("Unable to create signed payload: {:?}", e);
			})
			.ok()?;
		let signature = raw_payload.using_encoded(|payload| C::sign(payload, public))?;
		let (call, tx_ext, _) = raw_payload.deconstruct();
		let address = <Runtime as frame_system::Config>::Lookup::unlookup(account);
		let transaction = UncheckedExtrinsic::new_signed(call, address, signature, tx_ext);
		Some(transaction)
	}
}