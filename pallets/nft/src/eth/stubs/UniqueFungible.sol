// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

// Inline
contract ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(
		address indexed owner,
		address indexed spender,
		uint256 value
	);
}

// Inline
contract InlineNameSymbol is Dummy {
	// Selector: name() 06fdde03
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	// Selector: symbol() 95d89b41
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}
}

// Inline
contract InlineTotalSupply is Dummy {
	// Selector: totalSupply() 18160ddd
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}
}

contract ERC165 is Dummy {
	// Selector: supportsInterface(bytes4) 01ffc9a7
	function supportsInterface(uint32 interfaceId) public view returns (bool) {
		require(false, stub_error);
		interfaceId;
		dummy;
		return false;
	}
}

contract ERC20 is Dummy, InlineNameSymbol, InlineTotalSupply, ERC20Events {
	// Selector: decimals() 313ce567
	function decimals() public view returns (uint8) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}

	// Selector: transferFrom(address,address,uint256) 23b872dd
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

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address spender, uint256 amount) public returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		dummy = 0;
		return false;
	}

	// Selector: allowance(address,address) dd62ed3e
	function allowance(address owner, address spender)
		public
		view
		returns (uint256)
	{
		require(false, stub_error);
		owner;
		spender;
		dummy;
		return 0;
	}
}

contract UniqueFungible is Dummy, ERC165, ERC20 {}
