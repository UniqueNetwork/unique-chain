// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
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

/// @dev inlined interface
contract CollectionHelpersEvents {
	event CollectionCreated(
		address indexed owner,
		address indexed collectionId
	);
}

/// @title Contract, which allows users to operate with collections
/// @dev the ERC-165 identifier for this interface is 0x675f3074
contract CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	/// @dev EVM selector for this function is: 0xe34a6844,
	///  or in textual repr: createNonfungibleCollection(string,string,string)
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

	/// @dev EVM selector for this function is: 0xa634a5f9,
	///  or in textual repr: createERC721MetadataCompatibleCollection(string,string,string,string)
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

	/// @dev EVM selector for this function is: 0x44a68ad5,
	///  or in textual repr: createRefungibleCollection(string,string,string)
	function createRefungibleCollection(
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

	/// @dev EVM selector for this function is: 0xa5596388,
	///  or in textual repr: createERC721MetadataCompatibleRFTCollection(string,string,string,string)
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

	/// Check if a collection exists
	/// @param collectionAddress Address of the collection in question
	/// @return bool Does the collection exist?
	/// @dev EVM selector for this function is: 0xc3de1494,
	///  or in textual repr: isCollectionExist(address)
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
