<!-- bureaucrate goes here -->
## v0.9.25 [2022-07-21]

### Other changes

- build: Upgrade polkadot to v0.9.26 50a343ea000907169d4ea26178d2d52985df27bf

- refactor: Use export-genesis state from cumulus 03cdd4abdb57cac24a54aa6024076801ae6f0900

We had our implementation for some reason, however it is now broken, and
I see no reason to keep it, as upstream implements exact same options

- build: Upgrade polkadot to v0.9.25 04c093485e1aacc051e5e682f45c022470ae177b