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

// Selector: 6073d917
interface ContractHelpers is Dummy, ERC165 {
	// Get contract ovner
	//
	// @param Contract_address contract for which the owner is being determined.
	// @return Contract owner.
	//
	// Selector: contractOwner(address) 5152b14c
	function contractOwner(address contractAddress)
		external
		view
		returns (address);

	// Set sponsor.
	//
	// @param contract_address Contract for which a sponsor is being established.
	// @param sponsor User address who set as pending sponsor.
	//
	// Selector: setSponsor(address,address) f01fba93
	function setSponsor(address contractAddress, address sponsor) external;

	// Set contract as self sponsored.
	//
	// @param contract_address Contract for which a self sponsoring is being enabled.
	//
	// Selector: selfSponsoredEnable(address) 89f7d9ae
	function selfSponsoredEnable(address contractAddress) external;

	// Remove sponsor.
	//
	// @param contract_address Contract for which a sponsorship is being removed.
	//
	// Selector: removeSponsor(address) ef784250
	function removeSponsor(address contractAddress) external;

	// Confirm sponsorship.
	//
	// @dev Caller must be same that set via [`set_sponsor`].
	//
	// @param contract_address Сontract for which need to confirm sponsorship.
	//
	// Selector: confirmSponsorship(address) abc00001
	function confirmSponsorship(address contractAddress) external;

	// Get current sponsor.
	//
	// @param contract_address The contract for which a sponsor is requested.
	// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	//
	// Selector: getSponsor(address) 743fc745
	function getSponsor(address contractAddress)
		external
		view
		returns (Tuple0 memory);

	// Check tat contract has confirmed sponsor.
	//
	// @param contract_address The contract for which the presence of a confirmed sponsor is checked.
	// @return **true** if contract has confirmed sponsor.
	//
	// Selector: hasSponsor(address) 97418603
	function hasSponsor(address contractAddress) external view returns (bool);

	// Check tat contract has pending sponsor.
	//
	// @param contract_address The contract for which the presence of a pending sponsor is checked.
	// @return **true** if contract has pending sponsor.
	//
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
