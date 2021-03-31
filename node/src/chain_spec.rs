//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

use nft_runtime::*;
use sp_core::{Pair, Public, sr25519};
use nft_runtime::{
	AccountId, AuraConfig, BalancesConfig, EVMConfig, EthereumConfig, GenesisConfig, GrandpaConfig,
	SudoConfig, SystemConfig, WASM_BINARY, Signature
};
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_finality_grandpa::AuthorityId as GrandpaId;
use sp_runtime::traits::{Verify, IdentifyAccount};
use sc_service::ChainType;
use serde_json::map::Map;
use std::collections::BTreeMap;

// Note this is the URL for the telemetry server
//const STAGING_TELEMETRY_URL: &str = "wss://telemetry.polkadot.io/submit/";

/// Specialized `ChainSpec`. This is a specialization of the general Substrate ChainSpec type.
pub type ChainSpec = sc_service::GenericChainSpec<GenesisConfig>;

/// Helper function to generate a crypto pair from seed
pub fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{}", seed), None)
		.expect("static values are valid; qed")
		.public()
}

type AccountPublic = <Signature as Verify>::Signer;

/// Helper function to generate an account ID from seed
pub fn get_account_id_from_seed<TPublic: Public>(seed: &str) -> AccountId
where
	AccountPublic: From<<TPublic::Pair as Pair>::Public>,
{
	AccountPublic::from(get_from_seed::<TPublic>(seed)).into_account()
}

/// Helper function to generate an authority key for Aura
pub fn authority_keys_from_seed(s: &str) -> (AuraId, GrandpaId) {
	(get_from_seed::<AuraId>(s), get_from_seed::<GrandpaId>(s))
}

pub fn development_config() -> Result<ChainSpec, String> {
	let wasm_binary = WASM_BINARY.ok_or("Development wasm binary not available".to_string())?;

	let mut properties = Map::new();
	properties.insert("tokenSymbol".into(), "UniqueTest".into());
	properties.insert("tokenDecimals".into(), 15.into());
	properties.insert("ss58Format".into(), 42.into()); // Generic Substrate wildcard (SS58 checksum preimage)

	Ok(ChainSpec::from_genesis(
		// Name
		"Development",
		// ID
		"dev",
		ChainType::Development,
		move || testnet_genesis(
			wasm_binary,
			// Initial PoA authorities
			vec![
				authority_keys_from_seed("Alice"),
			],
			// Sudo account
			get_account_id_from_seed::<sr25519::Public>("Alice"),
			// Pre-funded accounts
			vec![
				get_account_id_from_seed::<sr25519::Public>("Alice"),
				get_account_id_from_seed::<sr25519::Public>("Bob"),
				get_account_id_from_seed::<sr25519::Public>("Alice//stash"),
				get_account_id_from_seed::<sr25519::Public>("Bob//stash"),
			],
			true,
		),
		// Bootnodes
		vec![],
		// Telemetry
		None,
		// Protocol ID
		None,
		// Properties
		Some(properties),
		// Extensions
		None,
	))
}

pub fn local_testnet_config() -> Result<ChainSpec, String> {
	let wasm_binary = WASM_BINARY.ok_or("Development wasm binary not available".to_string())?;

	Ok(ChainSpec::from_genesis(
		// Name
		"Local Testnet",
		// ID
		"local_testnet",
		ChainType::Local,
		move || testnet_genesis(
			wasm_binary,
			// Initial PoA authorities
			vec![
				authority_keys_from_seed("Alice"),
				authority_keys_from_seed("Bob"),
			],
			// Sudo account
			get_account_id_from_seed::<sr25519::Public>("Alice"),
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
			true,
		),
		// Bootnodes
		vec![],
		// Telemetry
		None,
		// Protocol ID
		None,
		// Properties
		None,
		// Extensions
		None,
	))
}

fn testnet_genesis(
	wasm_binary: &[u8],
	initial_authorities: Vec<(AuraId, GrandpaId)>,
	root_key: AccountId,
	endowed_accounts: Vec<AccountId>,
	enable_println: bool,
) -> GenesisConfig {

	let vested_accounts = vec![
		get_account_id_from_seed::<sr25519::Public>("Bob"),
	];

	GenesisConfig {
		system: SystemConfig {
			code: wasm_binary.to_vec(),
			changes_trie_config: Default::default(),
		},
		pallet_balances: BalancesConfig {
			balances: endowed_accounts
				.iter()
				.cloned()
				.map(|k| (k, 1 << 100))
				.collect(),
		},
		pallet_aura: AuraConfig {
			authorities: initial_authorities.iter().map(|x| (x.0.clone())).collect(),
		},
		pallet_grandpa: GrandpaConfig {
			authorities: initial_authorities
				.iter()
				.map(|x| (x.1.clone(), 1))
				.collect(),
		},
		pallet_treasury: Default::default(),
		pallet_sudo: SudoConfig { key: root_key },
		pallet_vesting: VestingConfig {
			vesting: vested_accounts
				.iter()
				.cloned()
				.map(|k| (k, 1000, 100, 1 << 98))
				.collect(),
		},
		pallet_nft: NftConfig {
			collection_id: vec![(
				1,
				Collection {
					owner: get_account_id_from_seed::<sr25519::Public>("Alice"),
					mode: CollectionMode::NFT,
					access: AccessMode::Normal,
					decimal_points: 0,
					name: vec![],
					description: vec![],
					token_prefix: vec![],
					mint_mode: false,
					offchain_schema: vec![],
					schema_version: SchemaVersion::default(),
					sponsorship: SponsorshipState::Confirmed(get_account_id_from_seed::<sr25519::Public>("Alice")),
					const_on_chain_schema: vec![],
					variable_on_chain_schema: vec![],
					limits: CollectionLimits::default()
				},
			)],
			nft_item_id: vec![],
			fungible_item_id: vec![],
			refungible_item_id: vec![],
			chain_limit: ChainLimits {
				collection_numbers_limit: 100000,
				account_token_ownership_limit: 1000000,
				collections_admins_limit: 5,
				custom_data_limit: 2048,
				nft_sponsor_transfer_timeout: 15,
				fungible_sponsor_transfer_timeout: 15,
				refungible_sponsor_transfer_timeout: 15,
				offchain_schema_limit: 1024,
				variable_on_chain_schema_limit: 1024,
				const_on_chain_schema_limit: 1024,
			},
		},
		pallet_contracts: ContractsConfig {
			current_schedule: ContractsSchedule {
				enable_println,
				..Default::default()
			},
		},
		pallet_evm: EVMConfig {
			accounts: BTreeMap::new(),
		},
		pallet_ethereum: EthereumConfig {},
	}
}
