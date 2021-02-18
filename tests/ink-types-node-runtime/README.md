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