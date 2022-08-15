# Change Log

All notable changes to this project will be documented in this file.

## [0.1.2] - 2022-08-12

### Fixed

-   Method signature `total_pieces`. Before that the number of pieces greater than 2^53 -1 caused an error when calling this method.

## [0.1.1] - 2022-07-14

### Added

-   Implementation of RPC method `token_owners` returning 10 owners in no particular order.
    This was an internal request to improve the web interface and support fractionalization event.
