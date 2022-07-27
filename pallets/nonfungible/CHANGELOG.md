# Change Log

All notable changes to this project will be documented in this file.

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
