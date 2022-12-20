// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

/// @title A contract that allows you to work with collections.
/// @dev the ERC-165 identifier for this interface is 0x23201442
interface Collection is Dummy, ERC165 {
	// /// Set collection property.
	// ///
	// /// @param key Property key.
	// /// @param value Propery value.
	// /// @dev EVM selector for this function is: 0x2f073f66,
	// ///  or in textual repr: setCollectionProperty(string,bytes)
	// function setCollectionProperty(string memory key, bytes memory value) external;

	/// Set collection properties.
	///
	/// @param properties Vector of properties key/value pair.
	/// @dev EVM selector for this function is: 0x50b26b2a,
	///  or in textual repr: setCollectionProperties((string,bytes)[])
	function setCollectionProperties(Property[] memory properties) external;

	// /// Delete collection property.
	// ///
	// /// @param key Property key.
	// /// @dev EVM selector for this function is: 0x7b7debce,
	// ///  or in textual repr: deleteCollectionProperty(string)
	// function deleteCollectionProperty(string memory key) external;

	/// Delete collection properties.
	///
	/// @param keys Properties keys.
	/// @dev EVM selector for this function is: 0xee206ee3,
	///  or in textual repr: deleteCollectionProperties(string[])
	function deleteCollectionProperties(string[] memory keys) external;

	/// Get collection property.
	///
	/// @dev Throws error if key not found.
	///
	/// @param key Property key.
	/// @return bytes The property corresponding to the key.
	/// @dev EVM selector for this function is: 0xcf24fd6d,
	///  or in textual repr: collectionProperty(string)
	function collectionProperty(string memory key) external view returns (bytes memory);

	/// Get collection properties.
	///
	/// @param keys Properties keys. Empty keys for all propertyes.
	/// @return Vector of properties key/value pairs.
	/// @dev EVM selector for this function is: 0x285fb8e6,
	///  or in textual repr: collectionProperties(string[])
	function collectionProperties(string[] memory keys) external view returns (Property[] memory);

	// /// Set the sponsor of the collection.
	// ///
	// /// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	// ///
	// /// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	// /// @dev EVM selector for this function is: 0x7623402e,
	// ///  or in textual repr: setCollectionSponsor(address)
	// function setCollectionSponsor(address sponsor) external;

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Cross account address of the sponsor from whose account funds will be debited for operations with the contract.
	/// @dev EVM selector for this function is: 0x84a1d5a8,
	///  or in textual repr: setCollectionSponsorCross((address,uint256))
	function setCollectionSponsorCross(EthCrossAccount memory sponsor) external;

	/// Whether there is a pending sponsor.
	/// @dev EVM selector for this function is: 0x058ac185,
	///  or in textual repr: hasCollectionPendingSponsor()
	function hasCollectionPendingSponsor() external view returns (bool);

	/// Collection sponsorship confirmation.
	///
	/// @dev After setting the sponsor for the collection, it must be confirmed with this function.
	/// @dev EVM selector for this function is: 0x3c50e97a,
	///  or in textual repr: confirmCollectionSponsorship()
	function confirmCollectionSponsorship() external;

	/// Remove collection sponsor.
	/// @dev EVM selector for this function is: 0x6e0326a3,
	///  or in textual repr: removeCollectionSponsor()
	function removeCollectionSponsor() external;

	/// Get current sponsor.
	///
	/// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	/// @dev EVM selector for this function is: 0x6ec0a9f1,
	///  or in textual repr: collectionSponsor()
	function collectionSponsor() external view returns (EthCrossAccount memory);

	/// Get current collection limits.
	///
	/// @return Array of collection limits
	/// @dev EVM selector for this function is: 0xf63bc572,
	///  or in textual repr: collectionLimits()
	function collectionLimits() external view returns (CollectionLimit[] memory);

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Some limit.
	/// @dev EVM selector for this function is: 0x2a2235e7,
	///  or in textual repr: setCollectionLimit((uint8,bool,uint256))
	function setCollectionLimit(CollectionLimit memory limit) external;

	/// Get contract address.
	/// @dev EVM selector for this function is: 0xf6b4dfb4,
	///  or in textual repr: contractAddress()
	function contractAddress() external view returns (address);

