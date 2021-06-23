// SPDX-License-Identifier: OTHER

pragma solidity >=0.8.0 <0.9.0;

contract ERC20 {
	uint8 _dummy = 0;
	string stub_error = "this contract does not exists, code for collections is implemented at pallet side";

	// 0x18160ddd
	function totalSupply() external view returns (uint256) {
		require(false, stub_error);
		_dummy;
		return 0;
	}

	// 0x70a08231
	function balanceOf(address account) external view returns (uint256) {
		require(false, stub_error);
		account;
		_dummy;
		return 0;
	}

	// 0xa9059cbb
	function transfer(address recipient, uint256 amount) external returns (bool) {
		require(false, stub_error);
		recipient;
		amount;
		_dummy = 0;
		return false;
	}

	// 0xdd62ed3e
	function allowance(address owner, address spender) external view returns (uint256) {
		require(false, stub_error);
		owner;
		spender;
		return _dummy;
	}

	// 0x095ea7b3
	function approve(address spender, uint256 amount) external returns (bool) {
		require(false, stub_error);
		spender;
		amount;
		_dummy = 0;
		return false;
	}

	// 0x23b872dd
	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
		require(false, stub_error);
		sender;
		recipient;
		amount;
		_dummy = 0;
		return false;
	}

	// While ERC165 is not required by spec of ERC20, better implement it
	// 0x01ffc9a7
	function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
		return 
			// ERC20
			interfaceID == 0x36372b07 || 
			// ERC165
			interfaceID == 0x01ffc9a7;
	}
}