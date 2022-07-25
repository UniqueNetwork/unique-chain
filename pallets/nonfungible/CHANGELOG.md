# Change Log

All notable changes to this project will be documented in this file.

## [0.1.2] - 2022-07-25
### Changed
- New alghoritm for retrieving `token_iri`.

## [0.1.1] - 2022-07-14
### Added

- Implementation of RPC method `token_owners`.
   For reasons of compatibility with this pallet, returns only one owner if token exists.
   This was an internal request to improve the web interface and support fractionalization event. 
