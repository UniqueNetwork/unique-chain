//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

use cumulus_primitives_core::ParaId;
use nft_runtime::*;
use sc_chain_spec::{ChainSpecExtension, ChainSpecGroup};
use sc_service::ChainType;
use sp_core::{sr25519, Pair, Public};
use sp_runtime::traits::{IdentifyAccount, Verify};

use serde::{Deserialize, Serialize};
use serde_json::map::Map;

/// Specialized `ChainSpec`. This is a specialization of the general Substrate ChainSpec type.
pub type ChainSpec = sc_service::GenericChainSpec<nft_runtime::GenesisConfig, Extensions>;

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

pub fn development_config(id: ParaId) -> ChainSpec {
	let mut properties = Map::new();
	properties.insert("tokenSymbol".into(), "testUNQ".into());
	properties.insert("tokenDecimals".into(), 15.into());
	properties.insert("ss58Format".into(), 42.into()); // Generic Substrate wildcard (SS58 checksum preimage)

	ChainSpec::from_genesis(
		// Name
		"Development",
		// ID
		"dev",
		ChainType::Local,
		move || testnet_genesis(
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
			id,
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
		Extensions {
			relay_chain: "rococo-dev".into(),
			para_id: id.into(),
		},
	)
}

pub fn local_testnet_config(id: ParaId) -> ChainSpec {
	ChainSpec::from_genesis(
		// Name
		"Local Testnet",
		// ID
		"local_testnet",
		ChainType::Local,
		move || testnet_genesis(
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
			id,
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
		Extensions {
			relay_chain: "rococo-local".into(),
			para_id: id.into(),
		},
	)
}

fn testnet_genesis(
    root_key: AccountId,
	initial_authorities: Vec<AuraId>,
    endowed_accounts: Vec<AccountId>,
	id: ParaId,
) -> GenesisConfig {

	let vested_accounts = vec![
		get_account_id_from_seed::<sr25519::Public>("Bob"),
	];

    GenesisConfig {
		system: nft_runtime::SystemConfig {
			code: nft_runtime::WASM_BINARY
				.expect("WASM binary was not build, please build it!")
				.to_vec(),
			changes_trie_config: Default::default(),
		},
        pallet_balances: BalancesConfig {
            balances: endowed_accounts
                .iter()
                .cloned()
                .map(|k| (k, 1 << 100))
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
		parachain_info: nft_runtime::ParachainInfoConfig { parachain_id: id },
		pallet_aura: nft_runtime::AuraConfig {
			authorities: initial_authorities,
		},
		cumulus_pallet_aura_ext: Default::default(),
    }
}
