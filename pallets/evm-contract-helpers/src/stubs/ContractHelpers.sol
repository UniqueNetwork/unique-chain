// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Anonymous struct
struct Tuple0 {
	address field_0;
	uint256 field_1;
}

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

// Selector: 06fc42e9
contract ContractHelpers is Dummy, ERC165 {
	// Selector: contractOwner(address) 5152b14c
	function contractOwner(address contractAddress)
		public
		view
		returns (address)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: setSponsor(address,address) f01fba93
	function setSponsor(address contractAddress, address sponsor) public {
		require(false, stub_error);
		contractAddress;
		sponsor;
		dummy = 0;
	}

	// Selector: confirmSponsorship(address) abc00001
	function confirmSponsorship(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	// Selector: getSponsor(address) 743fc745
	function getSponsor(address contractAddress)
		public
		view
		returns (Tuple0 memory)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return Tuple0(0x0000000000000000000000000000000000000000, 0);
	}

	// Selector: hasSponsor(address) 97418603
	function hasSponsor(address contractAddress) public view returns (bool) {
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	// Selector: hasPendingSponsor(address) 39b9b242
	function hasPendingSponsor(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	// Selector: sponsoringEnabled(address) 6027dc61
	function sponsoringEnabled(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	// Selector: setSponsoringMode(address,uint8) fde8a560
	function setSponsoringMode(address contractAddress, uint8 mode) public {
		require(false, stub_error);
		contractAddress;
		mode;
		dummy = 0;
	}

	// Selector: sponsoringMode(address) b70c7267
	function sponsoringMode(address contractAddress)
		public
		view
		returns (uint8)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return 0;
	}

	// Selector: setSponsoringRateLimit(address,uint32) 77b6c908
	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		public
	{
		require(false, stub_error);
		contractAddress;
		rateLimit;
		dummy = 0;
	}

	// Selector: getSponsoringRateLimit(address) 610cfabd
	function getSponsoringRateLimit(address contractAddress)
		public
		view
		returns (uint32)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return 0;
	}

	// Selector: allowed(address,address) 5c658165
	function allowed(address contractAddress, address user)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		user;
		dummy;
		return false;
	}

	// Selector: allowlistEnabled(address) c772ef6c
	function allowlistEnabled(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	// Selector: toggleAllowlist(address,bool) 36de20f5
	function toggleAllowlist(address contractAddress, bool enabled) public {
		require(false, stub_error);
		contractAddress;
		enabled;
		dummy = 0;
	}

	// Selector: toggleAllowed(address,address,bool) 4706cc1c
	function toggleAllowed(
		address contractAddress,
		address user,
		bool allowed
	) public {
		require(false, stub_error);
		contractAddress;
		user;
		allowed;
		dummy = 0;
	}
}
