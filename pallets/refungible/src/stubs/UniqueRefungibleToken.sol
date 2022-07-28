// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
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

// Inline
contract ERC20Events {
	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(
		address indexed owner,
		address indexed spender,
		uint256 value
	);
}

// Selector: 942e8b22
contract ERC20 is Dummy, ERC165, ERC20Events {
	// @return the name of the token.
	//
	// Selector: name() 06fdde03
	function name() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	// @return the symbol of the token.
	//
	// Selector: symbol() 95d89b41
	function symbol() public view returns (string memory) {
		require(false, stub_error);
		dummy;
		return "";
	}

	// @dev Total number of tokens in existence
	//
	// Selector: totalSupply() 18160ddd
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// @dev Not supported
	//
	// Selector: decimals() 313ce567
	function decimals() public view returns (uint8) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// @dev Gets the balance of the specified address.
	// @param owner The address to query the balance of.
	// @return An uint256 representing the amount owned by the passed address.
	//
	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	// @dev Transfer token for a specified address
	// @param to The address to transfer to.
	// @param amount The amount to be transferred.
	//
	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 amount) public returns (bool) {
		require(false, stub_error);
		to;
		amount;
		dummy = 0;
		return false;
	}

	// @dev Transfer tokens from one address to another
	// @param from address The address which you want to send tokens from
	// @param to address The address which you want to transfer to
	// @param amount uint256 the amount of tokens to be transferred
	//
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

	// @dev Approve the passed address to spend the specified amount of tokens on behalf of `msg.sender`.
	// Beware that changing an allowance with this method brings the risk that someone may use both the old
	// and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
	// race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
	// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
	// @param spender The address which will spend the funds.
	// @param amount The amount of tokens to be spent.
	//
	// Selector: approve(address,uint256) 095ea7b3
	function approve(address spender, uint256 amount) public returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		dummy = 0;
		return false;
	}

	// @dev Function to check the amount of tokens that an owner allowed to a spender.
	// @param owner address The address which owns the funds.
	// @param spender address The address which will spend the funds.
	// @return A uint256 specifying the amount of tokens still available for the spender.
	//
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

// Selector: ab8deb37
contract ERC20UniqueExtensions is Dummy, ERC165 {
	// @dev Function that burns an amount of the token of a given account,
	// deducting from the sender's allowance for said account.
	// @param from The account whose tokens will be burnt.
	// @param amount The amount that will be burnt.
	//
	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 amount) public returns (bool) {
		require(false, stub_error);
		from;
		amount;
		dummy = 0;
		return false;
	}

	// @dev Function that changes total amount of the tokens.
	//  Throws if `msg.sender` doesn't owns all of the tokens.
	// @param amount New total amount of the tokens.
	//
	// Selector: repartition(uint256) d2418ca7
	function repartition(uint256 amount) public returns (bool) {
		require(false, stub_error);
		amount;
		dummy = 0;
		return false;
	}
}

contract UniqueRefungibleToken is Dummy, ERC165, ERC20, ERC20UniqueExtensions {}
