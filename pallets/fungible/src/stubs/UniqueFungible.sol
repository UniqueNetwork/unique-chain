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

/// @title A contract that allows you to work with collections.
/// @dev the ERC-165 identifier for this interface is 0x660da1e8
contract Collection is Dummy, ERC165 {
	/// Set collection property.
	///
	/// @param key Property key.
	/// @param value Propery value.
	/// @dev EVM selector for this function is: 0x2f073f66,
	///  or in textual repr: setCollectionProperty(string,bytes)
	function setCollectionProperty(string memory key, bytes memory value) public {
		require(false, stub_error);
		key;
		value;
		dummy = 0;
	}

	/// Delete collection property.
	///
	/// @param key Property key.
	/// @dev EVM selector for this function is: 0x7b7debce,
	///  or in textual repr: deleteCollectionProperty(string)
	function deleteCollectionProperty(string memory key) public {
		require(false, stub_error);
		key;
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

	/// Set the sponsor of the collection.
	///
	/// @dev In order for sponsorship to work, it must be confirmed on behalf of the sponsor.
	///
	/// @param sponsor Address of the sponsor from whose account funds will be debited for operations with the contract.
	/// @dev EVM selector for this function is: 0x7623402e,
	///  or in textual repr: setCollectionSponsor(address)
	function setCollectionSponsor(address sponsor) public {
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
	function collectionSponsor() public view returns (Tuple6 memory) {
		require(false, stub_error);
		dummy;
		return Tuple6(0x0000000000000000000000000000000000000000, 0);
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Name of the limit. Valid names:
	/// 	"accountTokenOwnershipLimit",
	/// 	"sponsoredDataSize",
	/// 	"sponsoredDataRateLimit",
	/// 	"tokenLimit",
	/// 	"sponsorTransferTimeout",
	/// 	"sponsorApproveTimeout"
	/// @param value Value of the limit.
	/// @dev EVM selector for this function is: 0x6a3841db,
	///  or in textual repr: setCollectionLimit(string,uint32)
	function setCollectionLimit(string memory limit, uint32 value) public {
		require(false, stub_error);
		limit;
		value;
		dummy = 0;
	}

	/// Set limits for the collection.
	/// @dev Throws error if limit not found.
	/// @param limit Name of the limit. Valid names:
	/// 	"ownerCanTransfer",
	/// 	"ownerCanDestroy",
	/// 	"transfersEnabled"
	/// @param value Value of the limit.
	/// @dev EVM selector for this function is: 0x993b7fba,
	///  or in textual repr: setCollectionLimit(string,bool)
	function setCollectionLimit(string memory limit, bool value) public {
		require(false, stub_error);
		limit;
		value;
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
	/// @param newAdmin Address of the added administrator.
	/// @dev EVM selector for this function is: 0x92e462c7,
	///  or in textual repr: addCollectionAdmin(address)
	function addCollectionAdmin(address newAdmin) public {
		require(false, stub_error);
		newAdmin;
		dummy = 0;
	}

	/// Remove collection admin.
	///
	/// @param admin Address of the removed administrator.
	/// @dev EVM selector for this function is: 0xfafd7b42,
	///  or in textual repr: removeCollectionAdmin(address)
	function removeCollectionAdmin(address admin) public {
		require(false, stub_error);
		admin;
		dummy = 0;
	}

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
	/// @dev EVM selector for this function is: 0xd63a8e11,
	///  or in textual repr: allowed(address)
	function allowed(address user) public view returns (bool) {
		require(false, stub_error);
		user;
		dummy;
		return false;
	}

	/// Add the user to the allowed list.
	///
	/// @param user Address of a trusted user.
	/// @dev EVM selector for this function is: 0x67844fe6,
	///  or in textual repr: addToCollectionAllowList(address)
	function addToCollectionAllowList(address user) public {
		require(false, stub_error);
		user;
		dummy = 0;
	}

	/// Remove the user from the allowed list.
	///
	/// @param user Address of a removed user.
	/// @dev EVM selector for this function is: 0x85c51acb,
	///  or in textual repr: removeFromCollectionAllowList(address)
	function removeFromCollectionAllowList(address user) public {
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

	/// Check that account is the owner or admin of the collection
	///
	/// @param user account to verify
	/// @return "true" if account is the owner or admin
	/// @dev EVM selector for this function is: 0x9811b0c7,
	///  or in textual repr: isOwnerOrAdmin(address)
	function isOwnerOrAdmin(address user) public view returns (bool) {
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
	/// @return Tuple with sponsor address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0xdf727d3b,
	///  or in textual repr: collectionOwner()
	function collectionOwner() public view returns (Tuple6 memory) {
		require(false, stub_error);
		dummy;
		return Tuple6(0x0000000000000000000000000000000000000000, 0);
	}

	/// Changes collection owner to another account
	///
	/// @dev Owner can be changed only by current owner
	/// @param newOwner new owner account
	/// @dev EVM selector for this function is: 0x13af4035,
	///  or in textual repr: setOwner(address)
	function setOwner(address newOwner) public {
		require(false, stub_error);
		newOwner;
		dummy = 0;
	}

	/// Get collection administrators
	///
	/// @return Vector of tuples with admins address and his substrate mirror.
	/// If address is canonical then substrate mirror is zero and vice versa.
	/// @dev EVM selector for this function is: 0x5813216b,
	///  or in textual repr: collectionAdmins()
	function collectionAdmins() public view returns (Tuple6[] memory) {
		require(false, stub_error);
		dummy;
		return new Tuple6[](0);
	}
}

/// @dev the ERC-165 identifier for this interface is 0x63034ac5
contract ERC20UniqueExtensions is Dummy, ERC165 {
	/// Burn tokens from account
	/// @dev Function that burns an `amount` of the tokens of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	/// @dev EVM selector for this function is: 0x79cc6790,
	///  or in textual repr: burnFrom(address,uint256)
	function burnFrom(address from, uint256 amount) public returns (bool) {
		require(false, stub_error);
		from;
		amount;
		dummy = 0;
		return false;
	}

	/// Mint tokens for multiple accounts.
	/// @param amounts array of pairs of account address and amount
	/// @dev EVM selector for this function is: 0x1acf2d55,
	///  or in textual repr: mintBulk((address,uint256)[])
	function mintBulk(Tuple6[] memory amounts) public returns (bool) {
		require(false, stub_error);
		amounts;
		dummy = 0;
		return false;
	}
}

/// @dev anonymous struct
struct Tuple6 {
	address field_0;
	uint256 field_1;
}

/// @dev the ERC-165 identifier for this interface is 0x40c10f19
contract ERC20Mintable is Dummy, ERC165 {
	/// Mint tokens for `to` account.
	/// @param to account that will receive minted tokens
	/// @param amount amount of tokens to mint
	/// @dev EVM selector for this function is: 0x40c10f19,
	///  or in textual repr: mint(address,uint256)
	function mint(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}
}

/// @dev inlined interface
contract ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @dev the ERC-165 identifier for this interface is 0x942e8b22
contract ERC20 is Dummy, ERC165, ERC20Events {
	/// @dev EVM selector for this function is: 0x06fdde03,
	///  or in textual repr: name()
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// @dev EVM selector for this function is: 0x95d89b41,
	///  or in textual repr: symbol()
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	/// @dev EVM selector for this function is: 0x18160ddd,
	///  or in textual repr: totalSupply()
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	/// @dev EVM selector for this function is: 0x313ce567,
	///  or in textual repr: decimals()
	function decimals() public view returns (uint8) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	/// @dev EVM selector for this function is: 0x70a08231,
	///  or in textual repr: balanceOf(address)
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	/// @dev EVM selector for this function is: 0xa9059cbb,
	///  or in textual repr: transfer(address,uint256)
	function transfer(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}

	/// @dev EVM selector for this function is: 0x23b872dd,
	///  or in textual repr: transferFrom(address,address,uint256)
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

	/// @dev EVM selector for this function is: 0x095ea7b3,
	///  or in textual repr: approve(address,uint256)
	function approve(address spender, uint256 amount) public returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		dummy = 0;
		return false;
	}

	/// @dev EVM selector for this function is: 0xdd62ed3e,
	///  or in textual repr: allowance(address,address)
	function allowance(address owner, address spender) public view returns (uint256) {
		require(false, stub_error);
		owner;
		spender;
		dummy;
		return 0;
	}
}

contract UniqueFungible is Dummy, ERC165, ERC20, ERC20Mintable, ERC20UniqueExtensions, Collection {}
