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

use sc_chain_spec::{ChainSpecExtension, ChainSpecGroup};
use sc_service::ChainType;
use sp_core::{sr25519, Pair, Public};
use sp_runtime::traits::{IdentifyAccount, Verify};
use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::map::Map;

use unique_runtime_common::types::*;

#[cfg(feature = "unique-runtime")]
use unique_runtime as default_runtime;

#[cfg(all(not(feature = "unique-runtime"), feature = "quartz-runtime"))]
use quartz_runtime as default_runtime;

#[cfg(all(not(feature = "unique-runtime"), not(feature = "quartz-runtime")))]
use opal_runtime as default_runtime;

/// The `ChainSpec` parameterized for the unique runtime.
#[cfg(feature = "unique-runtime")]
pub type UniqueChainSpec = sc_service::GenericChainSpec<unique_runtime::GenesisConfig, Extensions>;

/// The `ChainSpec` parameterized for the quartz runtime.
#[cfg(feature = "quartz-runtime")]
pub type QuartzChainSpec = sc_service::GenericChainSpec<quartz_runtime::GenesisConfig, Extensions>;

/// The `ChainSpec` parameterized for the opal runtime.
pub type OpalChainSpec = sc_service::GenericChainSpec<opal_runtime::GenesisConfig, Extensions>;

#[cfg(feature = "unique-runtime")]
pub type DefaultChainSpec = UniqueChainSpec;

#[cfg(all(not(feature = "unique-runtime"), feature = "quartz-runtime"))]
pub type DefaultChainSpec = QuartzChainSpec;

#[cfg(all(not(feature = "unique-runtime"), not(feature = "quartz-runtime")))]
pub type DefaultChainSpec = OpalChainSpec;

pub enum RuntimeId {
	#[cfg(feature = "unique-runtime")]
	Unique,

	#[cfg(feature = "quartz-runtime")]
	Quartz,

	Opal,
	Unknown(String),
}

pub trait RuntimeIdentification {
	fn runtime_id(&self) -> RuntimeId;
}

impl RuntimeIdentification for Box<dyn sc_service::ChainSpec> {
	fn runtime_id(&self) -> RuntimeId {
		#[cfg(feature = "unique-runtime")]
		if self.id().starts_with("unique") {
			return RuntimeId::Unique;
		}

		#[cfg(feature = "quartz-runtime")]
		if self.id().starts_with("quartz") {
			return RuntimeId::Quartz;
		}

		if self.id().starts_with("opal") || self.id() == "dev" || self.id() == "local_testnet" {
			return RuntimeId::Opal;
		}

		RuntimeId::Unknown(self.id().into())
	}
}

pub enum ServiceId {
	Prod,
	Dev,
}

pub trait ServiceIdentification {
	fn service_id(&self) -> ServiceId;
}

impl ServiceIdentification for Box<dyn sc_service::ChainSpec> {
	fn service_id(&self) -> ServiceId {
		if self.id().ends_with("dev") {
			ServiceId::Dev
		} else {
			ServiceId::Prod
		}
	}
}

/// Helper function to generate a crypto pair from seed
pub fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{}", seed), None)
		.expect("static values are valid; qed")
		.public()
}

/// The extensions for the [`ChainSpec`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ChainSpecGroup, ChainSpecExtension)]
#[serde(deny_unknown_fields)]
pub struct Extensions {
	/// The relay chain of the Parachain.
	pub relay_chain: String,
	/// The id of the Parachain.
	pub para_id: u32,
}

impl Extensions {
	/// Try to get the extension from the given `ChainSpec`.
	pub fn try_get(chain_spec: &dyn sc_service::ChainSpec) -> Option<&Self> {
		sc_chain_spec::get_extension(chain_spec.extensions())
	}
}

type AccountPublic = <Signature as Verify>::Signer;

/// Helper function to generate an account ID from seed
pub fn get_account_id_from_seed<TPublic: Public>(seed: &str) -> AccountId
where
	AccountPublic: From<<TPublic::Pair as Pair>::Public>,
{
	AccountPublic::from(get_from_seed::<TPublic>(seed)).into_account()
}

