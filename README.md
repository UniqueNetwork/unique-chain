![Docker build](https://github.com/usetech-llc/nft_parachain/workflows/Docker%20build/badge.svg)

# NFT Parachain

## Project Description

The NFT Pallet is the core of NFT functionality. Like ERC-721 standard in Ethereum ecosystem, this pallet provides the basement for creating collections of unique non-divisible things, also called Non Fungible Tokens (NFTs), minting NFT of a given Collection, and managing their ownership.

The pallet also enables storing NFT properties. Though (according to ERC-721) NFT properties belong to logic of a concrete application that operates a Collection, so purposefully the NFT Tracking Module does not have any knowledge about properties except their byte size leaving application logic out to be controlled by Smart Contracts.

The NFT Chain also provides:

* Smart Contracts Pallet and example smart contract that interacts with NFT Runtime
* ERC-1155 Functionality (currently PoC as Re-Fungible tokens, i.e. items that are still unique, but that can be split between multiple users)
* Variety of economic options for dapp producers to choose from to create freemium games and other ways to attract users. As a step one, we implemented an economic model when a collection sponsor can be set to pay for collection Transfer transactions.

Wider NFT Ecosystem (most of it was developed during Hackusama):
* [SubstraPunks Game hosted on IPFS](https://github.com/usetech-llc/substrapunks)
* [NFT Wallet and UI](https://uniqueapps.usetech.com/#/nft)
* [NFT Asset for Unity Framework](https://github.com/usetech-llc/nft_unity)

Please see our [walk-thorugh instructions](doc/hackusama_walk_through.md) to try everything out!

## Hackusama Update

During the Kusama Hackaphon the following changes were made:
* Enabled Smart Contracts Pallet
* Enabled integration between Smart Contracts and NFT Pallet (required special edition of RC4 Substrate version)
* Fixed misc. bugs in NFT Pallet
* Deployed NFT TestNet. Public node available at wss://unique.usetech.com, custom UI types - see below in this README.
* New Features:
  * Re-Fungible Token Mode
  * Off-Chain Schema to store token image URLs
  * Alternative economic model
  * White Lists and Public Mint Permission
* Use example: [SubstraPunks Game](https://github.com/usetech-llc/substrapunks), fully hosted on IPFS and NFT Testnet Blockchain.

## Application Development

If you are building an application that operates NFT tokens, use [this document](doc/application_development.md).

## Building

Building NFT chain requires special versions of Rust and toolchain. We don't use the most recent versions of everything so that we can keep the builds stable.

1. Install Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
sudo apt-get install libssl-dev pkg-config libclang-dev clang
```

2. Remove all installed toolchains with `rustup toolchain list` and `rustup toolchain uninstall <toolchain>`.

3. Install Rust Toolchain 1.44.0:

```bash
rustup install 1.44.0
```

4. Make it default (actual toochain version may be different, so do a `rustup toolchain list` first)
```bash
rustup toolchain list
rustup default 1.44.0-x86_64-unknown-linux-gnu
```

5. Install nightly toolchain and add wasm target for it:

```bash
rustup toolchain install nightly-2020-05-01
rustup target add wasm32-unknown-unknown --toolchain nightly-2020-05-01-x86_64-unknown-linux-gnu
```

6. Build:
```bash
cargo build
```

## Run

You can start a development chain with:

```bash
cargo run -- --dev
```

Detailed logs may be shown by running the node with the following environment variables set: `RUST_LOG=debug RUST_BACKTRACE=1 cargo run -- --dev`.

If you want to see the multi-node consensus algorithm in action locally, then you can create a local testnet with two validator nodes for Alice and Bob, who are the initial authorities of the genesis chain that have been endowed with testnet units. Give each node a name and expose them so they are listed on the Polkadot [telemetry site](https://telemetry.polkadot.io/#/Local%20Testnet). You'll need two terminal windows open.

We'll start Alice's substrate node first on default TCP port 30333 with her chain database stored locally at `/tmp/alice`. The bootnode ID of her node is `QmQZ8TjTqeDj3ciwr93EJ95hxfDsb9pEYDizUAbWpigtQN`, which is generated from the `--node-key` value that we specify below:

```bash
cargo run -- \
  --base-path /tmp/alice \
  --chain=local \
  --alice \
  --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
  --telemetry-url ws://telemetry.polkadot.io:1024 \
  --validator
```

In the second terminal, we'll start Bob's substrate node on a different TCP port of 30334, and with his chain database stored locally at `/tmp/bob`. We'll specify a value for the `--bootnodes` option that will connect his node to Alice's bootnode ID on TCP port 30333:

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


## UI custom types
```
{
  "Schedule": {
    "version": "u32",
    "put_code_per_byte_cost": "Gas",
    "grow_mem_cost": "Gas",
    "regular_op_cost": "Gas",
    "return_data_per_byte_cost": "Gas",
    "event_data_per_byte_cost": "Gas",
    "event_per_topic_cost": "Gas",
    "event_base_cost": "Gas",
    "call_base_cost": "Gas",
    "instantiate_base_cost": "Gas",
    "dispatch_base_cost": "Gas",
    "sandbox_data_read_cost": "Gas",
    "sandbox_data_write_cost": "Gas",
    "transfer_cost": "Gas",
    "instantiate_cost": "Gas",
    "max_event_topics": "u32",
    "max_stack_height": "u32",
    "max_memory_pages": "u32",
    "max_table_size": "u32",
    "enable_println": "bool",
    "max_subject_len": "u32"
  },
  "CollectionMode": {
    "_enum": {
      "Invalid": null,
      "NFT": "u32",
      "Fungible": "u32",
      "ReFungible": "(u32, u32)"
    }
  },
  "NftItemType": {
    "Collection": "u64",
    "Owner": "AccountId",
    "Data": "Vec<u8>"
  },
  "Ownership": {
    "owner": "AccountId",
    "fraction": "u128"
  },
  "ReFungibleItemType": {
    "Collection": "u64",
    "Owner": "Vec<Ownership<AccountId>>",
    "Data": "Vec<u8>"
  },
  "CollectionType": {
    "Owner": "AccountId",
    "Mode": "CollectionMode",
    "Access": "u8",
    "DecimalPoints": "u32",
    "Name": "Vec<u16>",
    "Description": "Vec<u16>",
    "TokenPrefix": "Vec<u8>",
    "CustomDataSize": "u32",
    "OffchainSchema": "Vec<u8>",
    "Sponsor": "AccountId",
    "UnconfirmedSponsor": "AccountId"
  },
  "RawData": "Vec<u8>",
  "Address": "AccountId",
  "LookupSource": "AccountId",
  "Weight": "u64"
}
```