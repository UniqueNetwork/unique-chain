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

mod util;

#[macro_export]
macro_rules! construct_runtime {
    ($select_runtime:ident) => {
        $crate::construct_runtime_impl! {
            select_runtime($select_runtime);

            pub enum Runtime where
                Block = Block,
                NodeBlock = opaque::Block,
                UncheckedExtrinsic = UncheckedExtrinsic
            {
                System: frame_system = 0,

                ParachainSystem: cumulus_pallet_parachain_system::{Pallet, Call, Config, Storage, Inherent, Event<T>, ValidateUnsigned} = 20,
                ParachainInfo: parachain_info::{Pallet, Storage, Config} = 21,

                Aura: pallet_aura::{Pallet, Config<T>} = 22,
                AuraExt: cumulus_pallet_aura_ext::{Pallet, Config} = 23,

                Balances: pallet_balances::{Pallet, Call, Storage, Config<T>, Event<T>} = 30,
                RandomnessCollectiveFlip: pallet_randomness_collective_flip::{Pallet, Storage} = 31,
                Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent} = 32,
                TransactionPayment: pallet_transaction_payment::{Pallet, Storage, Event<T>} = 33,
                Treasury: pallet_treasury::{Pallet, Call, Storage, Config, Event<T>} = 34,
                Sudo: pallet_sudo::{Pallet, Call, Storage, Config<T>, Event<T>} = 35,
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

                #[runtimes(opal)]
                Scheduler: pallet_unique_scheduler::{Pallet, Call, Storage, Event<T>} = 62,

                Configuration: pallet_configuration::{Pallet, Call, Storage} = 63,

                Charging: pallet_charge_transaction::{Pallet, Call, Storage } = 64,
                // ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage} = 65,
                Common: pallet_common::{Pallet, Storage, Event<T>} = 66,
                Fungible: pallet_fungible::{Pallet, Storage} = 67,

                #[runtimes(opal)]
                Refungible: pallet_refungible::{Pallet, Storage} = 68,

                Nonfungible: pallet_nonfungible::{Pallet, Storage} = 69,
                Structure: pallet_structure::{Pallet, Call, Storage, Event<T>} = 70,

                #[runtimes(opal)]
                RmrkCore: pallet_proxy_rmrk_core::{Pallet, Call, Storage, Event<T>} = 71,

                #[runtimes(opal)]
                RmrkEquip: pallet_proxy_rmrk_equip::{Pallet, Call, Storage, Event<T>} = 72,

                #[runtimes(opal)]
                Promotion: pallet_app_promotion::{Pallet, Call, Storage, Event<T>} = 73,

                // Frontier
                EVM: pallet_evm::{Pallet, Config, Call, Storage, Event<T>} = 100,
                Ethereum: pallet_ethereum::{Pallet, Config, Call, Storage, Event, Origin} = 101,

                EvmCoderSubstrate: pallet_evm_coder_substrate::{Pallet, Storage} = 150,
                EvmContractHelpers: pallet_evm_contract_helpers::{Pallet, Storage} = 151,
                EvmTransactionPayment: pallet_evm_transaction_payment::{Pallet} = 152,
                EvmMigration: pallet_evm_migration::{Pallet, Call, Storage} = 153,
            }
        }
    }
}
