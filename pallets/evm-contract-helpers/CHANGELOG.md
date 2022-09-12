# Change Log

All notable changes to this project will be documented in this file.

## [v0.3.0] 2022-09-05

### Added

-   Methods `force_set_sponsor` , `force_remove_sponsor` to be able to administer sponsorships with other pallets. Added to implement `AppPromotion` pallet logic.

## [v0.2.0] - 2022-08-19

### Added

-   Set arbitrary evm address as contract sponsor.
-   Ability to remove current sponsor.

### Removed

-   Remove methods
    -   sponsoring_enabled
    -   toggle_sponsoring

### Changed

-   Change `toggle_sponsoring` to `self_sponsored_enable`.

## [v0.1.2] 2022-08-16

### Other changes

-   build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

-   build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

-   build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b