	/// Add collection admin.
	/// @param newAdmin Cross account administrator address.
	/// @dev EVM selector for this function is: 0x859aa7d6,
	///  or in textual repr: addCollectionAdminCross((address,uint256))
	function addCollectionAdminCross(EthCrossAccount memory newAdmin) external;

	/// Remove collection admin.
	/// @param admin Cross account administrator address.
	/// @dev EVM selector for this function is: 0x6c0cd173,
	///  or in textual repr: removeCollectionAdminCross((address,uint256))
	function removeCollectionAdminCross(EthCrossAccount memory admin) external;

	// /// Add collection admin.
	// /// @param newAdmin Address of the added administrator.
	// /// @dev EVM selector for this function is: 0x92e462c7,
	// ///  or in textual repr: addCollectionAdmin(address)
	// function addCollectionAdmin(address newAdmin) external;

	// /// Remove collection admin.
	// ///
	// /// @param admin Address of the removed administrator.
	// /// @dev EVM selector for this function is: 0xfafd7b42,
	// ///  or in textual repr: removeCollectionAdmin(address)
	// function removeCollectionAdmin(address admin) external;

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: 'Owner' else to nesting: 'Disabled'
	/// @dev EVM selector for this function is: 0x112d4586,
	///  or in textual repr: setCollectionNesting(bool)
	function setCollectionNesting(bool enable) external;

	/// Toggle accessibility of collection nesting.
	///
	/// @param enable If "true" degenerates to nesting: {OwnerRestricted: [1, 2, 3]} else to nesting: 'Disabled'
	/// @param collections Addresses of collections that will be available for nesting.
	/// @dev EVM selector for this function is: 0x64872396,
	///  or in textual repr: setCollectionNesting(bool,address[])
	function setCollectionNesting(bool enable, address[] memory collections) external;

	/// Returns nesting for a collection
	/// @dev EVM selector for this function is: 0x22d25bfe,
	///  or in textual repr: collectionNestingRestrictedCollectionIds()
	function collectionNestingRestrictedCollectionIds() external view returns (Tuple26 memory);

	/// Returns permissions for a collection
	/// @dev EVM selector for this function is: 0x5b2eaf4b,
	///  or in textual repr: collectionNestingPermissions()
	function collectionNestingPermissions() external view returns (Tuple29[] memory);

	/// Set the collection access method.
	/// @param mode Access mode
	/// 	0 for Normal
	/// 	1 for AllowList
	/// @dev EVM selector for this function is: 0x41835d4c,
	///  or in textual repr: setCollectionAccess(uint8)
	function setCollectionAccess(uint8 mode) external;

	/// Checks that user allowed to operate with collection.
	///
	/// @param user User address to check.
	/// @dev EVM selector for this function is: 0x91b6df49,
	///  or in textual repr: allowlistedCross((address,uint256))
	function allowlistedCross(EthCrossAccount memory user) external view returns (bool);

	// /// Add the user to the allowed list.
	// ///
	// /// @param user Address of a trusted user.
	// /// @dev EVM selector for this function is: 0x67844fe6,
	// ///  or in textual repr: addToCollectionAllowList(address)
	// function addToCollectionAllowList(address user) external;

	/// Add user to allowed list.
	///
	/// @param user User cross account address.
	/// @dev EVM selector for this function is: 0xa0184a3a,
	///  or in textual repr: addToCollectionAllowListCross((address,uint256))
	function addToCollectionAllowListCross(EthCrossAccount memory user) external;

	// /// Remove the user from the allowed list.
	// ///
	// /// @param user Address of a removed user.
	// /// @dev EVM selector for this function is: 0x85c51acb,
	// ///  or in textual repr: removeFromCollectionAllowList(address)
	// function removeFromCollectionAllowList(address user) external;

	/// Remove user from allowed list.
	///
	/// @param user User cross account address.
	/// @dev EVM selector for this function is: 0x09ba452a,
	///  or in textual repr: removeFromCollectionAllowListCross((address,uint256))
	function removeFromCollectionAllowListCross(EthCrossAccount memory user) external;

	/// Switch permission for minting.
	///
	/// @param mode Enable if "true".
	/// @dev EVM selector for this function is: 0x00018e84,
	///  or in textual repr: setCollectionMintMode(bool)
	function setCollectionMintMode(bool mode) external;

