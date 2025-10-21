use frame_support::{
	parameter_types,
	traits::{ConstU128, ConstU32, EitherOfDiverse, SortedMembers},
	BoundedVec, PalletId,
};
#[cfg(not(feature = "governance"))]
use frame_system::EnsureRoot;
use orml_oracle::DefaultCombineData;
use pallet_evm::account::CrossAccountId;
use pallet_foreign_assets::OracleMembers;
use parity_scale_codec::Encode;
use sp_core::H160;
use sp_runtime::{traits::Verify, FixedU128, SaturatedConversion};
use sp_std::vec::Vec;
use staging_xcm::prelude::*;
use staging_xcm_builder::AccountKey20Aliases;
use up_common::types::{AccountId, Signature};

use crate::{
	identity, maintenance,
	runtime_common::{
		config::{
			ethereum::CrossAccountId as ConfigCrossAccountId,
			governance,
			substrate::BlockHashCount,
			xcm::{LocationToAccountId, SelfLocation},
		},
		generic,
	},
	FeeCoefficientApplier, RelayNetwork, Runtime, RuntimeCall, TxExtension, UncheckedExtrinsic,
};

parameter_types! {
	pub ForeignAssetPalletId: PalletId = PalletId(*b"frgnasts");
	pub const ForeignAssetConversionCoefficient: FixedU128 = FixedU128::from_rational(2, 1);
}

pub struct LocationToCrossAccountId;
impl staging_xcm_executor::traits::ConvertLocation<ConfigCrossAccountId>
	for LocationToCrossAccountId
{
	fn convert_location(location: &Location) -> Option<ConfigCrossAccountId> {
		LocationToAccountId::convert_location(location)
			.map(ConfigCrossAccountId::from_sub)
			.or_else(|| {
				let eth_address =
					AccountKey20Aliases::<RelayNetwork, H160>::convert_location(location)?;

				Some(ConfigCrossAccountId::from_eth(eth_address))
			})
	}
}

impl pallet_foreign_assets::Config for Runtime {
	#[cfg(feature = "governance")]
	type ForceRegisterOrigin = EitherOfDiverse<
		governance::RootOrFinancialCouncilMember,
		governance::TechnicalCommitteeMember,
	>;

	#[cfg(not(feature = "governance"))]
	type ForceRegisterOrigin = EnsureRoot<Self::AccountId>;

	#[cfg(feature = "governance")]
	type ManagerOrigin = governance::SupremeTrio;

	#[cfg(not(feature = "governance"))]
	type ManagerOrigin = EnsureRoot<Self::AccountId>;

	type PalletId = ForeignAssetPalletId;
	type SelfLocation = SelfLocation;
	type LocationToAccountId = LocationToCrossAccountId;
	type WeightInfo = pallet_foreign_assets::weights::SubstrateWeight<Self>;

	type AuthorityId = pallet_foreign_assets::crypto::AuthId;
	type AccountId32 = AccountId;
	type ForeignAssetConversionCoefficientDefault = ForeignAssetConversionCoefficient;
	type DotAccuracy = ConstU128<1_000_000_000_000>;
}

type Key = BoundedVec<u8, ConstU32<3>>;
type Value = FixedU128;
pub type Moment = u64;

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
		pallet_foreign_assets::Pallet::<Runtime>::add_oracle_member(
			RawOrigin::Root.into(),
			who.clone(),
		)
		.unwrap();
	}
}

parameter_types! {
	pub const MinimumCount: u32 = 1;
	pub const ExpiresIn: Moment = 1000 * 60;
	pub const RootOperatorAccountId: AccountId = AccountId::new([0u8; 32]);
	pub const MaxFeedValues: u32 = 5;
	pub const MaxHasDispatchedSize: u32 = 20;
}

impl orml_oracle::Config for Runtime {
	type OnNewData = ();
	type CombineData = DefaultCombineData<Self, MinimumCount, ExpiresIn, ()>;
	type Time = crate::Timestamp;
	type OracleKey = Key;
	type OracleValue = Value;
	type RootOperatorAccountId = RootOperatorAccountId;
	type Members = Members;
	type WeightInfo = ();
	type MaxHasDispatchedSize = MaxHasDispatchedSize;
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
		let period = BlockHashCount::get()
			.checked_next_power_of_two()
			.map(|c| c / 2)
			.unwrap_or(2) as u64;

		let current_block = crate::System::block_number()
			.saturated_into::<u64>()
			// The `System::block_number` is initialized with `n+1`,
			// so the actual block number is `n`.
			.saturating_sub(30);
		let tip = 0;
		let tx_ext: TxExtension = cumulus_pallet_weight_reclaim::StorageWeightReclaim::new((
			frame_system::CheckSpecVersion::<Runtime>::new(),
			frame_system::CheckTxVersion::<Runtime>::new(),
			frame_system::CheckGenesis::<Runtime>::new(),
			frame_system::CheckEra::<Runtime>::from(generic::Era::mortal(period, current_block)),
			pallet_charge_transaction::CheckNonce::<Runtime>::from(nonce),
			frame_system::CheckWeight::<Runtime>::new(),
			maintenance::CheckMaintenance,
			identity::DisableIdentityCalls,
			pallet_charge_transaction::ChargeAssetTxPayment::<Runtime, FeeCoefficientApplier>::new(
				tip, None,
			),
			//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
			pallet_ethereum::FakeTransactionFinalizer::<Runtime>::new(),
			frame_metadata_hash_extension::CheckMetadataHash::<Runtime>::new(false),
		));
		let raw_payload = generic::SignedPayload::new(call, tx_ext)
			.map_err(|e| {
				log::warn!("Unable to create signed payload: Invalid : {e:?}");
			})
			.ok()?;
		let signature = raw_payload.using_encoded(|payload| C::sign(payload, public))?;
		let (call, tx_ext, _) = raw_payload.deconstruct();
		let address = <Runtime as frame_system::Config>::Lookup::unlookup(account);
		let transaction = UncheckedExtrinsic::new_signed(call, address, signature, tx_ext);
		Some(transaction)
	}
}
