// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ContractHelpers is Dummy {
	// Selector: contractOwner(address) 5152b14c
	function contractOwner(address contractAddress)
		external
		view
		returns (address);

	// Selector: sponsoringEnabled(address) 6027dc61
	function sponsoringEnabled(address contractAddress)
		external
		view
		returns (bool);

	// Selector: toggleSponsoring(address,bool) fcac6d86
	function toggleSponsoring(address contractAddress, bool enabled) external;

	// Selector: setSponsoringRateLimit(address,uint32) 77b6c908
	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		external;

	// Selector: allowed(address,address) 5c658165
	function allowed(address contractAddress, address user)
		external
		view
		returns (bool);

	// Selector: allowlistEnabled(address) c772ef6c
	function allowlistEnabled(address contractAddress)
		external
		view
		returns (bool);

	// Selector: toggleAllowlist(address,bool) 36de20f5
	function toggleAllowlist(address contractAddress, bool enabled) external;

	// Selector: toggleAllowed(address,address,bool) 4706cc1c
	function toggleAllowed(
		address contractAddress,
		address user,
		bool allowed
	) external;
}
