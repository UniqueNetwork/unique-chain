# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->

## [0.1.4] - 2023-01-31

### Changed

- Balance reservation when calling the unstake method is removed.
  Now the locked balance (by AppPromo) does not change until the unlock interval expires.

## [0.1.3] - 2022-12-25

### Fixed

- Benchmarks for `payoutStakers` and `unstake` extrinsics.

## [0.1.2] - 2022-12-20

### Fixed

- The behaviour of the `payoutStakers` extrinsic
  in which only one stake is calculated for the last processed staker.

## [0.1.1] - 2022-12-13

### Added

- The ability to configure pallet `app-promotion` via the `configuration` pallet.
