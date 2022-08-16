# Change Log

All notable changes to this project will be documented in this file.

<!-- bureaucrate goes here -->
## [v0.1.4] 2022-08-16

### Other changes

- build: Upgrade polkadot to v0.9.27 2c498572636f2b34d53b1c51b7283a761a7dc90a

- build: Upgrade polkadot to v0.9.26 85515e54c4ca1b82a2630034e55dcc804c643bf8

- refactor: Switch to new prefix removal methods 26734e9567589d75cdd99e404eabf11d5a97d975

New methods allows to call `remove_prefix` with limit multiple times
in the same block
However, we don't use prefix removal limits, so upgrade is
straightforward

Upstream-Change: https://github.com/paritytech/substrate/pull/11490

- build: Upgrade polkadot to v0.9.25 cdfb9bdc7b205ff1b5134f034ef9973d769e5e6b

## [0.1.2] - 2022-07-25
### Changed
- New `token_uri` retrieval logic:

      If the collection has a `url` property and it is not empty, it is returned.
      Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.

      If the property `baseURI` is empty or absent, return "" (empty string)
      otherwise, if property `suffix` present and is non-empty, return concatenation of baseURI and suffix
      otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).

## [0.1.1] - 2022-07-14
### Added

- Implementation of RPC method `token_owners`.
   For reasons of compatibility with this pallet, returns only one owner if token exists.
   This was an internal request to improve the web interface and support fractionalization event.
