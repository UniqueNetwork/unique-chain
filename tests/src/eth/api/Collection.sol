// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Selector: 15cc740e
interface Collection is Dummy, ERC165 {
	// Selector: setSponsor(address) 59753fb1
	function setSponsor(address sponsor) external view;

	// Selector: confirmSponsorship() c8c6a056
	function confirmSponsorship() external view;

	// Selector: setLimits(string) 72cb345d
	function setLimits(string memory limitsJson) external view;

	// Selector: contractAddress() f6b4dfb4
	function contractAddress() external view returns (address);
}
