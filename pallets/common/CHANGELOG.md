# Change Log

All notable changes to this project will be documented in this file.

## [0.1.3] - 2022-07-25
### Add
-   Some static property keys and values.

## [0.1.2] - 2022-07-20

### Fixed

-   Some methods in `#[solidity_interface]` for `CollectionHandle` had invalid
    mutability modifiers, causing invalid stub/abi generation.

## [0.1.1] - 2022-07-14

### Added

 - Implementation of RPC method `token_owners` returning 10 owners in no particular order.
    This was an internal request to improve the web interface and support fractionalization event. 

 