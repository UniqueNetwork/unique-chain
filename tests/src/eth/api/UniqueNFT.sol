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

// Selector: 41369377
interface TokenProperties is Dummy, ERC165 {
	// @notice Set permissions for token property.
	// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	// @param key Property key.
	// @param is_mutable Permission to mutate property.
	// @param collection_admin Permission to mutate property by collection admin if property is mutable.
	// @param token_owner Permission to mutate property by token owner if property is mutable.
	//
	// Selector: setTokenPropertyPermission(string,bool,bool,bool) 222d97fa
	function setTokenPropertyPermission(
		string memory key,
		bool isMutable,
		bool collectionAdmin,
		bool tokenOwner
	) external;

	// @notice Set token property value.
	// @dev Throws error if `msg.sender` has no permission to edit the property.
	// @param tokenId ID of the token.
	// @param key Property key.
	// @param value Property value.
	//
	// Selector: setProperty(uint256,string,bytes) 1752d67b
	function setProperty(
		uint256 tokenId,
		string memory key,
		bytes memory value
	) external;

	// @notice Delete token property value.
	// @dev Throws error if `msg.sender` has no permission to edit the property.
	// @param tokenId ID of the token.
	// @param key Property key.
	//
	// Selector: deleteProperty(uint256,string) 066111d1
	function deleteProperty(uint256 tokenId, string memory key) external;

	// @notice Get token property value.
	// @dev Throws error if key not found
	// @param tokenId ID of the token.
	// @param key Property key.
	// @return Property value bytes
	//
	// Selector: property(uint256,string) 7228c327
	function property(uint256 tokenId, string memory key)
		external
		view
		returns (bytes memory);
}

// Selector: 42966c68
interface ERC721Burnable is Dummy, ERC165 {
	// @notice Burns a specific ERC721 token.
	// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	//  operator of the current owner.
	// @param tokenId The NFT to approve
	//
	// Selector: burn(uint256) 42966c68
	function burn(uint256 tokenId) external;
}

// Selector: 58800161
interface ERC721 is Dummy, ERC165, ERC721Events {
	// @notice Count all NFTs assigned to an owner
	// @dev NFTs assigned to the zero address are considered invalid, and this
	//  function throws for queries about the zero address.
	// @param owner An address for whom to query the balance
	// @return The number of NFTs owned by `owner`, possibly zero
	//
	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) external view returns (uint256);

	// @notice Find the owner of an NFT
	// @dev NFTs assigned to zero address are considered invalid, and queries
	//  about them do throw.
	// @param tokenId The identifier for an NFT
	// @return The address of the owner of the NFT
	//
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

	// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
	//  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
	//  THEY MAY BE PERMANENTLY LOST
	// @dev Throws unless `msg.sender` is the current owner or an authorized
	//  operator for this NFT. Throws if `from` is not the current owner. Throws
	//  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	// @param from The current owner of the NFT
	// @param to The new owner
	// @param tokenId The NFT to transfer
	// @param _value Not used for an NFT
	//
	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	// @notice Set or reaffirm the approved address for an NFT
	// @dev The zero address indicates there is no approved address.
	// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	//  operator of the current owner.
	// @param approved The new approved NFT controller
	// @param tokenId The NFT to approve
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
	// @notice A descriptive name for a collection of NFTs in this contract
	//
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// @notice An abbreviated name for NFTs in this contract
	//
	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);

	// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
	//
	// @dev If the token has a `url` property and it is not empty, it is returned.
	//  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.
	//  If the collection property `baseURI` is empty or absent, return "" (empty string)
	//  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix
	//  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).
	//
	// @return token's const_metadata
	//
	// Selector: tokenURI(uint256) c87b56dd
	function tokenURI(uint256 tokenId) external view returns (string memory);
}

// Selector: 68ccfe89
interface ERC721Mintable is Dummy, ERC165, ERC721MintableEvents {
	// Selector: mintingFinished() 05d2035b
	function mintingFinished() external view returns (bool);

	// @notice Function to mint token.
	// @dev `tokenId` should be obtained with `nextTokenId` method,
	//  unlike standard, you can't specify it manually
	// @param to The new owner
	// @param tokenId ID of the minted NFT
	//
	// Selector: mint(address,uint256) 40c10f19
	function mint(address to, uint256 tokenId) external returns (bool);

