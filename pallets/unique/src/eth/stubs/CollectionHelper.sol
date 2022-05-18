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

// Selector: 951c0151
contract CollectionHelper is Dummy, ERC165 {
	// Selector: create721Collection(string,string,string) 951c0151
	function create721Collection(
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
}
