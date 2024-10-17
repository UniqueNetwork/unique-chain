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

use frame_support::{
	derive_impl,
	dispatch::DispatchClass,
	ord_parameter_types, parameter_types,
	pallet_prelude::*,
	traits::{
		tokens::{PayFromAccount, UnityAssetBalanceConversion},
		ConstBool, ConstU32, ConstU64, Everything, NeverEnsureOrigin,
		OnRuntimeUpgrade,
	},
	weights::{
		constants::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight},
		ConstantMultiplier,
	},
	PalletId,
};
use frame_system::{
	limits::{BlockLength, BlockWeights},
	EnsureRoot, EnsureSignedBy,
};
use pallet_transaction_payment::{ConstFeeMultiplier, Multiplier};
use sp_arithmetic::traits::One;
use sp_runtime::{
	traits::{AccountIdLookup, BlakeTwo256, IdentityLookup},
	Perbill, Percent, Permill,
};
use pallet_evm::account::CrossAccountId as CrossAccountIdT;
use sp_std::vec;
use up_common::{constants::*, types::*};

use crate::{
	runtime_common::{DealWithFees, config::ethereum::CrossAccountId}, Balances, Block, OriginCaller, PalletInfo, Runtime, RuntimeCall,
	RuntimeEvent, RuntimeFreezeReason, RuntimeHoldReason, RuntimeOrigin, RuntimeTask, SS58Prefix,
	System, Treasury, Version,
};

parameter_types! {
	pub const BlockHashCount: BlockNumber = 2400;
	pub RuntimeBlockLength: BlockLength =
		BlockLength::max_with_normal_ratio(5 * 1024 * 1024, NORMAL_DISPATCH_RATIO);
	pub const AvailableBlockRatio: Perbill = Perbill::from_percent(75);
	pub const MaximumBlockLength: u32 = 5 * 1024 * 1024;
	pub RuntimeBlockWeights: BlockWeights = BlockWeights::builder()
		.base_block(BlockExecutionWeight::get())
		.for_class(DispatchClass::all(), |weights| {
			weights.base_extrinsic = ExtrinsicBaseWeight::get();
		})
		.for_class(DispatchClass::Normal, |weights| {
			weights.max_total = Some(NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT);
		})
		.for_class(DispatchClass::Operational, |weights| {
			weights.max_total = Some(MAXIMUM_BLOCK_WEIGHT);
			// Operational transactions have some extra reserved space, so that they
			// are included even if block reached `MAXIMUM_BLOCK_WEIGHT`.
			weights.reserved = Some(
				MAXIMUM_BLOCK_WEIGHT - NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT
			);
		})
		.avg_block_initialization(AVERAGE_ON_INITIALIZE_RATIO)
		.build_or_panic();
}

pub struct FixDerivatives;
impl OnRuntimeUpgrade for FixDerivatives {
	fn on_runtime_upgrade() -> Weight {
		use frame_system::Config;
		use staging_xcm::v4::prelude::*;
		use staging_xcm_builder::unique_instances::NonFungibleAsset;
		use up_data_structs::{CollectionId, TokenId};

		type NftId = (CollectionId, TokenId);

		type DerivativeCollections = pallet_derivatives::Instance1;
		type DerivativeNfts = pallet_derivatives::Instance2;

		let mut weight = Weight::zero();

		let maybe_cursor = None;

		let collections_num = 2;
		let _ = pallet_derivatives::OriginalToDerivative::<Runtime, DerivativeCollections>::clear(collections_num, maybe_cursor);
		let _ = pallet_derivatives::DerivativeToOriginal::<Runtime, DerivativeCollections>::clear(collections_num, maybe_cursor);

		let nfts_num = 3;
		let _ = pallet_derivatives::OriginalToDerivative::<Runtime, DerivativeNfts>::clear(nfts_num, maybe_cursor);
		let _ = pallet_derivatives::DerivativeToOriginal::<Runtime, DerivativeNfts>::clear(nfts_num, maybe_cursor);

		weight = weight
			.saturating_add(<Runtime as Config>::DbWeight::get().reads_writes(collections_num as _, collections_num as _))
			.saturating_add(<Runtime as Config>::DbWeight::get().reads_writes(nfts_num as _, nfts_num as _))
			.saturating_mul(2);

		let xusd_asset_id: AssetId = (
			Parent,
			Parachain(1000),
			PalletInstance(50),
			GeneralIndex(32),
		).into();
		let xusd_derivative = CollectionId(2);

		let ahnf_asset_id: AssetId = (
			Parent,
			Parachain(1000),
			PalletInstance(51),
			GeneralIndex(21),
		).into();
		let ahnf_derivative = CollectionId(3);

		let fixed_collections: &[(AssetId, CollectionId)] = &[	
			(
				xusd_asset_id,
				xusd_derivative
			),
			(
				ahnf_asset_id.clone(),
				ahnf_derivative,
			)
		];

		let fixed_nfts: &[(NonFungibleAsset, NftId)] = &[
			(
				(ahnf_asset_id.clone(), Index(111)),
				(ahnf_derivative, TokenId(1)),
			),
			(
				(ahnf_asset_id.clone(), Index(112)),
				(ahnf_derivative, TokenId(2)),
			),
			(
				(ahnf_asset_id, Index(113)),
				(ahnf_derivative, TokenId(3)),
			),
		];

		for (original, derivative) in fixed_collections.iter() {
			pallet_derivatives::OriginalToDerivative::<Runtime, DerivativeCollections>::insert(
				original,
				derivative,
			);

			pallet_derivatives::DerivativeToOriginal::<Runtime, DerivativeCollections>::insert(
				derivative,
				original,
			);

			weight = weight.saturating_add(
				<Runtime as Config>::DbWeight::get().writes(2)
			);
		}

		for (original, derivative) in fixed_nfts.iter() {
			pallet_derivatives::OriginalToDerivative::<Runtime, DerivativeNfts>::insert(
				original,
				derivative,
			);

			pallet_derivatives::DerivativeToOriginal::<Runtime, DerivativeNfts>::insert(
				derivative,
				original,
			);

			weight = weight.saturating_add(
				<Runtime as Config>::DbWeight::get().writes(2)
			);
		}

		weight
	}
}

