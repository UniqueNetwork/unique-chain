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

// Selector: 675f3074
interface CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
	// Create an NFT collection
	// @param name Name of the collection
	// @param description Informative description of the collection
	// @param token_prefix Token prefix to represent the collection tokens in UI and user applications
	// @return address Address of the newly created collection
	//
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

	// Selector: createRefungibleCollection(string,string,string) 44a68ad5
	function createRefungibleCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external view returns (address);

	// Selector: createERC721MetadataCompatibleRFTCollection(string,string,string,string) a5596388
	function createERC721MetadataCompatibleRFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix,
		string memory baseUri
	) external returns (address);

	// Check if a collection exists
	// @param collection_address Address of the collection in question
	// @return bool Does the collection exist?
	//
	// Selector: isCollectionExist(address) c3de1494
	function isCollectionExist(address collectionAddress)
		external
		view
		returns (bool);
}