	// /// Check that account is the owner or admin of the collection
	// ///
	// /// @param user account to verify
	// /// @return "true" if account is the owner or admin
	// /// @dev EVM selector for this function is: 0x9811b0c7,
	// ///  or in textual repr: isOwnerOrAdmin(address)
	// function isOwnerOrAdmin(address user) external view returns (bool);

	/// Check that account is the owner or admin of the collection
	///
	/// @param user User cross account to verify
	/// @return "true" if account is the owner or admin
	/// @dev EVM selector for this function is: 0x3e75a905,
	///  or in textual repr: isOwnerOrAdminCross((address,uint256))
	function isOwnerOrAdminCross(EthCrossAccount memory user) external view returns (bool);

	/// Returns collection type
	///
	/// @return `Fungible` or `NFT` or `ReFungible`
	/// @dev EVM selector for this function is: 0xd34b55b8,
	///  or in textual repr: uniqueCollectionType()
	function uniqueCollectionType() external view returns (string memory);

	/// Get collection owner.
	///
	/// @return Tuble with sponsor address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0xdf727d3b,
	///  or in textual repr: collectionOwner()
	function collectionOwner() external view returns (EthCrossAccount memory);

	// /// Changes collection owner to another account
	// ///
	// /// @dev Owner can be changed only by current owner
	// /// @param newOwner new owner account
	// /// @dev EVM selector for this function is: 0x4f53e226,
	// ///  or in textual repr: changeCollectionOwner(address)
	// function changeCollectionOwner(address newOwner) external;

	/// Get collection administrators
	///
	/// @return Vector of tuples with admins address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0x5813216b,
	///  or in textual repr: collectionAdmins()
	function collectionAdmins() external view returns (EthCrossAccount[] memory);

	/// Changes collection owner to another account
	///
	/// @dev Owner can be changed only by current owner
	/// @param newOwner new owner cross account
	/// @dev EVM selector for this function is: 0x6496c497,
	///  or in textual repr: changeCollectionOwnerCross((address,uint256))
	function changeCollectionOwnerCross(EthCrossAccount memory newOwner) external;
}

/// @dev Cross account struct
struct EthCrossAccount {
	address eth;
	uint256 sub;
}

/// @dev anonymous struct
struct Tuple29 {
	CollectionPermissions field_0;
	bool field_1;
}

/// @dev Ethereum representation of `NestingPermissions` (see [`up_data_structs::NestingPermissions`]) fields as an enumeration.
enum CollectionPermissions {
	/// @dev Owner of token can nest tokens under it.
	TokenOwner,
	/// @dev Admin of token collection can nest tokens under token.
	CollectionAdmin
}

/// @dev anonymous struct
struct Tuple26 {
	bool field_0;
	uint256[] field_1;
}

struct CollectionLimit {
	CollectionLimitField field;
	bool status;
	uint256 value;
}

/// @dev [`CollectionLimits`](up_data_structs::CollectionLimits) representation for EVM.
enum CollectionLimitField {
	/// @dev How many tokens can a user have on one account.
	AccountTokenOwnership,
	/// @dev How many bytes of data are available for sponsorship.
	SponsoredDataSize,
	/// @dev In any case, chain default: [`SponsoringRateLimit::SponsoringDisabled`]
	SponsoredDataRateLimit,
	/// @dev How many tokens can be mined into this collection.
	TokenLimit,
	/// @dev Timeouts for transfer sponsoring.
	SponsorTransferTimeout,
	/// @dev Timeout for sponsoring an approval in passed blocks.
	SponsorApproveTimeout,
	/// @dev Whether the collection owner of the collection can send tokens (which belong to other users).
	OwnerCanTransfer,
	/// @dev Can the collection owner burn other people's tokens.
	OwnerCanDestroy,
	/// @dev Is it possible to send tokens from this collection between users.
	TransferEnabled
}

/// @dev Ethereum representation of collection [`PropertyKey`](up_data_structs::PropertyKey) and [`PropertyValue`](up_data_structs::PropertyValue).
struct Property {
	/// @dev Property key.
	string key;
	/// @dev Property value.
	bytes value;
}

/// @dev the ERC-165 identifier for this interface is 0x7dee5997
interface ERC20UniqueExtensions is Dummy, ERC165 {
	/// @notice A description for the collection.
	/// @dev EVM selector for this function is: 0x7284e416,
	///  or in textual repr: description()
	function description() external view returns (string memory);

