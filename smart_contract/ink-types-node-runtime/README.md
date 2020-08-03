# Node runtime types for `ink!`

Defines types for [ink!](https://github.com/paritytech/ink) smart contracts targeting [Substrate's `node-runtime`](https://github.com/paritytech/substrate/blob/master/bin/node/runtime/src/lib.rs).

Supplies an implementation of the [ink! `EnvTypes` trait](https://github.com/paritytech/ink/blob/master/core/src/env/types.rs#L128).

See `ink!` [examples](./examples) for usage.

## Requirements
```
rustup component add rust-src --toolchain nightly
rustup target add wasm32-unknown-unknown --toolchain nightly
rustup target add wasm32-unknown-unknown --toolchain stable
cargo install cargo-contract --vers 0.6.1 --force
```

## Build

### Runtime Dependencies
```
cargo +nightly build --release
```

### ink! Smart Contract
```
cargo +nightly contract build
cargo +nightly contract generate-metadata
```

## Test
```
cargo +nightly test
```

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
      "ReFungible": null
    }
  },
  "NftItemType": {
    "Collection": "u64",
    "Owner": "AccountId",
    "Data": "Vec<u8>"
  },
  
  
"CollectionType": {
    "Owner": "AccountId",
    "Mode": "u8",
    "ModeParam": "u32",
    "Access": "u8",
    "NextItemId": "u64",
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