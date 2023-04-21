// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

/// @dev common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

/// @dev the ERC-165 identifier for this interface is 0xff15c6f4
interface ERC20UniqueExtensions is Dummy, ERC165 {
	/// @dev EVM selector for this function is: 0x2ada85ff,
	///  or in textual repr: transferCross((address,uint256),uint256)
	function transferCross(CrossAddress memory to, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0xd5cf430b,
	///  or in textual repr: transferFromCross((address,uint256),(address,uint256),uint256)
	function transferFromCross(
		CrossAddress memory from,
		CrossAddress memory to,
		uint256 amount
	) external returns (bool);
}

/// Cross account struct
struct CrossAddress {
	address eth;
	uint256 sub;
}

/// @dev inlined interface
interface ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
}

/// @dev the ERC-165 identifier for this interface is 0x942e8b22
interface ERC20 is Dummy, ERC165, ERC20Events {
	/// @dev EVM selector for this function is: 0xdd62ed3e,
	///  or in textual repr: allowance(address,address)
	function allowance(address owner, address spender) external view returns (uint256);

	/// @dev EVM selector for this function is: 0x095ea7b3,
	///  or in textual repr: approve(address,uint256)
	function approve(address spender, uint256 amount) external returns (bool);

	/// @dev EVM selector for this function is: 0x70a08231,
	///  or in textual repr: balanceOf(address)
	function balanceOf(address owner) external view returns (uint256);

	/// @dev EVM selector for this function is: 0x313ce567,
	///  or in textual repr: decimals()
	function decimals() external view returns (uint8);

	/// @dev EVM selector for this function is: 0x06fdde03,
	///  or in textual repr: name()
	function name() external view returns (string memory);

	/// @dev EVM selector for this function is: 0x95d89b41,
	///  or in textual repr: symbol()
	function symbol() external view returns (string memory);

	/// @dev EVM selector for this function is: 0x18160ddd,
	///  or in textual repr: totalSupply()
	function totalSupply() external view returns (uint256);

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
}

interface UniqueNativeFungible is Dummy, ERC165, ERC20, ERC20UniqueExtensions {}
