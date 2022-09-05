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

use sp_runtime::BuildStorage;
use sp_core::{Public, Pair};
use sp_std::vec;
use up_common::types::AuraId;
use crate::{GenesisConfig, ParachainInfoConfig, AuraConfig};

pub mod xcm;

fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{}", seed), None)
		.expect("static values are valid; qed")
		.public()
}

fn new_test_ext(para_id: u32) -> sp_io::TestExternalities {
    let cfg = GenesisConfig {
        aura: AuraConfig {
            authorities: vec![
                get_from_seed::<AuraId>("Alice"),
                get_from_seed::<AuraId>("Bob"),
            ],
        },
        parachain_info: ParachainInfoConfig {
            parachain_id: para_id.into(),
        },
        ..GenesisConfig::default()
    };

	cfg.build_storage()
        .unwrap()
		.into()
}
