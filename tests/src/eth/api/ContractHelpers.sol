// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ContractHelpers is Dummy {
	function contractOwner(address contr) external view returns (address);

	function sponsoringEnabled(address contr) external view returns (bool);

	function toggleSponsoring(address contr, bool enabled) external;

	function setSponsoringRateLimit(address contr, uint32 rateLimit) external;

	function allowed(address contr, address user) external view returns (bool);

	function allowlistEnabled(address contr) external view returns (bool);

	function toggleAllowlist(address contr, bool enabled) external;

	function toggleAllowed(
		address contr,
		address user,
		bool allowed
	) external;
}
