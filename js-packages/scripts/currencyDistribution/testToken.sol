// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.17;

import "node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor() ERC20("TEST", "TST")  {
	}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}