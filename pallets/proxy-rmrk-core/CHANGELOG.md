<!-- bureaucrate goes here -->
## v0.1.1 [2022-07-21]

### Other changes

- build: Upgrade polkadot to v0.9.26 50a343ea000907169d4ea26178d2d52985df27bf

- refactor: Remove `#[transactional]` from extrinsics 460acb32b6b2de837bf8d3e556365902ec89e427

Every extrinsic now runs in transaction implicitly, and
`#[transactional]` on pallet dispatchable is now meaningless

Upstream-Change: https://github.com/paritytech/substrate/issues/10806

- build: Upgrade polkadot to v0.9.25 04c093485e1aacc051e5e682f45c022470ae177b