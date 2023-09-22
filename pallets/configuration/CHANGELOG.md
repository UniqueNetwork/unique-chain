# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
## [0.2.0] - 2023-06-27

### Major change

- Architecture fixed: in the configuration of this pallet, bounds on the associated type were determined not by the functional requirements for this pallet itself, but by the pallet that had tight coupling with it.

## [0.1.3] - 2022-12-29

### Added

- The ability to configure pallet `collator-selection` via the `configuration` pallet.

## [0.1.2] - 2022-12-13

### Added

- The ability to configure pallet `app-promotion` via the `configuration` pallet.

## [v0.1.1] 2022-08-16

### Other changes

- build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a
