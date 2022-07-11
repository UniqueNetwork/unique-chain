use cumulus_pallet_parachain_system;
use fp_self_contained;
use frame_executive;
use frame_support::construct_runtime;
use frame_system;
use pallet_charge_transaction;
use pallet_ethereum;
use sp_api::impl_runtime_apis;
use sp_runtime::{generic, MultiAddress, traits::BlakeTwo256};
use sp_std::prelude::{Box, Vec};
use sp_version::{ApisVec, RuntimeVersion};

use unique_runtime_common::{impl_common_runtime_apis, types::{AccountId, BlockNumber, Signature}};

use super::*;
use super::opaque;

pub(crate) const RUNTIME_API_VERSIONS_PUB: ApisVec = RUNTIME_API_VERSIONS;

construct_runtime!(
	pub enum Runtime where
		Block = Block,
		NodeBlock = opaque::Block,
		UncheckedExtrinsic = UncheckedExtrinsic
	{
		ParachainSystem: cumulus_pallet_parachain_system::{Pallet, Call, Config, Storage, Inherent, Event<T>, ValidateUnsigned} = 20,
		ParachainInfo: parachain_info::{Pallet, Storage, Config} = 21,

		Aura: pallet_aura::{Pallet, Config<T>} = 22,
		AuraExt: cumulus_pallet_aura_ext::{Pallet, Config} = 23,

		Balances: pallet_balances::{Pallet, Call, Storage, Config<T>, Event<T>} = 30,
		RandomnessCollectiveFlip: pallet_randomness_collective_flip::{Pallet, Storage} = 31,
		Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent} = 32,
		TransactionPayment: pallet_transaction_payment::{Pallet, Storage} = 33,
		Treasury: pallet_treasury::{Pallet, Call, Storage, Config, Event<T>} = 34,
		Sudo: pallet_sudo::{Pallet, Call, Storage, Config<T>, Event<T>} = 35,
		System: frame_system::{Pallet, Call, Storage, Config, Event<T>} = 36,
		Vesting: orml_vesting::{Pallet, Storage, Call, Event<T>, Config<T>} = 37,
		// Vesting: pallet_vesting::{Pallet, Call, Config<T>, Storage, Event<T>} = 37,
		// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>} = 38,

		// XCM helpers.
		XcmpQueue: cumulus_pallet_xcmp_queue::{Pallet, Call, Storage, Event<T>} = 50,
		PolkadotXcm: pallet_xcm::{Pallet, Call, Event<T>, Origin} = 51,
		CumulusXcm: cumulus_pallet_xcm::{Pallet, Call, Event<T>, Origin} = 52,
		DmpQueue: cumulus_pallet_dmp_queue::{Pallet, Call, Storage, Event<T>} = 53,

		// Unique Pallets
		Inflation: pallet_inflation::{Pallet, Call, Storage} = 60,
		Unique: pallet_unique::{Pallet, Call, Storage, Event<T>} = 61,
		Scheduler: pallet_unique_scheduler::{Pallet, Call, Storage, Event<T>} = 62,
		// free = 63
		Charging: pallet_charge_transaction::{Pallet, Call, Storage } = 64,
		// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage} = 65,
		Common: pallet_common::{Pallet, Storage, Event<T>} = 66,
		Fungible: pallet_fungible::{Pallet, Storage} = 67,
		Refungible: pallet_refungible::{Pallet, Storage} = 68,
		Nonfungible: pallet_nonfungible::{Pallet, Storage} = 69,
		Structure: pallet_structure::{Pallet, Call, Storage, Event<T>} = 70,

		// Frontier
		EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>} = 100,
		Ethereum: pallet_ethereum::{Pallet, Config, Call, Storage, Event, Origin} = 101,

		EvmCoderSubstrate: pallet_evm_coder_substrate::{Pallet, Storage} = 150,
		EvmContractHelpers: pallet_evm_contract_helpers::{Pallet, Storage} = 151,
		EvmTransactionPayment: pallet_evm_transaction_payment::{Pallet} = 152,
		EvmMigration: pallet_evm_migration::{Pallet, Call, Storage} = 153,
	}
);

