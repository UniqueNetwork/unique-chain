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

// Selector: ffe4da23
contract Collection is Dummy, ERC165 {
	// Set collection property.
	//
	// @param key Property key.
	// @param value Propery value.
	//
	// Selector: setCollectionProperty(string,bytes) 2f073f66
	function setCollectionProperty(string memory key, bytes memory value)
		public
	{
		require(false, stub_error);
		key;
		value;
		dummy = 0;
	}

	// Delete collection property.
	//
	// @param key Property key.
	//
	// Selector: deleteCollectionProperty(string) 7b7debce
	function deleteCollectionProperty(string memory key) public {
		require(false, stub_error);
		key;
		dummy = 0;
	}

	// Get collection property.
	//
	// @dev Throws error if key not found.
	//
	// @param key Property key.
	// @return bytes The property corresponding to the key.
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

	// Set the sponsor of the collection.
	//
	// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	//
	// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	//
	// Selector: setCollectionSponsor(address) 7623402e
	function setCollectionSponsor(address sponsor) public {
		require(false, stub_error);
		sponsor;
		dummy = 0;
	}

	// Collection sponsorship confirmation.
	//
	// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	//
	// Selector: confirmCollectionSponsorship() 3c50e97a
	function confirmCollectionSponsorship() public {
		require(false, stub_error);
		dummy = 0;
	}

	// Set limits for the collection.
	// @dev Throws error if limit not found.
	// @param limit Name of the limit. Valid names:
	// 	"accountTokenOwnershipLimit",
	// 	"sponsoredDataSize",
	// 	"sponsoredDataRateLimit",
	// 	"tokenLimit",
	// 	"sponsorTransferTimeout",
	// 	"sponsorApproveTimeout"
	// @param value Value of the limit.
	//
	// Selector: setCollectionLimit(string,uint32) 6a3841db
	function setCollectionLimit(string memory limit, uint32 value) public {
		require(false, stub_error);
		limit;
		value;
		dummy = 0;
	}

	// Set limits for the collection.
	// @dev Throws error if limit not found.
	// @param limit Name of the limit. Valid names:
	// 	"ownerCanTransfer",
	// 	"ownerCanDestroy",
	// 	"transfersEnabled"
	// @param value Value of the limit.
	//
	// Selector: setCollectionLimit(string,bool) 993b7fba
	function setCollectionLimit(string memory limit, bool value) public {
		require(false, stub_error);
		limit;
		value;
		dummy = 0;
	}

	// Get contract address.
	//
	// Selector: contractAddress() f6b4dfb4
	function contractAddress() public view returns (address) {
		require(false, stub_error);
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Add collection admin by substrate address.
	// @param new_admin Substrate administrator address.
	//
	// Selector: addCollectionAdminSubstrate(uint256) 5730062b
	function addCollectionAdminSubstrate(uint256 newAdmin) public {
		require(false, stub_error);
		newAdmin;
		dummy = 0;
	}

	// Remove collection admin by substrate address.
	// @param admin Substrate administrator address.
	//
	// Selector: removeCollectionAdminSubstrate(uint256) 4048fcf9
	function removeCollectionAdminSubstrate(uint256 admin) public {
		require(false, stub_error);
		admin;
		dummy = 0;
	}

	// Add collection admin.
	// @param new_admin Address of the added administrator.
	//
	// Selector: addCollectionAdmin(address) 92e462c7
	function addCollectionAdmin(address newAdmin) public {
		require(false, stub_error);
		newAdmin;
		dummy = 0;
	}

	// Remove collection admin.
	//
	// @param new_admin Address of the removed administrator.
	//
	// Selector: removeCollectionAdmin(address) fafd7b42
	function removeCollectionAdmin(address admin) public {
		require(false, stub_error);
		admin;
		dummy = 0;
	}

	// Toggle accessibility of collection nesting.
	//
	// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	//
	// Selector: setCollectionNesting(bool) 112d4586
	function setCollectionNesting(bool enable) public {
		require(false, stub_error);
		enable;
		dummy = 0;
	}

	// Toggle accessibility of collection nesting.
	//
	// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	// @param collections Addresses of collections that will be available for nesting.
	//
	// Selector: setCollectionNesting(bool,address[]) 64872396
	function setCollectionNesting(bool enable, address[] memory collections)
		public
	{
		require(false, stub_error);
		enable;
		collections;
		dummy = 0;
	}

	// Set the collection access method.
	// @param mode Access mode
	// 	0 for Normal
	// 	1 for AllowList
	//
	// Selector: setCollectionAccess(uint8) 41835d4c
	function setCollectionAccess(uint8 mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}

	// Add the user to the allowed list.
	//
	// @param user Address of a trusted user.
	//
	// Selector: addToCollectionAllowList(address) 67844fe6
	function addToCollectionAllowList(address user) public {
		require(false, stub_error);
		user;
		dummy = 0;
	}

	// Remove the user from the allowed list.
	//
	// @param user Address of a removed user.
	//
	// Selector: removeFromCollectionAllowList(address) 85c51acb
	function removeFromCollectionAllowList(address user) public {
		require(false, stub_error);
		user;
		dummy = 0;
	}

	// Switch permission for minting.
	//
	// @param mode Enable if "true".
	//
	// Selector: setCollectionMintMode(bool) 00018e84
	function setCollectionMintMode(bool mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}

	// Check that account is the owner or admin of the collection
	//
	// @param user account to verify
	// @return "true" if account is the owner or admin
	//
	// Selector: isOwnerOrAdmin(address) 9811b0c7
	function isOwnerOrAdmin(address user) public view returns (bool) {
		require(false, stub_error);
		user;
		dummy;
		return false;
	}

	// Check that substrate account is the owner or admin of the collection
	//
	// @param user account to verify
	// @return "true" if account is the owner or admin
	//
	// Selector: isOwnerOrAdminSubstrate(uint256) 68910e00
	function isOwnerOrAdminSubstrate(uint256 user) public view returns (bool) {
		require(false, stub_error);
		user;
		dummy;
		return false;
	}

	// Returns collection type
	//
	// @return `Fungible` or `NFT` or `ReFungible`
	//
	// Selector: uniqueCollectionType() d34b55b8
	function uniqueCollectionType() public returns (string memory) {
		require(false, stub_error);
		dummy = 0;
		return "";
	}

	// Changes collection owner to another account
	//
	// @dev Owner can be changed only by current owner
	// @param newOwner new owner account
	//
	// Selector: setOwner(address) 13af4035
	function setOwner(address newOwner) public {
		require(false, stub_error);
		newOwner;
		dummy = 0;
	}

	// Changes collection owner to another substrate account
	//
	// @dev Owner can be changed only by current owner
	// @param newOwner new owner substrate account
	//
	// Selector: setOwnerSubstrate(uint256) b212138f
	function setOwnerSubstrate(uint256 newOwner) public {
		require(false, stub_error);
		newOwner;
		dummy = 0;
	}
}

contract UniqueFungible is
	Dummy,
	ERC165,
	ERC20,
	ERC20UniqueExtensions,
	Collection
{}
