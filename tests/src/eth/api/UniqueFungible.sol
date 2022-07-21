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
	// Set collection property.
	//
	// @param key Property key.
	// @param value Propery value.
	//
	// Selector: setCollectionProperty(string,bytes) 2f073f66
	function setCollectionProperty(string memory key, bytes memory value)
		external;

	// Delete collection property.
	//
	// @param key Property key.
	//
	// Selector: deleteCollectionProperty(string) 7b7debce
	function deleteCollectionProperty(string memory key) external;

	// Get collection property.
	//
	// @dev Throws error if key not found.
	//
	// @param key Property key.
	// @return bytes The property corresponding to the key.
	//
	// Selector: collectionProperty(string) cf24fd6d
	function collectionProperty(string memory key)
		external
		view
		returns (bytes memory);

	// Set the sponsor of the collection.
	//
	// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	//
	// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	//
	// Selector: setCollectionSponsor(address) 7623402e
	function setCollectionSponsor(address sponsor) external;

	// Collection sponsorship confirmation.
	//
	// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	//
	// Selector: confirmCollectionSponsorship() 3c50e97a
	function confirmCollectionSponsorship() external;

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
	function setCollectionLimit(string memory limit, uint32 value) external;

	// Set limits for the collection.
	// @dev Throws error if limit not found.
	// @param limit Name of the limit. Valid names:
	// 	"ownerCanTransfer",
	// 	"ownerCanDestroy",
	// 	"transfersEnabled"
	// @param value Value of the limit.
	//
	// Selector: setCollectionLimit(string,bool) 993b7fba
	function setCollectionLimit(string memory limit, bool value) external;

	// Get contract address.
	//
	// Selector: contractAddress() f6b4dfb4
	function contractAddress() external view returns (address);

	// Add collection admin by substrate address.
	// @param new_admin Substrate administrator address.
	//
	// Selector: addCollectionAdminSubstrate(uint256) 5730062b
	function addCollectionAdminSubstrate(uint256 newAdmin) external;

	// Remove collection admin by substrate address.
	// @param admin Substrate administrator address.
	//
	// Selector: removeCollectionAdminSubstrate(uint256) 4048fcf9
	function removeCollectionAdminSubstrate(uint256 admin) external;

	// Add collection admin.
	// @param new_admin Address of the added administrator.
	//
	// Selector: addCollectionAdmin(address) 92e462c7
	function addCollectionAdmin(address newAdmin) external;

	// Remove collection admin.
	//
	// @param new_admin Address of the removed administrator.
	//
	// Selector: removeCollectionAdmin(address) fafd7b42
	function removeCollectionAdmin(address admin) external;

	// Toggle accessibility of collection nesting.
	//
	// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	//
	// Selector: setCollectionNesting(bool) 112d4586
	function setCollectionNesting(bool enable) external;

	// Toggle accessibility of collection nesting.
	//
	// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	// @param collections Addresses of collections that will be available for nesting.
	//
	// Selector: setCollectionNesting(bool,address[]) 64872396
	function setCollectionNesting(bool enable, address[] memory collections)
		external;

	// Set the collection access method.
	// @param mode Access mode
	// 	0 for Normal
	// 	1 for AllowList
	//
	// Selector: setCollectionAccess(uint8) 41835d4c
	function setCollectionAccess(uint8 mode) external;

	// Add the user to the allowed list.
	//
	// @param user Address of a trusted user.
	//
	// Selector: addToCollectionAllowList(address) 67844fe6
	function addToCollectionAllowList(address user) external;

	// Remove the user from the allowed list.
	//
	// @param user Address of a removed user.
	//
	// Selector: removeFromCollectionAllowList(address) 85c51acb
	function removeFromCollectionAllowList(address user) external;

	// Switch permission for minting.
	//
	// @param mode Enable if "true".
	//
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

interface UniqueFungible is
	Dummy,
	ERC165,
	ERC20,
	ERC20UniqueExtensions,
	Collection
{}
