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

use sp_core::{Pair, Public};
pub use sp_runtime::AccountId32 as AccountId;
use sp_runtime::{BuildStorage, Storage};
use up_common::types::AuraId;

use crate::{ParachainInfoConfig, Runtime, RuntimeGenesisConfig, System};
pub type Balance = u128;

pub mod xcm;

#[cfg(any(feature = "opal-runtime", feature = "quartz-runtime"))]
/// PARA_ID for Opal/Sapphire/Quartz
const PARA_ID: u32 = 2095;

#[cfg(feature = "unique-runtime")]
/// PARA_ID for Unique
const PARA_ID: u32 = 2037;

fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{seed}"), None)
		.expect("static values are valid; qed")
		.public()
}

fn new_test_ext(balances: Vec<(AccountId, Balance)>) -> sp_io::TestExternalities {
	let mut storage = make_basic_storage();

	pallet_balances::GenesisConfig::<Runtime> {
		balances,
		..Default::default()
	}
	.assimilate_storage(&mut storage)
	.unwrap();

	let mut ext = sp_io::TestExternalities::new(storage);
	ext.execute_with(|| System::set_block_number(1));
	ext
}

#[cfg(feature = "collator-selection")]
fn make_basic_storage() -> Storage {
	use sp_core::sr25519;
	use sp_runtime::traits::{IdentifyAccount, Verify};

	use crate::{AccountId, CollatorSelectionConfig, SessionConfig, SessionKeys, Signature};

	type AccountPublic = <Signature as Verify>::Signer;

	fn get_account_id_from_seed<TPublic: Public>(seed: &str) -> AccountId
	where
		AccountPublic: From<<TPublic::Pair as Pair>::Public>,
	{
		AccountPublic::from(get_from_seed::<TPublic>(seed)).into_account()
	}

	let accounts = ["Alice", "Bob"];
	let keys = accounts
		.iter()
		.map(|&acc| {
			let account_id = get_account_id_from_seed::<sr25519::Public>(acc);
			(
				account_id.clone(),
				account_id,
				SessionKeys {
					aura: get_from_seed::<AuraId>(acc),
				},
			)
		})
		.collect::<Vec<_>>();
	let invulnerables = accounts
		.iter()
		.map(|acc| get_account_id_from_seed::<sr25519::Public>(acc))
		.collect::<Vec<_>>();

	let cfg = RuntimeGenesisConfig {
		collator_selection: CollatorSelectionConfig { invulnerables },
		session: SessionConfig {
			keys,
			..Default::default()
		},
		parachain_info: ParachainInfoConfig {
			parachain_id: PARA_ID.into(),
			..Default::default()
		},
		..Default::default()
	};

	cfg.build_storage().unwrap()
}

#[cfg(not(feature = "collator-selection"))]
fn make_basic_storage() -> Storage {
	use crate::AuraConfig;

	let cfg = RuntimeGenesisConfig {
		aura: AuraConfig {
			authorities: vec![
				get_from_seed::<AuraId>("Alice"),
				get_from_seed::<AuraId>("Bob"),
			],
		},
		parachain_info: ParachainInfoConfig {
			parachain_id: PARA_ID.into(),
			..Default::default()
		},
		..Default::default()
	};

	cfg.build_storage().unwrap()
}
