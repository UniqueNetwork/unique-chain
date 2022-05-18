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

// Selector: 15cc740e
contract Collection is Dummy, ERC165 {
	// Selector: setSponsor(address) 59753fb1
	function setSponsor(address sponsor) public view {
		require(false, stub_error);
		sponsor;
		dummy;
	}

	// Selector: confirmSponsorship() c8c6a056
	function confirmSponsorship() public view {
		require(false, stub_error);
		dummy;
	}

	// Selector: setLimits(string) 72cb345d
	function setLimits(string memory limitsJson) public view {
		require(false, stub_error);
		limitsJson;
		dummy;
	}

	// Selector: contractAddress() f6b4dfb4
	function contractAddress() public view returns (address) {
		require(false, stub_error);
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
}
