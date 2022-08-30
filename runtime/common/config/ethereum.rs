use sp_core::{U256, H160};
use frame_support::{
	weights::{Weight, constants::WEIGHT_PER_SECOND},
	traits::{FindAuthor},
	parameter_types, ConsensusEngineId,
};
use sp_runtime::{RuntimeAppPublic, Perbill};
use crate::{
	runtime_common::{
		dispatch::CollectionDispatchT, ethereum::sponsoring::EvmSponsorshipHandler,
		config::sponsoring::DefaultSponsoringRateLimit, DealWithFees,
	},
	Runtime, Aura, Balances, Event, ChainId,
};
use pallet_evm::{EnsureAddressTruncated, HashedAddressMapping};
use up_common::constants::*;

pub type CrossAccountId = pallet_evm::account::BasicCrossAccountId<Runtime>;

impl pallet_evm::account::Config for Runtime {
	type CrossAccountId = CrossAccountId;
	type EvmAddressMapping = pallet_evm::HashedAddressMapping<Self::Hashing>;
	type EvmBackwardsAddressMapping = fp_evm_mapping::MapBackwardsAddressTruncated;
}

// Assuming slowest ethereum opcode is SSTORE, with gas price of 20000 as our worst case
// (contract, which only writes a lot of data),
// approximating on top of our real store write weight
parameter_types! {
	pub const WritesPerSecond: u64 = WEIGHT_PER_SECOND / <Runtime as frame_system::Config>::DbWeight::get().write;
	pub const GasPerSecond: u64 = WritesPerSecond::get() * 20000;
	pub const WeightPerGas: u64 = WEIGHT_PER_SECOND / GasPerSecond::get();
}

/// Limiting EVM execution to 50% of block for substrate users and management tasks
/// EVM transaction consumes more weight than substrate's, so we can't rely on them being
/// scheduled fairly
const EVM_DISPATCH_RATIO: Perbill = Perbill::from_percent(50);
parameter_types! {
	pub BlockGasLimit: U256 = U256::from(NORMAL_DISPATCH_RATIO * EVM_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT / WeightPerGas::get());
}

pub enum FixedGasWeightMapping {}
impl pallet_evm::GasWeightMapping for FixedGasWeightMapping {
	fn gas_to_weight(gas: u64) -> Weight {
		gas.saturating_mul(WeightPerGas::get())
	}
	fn weight_to_gas(weight: Weight) -> u64 {
		weight / WeightPerGas::get()
	}
}

pub struct EthereumFindAuthor<F>(core::marker::PhantomData<F>);
impl<F: FindAuthor<u32>> FindAuthor<H160> for EthereumFindAuthor<F> {
	fn find_author<'a, I>(digests: I) -> Option<H160>
	where
		I: 'a + IntoIterator<Item = (ConsensusEngineId, &'a [u8])>,
	{
		if let Some(author_index) = F::find_author(digests) {
			let authority_id = Aura::authorities()[author_index as usize].clone();
			return Some(H160::from_slice(&authority_id.to_raw_vec()[4..24]));
		}
		None
	}
}

impl pallet_evm::Config for Runtime {
	type BlockGasLimit = BlockGasLimit;
	type FeeCalculator = pallet_configuration::FeeCalculator<Self>;
	type GasWeightMapping = FixedGasWeightMapping;
	type BlockHashMapping = pallet_ethereum::EthereumBlockHashMapping<Self>;
	type CallOrigin = EnsureAddressTruncated<Self>;
	type WithdrawOrigin = EnsureAddressTruncated<Self>;
	type AddressMapping = HashedAddressMapping<Self::Hashing>;
	type PrecompilesType = ();
	type PrecompilesValue = ();
	type Currency = Balances;
	type Event = Event;
	type OnMethodCall = (
		pallet_evm_migration::OnMethodCall<Self>,
		pallet_evm_contract_helpers::HelpersOnMethodCall<Self>,
		CollectionDispatchT<Self>,
		pallet_unique::eth::CollectionHelpersOnMethodCall<Self>,
	);
	type OnCreate = pallet_evm_contract_helpers::HelpersOnCreate<Self>;
	type ChainId = ChainId;
	type Runner = pallet_evm::runner::stack::Runner<Self>;
	type OnChargeTransaction = pallet_evm::EVMCurrencyAdapter<Balances, DealWithFees>;
	type TransactionValidityHack = pallet_evm_transaction_payment::TransactionValidityHack<Self>;
	type FindAuthor = EthereumFindAuthor<Aura>;
}

impl pallet_evm_migration::Config for Runtime {
	type WeightInfo = pallet_evm_migration::weights::SubstrateWeight<Self>;
}

impl pallet_ethereum::Config for Runtime {
	type Event = Event;
	type StateRoot = pallet_ethereum::IntermediateStateRoot<Self>;
}

parameter_types! {
	// 0x842899ECF380553E8a4de75bF534cdf6fBF64049
	pub const HelpersContractAddress: H160 = H160([
		0x84, 0x28, 0x99, 0xec, 0xf3, 0x80, 0x55, 0x3e, 0x8a, 0x4d, 0xe7, 0x5b, 0xf5, 0x34, 0xcd, 0xf6, 0xfb, 0xf6, 0x40, 0x49,
	]);

	// 0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f
	pub const EvmCollectionHelpersAddress: H160 = H160([
		0x6c, 0x4e, 0x9f, 0xe1, 0xae, 0x37, 0xa4, 0x1e, 0x93, 0xce, 0xe4, 0x29, 0xe8, 0xe1, 0x88, 0x1a, 0xbd, 0xcb, 0xb5, 0x4f,
	]);
}

impl pallet_evm_contract_helpers::Config for Runtime {
	type ContractAddress = HelpersContractAddress;
	type DefaultSponsoringRateLimit = DefaultSponsoringRateLimit;
}

impl pallet_evm_coder_substrate::Config for Runtime {}

impl pallet_evm_transaction_payment::Config for Runtime {
	type EvmSponsorshipHandler = EvmSponsorshipHandler;
}
