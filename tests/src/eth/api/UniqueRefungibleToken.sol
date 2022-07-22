// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Inline
interface ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(
		address indexed owner,
		address indexed spender,
		uint256 value
	);
}

// Selector: 79cc6790
interface ERC20UniqueExtensions is Dummy, ERC165 {
	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 amount) external returns (bool);
}

// Selector: 7d9262e6
interface Collection is Dummy, ERC165 {
	// Selector: setCollectionProperty(string,bytes) 2f073f66
	function setCollectionProperty(string memory key, bytes memory value)
		external;

	// Selector: deleteCollectionProperty(string) 7b7debce
	function deleteCollectionProperty(string memory key) external;

	// Throws error if key not found
	//
	// Selector: collectionProperty(string) cf24fd6d
	function collectionProperty(string memory key)
		external
		view
		returns (bytes memory);

	// Selector: setCollectionSponsor(address) 7623402e
	function setCollectionSponsor(address sponsor) external;

	// Selector: confirmCollectionSponsorship() 3c50e97a
	function confirmCollectionSponsorship() external;

	// Selector: setCollectionLimit(string,uint32) 6a3841db
	function setCollectionLimit(string memory limit, uint32 value) external;

	// Selector: setCollectionLimit(string,bool) 993b7fba
	function setCollectionLimit(string memory limit, bool value) external;

	// Selector: contractAddress() f6b4dfb4
	function contractAddress() external view returns (address);

	// Selector: addCollectionAdminSubstrate(uint256) 5730062b
	function addCollectionAdminSubstrate(uint256 newAdmin) external view;

	// Selector: removeCollectionAdminSubstrate(uint256) 4048fcf9
	function removeCollectionAdminSubstrate(uint256 newAdmin) external view;

	// Selector: addCollectionAdmin(address) 92e462c7
	function addCollectionAdmin(address newAdmin) external view;

	// Selector: removeCollectionAdmin(address) fafd7b42
	function removeCollectionAdmin(address admin) external view;

	// Selector: setCollectionNesting(bool) 112d4586
	function setCollectionNesting(bool enable) external;

	// Selector: setCollectionNesting(bool,address[]) 64872396
	function setCollectionNesting(bool enable, address[] memory collections)
		external;

	// Selector: setCollectionAccess(uint8) 41835d4c
	function setCollectionAccess(uint8 mode) external;

	// Selector: addToCollectionAllowList(address) 67844fe6
	function addToCollectionAllowList(address user) external view;

	// Selector: removeFromCollectionAllowList(address) 85c51acb
	function removeFromCollectionAllowList(address user) external view;

	// Selector: setCollectionMintMode(bool) 00018e84
	function setCollectionMintMode(bool mode) external;
}

// Selector: 942e8b22
interface ERC20 is Dummy, ERC165, ERC20Events {
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);

	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);

	// Selector: decimals() 313ce567
	function decimals() external view returns (uint8);

	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) external view returns (uint256);

	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 amount) external returns (bool);

	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) external returns (bool);

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address spender, uint256 amount) external returns (bool);

	// Selector: allowance(address,address) dd62ed3e
	function allowance(address owner, address spender)
		external
		view
		returns (uint256);
}

interface UniqueRFT is Dummy, ERC165, Collection {}

interface UniqueRefungibleToken is
	Dummy,
	ERC165,
	ERC20,
	ERC20UniqueExtensions,
	UniqueRFT
{}
