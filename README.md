![Docker build](https://github.com/usetech-llc/nft_parachain/workflows/Docker%20build/badge.svg)

# NFT Parachain

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
  "Ownership": {
    "Owner": "AccountId",
    "Fraction": "u128"
  },
  "FungibleItemType": {
    "Collection": "u64",
    "Owner": "AccountId",
    "Value": "u128"
  },
  "ReFungibleItemType": {
    "Collection": "u64",
    "Owner": "Vec<Ownership>",
    "Data": "Vec<u8>"
  },
  "NftItemType": {
    "Collection": "u64",
    "Owner": "AccountId",
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