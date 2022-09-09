// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
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

/// @dev inlined interface
contract ContractHelpersEvents {
	event ContractSponsorSet(address indexed contractAddress, address sponsor);
	event ContractSponsorshipConfirmed(
		address indexed contractAddress,
		address sponsor
	);
	event ContractSponsorRemoved(address indexed contractAddress);
}

/// @title Magic contract, which allows users to reconfigure other contracts
/// @dev the ERC-165 identifier for this interface is 0xd77fab70
contract ContractHelpers is Dummy, ERC165, ContractHelpersEvents {
	/// Get user, which deployed specified contract
	/// @dev May return zero address in case if contract is deployed
	///  using uniquenetwork evm-migration pallet, or using other terms not
	///  intended by pallet-evm
	/// @dev Returns zero address if contract does not exists
	/// @param contractAddress Contract to get owner of
	/// @return address Owner of contract
	/// @dev EVM selector for this function is: 0x5152b14c,
	///  or in textual repr: contractOwner(address)
	function contractOwner(address contractAddress)
		public
		view
		returns (address)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	/// Set sponsor.
	/// @param contractAddress Contract for which a sponsor is being established.
	/// @param sponsor User address who set as pending sponsor.
	/// @dev EVM selector for this function is: 0xf01fba93,
	///  or in textual repr: setSponsor(address,address)
	function setSponsor(address contractAddress, address sponsor) public {
		require(false, stub_error);
		contractAddress;
		sponsor;
		dummy = 0;
	}

	/// Set contract as self sponsored.
	///
	/// @param contractAddress Contract for which a self sponsoring is being enabled.
	/// @dev EVM selector for this function is: 0x89f7d9ae,
	///  or in textual repr: selfSponsoredEnable(address)
	function selfSponsoredEnable(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	/// Remove sponsor.
	///
	/// @param contractAddress Contract for which a sponsorship is being removed.
	/// @dev EVM selector for this function is: 0xef784250,
	///  or in textual repr: removeSponsor(address)
	function removeSponsor(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	/// Confirm sponsorship.
	///
	/// @dev Caller must be same that set via [`setSponsor`].
	///
	/// @param contractAddress Сontract for which need to confirm sponsorship.
	/// @dev EVM selector for this function is: 0xabc00001,
	///  or in textual repr: confirmSponsorship(address)
	function confirmSponsorship(address contractAddress) public {
		require(false, stub_error);
		contractAddress;
		dummy = 0;
	}

	/// Get current sponsor.
	///
	/// @param contractAddress The contract for which a sponsor is requested.
	/// @return Tuble with sponsor address and his substrate mirror. If there is no confirmed sponsor error "Contract has no sponsor" throw.
	/// @dev EVM selector for this function is: 0x743fc745,
	///  or in textual repr: getSponsor(address)
	function getSponsor(address contractAddress)
		public
		view
		returns (Tuple0 memory)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return Tuple0(0x0000000000000000000000000000000000000000, 0);
	}

	/// Check tat contract has confirmed sponsor.
	///
	/// @param contractAddress The contract for which the presence of a confirmed sponsor is checked.
	/// @return **true** if contract has confirmed sponsor.
	/// @dev EVM selector for this function is: 0x97418603,
	///  or in textual repr: hasSponsor(address)
	function hasSponsor(address contractAddress) public view returns (bool) {
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	/// Check tat contract has pending sponsor.
	///
	/// @param contractAddress The contract for which the presence of a pending sponsor is checked.
	/// @return **true** if contract has pending sponsor.
	/// @dev EVM selector for this function is: 0x39b9b242,
	///  or in textual repr: hasPendingSponsor(address)
	function hasPendingSponsor(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	/// @dev EVM selector for this function is: 0x6027dc61,
	///  or in textual repr: sponsoringEnabled(address)
	function sponsoringEnabled(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	/// @dev EVM selector for this function is: 0xfde8a560,
	///  or in textual repr: setSponsoringMode(address,uint8)
	function setSponsoringMode(address contractAddress, uint8 mode) public {
		require(false, stub_error);
		contractAddress;
		mode;
		dummy = 0;
	}

	/// Get current contract sponsoring rate limit
	/// @param contractAddress Contract to get sponsoring mode of
	/// @return uint32 Amount of blocks between two sponsored transactions
	/// @dev EVM selector for this function is: 0x610cfabd,
	///  or in textual repr: getSponsoringRateLimit(address)
	function getSponsoringRateLimit(address contractAddress)
		public
		view
		returns (uint32)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return 0;
	}

	/// Set contract sponsoring rate limit
	/// @dev Sponsoring rate limit - is a minimum amount of blocks that should
	///  pass between two sponsored transactions
	/// @param contractAddress Contract to change sponsoring rate limit of
	/// @param rateLimit Target rate limit
	/// @dev Only contract owner can change this setting
	/// @dev EVM selector for this function is: 0x77b6c908,
	///  or in textual repr: setSponsoringRateLimit(address,uint32)
	function setSponsoringRateLimit(address contractAddress, uint32 rateLimit)
		public
	{
		require(false, stub_error);
		contractAddress;
		rateLimit;
		dummy = 0;
	}

	/// Is specified user present in contract allow list
	/// @dev Contract owner always implicitly included
	/// @param contractAddress Contract to check allowlist of
	/// @param user User to check
	/// @return bool Is specified users exists in contract allowlist
	/// @dev EVM selector for this function is: 0x5c658165,
	///  or in textual repr: allowed(address,address)
	function allowed(address contractAddress, address user)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		user;
		dummy;
		return false;
	}

	/// Toggle user presence in contract allowlist
	/// @param contractAddress Contract to change allowlist of
	/// @param user Which user presence should be toggled
	/// @param isAllowed `true` if user should be allowed to be sponsored
	///  or call this contract, `false` otherwise
	/// @dev Only contract owner can change this setting
	/// @dev EVM selector for this function is: 0x4706cc1c,
	///  or in textual repr: toggleAllowed(address,address,bool)
	function toggleAllowed(
		address contractAddress,
		address user,
		bool isAllowed
	) public {
		require(false, stub_error);
		contractAddress;
		user;
		isAllowed;
		dummy = 0;
	}

	/// Is this contract has allowlist access enabled
	/// @dev Allowlist always can have users, and it is used for two purposes:
	///  in case of allowlist sponsoring mode, users will be sponsored if they exist in allowlist
	///  in case of allowlist access enabled, only users from allowlist may call this contract
	/// @param contractAddress Contract to get allowlist access of
	/// @return bool Is specified contract has allowlist access enabled
	/// @dev EVM selector for this function is: 0xc772ef6c,
	///  or in textual repr: allowlistEnabled(address)
	function allowlistEnabled(address contractAddress)
		public
		view
		returns (bool)
	{
		require(false, stub_error);
		contractAddress;
		dummy;
		return false;
	}

	/// Toggle contract allowlist access
	/// @param contractAddress Contract to change allowlist access of
	/// @param enabled Should allowlist access to be enabled?
	/// @dev EVM selector for this function is: 0x36de20f5,
	///  or in textual repr: toggleAllowlist(address,bool)
	function toggleAllowlist(address contractAddress, bool enabled) public {
		require(false, stub_error);
		contractAddress;
		enabled;
		dummy = 0;
	}
}

/// @dev anonymous struct
struct Tuple0 {
	address field_0;
	uint256 field_1;
}
