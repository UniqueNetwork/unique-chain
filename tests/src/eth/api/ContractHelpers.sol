// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Anonymous struct
struct Tuple0 {
	address field_0;
	uint256 field_1;
}

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Selector: 06fc42e9
interface ContractHelpers is Dummy, ERC165 {
	// Selector: contractOwner(address) 5152b14c
	function contractOwner(address contractAddress)
		external
		view
		returns (address);

	// Selector: setSponsor(address,address) f01fba93
	function setSponsor(address contractAddress, address sponsor) external;

	// Selector: confirmSponsorship(address) abc00001
	function confirmSponsorship(address contractAddress) external;

	// Selector: getSponsor(address) 743fc745
	function getSponsor(address contractAddress)
		external
		view
		returns (Tuple0 memory);

	// Selector: hasSponsor(address) 97418603
	function hasSponsor(address contractAddress) external view returns (bool);

	// Selector: hasPendingSponsor(address) 39b9b242
	function hasPendingSponsor(address contractAddress)
		external
		view
		returns (bool);

	// Selector: sponsoringEnabled(address) 6027dc61
	function sponsoringEnabled(address contractAddress)
		external
		view
		returns (bool);

	// Selector: setSponsoringMode(address,uint8) fde8a560
	function setSponsoringMode(address contractAddress, uint8 mode) external;

	// Selector: sponsoringMode(address) b70c7267
	function sponsoringMode(address contractAddress)
		external
		view
		returns (uint8);

	// Selector: setSponsoringRateLimit(address,uint32) 77b6c908
	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		external;

	// Selector: getSponsoringRateLimit(address) 610cfabd
	function getSponsoringRateLimit(address contractAddress)
		external
		view
		returns (uint32);

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
