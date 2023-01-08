// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

contract ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool) {
		require(false, stub_error);
		interfaceID;
		return true;
	}
}

/// @title A contract that allows to set and delete token properties and change token property permissions.
/// @dev the ERC-165 identifier for this interface is 0xde0695c2
contract TokenProperties is Dummy, ERC165 {
	// /// @notice Set permissions for token property.
	// /// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	// /// @param key Property key.
	// /// @param isMutable Permission to mutate property.
	// /// @param collectionAdmin Permission to mutate property by collection admin if property is mutable.
	// /// @param tokenOwner Permission to mutate property by token owner if property is mutable.
	// /// @dev EVM selector for this function is: 0x222d97fa,
	// ///  or in textual repr: setTokenPropertyPermission(string,bool,bool,bool)
	// function setTokenPropertyPermission(string memory key, bool isMutable, bool collectionAdmin, bool tokenOwner) public {
	// 	require(false, stub_error);
	// 	key;
	// 	isMutable;
	// 	collectionAdmin;
	// 	tokenOwner;
	// 	dummy = 0;
	// }

	/// @notice Set permissions for token property.
	/// @dev Throws error if `msg.sender` is not admin or owner of the collection.
	/// @param permissions Permissions for keys.
	/// @dev EVM selector for this function is: 0xbd92983a,
	///  or in textual repr: setTokenPropertyPermissions((string,(uint8,bool)[])[])
	function setTokenPropertyPermissions(TokenPropertyPermission[] memory permissions) public {
		require(false, stub_error);
		permissions;
		dummy = 0;
	}

	/// @notice Get permissions for token properties.
	/// @dev EVM selector for this function is: 0xf23d7790,
	///  or in textual repr: tokenPropertyPermissions()
	function tokenPropertyPermissions() public view returns (TokenPropertyPermission[] memory) {
		require(false, stub_error);
		dummy;
		return new TokenPropertyPermission[](0);
	}

	// /// @notice Set token property value.
	// /// @dev Throws error if `msg.sender` has no permission to edit the property.
	// /// @param tokenId ID of the token.
	// /// @param key Property key.
	// /// @param value Property value.
	// /// @dev EVM selector for this function is: 0x1752d67b,
	// ///  or in textual repr: setProperty(uint256,string,bytes)
	// function setProperty(uint256 tokenId, string memory key, bytes memory value) public {
	// 	require(false, stub_error);
	// 	tokenId;
	// 	key;
	// 	value;
	// 	dummy = 0;
	// }

	/// @notice Set token properties value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param properties settable properties
	/// @dev EVM selector for this function is: 0x14ed3a6e,
	///  or in textual repr: setProperties(uint256,(string,bytes)[])
	function setProperties(uint256 tokenId, Property[] memory properties) public {
		require(false, stub_error);
		tokenId;
		properties;
		dummy = 0;
	}

	// /// @notice Delete token property value.
	// /// @dev Throws error if `msg.sender` has no permission to edit the property.
	// /// @param tokenId ID of the token.
	// /// @param key Property key.
	// /// @dev EVM selector for this function is: 0x066111d1,
	// ///  or in textual repr: deleteProperty(uint256,string)
	// function deleteProperty(uint256 tokenId, string memory key) public {
	// 	require(false, stub_error);
	// 	tokenId;
	// 	key;
	// 	dummy = 0;
	// }

	/// @notice Delete token properties value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param keys Properties key.
	/// @dev EVM selector for this function is: 0xc472d371,
	///  or in textual repr: deleteProperties(uint256,string[])
	function deleteProperties(uint256 tokenId, string[] memory keys) public {
		require(false, stub_error);
		tokenId;
		keys;
		dummy = 0;
	}

	/// @notice Get token property value.
	/// @dev Throws error if key not found
	/// @param tokenId ID of the token.
	/// @param key Property key.
	/// @return Property value bytes
	/// @dev EVM selector for this function is: 0x7228c327,
	///  or in textual repr: property(uint256,string)
	function property(uint256 tokenId, string memory key) public view returns (bytes memory) {
		require(false, stub_error);
		tokenId;
		key;
		dummy;
		return hex"";
	}
}

