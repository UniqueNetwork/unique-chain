# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
## [0.2.0] - 2023-05-19

### Changed

- **Breaking:** migration from `Currency` traits to `Fungible` ones in constraints
  for `Config::Currency` associated type.

## [0.1.6] - 2023-04-19

- ### Fixed

- Useless `on_runtime_upgrade()` has been removed

## [0.1.5] - 2023-02-14

### Added

- `unstake_partial` extrinsic.

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
