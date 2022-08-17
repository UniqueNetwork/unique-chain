# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
## [v0.2.3] 2022-08-16

### Other changes

- build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

- build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

- refactor: Switch to new prefix removal methods 26734e9567589d75cdd99e404eabf11d5a97d975

New methods allows to call `remove_prefix` with limit multiple times
in the same block
However, we don't use prefix removal limits, so upgrade is
straightforward

Upstream-Change: https://github.com/paritytech/substrate/pull/11490

- build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b

## [v0.2.2] 2022-08-04

### Product changes

- Now RefungibleMultipleItems may only receive single user on type level.

### Added features

- Implement property RPC 7bf45b532e32daa91f03c157b58874d21b42ae1f

### Other changes

- refactor: Disallow invalid bulk mints 53fec71cf728dddd012257b407ea30441e699f88

`create_multiple_items_ex` was allowing invalid (that will be always
rejected at runtime level) refungible mint extrinsics, by passing
multiple users into `RefungibleMultipleItems` call.

## [v0.2.1] - 2022-07-27

### New features

Implementation of ERC-721 EVM API ([#452](https://github.com/UniqueNetwork/unique-chain/pull/452))

## [v0.2.0] - 2022-08-01

### Deprecated

`const_data` field is removed

- `ItemData`
- `TokenData`

## [v0.1.2] - 2022-07-14

### Other changes

feat(refungible-pallet): add ERC-20 EVM API for RFT token pieces ([#413](https://github.com/UniqueNetwork/unique-chain/pull/413))
test(refungible-pallet): add tests for ERC-20 EVM API for RFT token pieces ([#413](https://github.com/UniqueNetwork/unique-chain/pull/413))

## [v0.1.1] - 2022-07-14

### Added features

- Support for properties for RFT collections and tokens.

### Other changes

- feat: RPC method `token_owners` returning 10 owners in no particular order.

This was an internal request to improve the web interface and support fractionalization event.
