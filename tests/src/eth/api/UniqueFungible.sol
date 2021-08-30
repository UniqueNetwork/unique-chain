// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

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

// Inline
interface InlineNameSymbol is Dummy {
	function name() external view returns (string memory);

	function symbol() external view returns (string memory);
}

// Inline
interface InlineTotalSupply is Dummy {
	function totalSupply() external view returns (uint256);
}

interface ERC165 is Dummy {
	function supportsInterface(uint32 interfaceId) external view returns (bool);
}

interface ERC20 is Dummy, InlineNameSymbol, InlineTotalSupply, ERC20Events {
	function decimals() external view returns (uint8);

	function balanceOf(address owner) external view returns (uint256);

	function transfer(address to, uint256 amount) external returns (bool);

	function transferFrom(
		address from,
		address to,
		uint256 amount
	) external returns (bool);

	function approve(address spender, uint256 amount) external returns (bool);

	function allowance(address owner, address spender)
		external
		view
		returns (uint256);
}

interface UniqueFungible is Dummy, ERC165, ERC20 {}
