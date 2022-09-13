# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->

## [v0.1.4] 2022-09-05

### Added

-   Methods `force_set_sponsor` , `force_remove_collection_sponsor` to be able to administer sponsorships with other pallets. Added to implement `AppPromotion` pallet logic.

## [v0.1.3] 2022-08-16

### Other changes

-   build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

-   build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

-   refactor: Remove `#[transactional]` from extrinsics 7fd36cea2f6e00c02c67ccc1de9649ae404efd31

Every extrinsic now runs in transaction implicitly, and
`#[transactional]` on pallet dispatchable is now meaningless

Upstream-Change: https://github.com/paritytech/substrate/issues/10806

-   refactor: Switch to new prefix removal methods 26734e9567589d75cdd99e404eabf11d5a97d975

New methods allows to call `remove_prefix` with limit multiple times
in the same block
However, we don't use prefix removal limits, so upgrade is
straightforward

Upstream-Change: https://github.com/paritytech/substrate/pull/11490

-   build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b

## [v0.1.1] - 2022-07-25

### Added

-   Method for creating `ERC721Metadata` compatible NFT collection.
-   Method for creating `ERC721Metadata` compatible ReFungible collection.
-   Method for creating ReFungible collection.
