// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

contract ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID)
		external
		view
		returns (bool)
	{
		require(false, stub_error);
		interfaceID;
		return true;
	}
}

// Inline
contract CollectionHelpersEvents {
	event CollectionCreated(
		address indexed owner,
		address indexed collectionId
	);
}

// Selector: 675f3074
contract CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
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
	) public returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: createERC721MetadataCompatibleCollection(string,string,string,string) a634a5f9
	function createERC721MetadataCompatibleCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix,
		string memory baseUri
	) public returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		baseUri;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: createRefungibleCollection(string,string,string) 44a68ad5
	function createRefungibleCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) public view returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: createERC721MetadataCompatibleRFTCollection(string,string,string,string) a5596388
	function createERC721MetadataCompatibleRFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix,
		string memory baseUri
	) public returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		baseUri;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	// Check if a collection exists
	// @param collection_address Address of the collection in question
	// @return bool Does the collection exist?
	//
	// Selector: isCollectionExist(address) c3de1494
	function isCollectionExist(address collectionAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		collectionAddress;
		dummy;
		return false;
	}
}