/// Ethereum representation of collection [`PropertyKey`](up_data_structs::PropertyKey) and [`PropertyValue`](up_data_structs::PropertyValue).
struct Property {
	string key;
	bytes value;
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

/// @title A contract that allows you to work with collections.
/// @dev the ERC-165 identifier for this interface is 0x2a14cfd1
contract Collection is Dummy, ERC165 {
	// /// Set collection property.
	// ///
	// /// @param key Property key.
	// /// @param value Propery value.
	// /// @dev EVM selector for this function is: 0x2f073f66,
	// ///  or in textual repr: setCollectionProperty(string,bytes)
	// function setCollectionProperty(string memory key, bytes memory value) public {
	// 	require(false, stub_error);
	// 	key;
	// 	value;
	// 	dummy = 0;
	// }

	/// Set collection properties.
	///
	/// @param properties Vector of properties key/value pair.
	/// @dev EVM selector for this function is: 0x50b26b2a,
	///  or in textual repr: setCollectionProperties((string,bytes)[])
	function setCollectionProperties(Property[] memory properties) public {
		require(false, stub_error);
		properties;
		dummy = 0;
	}

	// /// Delete collection property.
	// ///
	// /// @param key Property key.
	// /// @dev EVM selector for this function is: 0x7b7debce,
	// ///  or in textual repr: deleteCollectionProperty(string)
	// function deleteCollectionProperty(string memory key) public {
	// 	require(false, stub_error);
	// 	key;
	// 	dummy = 0;
	// }

	/// Delete collection properties.
	///
	/// @param keys Properties keys.
	/// @dev EVM selector for this function is: 0xee206ee3,
	///  or in textual repr: deleteCollectionProperties(string[])
	function deleteCollectionProperties(string[] memory keys) public {
		require(false, stub_error);
		keys;
		dummy = 0;
	}

	/// Get collection property.
	///
	/// @dev Throws error if key not found.
	///
	/// @param key Property key.
	/// @return bytes The property corresponding to the key.
	/// @dev EVM selector for this function is: 0xcf24fd6d,
	///  or in textual repr: collectionProperty(string)
	function collectionProperty(string memory key) public view returns (bytes memory) {
		require(false, stub_error);
		key;
		dummy;
		return hex"";
	}

	/// Get collection properties.
	///
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	/// @dev EVM selector for this function is: 0x285fb8e6,
	///  or in textual repr: collectionProperties(string[])
	function collectionProperties(string[] memory keys) public view returns (Property[] memory) {
		require(false, stub_error);
		keys;
		dummy;
		return new Property[](0);
	}

	// /// Set the sponsor of the collection.
	// ///
	// /// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	// ///
	// /// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	// /// @dev EVM selector for this function is: 0x7623402e,
	// ///  or in textual repr: setCollectionSponsor(address)
	// function setCollectionSponsor(address sponsor) public {
	// 	require(false, stub_error);
	// 	sponsor;
	// 	dummy = 0;
	// }

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Cross account address of the sponsor from whose account funds will be debited for operations with the contract.
	/// @dev EVM selector for this function is: 0x84a1d5a8,
	///  or in textual repr: setCollectionSponsorCross((address,uint256))
	function setCollectionSponsorCross(CrossAddress memory sponsor) public {
		require(false, stub_error);
		sponsor;
		dummy = 0;
	}

	/// Whether there is a pending sponsor.
	/// @dev EVM selector for this function is: 0x058ac185,
	///  or in textual repr: hasCollectionPendingSponsor()
	function hasCollectionPendingSponsor() public view returns (bool) {
		require(false, stub_error);
		dummy;
		return false;
	}

	/// Collection sponsorship confirmation.
	///
	/// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	/// @dev EVM selector for this function is: 0x3c50e97a,
	///  or in textual repr: confirmCollectionSponsorship()
	function confirmCollectionSponsorship() public {
		require(false, stub_error);
		dummy = 0;
	}

	/// Remove collection sponsor.
	/// @dev EVM selector for this function is: 0x6e0326a3,
	///  or in textual repr: removeCollectionSponsor()
	function removeCollectionSponsor() public {
		require(false, stub_error);
		dummy = 0;
	}

	/// Get current sponsor.
	///
	/// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	/// @dev EVM selector for this function is: 0x6ec0a9f1,
	///  or in textual repr: collectionSponsor()
	function collectionSponsor() public view returns (CrossAddress memory) {
		require(false, stub_error);
		dummy;
		return CrossAddress(0x0000000000000000000000000000000000000000, 0);
	}

	/// Get current collection limits.
	///
	/// @return Array of collection limits
	/// @dev EVM selector for this function is: 0xf63bc572,
	///  or in textual repr: collectionLimits()
	function collectionLimits() public view returns (CollectionLimit[] memory) {
		require(false, stub_error);
		dummy;
		return new CollectionLimit[](0);
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Some limit.
	/// @dev EVM selector for this function is: 0x2316ee74,
	///  or in textual repr: setCollectionLimit((uint8,(bool,uint256)))
	function setCollectionLimit(CollectionLimit memory limit) public {
		require(false, stub_error);
		limit;
		dummy = 0;
	}

	/// Get contract address.
	/// @dev EVM selector for this function is: 0xf6b4dfb4,
	///  or in textual repr: contractAddress()
	function contractAddress() public view returns (address) {
		require(false, stub_error);
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	/// Add collection admin.
	/// @param newAdmin Cross account administrator address.
	/// @dev EVM selector for this function is: 0x859aa7d6,
	///  or in textual repr: addCollectionAdminCross((address,uint256))
	function addCollectionAdminCross(CrossAddress memory newAdmin) public {
		require(false, stub_error);
		newAdmin;
		dummy = 0;
	}

	/// Remove collection admin.
	/// @param admin Cross account administrator address.
	/// @dev EVM selector for this function is: 0x6c0cd173,
	///  or in textual repr: removeCollectionAdminCross((address,uint256))
	function removeCollectionAdminCross(CrossAddress memory admin) public {
		require(false, stub_error);
		admin;
		dummy = 0;
	}

	// /// Add collection admin.
	// /// @param newAdmin Address of the added administrator.
	// /// @dev EVM selector for this function is: 0x92e462c7,
	// ///  or in textual repr: addCollectionAdmin(address)
	// function addCollectionAdmin(address newAdmin) public {
	// 	require(false, stub_error);
	// 	newAdmin;
	// 	dummy = 0;
	// }

	// /// Remove collection admin.
	// ///
	// /// @param admin Address of the removed administrator.
	// /// @dev EVM selector for this function is: 0xfafd7b42,
	// ///  or in textual repr: removeCollectionAdmin(address)
	// function removeCollectionAdmin(address admin) public {
	// 	require(false, stub_error);
	// 	admin;
	// 	dummy = 0;
	// }

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	/// @dev EVM selector for this function is: 0x112d4586,
	///  or in textual repr: setCollectionNesting(bool)
	function setCollectionNesting(bool enable) public {
		require(false, stub_error);
		enable;
		dummy = 0;
	}

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	/// @param collections Addresses of collections that will be available for nesting.
	/// @dev EVM selector for this function is: 0x64872396,
	///  or in textual repr: setCollectionNesting(bool,address[])
	function setCollectionNesting(bool enable, address[] memory collections) public {
		require(false, stub_error);
		enable;
		collections;
		dummy = 0;
	}

	/// Returns nesting for a collection
	/// @dev EVM selector for this function is: 0x22d25bfe,
	///  or in textual repr: collectionNestingRestrictedCollectionIds()
	function collectionNestingRestrictedCollectionIds() public view returns (CollectionNesting memory) {
		require(false, stub_error);
		dummy;
		return CollectionNesting(false, new uint256[](0));
	}

	/// Returns permissions for a collection
	/// @dev EVM selector for this function is: 0x5b2eaf4b,
	///  or in textual repr: collectionNestingPermissions()
	function collectionNestingPermissions() public view returns (CollectionNestingPermission[] memory) {
		require(false, stub_error);
		dummy;
		return new CollectionNestingPermission[](0);
	}

	/// Set the collection access method.
	/// @param mode Access mode
	/// 	0 for Normal
	/// 	1 for AllowList
	/// @dev EVM selector for this function is: 0x41835d4c,
	///  or in textual repr: setCollectionAccess(uint8)
	function setCollectionAccess(uint8 mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}

	/// Checks that user allowed to operate with collection.
	///
	/// @param user User address to check.
	/// @dev EVM selector for this function is: 0x91b6df49,
	///  or in textual repr: allowlistedCross((address,uint256))
	function allowlistedCross(CrossAddress memory user) public view returns (bool) {
		require(false, stub_error);
		user;
		dummy;
		return false;
	}

	// /// Add the user to the allowed list.
	// ///
	// /// @param user Address of a trusted user.
	// /// @dev EVM selector for this function is: 0x67844fe6,
	// ///  or in textual repr: addToCollectionAllowList(address)
	// function addToCollectionAllowList(address user) public {
	// 	require(false, stub_error);
	// 	user;
	// 	dummy = 0;
	// }

	/// Add user to allowed list.
	///
	/// @param user User cross account address.
	/// @dev EVM selector for this function is: 0xa0184a3a,
	///  or in textual repr: addToCollectionAllowListCross((address,uint256))
	function addToCollectionAllowListCross(CrossAddress memory user) public {
		require(false, stub_error);
		user;
		dummy = 0;
	}

	// /// Remove the user from the allowed list.
	// ///
	// /// @param user Address of a removed user.
	// /// @dev EVM selector for this function is: 0x85c51acb,
	// ///  or in textual repr: removeFromCollectionAllowList(address)
	// function removeFromCollectionAllowList(address user) public {
	// 	require(false, stub_error);
	// 	user;
	// 	dummy = 0;
	// }

	/// Remove user from allowed list.
	///
	/// @param user User cross account address.
	/// @dev EVM selector for this function is: 0x09ba452a,
	///  or in textual repr: removeFromCollectionAllowListCross((address,uint256))
	function removeFromCollectionAllowListCross(CrossAddress memory user) public {
		require(false, stub_error);
		user;
		dummy = 0;
	}

	/// Switch permission for minting.
	///
	/// @param mode Enable if "true".
	/// @dev EVM selector for this function is: 0x00018e84,
	///  or in textual repr: setCollectionMintMode(bool)
	function setCollectionMintMode(bool mode) public {
		require(false, stub_error);
		mode;
		dummy = 0;
	}

	// /// Check that account is the owner or admin of the collection
	// ///
	// /// @param user account to verify
	// /// @return "true" if account is the owner or admin
	// /// @dev EVM selector for this function is: 0x9811b0c7,
	// ///  or in textual repr: isOwnerOrAdmin(address)
	// function isOwnerOrAdmin(address user) public view returns (bool) {
	// 	require(false, stub_error);
	// 	user;
	// 	dummy;
	// 	return false;
	// }

	/// Check that account is the owner or admin of the collection
	///
	/// @param user User cross account to verify
	/// @return "true" if account is the owner or admin
	/// @dev EVM selector for this function is: 0x3e75a905,
	///  or in textual repr: isOwnerOrAdminCross((address,uint256))
	function isOwnerOrAdminCross(CrossAddress memory user) public view returns (bool) {
		require(false, stub_error);
		user;
		dummy;
		return false;
	}

	/// Returns collection type
	///
	/// @return `Fungible` or `NFT` or `ReFungible`
	/// @dev EVM selector for this function is: 0xd34b55b8,
	///  or in textual repr: uniqueCollectionType()
	function uniqueCollectionType() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// Get collection owner.
	///
	/// @return Tuble with sponsor address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0xdf727d3b,
	///  or in textual repr: collectionOwner()
	function collectionOwner() public view returns (CrossAddress memory) {
		require(false, stub_error);
		dummy;
		return CrossAddress(0x0000000000000000000000000000000000000000, 0);
	}

	// /// Changes collection owner to another account
	// ///
	// /// @dev Owner can be changed only by current owner
	// /// @param newOwner new owner account
	// /// @dev EVM selector for this function is: 0x4f53e226,
	// ///  or in textual repr: changeCollectionOwner(address)
	// function changeCollectionOwner(address newOwner) public {
	// 	require(false, stub_error);
	// 	newOwner;
	// 	dummy = 0;
	// }

	/// Get collection administrators
	///
	/// @return Vector of tuples with admins address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0x5813216b,
	///  or in textual repr: collectionAdmins()
	function collectionAdmins() public view returns (CrossAddress[] memory) {
		require(false, stub_error);
		dummy;
		return new CrossAddress[](0);
	}

	/// Changes collection owner to another account
	///
	/// @dev Owner can be changed only by current owner
	/// @param newOwner new owner cross account
	/// @dev EVM selector for this function is: 0x6496c497,
	///  or in textual repr: changeCollectionOwnerCross((address,uint256))
	function changeCollectionOwnerCross(CrossAddress memory newOwner) public {
		require(false, stub_error);
		newOwner;
		dummy = 0;
	}
}

/// Cross account struct
struct CrossAddress {
	address eth;
	uint256 sub;
}

/// Ethereum representation of `NestingPermissions` (see [`up_data_structs::NestingPermissions`]) field.
struct CollectionNestingPermission {
	CollectionPermissionField field;
	bool value;
}

/// Ethereum representation of `NestingPermissions` (see [`up_data_structs::NestingPermissions`]) fields as an enumeration.
enum CollectionPermissionField {
	/// Owner of token can nest tokens under it.
	TokenOwner,
	/// Admin of token collection can nest tokens under token.
	CollectionAdmin
}

/// Nested collections.
struct CollectionNesting {
	bool token_owner;
	uint256[] ids;
}

/// [`CollectionLimits`](up_data_structs::CollectionLimits) field representation for EVM.
struct CollectionLimit {
	CollectionLimitField field;
	OptionUint value;
}

/// Ethereum representation of Optional value with uint256.
struct OptionUint {
	bool status;
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

/// @title ERC-721 Non-Fungible Token Standard, optional metadata extension
/// @dev See https://eips.ethereum.org/EIPS/eip-721
/// @dev the ERC-165 identifier for this interface is 0x5b5e139f
contract ERC721Metadata is Dummy, ERC165 {
	// /// @notice A descriptive name for a collection of NFTs in this contract
	// /// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	// /// @dev EVM selector for this function is: 0x06fdde03,
	// ///  or in textual repr: name()
	// function name() public view returns (string memory) {
	// 	require(false, stub_error);
	// 	dummy;
	// 	return "";
	// }

	// /// @notice An abbreviated name for NFTs in this contract
	// /// @dev real implementation of this function lies in `ERC721UniqueExtensions`
	// /// @dev EVM selector for this function is: 0x95d89b41,
	// ///  or in textual repr: symbol()
	// function symbol() public view returns (string memory) {
	// 	require(false, stub_error);
	// 	dummy;
	// 	return "";
	// }

	/// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
	///
	/// @dev If the token has a `url` property and it is not empty, it is returned.
	///  Else If the collection does not have a property with key `schemaName` or its value is not equal to `ERC721Metadata`, it return an error `tokenURI not set`.
	///  If the collection property `baseURI` is empty or absent, return "" (empty string)
	///  otherwise, if token property `suffix` present and is non-empty, return concatenation of baseURI and suffix
	///  otherwise, return concatenation of `baseURI` and stringified token id (decimal stringifying, without paddings).
	///
	/// @return token's const_metadata
	/// @dev EVM selector for this function is: 0xc87b56dd,
	///  or in textual repr: tokenURI(uint256)
	function tokenURI(uint256 tokenId) public view returns (string memory) {
		require(false, stub_error);
		tokenId;
		dummy;
		return "";
	}
}

/// @title ERC721 Token that can be irreversibly burned (destroyed).
/// @dev the ERC-165 identifier for this interface is 0x42966c68
contract ERC721Burnable is Dummy, ERC165 {
	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param tokenId The NFT to approve
	/// @dev EVM selector for this function is: 0x42966c68,
	///  or in textual repr: burn(uint256)
	function burn(uint256 tokenId) public {
		require(false, stub_error);
		tokenId;
		dummy = 0;
	}
}

/// @dev inlined interface
contract ERC721UniqueMintableEvents {
	event MintingFinished();
}

/// @title ERC721 minting logic.
/// @dev the ERC-165 identifier for this interface is 0x476ff149
contract ERC721UniqueMintable is Dummy, ERC165, ERC721UniqueMintableEvents {
	/// @dev EVM selector for this function is: 0x05d2035b,
	///  or in textual repr: mintingFinished()
	function mintingFinished() public view returns (bool) {
		require(false, stub_error);
		dummy;
		return false;
	}

	/// @notice Function to mint a token.
	/// @param to The new owner
	/// @return uint256 The id of the newly minted token
	/// @dev EVM selector for this function is: 0x6a627842,
	///  or in textual repr: mint(address)
	function mint(address to) public returns (uint256) {
		require(false, stub_error);
		to;
		dummy = 0;
		return 0;
	}

	// /// @notice Function to mint a token.
	// /// @dev `tokenId` should be obtained with `nextTokenId` method,
	// ///  unlike standard, you can't specify it manually
	// /// @param to The new owner
	// /// @param tokenId ID of the minted NFT
	// /// @dev EVM selector for this function is: 0x40c10f19,
	// ///  or in textual repr: mint(address,uint256)
	// function mint(address to, uint256 tokenId) public returns (bool) {
	// 	require(false, stub_error);
	// 	to;
	// 	tokenId;
	// 	dummy = 0;
	// 	return false;
	// }

	/// @notice Function to mint token with the given tokenUri.
	/// @param to The new owner
	/// @param tokenUri Token URI that would be stored in the NFT properties
	/// @return uint256 The id of the newly minted token
	/// @dev EVM selector for this function is: 0x45c17782,
	///  or in textual repr: mintWithTokenURI(address,string)
	function mintWithTokenURI(address to, string memory tokenUri) public returns (uint256) {
		require(false, stub_error);
		to;
		tokenUri;
		dummy = 0;
		return 0;
	}

	// /// @notice Function to mint token with the given tokenUri.
	// /// @dev `tokenId` should be obtained with `nextTokenId` method,
	// ///  unlike standard, you can't specify it manually
	// /// @param to The new owner
	// /// @param tokenId ID of the minted NFT
	// /// @param tokenUri Token URI that would be stored in the NFT properties
	// /// @dev EVM selector for this function is: 0x50bb4e7f,
	// ///  or in textual repr: mintWithTokenURI(address,uint256,string)
	// function mintWithTokenURI(address to, uint256 tokenId, string memory tokenUri) public returns (bool) {
	// 	require(false, stub_error);
	// 	to;
	// 	tokenId;
	// 	tokenUri;
	// 	dummy = 0;
	// 	return false;
	// }

	/// @dev Not implemented
	/// @dev EVM selector for this function is: 0x7d64bcb4,
	///  or in textual repr: finishMinting()
	function finishMinting() public returns (bool) {
		require(false, stub_error);
		dummy = 0;
		return false;
	}
}

/// @title Unique extensions for ERC721.
/// @dev the ERC-165 identifier for this interface is 0x0e48fdb4
contract ERC721UniqueExtensions is Dummy, ERC165 {
	/// @notice A descriptive name for a collection of NFTs in this contract
	/// @dev EVM selector for this function is: 0x06fdde03,
	///  or in textual repr: name()
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// @notice An abbreviated name for NFTs in this contract
	/// @dev EVM selector for this function is: 0x95d89b41,
	///  or in textual repr: symbol()
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// @notice A description for the collection.
	/// @dev EVM selector for this function is: 0x7284e416,
	///  or in textual repr: description()
	function description() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// Returns the owner (in cross format) of the token.
	///
	/// @param tokenId Id for the token.
	/// @dev EVM selector for this function is: 0x2b29dace,
	///  or in textual repr: crossOwnerOf(uint256)
	function crossOwnerOf(uint256 tokenId) public view returns (CrossAddress memory) {
		require(false, stub_error);
		tokenId;
		dummy;
		return CrossAddress(0x0000000000000000000000000000000000000000, 0);
	}

	/// Returns the token properties.
	///
	/// @param tokenId Id for the token.
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	/// @dev EVM selector for this function is: 0xe07ede7e,
	///  or in textual repr: properties(uint256,string[])
	function properties(uint256 tokenId, string[] memory keys) public view returns (Property[] memory) {
		require(false, stub_error);
		tokenId;
		keys;
		dummy;
		return new Property[](0);
	}

	/// @notice Set or reaffirm the approved address for an NFT
	/// @dev The zero address indicates there is no approved address.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param approved The new substrate address approved NFT controller
	/// @param tokenId The NFT to approve
	/// @dev EVM selector for this function is: 0x0ecd0ab0,
	///  or in textual repr: approveCross((address,uint256),uint256)
	function approveCross(CrossAddress memory approved, uint256 tokenId) public {
		require(false, stub_error);
		approved;
		tokenId;
		dummy = 0;
	}

	/// @notice Transfer ownership of an NFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	/// @dev EVM selector for this function is: 0xa9059cbb,
	///  or in textual repr: transfer(address,uint256)
	function transfer(address to, uint256 tokenId) public {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
	}

	/// @notice Transfer ownership of an NFT
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	/// @dev EVM selector for this function is: 0x2ada85ff,
	///  or in textual repr: transferCross((address,uint256),uint256)
	function transferCross(CrossAddress memory to, uint256 tokenId) public {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
	}

	/// @notice Transfer ownership of an NFT from cross account address to cross account address
	/// @dev Throws unless `msg.sender` is the current owner. Throws if `to`
	///  is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from Cross acccount address of current owner
	/// @param to Cross acccount address of new owner
	/// @param tokenId The NFT to transfer
	/// @dev EVM selector for this function is: 0xd5cf430b,
	///  or in textual repr: transferFromCross((address,uint256),(address,uint256),uint256)
	function transferFromCross(
		CrossAddress memory from,
		CrossAddress memory to,
		uint256 tokenId
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}

	// /// @notice Burns a specific ERC721 token.
	// /// @dev Throws unless `msg.sender` is the current owner or an authorized
	// ///  operator for this NFT. Throws if `from` is not the current owner. Throws
	// ///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	// /// @param from The current owner of the NFT
	// /// @param tokenId The NFT to transfer
	// /// @dev EVM selector for this function is: 0x79cc6790,
	// ///  or in textual repr: burnFrom(address,uint256)
	// function burnFrom(address from, uint256 tokenId) public {
	// 	require(false, stub_error);
	// 	from;
	// 	tokenId;
	// 	dummy = 0;
	// }

	/// @notice Burns a specific ERC721 token.
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this NFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from The current owner of the NFT
	/// @param tokenId The NFT to transfer
	/// @dev EVM selector for this function is: 0xbb2f5a58,
	///  or in textual repr: burnFromCross((address,uint256),uint256)
	function burnFromCross(CrossAddress memory from, uint256 tokenId) public {
		require(false, stub_error);
		from;
		tokenId;
		dummy = 0;
	}

	/// @notice Returns next free NFT ID.
	/// @dev EVM selector for this function is: 0x75794a3c,
	///  or in textual repr: nextTokenId()
	function nextTokenId() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// /// @notice Function to mint multiple tokens.
	// /// @dev `tokenIds` should be an array of consecutive numbers and first number
	// ///  should be obtained with `nextTokenId` method
	// /// @param to The new owner
	// /// @param tokenIds IDs of the minted NFTs
	// /// @dev EVM selector for this function is: 0x44a9945e,
	// ///  or in textual repr: mintBulk(address,uint256[])
	// function mintBulk(address to, uint256[] memory tokenIds) public returns (bool) {
	// 	require(false, stub_error);
	// 	to;
	// 	tokenIds;
	// 	dummy = 0;
	// 	return false;
	// }

	// /// @notice Function to mint multiple tokens with the given tokenUris.
	// /// @dev `tokenIds` is array of pairs of token ID and token URI. Token IDs should be consecutive
	// ///  numbers and first number should be obtained with `nextTokenId` method
	// /// @param to The new owner
	// /// @param tokens array of pairs of token ID and token URI for minted tokens
	// /// @dev EVM selector for this function is: 0x36543006,
	// ///  or in textual repr: mintBulkWithTokenURI(address,(uint256,string)[])
	// function mintBulkWithTokenURI(address to, Tuple15[] memory tokens) public returns (bool) {
	// 	require(false, stub_error);
	// 	to;
	// 	tokens;
	// 	dummy = 0;
	// 	return false;
	// }

	/// @notice Function to mint a token.
	/// @param to The new owner crossAccountId
	/// @param properties Properties of minted token
	/// @return uint256 The id of the newly minted token
	/// @dev EVM selector for this function is: 0xb904db03,
	///  or in textual repr: mintCross((address,uint256),(string,bytes)[])
	function mintCross(CrossAddress memory to, Property[] memory properties) public returns (uint256) {
		require(false, stub_error);
		to;
		properties;
		dummy = 0;
		return 0;
	}
}

/// @dev anonymous struct
struct Tuple15 {
	uint256 field_0;
	string field_1;
}

/// @title ERC-721 Non-Fungible Token Standard, optional enumeration extension
/// @dev See https://eips.ethereum.org/EIPS/eip-721
/// @dev the ERC-165 identifier for this interface is 0x780e9d63
contract ERC721Enumerable is Dummy, ERC165 {
	/// @notice Enumerate valid NFTs
	/// @param index A counter less than `totalSupply()`
	/// @return The token identifier for the `index`th NFT,
	///  (sort order not specified)
	/// @dev EVM selector for this function is: 0x4f6ccce7,
	///  or in textual repr: tokenByIndex(uint256)
	function tokenByIndex(uint256 index) public view returns (uint256) {
		require(false, stub_error);
		index;
		dummy;
		return 0;
	}

	/// @dev Not implemented
	/// @dev EVM selector for this function is: 0x2f745c59,
	///  or in textual repr: tokenOfOwnerByIndex(address,uint256)
	function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
		require(false, stub_error);
		owner;
		index;
		dummy;
		return 0;
	}

	/// @notice Count NFTs tracked by this contract
	/// @return A count of valid NFTs tracked by this contract, where each one of
	///  them has an assigned and queryable owner not equal to the zero address
	/// @dev EVM selector for this function is: 0x18160ddd,
	///  or in textual repr: totalSupply()
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}
}

/// @dev inlined interface
contract ERC721Events {
	event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
	event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
	event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
}

/// @title ERC-721 Non-Fungible Token Standard
/// @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
/// @dev the ERC-165 identifier for this interface is 0x983a942b
contract ERC721 is Dummy, ERC165, ERC721Events {
	/// @notice Count all NFTs assigned to an owner
	/// @dev NFTs assigned to the zero address are considered invalid, and this
	///  function throws for queries about the zero address.
	/// @param owner An address for whom to query the balance
	/// @return The number of NFTs owned by `owner`, possibly zero
	/// @dev EVM selector for this function is: 0x70a08231,
	///  or in textual repr: balanceOf(address)
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	/// @notice Find the owner of an NFT
	/// @dev NFTs assigned to zero address are considered invalid, and queries
	///  about them do throw.
	/// @param tokenId The identifier for an NFT
	/// @return The address of the owner of the NFT
	/// @dev EVM selector for this function is: 0x6352211e,
	///  or in textual repr: ownerOf(uint256)
	function ownerOf(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	/// @dev Not implemented
	/// @dev EVM selector for this function is: 0xb88d4fde,
	///  or in textual repr: safeTransferFrom(address,address,uint256,bytes)
	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId,
		bytes memory data
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		data;
		dummy = 0;
	}

	/// @dev Not implemented
	/// @dev EVM selector for this function is: 0x42842e0e,
	///  or in textual repr: safeTransferFrom(address,address,uint256)
	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}

	/// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
	///  TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE
	///  THEY MAY BE PERMANENTLY LOST
	/// @dev Throws unless `msg.sender` is the current owner or an authorized
	///  operator for this NFT. Throws if `from` is not the current owner. Throws
	///  if `to` is the zero address. Throws if `tokenId` is not a valid NFT.
	/// @param from The current owner of the NFT
	/// @param to The new owner
	/// @param tokenId The NFT to transfer
	/// @dev EVM selector for this function is: 0x23b872dd,
	///  or in textual repr: transferFrom(address,address,uint256)
	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}