cumulus_pallet_parachain_system::register_validate_block!(
	Runtime = Runtime,
	BlockExecutor = cumulus_pallet_aura_ext::BlockExecutor::<Runtime, Executive>,
	CheckInherents = CheckInherents,
);

macro_rules! dispatch_unique_runtime {
	($collection:ident.$method:ident($($name:ident),*)) => {{
		let collection = <Runtime as pallet_common::Config>::CollectionDispatch::dispatch(<pallet_common::CollectionHandle<Runtime>>::try_get($collection)?);
		let dispatch = collection.as_dyn();

		Ok::<_, DispatchError>(dispatch.$method($($name),*))
	}};
}

impl_common_runtime_apis! {
	#![custom_apis]

	impl rmrk_rpc::RmrkApi<
		Block,
		AccountId,
		RmrkCollectionInfo<AccountId>,
		RmrkInstanceInfo<AccountId>,
		RmrkResourceInfo,
		RmrkPropertyInfo,
		RmrkBaseInfo<AccountId>,
		RmrkPartType,
		RmrkTheme
	> for Runtime {
		fn last_collection_idx() -> Result<RmrkCollectionId, DispatchError> {
			Ok(Default::default())
		}

		fn collection_by_id(_collection_id: RmrkCollectionId) -> Result<Option<RmrkCollectionInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_by_id(_collection_id: RmrkCollectionId, _nft_by_id: RmrkNftId) -> Result<Option<RmrkInstanceInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn account_tokens(_account_id: AccountId, _collection_id: RmrkCollectionId) -> Result<Vec<RmrkNftId>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_children(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId) -> Result<Vec<RmrkNftChild>, DispatchError> {
			Ok(Default::default())
		}

		fn collection_properties(_collection_id: RmrkCollectionId, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_properties(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Vec<RmrkPropertyInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_resources(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId) -> Result<Vec<RmrkResourceInfo>, DispatchError> {
			Ok(Default::default())
		}

		fn nft_resource_priority(_collection_id: RmrkCollectionId, _nft_id: RmrkNftId, _resource_id: RmrkResourceId) -> Result<Option<u32>, DispatchError> {
			Ok(Default::default())
		}

		fn base(_base_id: RmrkBaseId) -> Result<Option<RmrkBaseInfo<AccountId>>, DispatchError> {
			Ok(Default::default())
		}

		fn base_parts(_base_id: RmrkBaseId) -> Result<Vec<RmrkPartType>, DispatchError> {
			Ok(Default::default())
		}

		fn theme_names(_base_id: RmrkBaseId) -> Result<Vec<RmrkThemeName>, DispatchError> {
			Ok(Default::default())
		}

		fn theme(_base_id: RmrkBaseId, _theme_name: RmrkThemeName, _filter_keys: Option<Vec<RmrkPropertyKey>>) -> Result<Option<RmrkTheme>, DispatchError> {
			Ok(Default::default())
		}
	}
}

pub(crate) struct CheckInherents;

impl cumulus_pallet_parachain_system::CheckInherents<Block> for CheckInherents {
    fn check_inherents(
        block: &Block,
        relay_state_proof: &cumulus_pallet_parachain_system::RelayChainStateProof,
    ) -> sp_inherents::CheckInherentsResult {
        let relay_chain_slot = relay_state_proof
            .read_slot()
            .expect("Could not read the relay chain slot from the proof");

        let inherent_data =
            cumulus_primitives_timestamp::InherentDataProvider::from_relay_chain_slot_and_duration(
                relay_chain_slot,
                sp_std::time::Duration::from_secs(6),
            )
                .create_inherent_data()
                .expect("Could not create the timestamp inherent data");

        inherent_data.check_extrinsics(block)
    }
}