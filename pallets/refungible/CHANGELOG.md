# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
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
