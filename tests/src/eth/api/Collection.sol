// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Selector: d32d5104
interface Collection is Dummy, ERC165 {
	// Selector: create721Collection(string,string,string) 951c0151
	function create721Collection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external view returns (address);

	// Selector: setSponsor(address,address) f01fba93
	function setSponsor(address collectionAddress, address sponsor)
		external
		view;

	// Selector: confirmSponsorship(address) abc00001
	function confirmSponsorship(address collectionAddress) external view;

	// Selector: setOffchainShema(address,string) d7dc2de3
	function setOffchainShema(address collectionAddress, string memory shema)
		external
		view;

	// Selector: setVariableOnChainSchema(address,string) 582691c3
	function setVariableOnChainSchema(
		address collectionAddress,
		string memory variable
	) external view;

	// Selector: setConstOnChainSchema(address,string) 921456e7
	function setConstOnChainSchema(
		address collectionAddress,
		string memory constOnChain
	) external view;
}