	/// @dev EVM selector for this function is: 0x269e6158,
	///  or in textual repr: mintCross((address,uint256),uint256)
	function mintCross(EthCrossAccount memory to, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0x0ecd0ab0,
	///  or in textual repr: approveCross((address,uint256),uint256)
	function approveCross(EthCrossAccount memory spender, uint256 amount) external returns (bool);

	// /// Burn tokens from account
	// /// @dev Function that burns an `amount` of the tokens of a given account,
	// /// deducting from the sender's allowance for said account.
	// /// @param from The account whose tokens will be burnt.
	// /// @param amount The amount that will be burnt.
	// /// @dev EVM selector for this function is: 0x79cc6790,
	// ///  or in textual repr: burnFrom(address,uint256)
	// function burnFrom(address from, uint256 amount) external returns (bool);

	/// Burn tokens from account
	/// @dev Function that burns an `amount` of the tokens of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	/// @dev EVM selector for this function is: 0xbb2f5a58,
	///  or in textual repr: burnFromCross((address,uint256),uint256)
	function burnFromCross(EthCrossAccount memory from, uint256 amount) external returns (bool);

	/// Mint tokens for multiple accounts.
	/// @param amounts array of pairs of account address and amount
	/// @dev EVM selector for this function is: 0x1acf2d55,
	///  or in textual repr: mintBulk((address,uint256)[])
	function mintBulk(Tuple9[] memory amounts) external returns (bool);

	/// @dev EVM selector for this function is: 0x2ada85ff,
	///  or in textual repr: transferCross((address,uint256),uint256)
	function transferCross(EthCrossAccount memory to, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0xd5cf430b,
	///  or in textual repr: transferFromCross((address,uint256),(address,uint256),uint256)
	function transferFromCross(
		EthCrossAccount memory from,
		EthCrossAccount memory to,
		uint256 amount
	) external returns (bool);
}

/// @dev anonymous struct
struct Tuple9 {
	address field_0;
	uint256 field_1;
}

/// @dev the ERC-165 identifier for this interface is 0x40c10f19
interface ERC20Mintable is Dummy, ERC165 {
	/// Mint tokens for `to` account.
	/// @param to account that will receive minted tokens
	/// @param amount amount of tokens to mint
	/// @dev EVM selector for this function is: 0x40c10f19,
	///  or in textual repr: mint(address,uint256)
	function mint(address to, uint256 amount) external returns (bool);
}

/// @dev inlined interface
interface ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @dev the ERC-165 identifier for this interface is 0x8cb847c4
interface ERC20 is Dummy, ERC165, ERC20Events {
	/// @dev EVM selector for this function is: 0x06fdde03,
	///  or in textual repr: name()
	function name() external view returns (string memory);

	/// @dev EVM selector for this function is: 0x95d89b41,
	///  or in textual repr: symbol()
	function symbol() external view returns (string memory);

	/// @dev EVM selector for this function is: 0x18160ddd,
	///  or in textual repr: totalSupply()
	function totalSupply() external view returns (uint256);

	/// @dev EVM selector for this function is: 0x313ce567,
	///  or in textual repr: decimals()
	function decimals() external view returns (uint8);

	/// @dev EVM selector for this function is: 0x70a08231,
	///  or in textual repr: balanceOf(address)
	function balanceOf(address owner) external view returns (uint256);

	/// @dev EVM selector for this function is: 0xa9059cbb,
	///  or in textual repr: transfer(address,uint256)
	function transfer(address to, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0x23b872dd,
	///  or in textual repr: transferFrom(address,address,uint256)
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) external returns (bool);

	/// @dev EVM selector for this function is: 0x095ea7b3,
	///  or in textual repr: approve(address,uint256)
	function approve(address spender, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0xdd62ed3e,
	///  or in textual repr: allowance(address,address)
	function allowance(address owner, address spender) external view returns (uint256);

	/// @notice Returns collection helper contract address
	/// @dev EVM selector for this function is: 0x1896cce6,
	///  or in textual repr: collectionHelperAddress()
	function collectionHelperAddress() external view returns (address);
}

interface UniqueFungible is Dummy, ERC165, ERC20, ERC20Mintable, ERC20UniqueExtensions, Collection {}
