# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->

## [v0.1.4] 2022-09-08

### Added
-  Support RPC for `AppPromotion` pallet. 

## [v0.1.3] 2022-08-16

### Other changes

-   build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

-   build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

-   build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b

## [0.1.2] - 2022-08-12

### Fixed

-   Method signature `total_pieces`. Before that the number of pieces greater than 2^53 -1 caused an error when calling this method.

## [0.1.1] - 2022-07-14

### Added

-   Implementation of RPC method `token_owners` returning 10 owners in no particular order.
    This was an internal request to improve the web interface and support fractionalization event.