#[derive_impl(frame_system::config_preludes::ParaChainDefaultConfig as frame_system::DefaultConfig)]
impl frame_system::Config for Runtime {
	/// The data to be stored in an account.
	type AccountData = pallet_balances::AccountData<Balance>;
	/// The identifier used to distinguish between accounts.
	type AccountId = AccountId;
	/// Maximum number of block number to block hash mappings to keep (oldest pruned first).
	type BlockHashCount = BlockHashCount;
	/// The block type.
	type Block = Block;
	/// The maximum length of a block (in bytes).
	type BlockLength = RuntimeBlockLength;
	/// The weight of the overhead invoked on the block import process, independent of the extrinsics included in that block.
	type BlockWeights = RuntimeBlockWeights;
	/// The weight of database operations that the runtime can invoke.
	type DbWeight = RocksDbWeight;
	/// The type for hashing blocks and tries.
	type Hash = Hash;
	/// The hashing algorithm used.
	type Hashing = BlakeTwo256;
	/// The index type for storing how many extrinsics an account has signed.
	type Nonce = Nonce;
	/// The lookup mechanism to get account ID from whatever is passed in dispatchers.
	type Lookup = AccountIdLookup<AccountId, ()>;
	type OnSetCode = cumulus_pallet_parachain_system::ParachainSetCode<Self>;
	/// The ubiquitous origin type.
	type RuntimeOrigin = RuntimeOrigin;
	/// This type is being generated by `construct_runtime!`.
	type PalletInfo = PalletInfo;
	/// This is used as an identifier of the chain. 42 is the generic substrate prefix.
	type SS58Prefix = SS58Prefix;
	/// Weight information for the extrinsics of this pallet.
	type SystemWeightInfo = frame_system::weights::SubstrateWeight<Self>;
	/// Version of the runtime.
	type Version = Version;
	type MaxConsumers = ConstU32<16>;

	type SingleBlockMigrations = FixDerivatives;
}

parameter_types! {
	pub const MigrationMaxKeyLen: u32 = 512;
}
ord_parameter_types! {
	pub const TrieMigrationSigned: AccountId = AccountId::from(hex_literal::hex!("3e2ee9b68b52c239488e8abbeb31284c0d4342ec7c3b53f8e50855051d54a319"));
}

impl pallet_state_trie_migration::Config for Runtime {
	type WeightInfo = pallet_state_trie_migration::weights::SubstrateWeight<Self>;
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type SignedDepositPerItem = ();
	type SignedDepositBase = ();
	type ControlOrigin = EnsureRoot<AccountId>;
	// Only root can perform this migration
	type SignedFilter = EnsureSignedBy<TrieMigrationSigned, AccountId>;
	type MaxKeyLen = MigrationMaxKeyLen;
	type RuntimeHoldReason = RuntimeHoldReason;
}

impl pallet_timestamp::Config for Runtime {
	/// A timestamp: milliseconds since the unix epoch.
	type Moment = u64;
	type OnTimestampSet = ();
	type MinimumPeriod = ConstU64<0>;
	type WeightInfo = ();
}

