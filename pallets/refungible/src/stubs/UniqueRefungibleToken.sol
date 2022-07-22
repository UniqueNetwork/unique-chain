// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

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

// Inline
contract ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(
		address indexed owner,
		address indexed spender,
		uint256 value
	);
}

// Selector: 79cc6790
contract ERC20UniqueExtensions is Dummy, ERC165 {
	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 amount) public returns (bool) {
		require(false, stub_error);
		from;
		amount;
		dummy = 0;
		return false;
	}
}

// Selector: 7d9262e6
contract Collection is Dummy, ERC165 {
	// Selector: setCollectionProperty(string,bytes) 2f073f66
	function setCollectionProperty(string memory key, bytes memory value)
		public
	{
		require(false, stub_error);
		key;
		value;
		dummy = 0;
	}

	// Selector: deleteCollectionProperty(string) 7b7debce
	function deleteCollectionProperty(string memory key) public {
		require(false, stub_error);
		key;
		dummy = 0;
	}

	// Throws error if key not found
	//
	// Selector: collectionProperty(string) cf24fd6d
	function collectionProperty(string memory key)
		public
		view
		returns (bytes memory)
	{
		require(false, stub_error);
		key;
		dummy;
		return hex"";
	}

	// Selector: setCollectionSponsor(address) 7623402e
	function setCollectionSponsor(address sponsor) public {
		require(false, stub_error);
		sponsor;
		dummy = 0;
	}

	// Selector: confirmCollectionSponsorship() 3c50e97a
	function confirmCollectionSponsorship() public {
		require(false, stub_error);
		dummy = 0;
	}

	// Selector: setCollectionLimit(string,uint32) 6a3841db
	function setCollectionLimit(string memory limit, uint32 value) public {
		require(false, stub_error);
		limit;
		value;
		dummy = 0;
	}

	// Selector: setCollectionLimit(string,bool) 993b7fba
	function setCollectionLimit(string memory limit, bool value) public {
		require(false, stub_error);
		limit;
		value;
		dummy = 0;
	}

	// Selector: contractAddress() f6b4dfb4
	function contractAddress() public view returns (address) {
		require(false, stub_error);
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: addCollectionAdminSubstrate(uint256) 5730062b
	function addCollectionAdminSubstrate(uint256 newAdmin) public view {
		require(false, stub_error);
		newAdmin;
		dummy;
	}

	// Selector: removeCollectionAdminSubstrate(uint256) 4048fcf9
	function removeCollectionAdminSubstrate(uint256 newAdmin) public view {
		require(false, stub_error);
		newAdmin;
		dummy;
	}

	// Selector: addCollectionAdmin(address) 92e462c7
	function addCollectionAdmin(address newAdmin) public view {
		require(false, stub_error);
		newAdmin;
		dummy;
	}

	// Selector: removeCollectionAdmin(address) fafd7b42
	function removeCollectionAdmin(address admin) public view {
		require(false, stub_error);
		admin;
		dummy;
	}

	// Selector: setCollectionNesting(bool) 112d4586
	function setCollectionNesting(bool enable) public {
		require(false, stub_error);
		enable;
		dummy = 0;
	}

	// Selector: setCollectionNesting(bool,address[]) 64872396
	function setCollectionNesting(bool enable, address[] memory collections)
		public
	{
		require(false, stub_error);
		enable;
		collections;
		dummy = 0;
	}

	// Selector: setCollectionAccess(uint8) 41835d4c
	function setCollectionAccess(uint8 mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}

	// Selector: addToCollectionAllowList(address) 67844fe6
	function addToCollectionAllowList(address user) public view {
		require(false, stub_error);
		user;
		dummy;
	}

	// Selector: removeFromCollectionAllowList(address) 85c51acb
	function removeFromCollectionAllowList(address user) public view {
		require(false, stub_error);
		user;
		dummy;
	}

	// Selector: setCollectionMintMode(bool) 00018e84
	function setCollectionMintMode(bool mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}
}

// Selector: 942e8b22
contract ERC20 is Dummy, ERC165, ERC20Events {
	// Selector: name() 06fdde03
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	// Selector: symbol() 95d89b41
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	// Selector: totalSupply() 18160ddd
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// Selector: decimals() 313ce567
	function decimals() public view returns (uint8) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}

	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) public returns (bool) {
		require(false, stub_error);
		from;
		to;
		amount;
		dummy = 0;
		return false;
	}

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address spender, uint256 amount) public returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		dummy = 0;
		return false;
	}

	// Selector: allowance(address,address) dd62ed3e
	function allowance(address owner, address spender)
		public
		view
		returns (uint256)
	{
		require(false, stub_error);
		owner;
		spender;
		dummy;
		return 0;
	}
}

contract UniqueRFT is Dummy, ERC165, Collection {}

contract UniqueRefungibleToken is
	Dummy,
	ERC165,
	ERC20,
	ERC20UniqueExtensions,
	UniqueRFT
{}
