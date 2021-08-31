// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

contract ContractHelpers is Dummy {
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

	function toggleSponsoring(address contractAddress, bool enabled) public {
		require(false, stub_error);
		contractAddress;
		enabled;
		dummy = 0;
	}

	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		public
	{
		require(false, stub_error);
		contractAddress;
		rateLimit;
		dummy = 0;
	}

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

	function toggleAllowlist(address contractAddress, bool enabled) public {
		require(false, stub_error);
		contractAddress;
		enabled;
		dummy = 0;
	}

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
