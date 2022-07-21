// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Inline
interface CollectionHelpersEvents {
	event CollectionCreated(
		address indexed owner,
		address indexed collectionId
	);
}

// Selector: 86a0d929
interface CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
	// Selector: createNonfungibleCollection(string,string,string) e34a6844
	function createNonfungibleCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external returns (address);

	// Selector: createERC721MetadataCompatibleCollection(string,string,string,string) a634a5f9
	function createERC721MetadataCompatibleCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix,
		string memory baseUri
	) external returns (address);

	// Selector: isCollectionExist(address) c3de1494
	function isCollectionExist(address collectionAddress)
		external
		view
		returns (bool);
}
