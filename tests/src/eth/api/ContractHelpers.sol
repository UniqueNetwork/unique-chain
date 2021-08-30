// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ContractHelpers is Dummy {
	function contractOwner(address contractAddress)
		external
		view
		returns (address);

	function sponsoringEnabled(address contractAddress)
		external
		view
		returns (bool);

	function toggleSponsoring(address contractAddress, bool enabled) external;

	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		external;

	function allowed(address contractAddress, address user)
		external
		view
		returns (bool);

	function allowlistEnabled(address contractAddress)
		external
		view
		returns (bool);

	function toggleAllowlist(address contractAddress, bool enabled) external;

	function toggleAllowed(
		address contractAddress,
		address user,
		bool allowed
	) external;
}
