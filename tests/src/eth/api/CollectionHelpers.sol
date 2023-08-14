// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

/// @dev inlined interface
interface CollectionHelpersEvents {
	event CollectionCreated(address indexed owner, address indexed collectionId);
	event CollectionDestroyed(address indexed collectionId);
	event CollectionChanged(address indexed collectionId);
}

/// @title Contract, which allows users to operate with collections
/// @dev the ERC-165 identifier for this interface is 0xf6061f38
interface CollectionHelpers is Dummy, ERC165, CollectionHelpersEvents {
	/// Create a collection
	/// @return address Address of the newly created collection
	/// @dev EVM selector for this function is: 0x10560e92,
	///  or in textual repr: createCollection((string,string,string,uint8,uint8,(string,bytes)[],(string,(uint8,bool)[])[],(address,uint256)[],(bool,bool,address[]),(uint8,uint256)[],address[],uint8))
	function createCollection(CreateCollectionData memory data) external payable returns (address);

	/// Create an NFT collection
	/// @param name Name of the collection
	/// @param description Informative description of the collection
	/// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	/// @return address Address of the newly created collection
	/// @dev EVM selector for this function is: 0x844af658,
	///  or in textual repr: createNFTCollection(string,string,string)
	function createNFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external payable returns (address);

	// /// Create an NFT collection
	// /// @param name Name of the collection
	// /// @param description Informative description of the collection
	// /// @param tokenPrefix Token prefix to represent the collection tokens in UI and user applications
	// /// @return address Address of the newly created collection
	// /// @dev EVM selector for this function is: 0xe34a6844,
	// ///  or in textual repr: createNonfungibleCollection(string,string,string)
	// function createNonfungibleCollection(string memory name, string memory description, string memory tokenPrefix) external payable returns (address);

	/// @dev EVM selector for this function is: 0xab173450,
	///  or in textual repr: createRFTCollection(string,string,string)
	function createRFTCollection(
		string memory name,
		string memory description,
		string memory tokenPrefix
	) external payable returns (address);

	/// @dev EVM selector for this function is: 0x7335b79f,
	///  or in textual repr: createFTCollection(string,uint8,string,string)
	function createFTCollection(
		string memory name,
		uint8 decimals,
		string memory description,
		string memory tokenPrefix
	) external payable returns (address);

	/// @dev EVM selector for this function is: 0x85624258,
	///  or in textual repr: makeCollectionERC721MetadataCompatible(address,string)
	function makeCollectionERC721MetadataCompatible(address collection, string memory baseUri) external;

	/// @dev EVM selector for this function is: 0x564e321f,
	///  or in textual repr: destroyCollection(address)
	function destroyCollection(address collectionAddress) external;

	/// Check if a collection exists
	/// @param collectionAddress Address of the collection in question
	/// @return bool Does the collection exist?
	/// @dev EVM selector for this function is: 0xc3de1494,
	///  or in textual repr: isCollectionExist(address)
	function isCollectionExist(address collectionAddress) external view returns (bool);

	/// @dev EVM selector for this function is: 0xd23a7ab1,
	///  or in textual repr: collectionCreationFee()
	function collectionCreationFee() external view returns (uint256);

	/// Returns address of a collection.
	/// @param collectionId  - CollectionId  of the collection
	/// @return eth mirror address of the collection
	/// @dev EVM selector for this function is: 0x2e716683,
	///  or in textual repr: collectionAddress(uint32)
	function collectionAddress(uint32 collectionId) external view returns (address);

	/// Returns collectionId of a collection.
	/// @param collectionAddress  - Eth address of the collection
	/// @return collectionId of the collection
	/// @dev EVM selector for this function is: 0xb5cb7498,
	///  or in textual repr: collectionId(address)
	function collectionId(address collectionAddress) external view returns (uint32);
}

