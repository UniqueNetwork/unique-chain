// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Selector: 56c215c5
interface CollectionHelper is Dummy, ERC165 {
	// Selector: create721Collection(string,string,string) 951c0151
	function create721Collection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external view returns (address);

	// Selector: isCollectionExist(address) c3de1494
	function isCollectionExist(address collectionAddress)
		external
		view
		returns (bool);
}
