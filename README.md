![Docker build](https://github.com/usetech-llc/nft_parachain/workflows/Docker%20build/badge.svg)

# NFT Parachain

## Project Description

The NFT Pallet is the core of NFT functionality. Like ERC-721 standard in Ethereum ecosystem, this pallet provides the
basement for creating collections of unique non-divisible things, also called Non Fungible Tokens (NFTs), minting NFT of
a given Collection, and managing their ownership.

The pallet also enables storing NFT properties. Though (according to ERC-721) NFT properties belong to logic of a
concrete application that operates a Collection, so purposefully the NFT Tracking Module does not have any knowledge
about properties except their byte size leaving application logic out to be controlled by Smart Contracts.

The NFT Chain also provides:

-   Smart Contracts Pallet and example smart contract that interacts with NFT Runtime
-   ERC-1155 Functionality (currently PoC as Re-Fungible tokens, i.e. items that are still unique, but that can be split
    between multiple users)
-   Variety of economic options for dapp producers to choose from to create freemium games and other ways to attract
    users. As a step one, we implemented an economic model when a collection sponsor can be set to pay for collection
    Transfer transactions.

Wider NFT Ecosystem (most of it was developed during Hackusama):

-   [SubstraPunks Game hosted on IPFS](https://github.com/usetech-llc/substrapunks)
-   [NFT Wallet and UI](https://uniqueapps.usetech.com/#/nft)
-   [NFT Asset for Unity Framework](https://github.com/usetech-llc/nft_unity)

Please see our [walk-thorugh instructions](doc/hackusama_walk_through.md) to try everything out!

## Hackusama Update

During the Kusama Hackaphon the following changes were made:

-   Enabled Smart Contracts Pallet
-   Enabled integration between Smart Contracts and NFT Pallet (required special edition of RC4 Substrate version)
-   Fixed misc. bugs in NFT Pallet
-   Deployed NFT TestNet. Public node available at wss://unique.usetech.com, custom UI types - see below in this README.
-   New Features:
    -   Re-Fungible Token Mode
    -   Off-Chain Schema to store token image URLs
    -   Alternative economic model
    -   White Lists and Public Mint Permission
-   Use example: [SubstraPunks Game](https://github.com/usetech-llc/substrapunks), fully hosted on IPFS and NFT Testnet
    Blockchain.

## Application Development

If you are building an application that operates NFT tokens, use [this document](doc/application_development.md).

## Building

Building NFT chain requires special versions of Rust and toolchain. We don't use the most recent versions of everything
so that we can keep the builds stable.

1. Install Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
sudo apt-get install libssl-dev pkg-config libclang-dev clang
```

2. Remove all installed toolchains with `rustup toolchain list` and `rustup toolchain uninstall <toolchain>`.

3. Install install nightly 2021-03-01 and make it default:

```bash
rustup toolchain install nightly-2021-03-01
rustup default nightly-2021-03-01
```

4. Add wasm target for nightly toolchain:

```bash
rustup target add wasm32-unknown-unknown --toolchain nightly-2021-03-01
```

5. Build:
```bash
cargo build
```

optionally, build in release:
```bash
cargo build --release
```

## Run

You can start a development chain with:

```bash
cargo run -- --dev
```

Detailed logs may be shown by running the node with the following environment variables set:
`RUST_LOG=debug RUST_BACKTRACE=1 cargo run -- --dev`.

If you want to see the multi-node consensus algorithm in action locally, then you can create a local testnet with two
validator nodes for Alice and Bob, who are the initial authorities of the genesis chain that have been endowed with
testnet units. Give each node a name and expose them so they are listed on the Polkadot
[telemetry site](https://telemetry.polkadot.io/#/Local%20Testnet). You'll need two terminal windows open.

We'll start Alice's substrate node first on default TCP port 30333 with her chain database stored locally at
`/tmp/alice`. The bootnode ID of her node is `QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN`, which is generated from
the `--node-key` value that we specify below:

```bash
cargo run -- \
  --base-path /tmp/alice \
  --chain=local \
  --alice \
  --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
  --telemetry-url ws://telemetry.polkadot.io:1024 \
  --validator
```

In the second terminal, we'll start Bob's substrate node on a different TCP port of 30334, and with his chain database
stored locally at `/tmp/bob`. We'll specify a value for the `--bootnodes` option that will connect his node to Alice's
bootnode ID on TCP port 30333:

```bash
cargo run -- \
  --base-path /tmp/bob \
  --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN \
  --chain=local \
  --bob \
  --port 30334 \
  --telemetry-url ws://telemetry.polkadot.io:1024 \
  --validator
```

Additional CLI usage options are available and may be shown by running `cargo run -- --help`.

## Building and Running as Parachain locally

Rust toolchain: nightly-2021-04-23
Note: checkout this project and polkadot project (see below) in the sibling folders (both under the same folder)

### Build relay

```
git clone https://github.com/paritytech/polkadot.git
cd polkadot
git checkout aa386760
cargo build --release
```

### Build parachain

Run in the root of this project:
```
cargo --build
```

### Run 4-node Relay

1. Download `rococo-custom-4.json` chain spec here: https://substrate.dev/cumulus-workshop/shared/chainspecs/rococo-custom-4.json
2. Use these instructions to launch 4 nodes: https://substrate.dev/cumulus-workshop/#/en/2-relay-chain/1-launch

Example (Run in polkadot folder. Replace `12D3KooWNLAmKcyee3oqSgTMthaQVXaAcXeo8RrGCzMfMVA3B5on` with output from Alice node):
```
./target/release/polkadot --alice --validator --base-path ./cumulus_relay0 --chain rococo-custom-4.json --port 50555 --ws-port 9944
./target/release/polkadot --bob --validator --base-path ./cumulus_relay1 --chain rococo-custom-4.json --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/12D3KooWNLAmKcyee3oqSgTMthaQVXaAcXeo8RrGCzMfMVA3B5on --port 50556 --ws-port 9945
./target/release/polkadot --charlie --validator --base-path ./cumulus_relay1 --chain rococo-custom-4.json --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/12D3KooWNLAmKcyee3oqSgTMthaQVXaAcXeo8RrGCzMfMVA3B5on --port 50557 --ws-port 9946
./target/release/polkadot --dave --validator --base-path ./cumulus_relay1 --chain rococo-custom-4.json --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/12D3KooWNLAmKcyee3oqSgTMthaQVXaAcXeo8RrGCzMfMVA3B5on --port 50558 --ws-port 9947

```

3. Export genesis state and runtime wasm from NFT parachain:

Run from this project root:
```
./target/release/nft export-genesis-state --parachain-id 2000 > ./resources/para-2000-genesis
./target/release/nft export-genesis-wasm > ./resources/para-2000-wasm
```

4. Run two parachain nodes:

Replace `12D3KooWN1ah2bFQSysEFnwZqcmcVpDDR8UedXyo6xfzV1zDNMNg` with Alice or Bob relay ID

Run from this project root:
```
./target/release/nft --alice --collator --force-authoring --base-path ./tmp/parachain-alice --parachain-id 2000 --port 40333 --ws-port 9844  -- --execution wasm --chain ../polkadot/rococo-custom-4.json --port 30343 --ws-port 9977
./target/release/nft --bob --collator --force-authoring --parachain-id 2000 --base-path ./tmp/parachain/bob --port 40334 --ws-port 9845 -- --execution wasm --chain ../polkadot/rococo-custom-4.json --port 30344 --ws-port 9978 --bootnodes /ip4/127.0.0.1/tcp/50556/p2p/12D3KooWN1ah2bFQSysEFnwZqcmcVpDDR8UedXyo6xfzV1zDNMNg
```

4. Reserve parachain ID as described here: https://substrate.dev/cumulus-workshop/#/en/2-relay-chain/2-reserve

5. Register parachain in relay as described here: https://substrate.dev/cumulus-workshop/#/en/3-parachains/2-register


## Run Integration Tests

1. Install all needed dependecies
```
cd tests
yarn install
```

2. Run tests
```
yarn test
```

## Benchmarks

First of all, add rust toolchain and make it default.
```bash
rustup target add wasm32-unknown-unknown --toolchain nightly-2020-10-01
```

Then in "/node/src" run build command below
```bash
cargo +nightly-2020-10-01 build --release --features runtime-benchmarks
```

Run benchmark
```bash
target/release/nft benchmark --chain dev --pallet "pallet_nft" --extrinsic "*" --repeat 1
```

## UI custom types

Moved to [runtime_types.json](./runtime_types.json).

## Running Integration Tests

See [tests/README.md](./tests/README.md).

## Code Formatting

### Get formatter and linter settings into your branch (if you forked before they were introduced)
```bash
git cherry-pick -n 8ff77c21b0d30b2a4648fa35dbf61dfa9d3948a7
```

### Apply formatting and clippy fixes
```bash
cargo clippy
cargo fmt
```

### Format tests
```bash
pushd tests && yarn fix ; popd
```

### Check code style in tests
```bash
cd tests && yarn eslint --ext .ts,.js src/
```

## Re-Enabling Ink! Contracts

Uncomment following lies:
1. In node/rpc/Cargo.toml
```
# pallet-contracts-rpc = { version = "3.0", git = 'https://github.com/paritytech/substrate.git', branch = 'polkadot-v0.9.7' }
```

2. In node/rpc/src/lib.rs
```
// C::Api: pallet_contracts_rpc::ContractsRuntimeApi<Block, AccountId, Balance, BlockNumber, Hash>,
...
// use pallet_contracts_rpc::{Contracts, ContractsApi};
...
// io.extend_with(ContractsApi::to_delegate(Contracts::new(client.clone())));

```

3. In runtime/Cargo.toml
```
    # 'pallet-contracts/std',
    # 'pallet-contracts-primitives/std',
    # 'pallet-contracts-rpc-runtime-api/std',
    # 'pallet-contract-helpers/std',
...
    # [dependencies.pallet-contracts]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.7'
    # version = '3.0.0'

    # [dependencies.pallet-contracts-primitives]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.7'
    # version = '3.0.0'

    # [dependencies.pallet-contracts-rpc-runtime-api]
    # git = 'https://github.com/paritytech/substrate.git'
    # default-features = false
    # branch = 'polkadot-v0.9.7'
    # version = '3.0.0'
...
    # pallet-contract-helpers = { path = '../pallets/contract-helpers', default-features = false, version = '0.1.0' }
```

4. runtime/src/lib.rs
```
// use pallet_contracts::weights::WeightInfo;
...
// pub use pallet_timestamp::Call as TimestampCall;
...
// mod chain_extension;
// use crate::chain_extension::{NFTExtension, Imbalance};
...
/*
parameter_types! {
	pub TombstoneDeposit: Balance = deposit(
  ...
}
*/
...
//pallet_contract_helpers::ContractSponsorshipHandler<Runtime>,
...
// impl pallet_contract_helpers::Config for Runtime {}
...
// Contracts: pallet_contracts::{Pallet, Call, Storage, Event<T>},
...
// ContractHelpers: pallet_contract_helpers::{Pallet, Call, Storage},
...
//pallet_contract_helpers::ContractHelpersExtension<Runtime>,
...
/*
	impl pallet_contracts_rpc_runtime_api::ContractsApi<Block, AccountId, Balance, BlockNumber, Hash>
		for Runtime
	{
    ...
	}
*/

```