macro_rules! testnet_genesis {
	(
		$runtime:path,
		$root_key:expr,
		$initial_authorities:expr,
		$endowed_accounts:expr,
		$id:expr
	) => {{
		use $runtime::*;

		GenesisConfig {
			system: SystemConfig {
				code: WASM_BINARY
					.expect("WASM binary was not build, please build it!")
					.to_vec(),
			},
			balances: BalancesConfig {
				balances: $endowed_accounts
					.iter()
					.cloned()
					// 1e13 UNQ
					.map(|k| (k, 1 << 100))
					.collect(),
			},
			treasury: Default::default(),
			sudo: SudoConfig {
				key: Some($root_key),
			},
			vesting: VestingConfig { vesting: vec![] },
			parachain_info: ParachainInfoConfig { parachain_id: $id.into() },
			parachain_system: Default::default(),
			aura: AuraConfig {
				authorities: $initial_authorities,
			},
			aura_ext: Default::default(),
			evm: EVMConfig {
				accounts: BTreeMap::new(),
			},
			ethereum: EthereumConfig {},
		}
	}};
}

pub fn development_config() -> OpalChainSpec {
	let mut properties = Map::new();
	properties.insert("tokenSymbol".into(), opal_runtime::TOKEN_SYMBOL.into());
	properties.insert("tokenDecimals".into(), 18.into());
	properties.insert("ss58Format".into(), opal_runtime::SS58Prefix::get().into());

	OpalChainSpec::from_genesis(
		// Name
		"OPAL by UNIQUE",
		// ID
		"opal_dev",
		ChainType::Local,
		move || {
			testnet_genesis!(
				opal_runtime,

				// Sudo account
				get_account_id_from_seed::<sr25519::Public>("Alice"),
				vec![
					get_from_seed::<AuraId>("Alice"),
					get_from_seed::<AuraId>("Bob"),
				],
				// Pre-funded accounts
				vec![
					get_account_id_from_seed::<sr25519::Public>("Alice"),
					get_account_id_from_seed::<sr25519::Public>("Bob"),
				],
				1000
			)
		},
		// Bootnodes
		vec![],
		// Telemetry
		None,
		// Protocol ID
		None,
		None,
		// Properties
		Some(properties),
		// Extensions
		Extensions {
			relay_chain: "rococo-dev".into(),
			para_id: 1000,
		},
	)
}

pub fn local_testnet_rococo_config() -> DefaultChainSpec {
	let mut properties = Map::new();
	properties.insert("tokenSymbol".into(), default_runtime::TOKEN_SYMBOL.into());
	properties.insert("tokenDecimals".into(), 18.into());
	properties.insert("ss58Format".into(), default_runtime::SS58Prefix::get().into());

	DefaultChainSpec::from_genesis(
		// Name
		format!(
			"{}{}",
			default_runtime::RUNTIME_NAME.to_uppercase(),
			if cfg!(feature = "unique-runtime") { "" } else { " by UNIQUE" }
		).as_str(),
		// ID
		format!("{}_local", default_runtime::RUNTIME_NAME).as_str(),
		ChainType::Local,
		move || {
			testnet_genesis!(
				default_runtime,

				// Sudo account
				get_account_id_from_seed::<sr25519::Public>("Alice"),
				vec![
					get_from_seed::<AuraId>("Alice"),
					get_from_seed::<AuraId>("Bob"),
				],
				// Pre-funded accounts
				vec![
					get_account_id_from_seed::<sr25519::Public>("Alice"),
					get_account_id_from_seed::<sr25519::Public>("Bob"),
					get_account_id_from_seed::<sr25519::Public>("Charlie"),
					get_account_id_from_seed::<sr25519::Public>("Dave"),
					get_account_id_from_seed::<sr25519::Public>("Eve"),
					get_account_id_from_seed::<sr25519::Public>("Ferdie"),
					get_account_id_from_seed::<sr25519::Public>("Alice//stash"),
					get_account_id_from_seed::<sr25519::Public>("Bob//stash"),
					get_account_id_from_seed::<sr25519::Public>("Charlie//stash"),
					get_account_id_from_seed::<sr25519::Public>("Dave//stash"),
					get_account_id_from_seed::<sr25519::Public>("Eve//stash"),
					get_account_id_from_seed::<sr25519::Public>("Ferdie//stash"),
				],
				1000
			)
		},
		// Bootnodes
		vec![],
		// Telemetry
		None,
		// Protocol ID
		None,
		None,
		// Properties
		Some(properties),
		// Extensions
		Extensions {
			relay_chain: "rococo-local".into(),
			para_id: 1000,
		},
	)
}
