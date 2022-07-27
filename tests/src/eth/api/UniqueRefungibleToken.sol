// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
interface Dummy {

}

interface ERC165 is Dummy {
	function supportsInterface(bytes4 interfaceID) external view returns (bool);
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

// Selector: 942e8b22
interface ERC20 is Dummy, ERC165, ERC20Events {
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);

	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);

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

// Selector: ab8deb37
interface ERC20UniqueExtensions is Dummy, ERC165 {
	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 amount) external returns (bool);

	// Selector: repartition(uint256) d2418ca7
	function repartition(uint256 amount) external returns (bool);
}

interface UniqueRefungibleToken is
	Dummy,
	ERC165,
	ERC20,
	ERC20UniqueExtensions
{}
