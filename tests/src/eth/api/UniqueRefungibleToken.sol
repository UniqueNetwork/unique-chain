// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

/// @dev the ERC-165 identifier for this interface is 0x5755c3f2
interface ERC1633 is Dummy, ERC165 {
	/// @dev EVM selector for this function is: 0x80a54001,
	///  or in textual repr: parentToken()
	function parentToken() external view returns (address);

	/// @dev EVM selector for this function is: 0xd7f083f3,
	///  or in textual repr: parentTokenId()
	function parentTokenId() external view returns (uint256);
}

/// @dev the ERC-165 identifier for this interface is 0xab8deb37
interface ERC20UniqueExtensions is Dummy, ERC165 {
	/// @dev Function that burns an amount of the token of a given account,
	/// deducting from the sender's allowance for said account.
	/// @param from The account whose tokens will be burnt.
	/// @param amount The amount that will be burnt.
	/// @dev EVM selector for this function is: 0x79cc6790,
	///  or in textual repr: burnFrom(address,uint256)
	function burnFrom(address from, uint256 amount) external returns (bool);

	/// @dev Function that changes total amount of the tokens.
	///  Throws if `msg.sender` doesn't owns all of the tokens.
	/// @param amount New total amount of the tokens.
	/// @dev EVM selector for this function is: 0xd2418ca7,
	///  or in textual repr: repartition(uint256)
	function repartition(uint256 amount) external returns (bool);
}

/// @dev inlined interface
interface ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @title Standard ERC20 token
///
/// @dev Implementation of the basic standard token.
/// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
/// @dev the ERC-165 identifier for this interface is 0x942e8b22
interface ERC20 is Dummy, ERC165, ERC20Events {
	/// @return the name of the token.
	/// @dev EVM selector for this function is: 0x06fdde03,
	///  or in textual repr: name()
	function name() external view returns (string memory);

	/// @return the symbol of the token.
	/// @dev EVM selector for this function is: 0x95d89b41,
	///  or in textual repr: symbol()
	function symbol() external view returns (string memory);

	/// @dev Total number of tokens in existence
	/// @dev EVM selector for this function is: 0x18160ddd,
	///  or in textual repr: totalSupply()
	function totalSupply() external view returns (uint256);

	/// @dev Not supported
	/// @dev EVM selector for this function is: 0x313ce567,
	///  or in textual repr: decimals()
	function decimals() external view returns (uint8);

	/// @dev Gets the balance of the specified address.
	/// @param owner The address to query the balance of.
	/// @return An uint256 representing the amount owned by the passed address.
	/// @dev EVM selector for this function is: 0x70a08231,
	///  or in textual repr: balanceOf(address)
	function balanceOf(address owner) external view returns (uint256);

	/// @dev Transfer token for a specified address
	/// @param to The address to transfer to.
	/// @param amount The amount to be transferred.
	/// @dev EVM selector for this function is: 0xa9059cbb,
	///  or in textual repr: transfer(address,uint256)
	function transfer(address to, uint256 amount) external returns (bool);

	/// @dev Transfer tokens from one address to another
	/// @param from address The address which you want to send tokens from
	/// @param to address The address which you want to transfer to
	/// @param amount uint256 the amount of tokens to be transferred
	/// @dev EVM selector for this function is: 0x23b872dd,
	///  or in textual repr: transferFrom(address,address,uint256)
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) external returns (bool);

	/// @dev Approve the passed address to spend the specified amount of tokens on behalf of `msg.sender`.
	/// Beware that changing an allowance with this method brings the risk that someone may use both the old
	/// and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
	/// race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
	/// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
	/// @param spender The address which will spend the funds.
	/// @param amount The amount of tokens to be spent.
	/// @dev EVM selector for this function is: 0x095ea7b3,
	///  or in textual repr: approve(address,uint256)
	function approve(address spender, uint256 amount) external returns (bool);

	/// @dev Function to check the amount of tokens that an owner allowed to a spender.
	/// @param owner address The address which owns the funds.
	/// @param spender address The address which will spend the funds.
	/// @return A uint256 specifying the amount of tokens still available for the spender.
	/// @dev EVM selector for this function is: 0xdd62ed3e,
	///  or in textual repr: allowance(address,address)
	function allowance(address owner, address spender) external view returns (uint256);
}

interface UniqueRefungibleToken is Dummy, ERC165, ERC20, ERC20UniqueExtensions, ERC1633 {}
