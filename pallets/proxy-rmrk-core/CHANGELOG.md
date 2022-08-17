<!-- bureaucrate goes here -->
## [v0.1.2] 2022-08-16

### Other changes

- build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

- build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

- refactor: Remove `#[transactional]` from extrinsics 7fd36cea2f6e00c02c67ccc1de9649ae404efd31

Every extrinsic now runs in transaction implicitly, and
`#[transactional]` on pallet dispatchable is now meaningless

Upstream-Change: https://github.com/paritytech/substrate/issues/10806

- build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b