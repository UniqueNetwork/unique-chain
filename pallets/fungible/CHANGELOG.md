# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->

## [0.1.9] - 2022-12-01

### Added

- The functions `mintCross` to `ERC20UniqueExtensions` interface.

## [0.1.8] - 2022-11-18

### Added

- The function `description` to `ERC20UniqueExtensions` interface.

## [0.1.7] - 2022-11-14

### Changed

- Added `transfer_cross` in eth functions.

### Changed

- Use named structure `EthCrossAccount` in eth functions.

## [0.1.6] - 2022-11-02

### Changed

- Use named structure `EthCrossAccount` in eth functions.

## [0.1.5] - 2022-08-29

### Added

- Implementation of `mint` and `mint_bulk` methods for ERC20 API.

## [v0.1.4] - 2022-08-24

### Change

- Add bound `AsRef<[u8; 32]>` to `T::CrossAccountId`.

## [v0.1.3] 2022-08-16

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

## [0.1.2] - 2022-08-04

### Fixed

- Issue with ItemCreated event containing total supply of tokens instead minted amount

## [0.1.1] - 2022-07-14

### Added

- Implementation of RPC method `token_owners` returning 10 owners in no particular order.
  This was an internal request to improve the web interface and support fractionalization event.
