<!-- bureaucrate goes here -->
## v0.9.25 [2022-07-21]

### Bugfixes

- Add missing config keys 430decbe3b0db3ee2a81207ef3bb1406dce18b10

New parity changes expect that System pallet has id 0, as it is declared
in most parachains

Because pallet id was changed, tx_version was increased, because old
transactions will not work with new version of chain

- Add missing config keys 93792bc194cc479312ae954005ef8af79c0e0edd

### Other changes

- build: Upgrade polkadot to v0.9.26 50a343ea000907169d4ea26178d2d52985df27bf

- build: Upgrade polkadot to v0.9.25 04c093485e1aacc051e5e682f45c022470ae177b