/// Collection properties
struct CreateCollectionData {
	/// Collection name
	string name;
	/// Collection description
	string description;
	/// Token prefix
	string token_prefix;
	/// Token type (NFT, FT or RFT)
	CollectionMode mode;
	/// Fungible token precision
	uint8 decimals;
	/// Custom Properties
	Property[] properties;
	/// Permissions for token properties
	TokenPropertyPermission[] token_property_permissions;
	/// Collection admins
	CrossAddress[] admin_list;
	/// Nesting settings
	CollectionNestingAndPermission nesting_settings;
	/// Collection limits
	CollectionLimitValue[] limits;
	/// Collection sponsor
	address[] pending_sponsor;
	/// Extra collection flags
	CollectionFlags flags;
}

/// Cross account struct
type CollectionFlags is uint8;

library CollectionFlagsLib {
	/// Tokens in foreign collections can be transferred, but not burnt
	CollectionFlags constant foreignField = CollectionFlags.wrap(128);
	/// Supports ERC721Metadata
	CollectionFlags constant erc721metadataField = CollectionFlags.wrap(64);
	/// External collections can't be managed using `unique` api
	CollectionFlags constant externalField = CollectionFlags.wrap(1);

	/// Reserved bits
	function reservedField(uint8 value) public pure returns (CollectionFlags) {
		require(value < 1 << 5, "out of bound value");
		return CollectionFlags.wrap(value << 1);
	}
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) field representation for EVM.
struct CollectionLimitValue {
	CollectionLimitField field;
	uint256 value;
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) fields representation for EVM.
enum CollectionLimitField {
	/// How many tokens can a user have on one account.
	AccountTokenOwnership,
	/// How many bytes of data are available for sponsorship.
	SponsoredDataSize,
	/// In any case, chain default: [`SponsoringRateLimit::SponsoringDisabled`]
	SponsoredDataRateLimit,
	/// How many tokens can be mined into this collection.
	TokenLimit,
	/// Timeouts for transfer sponsoring.
	SponsorTransferTimeout,
	/// Timeout for sponsoring an approval in passed blocks.
	SponsorApproveTimeout,
	/// Whether the collection owner of the collection can send tokens (which belong to other users).
	OwnerCanTransfer,
	/// Can the collection owner burn other people's tokens.
	OwnerCanDestroy,
	/// Is it possible to send tokens from this collection between users.
	TransferEnabled
}

/// Nested collections and permissions
struct CollectionNestingAndPermission {
	/// Owner of token can nest tokens under it.
	bool token_owner;
	/// Admin of token collection can nest tokens under token.
	bool collection_admin;
	/// If set - only tokens from specified collections can be nested.
	address[] restricted;
}

/// Cross account struct
struct CrossAddress {
	address eth;
	uint256 sub;
}

/// Ethereum representation of Token Property Permissions.
struct TokenPropertyPermission {
	/// Token property key.
	string key;
	/// Token property permissions.
	PropertyPermission[] permissions;
}

/// Ethereum representation of TokenPermissions (see [`up_data_structs::PropertyPermission`]) as an key and value.
struct PropertyPermission {
	/// TokenPermission field.
	TokenPermissionField code;
	/// TokenPermission value.
	bool value;
}

/// Ethereum representation of TokenPermissions (see [`up_data_structs::PropertyPermission`]) fields as an enumeration.
enum TokenPermissionField {
	/// Permission to change the property and property permission. See [`up_data_structs::PropertyPermission::mutable`]
	Mutable,
	/// Change permission for the collection administrator. See [`up_data_structs::PropertyPermission::token_owner`]
	TokenOwner,
	/// Permission to change the property for the owner of the token. See [`up_data_structs::PropertyPermission::collection_admin`]
	CollectionAdmin
}

/// Ethereum representation of collection [`PropertyKey`](up_data_structs::PropertyKey) and [`PropertyValue`](up_data_structs::PropertyValue).
struct Property {
	string key;
	bytes value;
}

/// Type of tokens in collection
enum CollectionMode {
	/// Fungible
	Fungible,
	/// Nonfungible
	Nonfungible,
	/// Refungible
	Refungible
}
