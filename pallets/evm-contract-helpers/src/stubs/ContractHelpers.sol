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

// Selector: 6073d917
contract ContractHelpers is Dummy, ERC165 {
	// Get contract ovner
	//
	// @param Contract_address contract for which the owner is being determined.
	// @return Contract owner.
	//
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

	// Set sponsor.
	//
	// @param contract_address Contract for which a sponsor is being established.
	// @param sponsor User address who set as pending sponsor.
	//
	// Selector: setSponsor(address,address) f01fba93
	function setSponsor(address contractAddress, address sponsor) public {
		require(false, stub_error);
		contractAddress;
		sponsor;
		dummy = 0;
	}

	// Set contract as self sponsored.
	//
	// @param contract_address Contract for which a self sponsoring is being enabled.
	//
	// Selector: selfSponsoredEnable(address) 89f7d9ae
	function selfSponsoredEnable(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	// Remove sponsor.
	//
	// @param contract_address Contract for which a sponsorship is being removed.
	//
	// Selector: removeSponsor(address) ef784250
	function removeSponsor(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	// Confirm sponsorship.
	//
	// @dev Caller must be same that set via [`set_sponsor`].
	//
	// @param contract_address Сontract for which need to confirm sponsorship.
	//
	// Selector: confirmSponsorship(address) abc00001
	function confirmSponsorship(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	// Get current sponsor.
	//
	// @param contract_address The contract for which a sponsor is requested.
	// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	//
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

	// Check tat contract has confirmed sponsor.
	//
	// @param contract_address The contract for which the presence of a confirmed sponsor is checked.
	// @return **true** if contract has confirmed sponsor.
	//
	// Selector: hasSponsor(address) 97418603
	function hasSponsor(address contractAddress) public view returns (bool) {
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	// Check tat contract has pending sponsor.
	//
	// @param contract_address The contract for which the presence of a pending sponsor is checked.
	// @return **true** if contract has pending sponsor.
	//
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
