# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucracy goes here -->

## [4.0.0] - 2022-12-29

### Added

- Entire functionality moved over from cumulus/pallet-collator-selection (v3.0.0). Refactored business logic:
   - Added an extra step for candidacy, `get_license`, at which payment happens. The number of license holders is unlimited. 
      - Only licensed accounts can apply for candidacy with `onboard`. No extra deposits are made.
      - Active candidates may `offboard`, but they will retain their license.
      - Deposit is returned, and candidacy possibly removed with `release_license`.
      - License can be forcibly forfeited and candidacy removed with `force_release_license`.
   - Failing collators' deposits will now be fully slashed, and funds will be redirected to Treasury.
   - Unify `MaxInvulnerables` and `MaxCandidates` into `MaxCollators`.
   - Remove `MinCandidates`.
   - Minimal amount of invulnerables is now 1.
   - Both invulnerables and candidates count against the limits together, however invulnerables ignore `DesiredCollators`.
   - `KickThreshold` is made configurable.
   - `DesiredCollators`, `LicenseBond`, and `KickThreshold` are moved to and referenced from `pallet-configuration`.
   - Naming changes to better reflect the new functionality.
   - More minor changes, tests, benchmarks, etc.