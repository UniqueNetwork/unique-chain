// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

contract ContractHelpers is Dummy {
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

	// Selector: toggleSponsoring(address,bool) fcac6d86
	function toggleSponsoring(address contractAddress, bool enabled) public {
		require(false, stub_error);
		contractAddress;
		enabled;
		dummy = 0;
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
