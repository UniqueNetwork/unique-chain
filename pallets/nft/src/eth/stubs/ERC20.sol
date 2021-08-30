// SPDX-License-Identifier: OTHER
// This code is automatically generated with `cargo test --package pallet-nft -- eth::erc::name --exact --nocapture --ignored`

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

// Inline
contract ERC20Events {
	event Transfer(address from, address to, uint256 value);
	event Approval(address owner, address spender, uint256 value);
}

// Inline
contract InlineNameSymbol is Dummy {
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}
}

// Inline
contract InlineTotalSupply is Dummy {
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}
}

contract ERC165 is Dummy {
	function supportsInterface(uint32 interfaceId) public view returns (bool) {
		require(false, stub_error);
		interfaceId;
		dummy;
		return false;
	}
}

contract ERC20 is Dummy, InlineNameSymbol, InlineTotalSupply, ERC20Events {
	function decimals() public view returns (uint8) {
		require(false, stub_error);
		dummy;
		return 0;
	}
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}
	function transfer(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}
	function transferFrom(address from, address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		from;
		to;
		amount;
		dummy = 0;
		return false;
	}
	function approve(address spender, uint256 amount) public returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		dummy = 0;
		return false;
	}
	function allowance(address owner, address spender) public view returns (uint256) {
		require(false, stub_error);
		owner;
		spender;
		dummy;
		return 0;
	}
}

contract UniqueFungible is Dummy, ERC165, ERC20 {
}