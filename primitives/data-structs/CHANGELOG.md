# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
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