parameter_types! {
	// pub const ExistentialDeposit: u128 = 500;
	pub const ExistentialDeposit: u128 = EXISTENTIAL_DEPOSIT;
	pub const MaxLocks: u32 = 50;
	pub const MaxReserves: u32 = 50;
	pub const MaxHolds: u32 = 10;
	pub const MaxFreezes: u32 = 10;
}

impl pallet_balances::Config for Runtime {
	type MaxLocks = MaxLocks;
	type MaxReserves = MaxReserves;
	type ReserveIdentifier = [u8; 16];
	/// The type for recording an account's balance.
	type Balance = Balance;
	/// The ubiquitous event type.
	type RuntimeEvent = RuntimeEvent;
	// FIXME: Is () the new treasury?
	// Switch to real treasury once we start having dust removals
	// Related issue: https://github.com/paritytech/polkadot/issues/7323
	type DustRemoval = ();
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = System;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Self>;
	type RuntimeHoldReason = RuntimeHoldReason;
	type RuntimeFreezeReason = RuntimeFreezeReason;
	type FreezeIdentifier = [u8; 16];
	type MaxFreezes = MaxFreezes;
}

parameter_types! {
	/// This value increases the priority of `Operational` transactions by adding
	/// a "virtual tip" that's equal to the `OperationalFeeMultiplier * final_fee`.
	pub const OperationalFeeMultiplier: u8 = 5;

	pub FeeMultiplier: Multiplier = Multiplier::one();
}

impl pallet_transaction_payment::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type OnChargeTransaction = pallet_transaction_payment::CurrencyAdapter<Balances, DealWithFees>;
	type LengthToFee = ConstantMultiplier<Balance, TransactionByteFee>;
	type OperationalFeeMultiplier = OperationalFeeMultiplier;
	type WeightToFee = pallet_configuration::WeightToFee<Self, Balance>;
	type FeeMultiplierUpdate = ConstFeeMultiplier<FeeMultiplier>;
}

parameter_types! {
	pub const SpendPeriod: BlockNumber = 5 * MINUTES;
	pub const Burn: Permill = Permill::from_percent(0);
	pub const TipCountdown: BlockNumber = 1 * DAYS;
	pub const TipFindersFee: Percent = Percent::from_percent(20);
	pub const TipReportDepositBase: Balance = 1 * UNIQUE;
	pub const DataDepositPerByte: Balance = 1 * CENTIUNIQUE;
	pub const BountyDepositBase: Balance = 1 * UNIQUE;
	pub const BountyDepositPayoutDelay: BlockNumber = 1 * DAYS;
	pub const TreasuryModuleId: PalletId = PalletId(*b"py/trsry");
	pub TreasuryAccount: AccountId = Treasury::account_id();
	pub TreasuryCrossAccount: CrossAccountId = CrossAccountId::from_sub(TreasuryAccount::get());
	pub const BountyUpdatePeriod: BlockNumber = 14 * DAYS;
	pub const MaximumReasonLength: u32 = 16384;
	pub const BountyCuratorDeposit: Permill = Permill::from_percent(50);
	pub const BountyValueMinimum: Balance = 5 * UNIQUE;
	pub const MaxApprovals: u32 = 100;
}

impl pallet_treasury::Config for Runtime {
	type PalletId = TreasuryModuleId;
	type Currency = Balances;
	type RejectOrigin = EnsureRoot<AccountId>;
	type SpendOrigin = NeverEnsureOrigin<u128>;
	type RuntimeEvent = RuntimeEvent;
	type SpendPeriod = SpendPeriod;
	type Burn = Burn;
	type BurnDestination = ();
	type SpendFunds = ();
	type WeightInfo = pallet_treasury::weights::SubstrateWeight<Self>;
	type MaxApprovals = MaxApprovals;
	type AssetKind = ();
	type Beneficiary = AccountId;
	type BeneficiaryLookup = IdentityLookup<Self::Beneficiary>;
	type Paymaster = PayFromAccount<Balances, TreasuryAccount>;
	type BalanceConverter = UnityAssetBalanceConversion;
	type PayoutPeriod = ConstU32<10>;
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = ();
}

impl pallet_sudo::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
	type WeightInfo = pallet_sudo::weights::SubstrateWeight<Self>;
}

parameter_types! {
	pub const MaxAuthorities: u32 = 100_000;
}

impl pallet_aura::Config for Runtime {
	type AuthorityId = AuraId;
	type DisabledValidators = ();
	type MaxAuthorities = MaxAuthorities;
	type AllowMultipleBlocksPerSlot = ConstBool<true>;
	type SlotDuration = ConstU64<SLOT_DURATION>;
}

impl pallet_utility::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
	type PalletsOrigin = OriginCaller;
	type WeightInfo = pallet_utility::weights::SubstrateWeight<Self>;
}
