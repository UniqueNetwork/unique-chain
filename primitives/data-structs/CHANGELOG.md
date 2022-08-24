# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
## [v0.2.2] 2022-08-16

### Other changes

- build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

- build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

- build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b

## [v0.2.1] 2022-08-04

### Product changes

- Now RefungibleMultipleItems may only receive single user on type level.

### Other changes

- refactor: Disallow invalid bulk mints 53fec71cf728dddd012257b407ea30441e699f88

`create_multiple_items_ex` was allowing invalid (that will be always
rejected at runtime level) refungible mint extrinsics, by passing
multiple users into `RefungibleMultipleItems` call.

## [v0.2.0] - 2022-08-01
### Deprecated
- `CreateReFungibleData::const_data`

## [v0.1.2] - 2022-07-25
### Added
- Type aliases `CollectionName`, `CollectionDescription`, `CollectionTokenPrefix`
## [v0.1.1] - 2022-07-22
### Added
- Аields with properties to `CreateReFungibleData` and `CreateRefungibleExData`.