	/// @notice Set or reaffirm the approved address for an NFT
	/// @dev The zero address indicates there is no approved address.
	/// @dev Throws unless `msg.sender` is the current NFT owner, or an authorized
	///  operator of the current owner.
	/// @param approved The new approved NFT controller
	/// @param tokenId The NFT to approve
	/// @dev EVM selector for this function is: 0x095ea7b3,
	///  or in textual repr: approve(address,uint256)
	function approve(address approved, uint256 tokenId) public {
		require(false, stub_error);
		approved;
		tokenId;
		dummy = 0;
	}

	/// @notice Sets or unsets the approval of a given operator.
	/// The `operator` is allowed to transfer all tokens of the `caller` on their behalf.
	/// @param operator Operator
	/// @param approved Should operator status be granted or revoked?
	/// @dev EVM selector for this function is: 0xa22cb465,
	///  or in textual repr: setApprovalForAll(address,bool)
	function setApprovalForAll(address operator, bool approved) public {
		require(false, stub_error);
		operator;
		approved;
		dummy = 0;
	}

	/// @dev Not implemented
	/// @dev EVM selector for this function is: 0x081812fc,
	///  or in textual repr: getApproved(uint256)
	function getApproved(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	/// @notice Tells whether the given `owner` approves the `operator`.
	/// @dev EVM selector for this function is: 0xe985e9c5,
	///  or in textual repr: isApprovedForAll(address,address)
	function isApprovedForAll(address owner, address operator) public view returns (bool) {
		require(false, stub_error);
		owner;
		operator;
		dummy;
		return false;
	}

	/// @notice Returns collection helper contract address
	/// @dev EVM selector for this function is: 0x1896cce6,
	///  or in textual repr: collectionHelperAddress()
	function collectionHelperAddress() public view returns (address) {
		require(false, stub_error);
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
}

contract UniqueNFT is
	Dummy,
	ERC165,
	ERC721,
	ERC721Enumerable,
	ERC721UniqueExtensions,
	ERC721UniqueMintable,
	ERC721Burnable,
	ERC721Metadata,
	Collection,
	TokenProperties
{}
