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

#[macro_export]
macro_rules! construct_runtime {
	() => {
		frame_support::construct_runtime! {

			pub enum Runtime where
				Block = Block,
				NodeBlock = opaque::Block,
				UncheckedExtrinsic = UncheckedExtrinsic
			{
				System: frame_system = 0,

				ParachainSystem: cumulus_pallet_parachain_system = 20,
				ParachainInfo: parachain_info = 21,

				#[cfg(feature = "collator-selection")]
				Authorship: pallet_authorship = 22,

				#[cfg(feature = "collator-selection")]
				CollatorSelection: pallet_collator_selection = 23,

				#[cfg(feature = "collator-selection")]
				Session: pallet_session = 24,

				Aura: pallet_aura = 25,
				AuraExt: cumulus_pallet_aura_ext = 26,

				Balances: pallet_balances = 30,
				// RandomnessCollectiveFlip = 31
				Timestamp: pallet_timestamp = 32,
				TransactionPayment: pallet_transaction_payment = 33,
				Treasury: pallet_treasury = 34,
				Sudo: pallet_sudo = 35,
				Vesting: orml_vesting = 37,

				XTokens: orml_xtokens = 38,
				Tokens: orml_tokens = 39,
				// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>} = 38,

				#[cfg(feature = "collator-selection")]
				Identity: pallet_identity = 40,

				#[cfg(feature = "preimage")]
				Preimage: pallet_preimage = 41,

				// XCM helpers.
				XcmpQueue: cumulus_pallet_xcmp_queue = 50,
				PolkadotXcm: pallet_xcm = 51,
				CumulusXcm: cumulus_pallet_xcm = 52,
				DmpQueue: cumulus_pallet_dmp_queue = 53,

				// Unique Pallets
				Inflation: pallet_inflation = 60,
				Unique: pallet_unique::{Pallet, Call, Storage} = 61,

				// #[cfg(feature = "scheduler")]
				// Scheduler: pallet_unique_scheduler_v2 = 62,

				Configuration: pallet_configuration = 63,

				Charging: pallet_charge_transaction::{Pallet, Call, Storage} = 64,
				// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage} = 65,
				Common: pallet_common = 66,
				Fungible: pallet_fungible = 67,

				#[cfg(feature = "refungible")]
				Refungible: pallet_refungible = 68,

				Nonfungible: pallet_nonfungible = 69,
				Structure: pallet_structure = 70,

				// RmrkCore: pallet_proxy_rmrk_core = 71,

				// RmrkEquip: pallet_proxy_rmrk_equip = 72,

				#[cfg(feature = "app-promotion")]
				AppPromotion: pallet_app_promotion = 73,

				#[cfg(feature = "foreign-assets")]
				ForeignAssets: pallet_foreign_assets = 80,

				// Frontier
				EVM: pallet_evm = 100,
				Ethereum: pallet_ethereum = 101,

				EvmCoderSubstrate: pallet_evm_coder_substrate = 150,
				EvmContractHelpers: pallet_evm_contract_helpers = 151,
				EvmTransactionPayment: pallet_evm_transaction_payment = 152,
				EvmMigration: pallet_evm_migration = 153,

				Maintenance: pallet_maintenance = 154,

				#[cfg(feature = "pallet-test-utils")]
				TestUtils: pallet_test_utils = 255,
			}
		}
	};
}