	// @notice Function to mint token with the given tokenUri.
	// @dev `tokenId` should be obtained with `nextTokenId` method,
	//  unlike standard, you can't specify it manually
	// @param to The new owner
	// @param tokenId ID of the minted NFT
	// @param tokenUri Token URI that would be stored in the NFT properties
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
	// @notice Enumerate valid NFTs
	// @param index A counter less than `totalSupply()`
	// @return The token identifier for the `index`th NFT,
	//  (sort order not specified)
	//
	// Selector: tokenByIndex(uint256) 4f6ccce7
	function tokenByIndex(uint256 index) external view returns (uint256);

	// @dev Not implemented
	//
	// Selector: tokenOfOwnerByIndex(address,uint256) 2f745c59
	function tokenOfOwnerByIndex(address owner, uint256 index)
		external
		view
		returns (uint256);

	// @notice Count NFTs tracked by this contract
	// @return A count of valid NFTs tracked by this contract, where each one of
	//  them has an assigned and queryable owner not equal to the zero address
	//
	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);
}

// Selector: d74d154f
interface ERC721UniqueExtensions is Dummy, ERC165 {
	// @notice Transfer ownership of an NFT
	// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	//  is the zero address. Throws if `tokenId` is not a valid NFT.
	// @param to The new owner
	// @param tokenId The NFT to transfer
	// @param _value Not used for an NFT
	//
	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 tokenId) external;

	// @notice Burns a specific ERC721 token.
	// @dev Throws unless `msg.sender` is the current owner or an authorized
	//  operator for this NFT. Throws if `from` is not the current owner. Throws
	//  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	// @param from The current owner of the NFT
	// @param tokenId The NFT to transfer
	// @param _value Not used for an NFT
	//
	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 tokenId) external;

	// @notice Returns next free NFT ID.
	//
	// Selector: nextTokenId() 75794a3c
	function nextTokenId() external view returns (uint256);

	// @notice Function to mint multiple tokens.
	// @dev `tokenIds` should be an array of consecutive numbers and first number
	//  should be obtained with `nextTokenId` method
	// @param to The new owner
	// @param tokenIds IDs of the minted NFTs
	//
	// Selector: mintBulk(address,uint256[]) 44a9945e
	function mintBulk(address to, uint256[] memory tokenIds)
		external
		returns (bool);

	// @notice Function to mint multiple tokens with the given tokenUris.
	// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
	//  numbers and first number should be obtained with `nextTokenId` method
	// @param to The new owner
	// @param tokens array of pairs of token ID and token URI for minted tokens
	//
	// Selector: mintBulkWithTokenURI(address,(uint256,string)[]) 36543006
	function mintBulkWithTokenURI(address to, Tuple0[] memory tokens)
		external
		returns (bool);
}

// Selector: f077f83e
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

	// Check that account is the owner or admin of the collection
	//
	// @param user account to verify
	// @return "true" if account is the owner or admin
	//
	// Selector: verifyOwnerOrAdmin(address) c2282493
	function verifyOwnerOrAdmin(address user) external view returns (bool);

	// Check that substrate account is the owner or admin of the collection
	//
	// @param user account to verify
	// @return "true" if account is the owner or admin
	//
	// Selector: verifyOwnerOrAdmin(uint256) a83328e5
	function verifyOwnerOrAdmin(uint256 user) external view returns (bool);

	// Returns collection type
	//
	// @return `Fungible` or `NFT` or `ReFungible`
	//
	// Selector: uniqueCollectionType() d34b55b8
	function uniqueCollectionType() external returns (string memory);

	// Changes collection owner to another account
	//
	// @dev Owner can be changed only by current owner
	// @param newOwner new owner account
	//
	// Selector: changeOwner(address) a6f9dae1
	function changeOwner(address newOwner) external;

	// Changes collection owner to another substrate account
	//
	// @dev Owner can be changed only by current owner
	// @param newOwner new owner substrate account
	//
	// Selector: changeOwner(uint256) 924c19f7
	function changeOwner(uint256 newOwner) external;
}

interface UniqueNFT is
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
