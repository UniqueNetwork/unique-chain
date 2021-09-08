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
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);
}

// Inline
interface InlineTotalSupply is Dummy {
	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);
}

interface ERC165 is Dummy {
	// Selector: supportsInterface(bytes4) 01ffc9a7
	function supportsInterface(uint32 interfaceId) external view returns (bool);
}

interface ERC20 is Dummy, InlineNameSymbol, InlineTotalSupply, ERC20Events {
	// Selector: decimals() 313ce567
	function decimals() external view returns (uint8);

	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) external view returns (uint256);

	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 amount) external returns (bool);

	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) external returns (bool);

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address spender, uint256 amount) external returns (bool);

	// Selector: allowance(address,address) dd62ed3e
	function allowance(address owner, address spender)
		external
		view
		returns (uint256);
}

interface UniqueFungible is Dummy, ERC165, ERC20 {}
