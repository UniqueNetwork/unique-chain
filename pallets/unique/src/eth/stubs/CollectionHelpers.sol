// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

contract ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool) {
		require(false, stub_error);
		interfaceID;
		return true;
	}
}

/// @dev inlined interface
contract CollectionHelpersEvents {
	event CollectionCreated(address indexed owner, address indexed collectionId);
	event CollectionDestroyed(address indexed collectionId);
}

/// @title Contract, which allows users to operate with collections
/// @dev the ERC-165 identifier for this interface is 0xe65011aa
contract CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	/// @dev EVM selector for this function is: 0x844af658,
	///  or in textual repr: createNFTCollection(string,string,string)
	function createNFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) public payable returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	// /// Create an NFT collection
	// /// @param name Name of the collection
	// /// @param description Informative description of the collection
	// /// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	// /// @return address Address of the newly created collection
	// /// @dev EVM selector for this function is: 0xe34a6844,
	// ///  or in textual repr: createNonfungibleCollection(string,string,string)
	// function createNonfungibleCollection(string memory name, string memory description, string memory tokenPrefix) public payable returns (address) {
	// 	require(false, stub_error);
	// 	name;
	// 	description;
	// 	tokenPrefix;
	// 	dummy = 0;
	// 	return 0x0000000000000000000000000000000000000000;
	// }

	/// @dev EVM selector for this function is: 0xab173450,
	///  or in textual repr: createRFTCollection(string,string,string)
	function createRFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) public payable returns (address) {
		require(false, stub_error);
		name;
		description;
		tokenPrefix;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	/// @dev EVM selector for this function is: 0x7335b79f,
	///  or in textual repr: createFTCollection(string,uint8,string,string)
	function createFTCollection(
		string memory name,
		uint8 decimals,
		string memory description,
		string memory tokenPrefix
	) public payable returns (address) {
		require(false, stub_error);
		name;
		decimals;
		description;
		tokenPrefix;
		dummy = 0;
		return 0x0000000000000000000000000000000000000000;
	}

	/// @dev EVM selector for this function is: 0x85624258,
	///  or in textual repr: makeCollectionERC721MetadataCompatible(address,string)
	function makeCollectionERC721MetadataCompatible(address collection, string memory baseUri) public {
		require(false, stub_error);
		collection;
		baseUri;
		dummy = 0;
	}

	/// @dev EVM selector for this function is: 0x564e321f,
	///  or in textual repr: destroyCollection(address)
	function destroyCollection(address collectionAddress) public {
		require(false, stub_error);
		collectionAddress;
		dummy = 0;
	}

	/// Check if a collection exists
	/// @param collectionAddress Address of the collection in question
	/// @return bool Does the collection exist?
	/// @dev EVM selector for this function is: 0xc3de1494,
	///  or in textual repr: isCollectionExist(address)
	function isCollectionExist(address collectionAddress) public view returns (bool) {
		require(false, stub_error);
		collectionAddress;
		dummy;
		return false;
	}

	/// @dev EVM selector for this function is: 0xd23a7ab1,
	///  or in textual repr: collectionCreationFee()
	function collectionCreationFee() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	/// Returns address of a collection.
	/// @param collectionId  - CollectionId  of the collection
	/// @return eth mirror address of the collection
	/// @dev EVM selector for this function is: 0x2e716683,
	///  or in textual repr: collectionAddress(uint32)
	function collectionAddress(uint32 collectionId) public view returns (address) {
		require(false, stub_error);
		collectionId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	/// Returns collectionId of a collection.
	/// @param collectionAddress  - Eth address of the collection
	/// @return collectionId of the collection
	/// @dev EVM selector for this function is: 0xb5cb7498,
	///  or in textual repr: collectionId(address)
	function collectionId(address collectionAddress) public view returns (uint32) {
		require(false, stub_error);
		collectionAddress;
		dummy;
		return 0;
	}
}
