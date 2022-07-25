// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Anonymous struct
struct Tuple0 {
	uint256 field_0;
	string field_1;
}

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

// Inline
interface ERC721Events {
	event Transfer(
		address indexed from,
		address indexed to,
		uint256 indexed tokenId
	);
	event Approval(
		address indexed owner,
		address indexed approved,
		uint256 indexed tokenId
	);
	event ApprovalForAll(
		address indexed owner,
		address indexed operator,
		bool approved
	);
}

// Inline
interface ERC721MintableEvents {
	event MintingFinished();
}

// Selector: 0784ee64
interface ERC721UniqueExtensions is Dummy, ERC165 {
	// @notice Returns next free RFT ID.
	//
	// Selector: nextTokenId() 75794a3c
	function nextTokenId() external view returns (uint256);

	// Selector: mintBulk(address,uint256[]) 44a9945e
	function mintBulk(address to, uint256[] memory tokenIds)
		external
		returns (bool);

	// Selector: mintBulkWithTokenURI(address,(uint256,string)[]) 36543006
	function mintBulkWithTokenURI(address to, Tuple0[] memory tokens)
		external
		returns (bool);
}

// Selector: 41369377
interface TokenProperties is Dummy, ERC165 {
	// Selector: setTokenPropertyPermission(string,bool,bool,bool) 222d97fa
	function setTokenPropertyPermission(
		string memory key,
		bool isMutable,
		bool collectionAdmin,
		bool tokenOwner
	) external;

	// Selector: setProperty(uint256,string,bytes) 1752d67b
	function setProperty(
		uint256 tokenId,
		string memory key,
		bytes memory value
	) external;

	// Selector: deleteProperty(uint256,string) 066111d1
	function deleteProperty(uint256 tokenId, string memory key) external;

	// Throws error if key not found
	//
	// Selector: property(uint256,string) 7228c327
	function property(uint256 tokenId, string memory key)
		external
		view
		returns (bytes memory);
}

// Selector: 42966c68
interface ERC721Burnable is Dummy, ERC165 {
	// @dev Not implemented
	//
	// Selector: burn(uint256) 42966c68
	function burn(uint256 tokenId) external;
}

// Selector: 58800161
interface ERC721 is Dummy, ERC165, ERC721Events {
	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) external view returns (uint256);

	// Selector: ownerOf(uint256) 6352211e
	function ownerOf(uint256 tokenId) external view returns (address);

	// @dev Not implemented
	//
	// Selector: safeTransferFromWithData(address,address,uint256,bytes) 60a11672
	function safeTransferFromWithData(
		address from,
		address to,
		uint256 tokenId,
		bytes memory data
	) external;

	// @dev Not implemented
	//
	// Selector: safeTransferFrom(address,address,uint256) 42842e0e
	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	// @dev Not implemented
	//
	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	// @dev Not implemented
	//
	// Selector: approve(address,uint256) 095ea7b3
	function approve(address approved, uint256 tokenId) external;

	// @dev Not implemented
	//
	// Selector: setApprovalForAll(address,bool) a22cb465
	function setApprovalForAll(address operator, bool approved) external;

	// @dev Not implemented
	//
	// Selector: getApproved(uint256) 081812fc
	function getApproved(uint256 tokenId) external view returns (address);

	// @dev Not implemented
	//
	// Selector: isApprovedForAll(address,address) e985e9c5
	function isApprovedForAll(address owner, address operator)
		external
		view
		returns (address);
}

// Selector: 5b5e139f
interface ERC721Metadata is Dummy, ERC165 {
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);

	// Returns token's const_metadata
	//
	// Selector: tokenURI(uint256) c87b56dd
	function tokenURI(uint256 tokenId) external view returns (string memory);
}

// Selector: 68ccfe89
interface ERC721Mintable is Dummy, ERC165, ERC721MintableEvents {
	// Selector: mintingFinished() 05d2035b
	function mintingFinished() external view returns (bool);

	// `token_id` should be obtained with `next_token_id` method,
	// unlike standard, you can't specify it manually
	//
	// Selector: mint(address,uint256) 40c10f19
	function mint(address to, uint256 tokenId) external returns (bool);

	// `token_id` should be obtained with `next_token_id` method,
	// unlike standard, you can't specify it manually
	//
	// Selector: mintWithTokenURI(address,uint256,string) 50bb4e7f
	function mintWithTokenURI(
		address to,
		uint256 tokenId,
		string memory tokenUri
	) external returns (bool);

	// @dev Not implemented
	//
	// Selector: finishMinting() 7d64bcb4
	function finishMinting() external returns (bool);
}

// Selector: 780e9d63
interface ERC721Enumerable is Dummy, ERC165 {
	// Selector: tokenByIndex(uint256) 4f6ccce7
	function tokenByIndex(uint256 index) external view returns (uint256);

	// Not implemented
	//
	// Selector: tokenOfOwnerByIndex(address,uint256) 2f745c59
	function tokenOfOwnerByIndex(address owner, uint256 index)
		external
		view
		returns (uint256);

	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);
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

interface UniqueRefungible is
	Dummy,
	ERC165,
	ERC721,
	ERC721Metadata,
	ERC721Enumerable,
	ERC721UniqueExtensions,
	ERC721Mintable,
	ERC721Burnable,
	Collection,
	TokenProperties
{}
