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

use default_runtime::WASM_BINARY;
#[cfg(all(not(feature = "unique-runtime"), not(feature = "quartz-runtime")))]
pub use opal_runtime as default_runtime;
#[cfg(all(not(feature = "unique-runtime"), feature = "quartz-runtime"))]
pub use quartz_runtime as default_runtime;
use sc_chain_spec::{ChainSpecExtension, ChainSpecGroup};
use sc_service::ChainType;
use serde::{Deserialize, Serialize};
use serde_json::{json, map::Map};
use sp_core::{sr25519, Pair, Public};
use sp_runtime::traits::{IdentifyAccount, Verify};
#[cfg(feature = "unique-runtime")]
pub use unique_runtime as default_runtime;
use up_common::types::opaque::*;

/// The `ChainSpec` parameterized for the unique runtime.
#[cfg(feature = "unique-runtime")]
pub type UniqueChainSpec =
	sc_service::GenericChainSpec<unique_runtime::RuntimeGenesisConfig, Extensions>;

/// The `ChainSpec` parameterized for the quartz runtime.
#[cfg(feature = "quartz-runtime")]
pub type QuartzChainSpec =
	sc_service::GenericChainSpec<quartz_runtime::RuntimeGenesisConfig, Extensions>;

/// The `ChainSpec` parameterized for the opal runtime.
pub type OpalChainSpec =
	sc_service::GenericChainSpec<opal_runtime::RuntimeGenesisConfig, Extensions>;

#[cfg(feature = "unique-runtime")]
pub type DefaultChainSpec = UniqueChainSpec;

#[cfg(all(not(feature = "unique-runtime"), feature = "quartz-runtime"))]
pub type DefaultChainSpec = QuartzChainSpec;

#[cfg(all(not(feature = "unique-runtime"), not(feature = "quartz-runtime")))]
pub type DefaultChainSpec = OpalChainSpec;

#[cfg(not(feature = "unique-runtime"))]
/// PARA_ID for Opal/Sapphire/Quartz
const PARA_ID: u32 = 2095;

#[cfg(feature = "unique-runtime")]
/// PARA_ID for Unique
const PARA_ID: u32 = 2037;

pub trait RuntimeIdentification {
	fn runtime_id(&self) -> RuntimeId;
}

impl RuntimeIdentification for Box<dyn sc_service::ChainSpec> {
	fn runtime_id(&self) -> RuntimeId {
		#[cfg(feature = "unique-runtime")]
		if self.id().starts_with("unique") || self.id().starts_with("unq") {
			return RuntimeId::Unique;
		}

		#[cfg(feature = "quartz-runtime")]
		if self.id().starts_with("quartz")
			|| self.id().starts_with("qtz")
			|| self.id().starts_with("sapphire")
		{
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
	TPublic::Pair::from_string(&format!("//{seed}"), None)
		.expect("static values are valid; qed")
		.public()
}

/// The extensions for the [`DefaultChainSpec`].
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

pub fn test_config(chain_id: &str, relay_chain: &str) -> DefaultChainSpec {
	DefaultChainSpec::builder(
		WASM_BINARY.expect("WASM binary was not build, please build it!"),
		Extensions {
			relay_chain: relay_chain.into(),
			para_id: PARA_ID,
		},
	)
	.with_id(&format!(
		"{}_{}",
		default_runtime::VERSION.spec_name,
		chain_id
	))
	.with_name(&format!(
		"{}{}",
		default_runtime::VERSION.spec_name.to_uppercase(),
		if cfg!(feature = "unique-runtime") {
			""
		} else {
			" by UNIQUE"
		}
	))
	.with_properties(chain_properties())
	.with_chain_type(ChainType::Development)
	.with_genesis_config_patch(genesis_patch())
	.build()
}

fn genesis_patch() -> serde_json::Value {
	use default_runtime::*;

	let invulnerables = ["Alice", "Bob"];

	#[allow(unused_mut)]
	let mut patch = json!({
		"parachainInfo": {
			"parachainId": PARA_ID,
		},

		"aura": {
			"authorities": invulnerables.into_iter()
				.map(get_from_seed::<AuraId>)
				.collect::<Vec<_>>(),
		},

		// We don't have Session pallet in production anywhere,
		// Adding this config makes baedeker think we have pallet-session, and it tries to
		// reconfigure chain using it, which makes no sense, because then aura knows no
		// authority, as baedeker expects them to be configured by session pallet.
		// "session": {
		// 	"keys": invulnerables.into_iter()
		// 		.map(|name| {
		// 			let account = get_account_id_from_seed::<sr25519::Public>(name);
		// 			let aura = get_from_seed::<AuraId>(name);
		//
		// 			(
		// 				/*   account id: */ account.clone(),
		// 				/* validator id: */ account,
		// 				/* session keys: */ SessionKeys { aura },
		// 			)
		// 		})
		// 		.collect::<Vec<_>>()
		// },

		"sudo": {
			"key": get_account_id_from_seed::<sr25519::Public>("Alice"),
		},

		"balances": {
			"balances": &[
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
			].into_iter()
			.map(|k| (k, /* ~1.2e+12 UNQ */ 1u128 << 100))
			.collect::<Vec<_>>(),
		},
	});

	#[cfg(feature = "unique-runtime")]
	{
		patch
			.as_object_mut()
			.expect("the genesis patch is always an object; qed")
			.remove("session");
	}

	patch
}

fn chain_properties() -> sc_chain_spec::Properties {
	let mut properties = Map::new();
	properties.insert("tokenSymbol".into(), default_runtime::TOKEN_SYMBOL.into());
	properties.insert("tokenDecimals".into(), default_runtime::DECIMALS.into());
	properties.insert(
		"ss58Format".into(),
		default_runtime::SS58Prefix::get().into(),
	);

	properties
}
