// SPDX-License-Identifier: OTHER

pragma solidity >=0.8.0 <0.9.0;

import "../api/UniqueFungible.sol";

contract UniqueFungibleProxy is UniqueFungible {
    UniqueFungible proxied;

    constructor(address _proxied) UniqueFungible() {
        proxied = UniqueFungible(_proxied);
    }

    function name() external view override returns (string memory) {
        return proxied.name();
    }

    function symbol() external view override returns (string memory) {
        return proxied.symbol();
    }

    function totalSupply() external view override returns (uint256) {
        return proxied.totalSupply();
    }

    function supportsInterface(uint32 interfaceId)
        external
        view
        override
        returns (bool)
    {
        return proxied.supportsInterface(interfaceId);
    }

    function decimals() external view override returns (uint8) {
        return proxied.decimals();
    }

    function balanceOf(address owner) external view override returns (uint256) {
        return proxied.balanceOf(owner);
    }

    function transfer(address to, uint256 amount)
        external
        override
        returns (bool)
    {
        return proxied.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override returns (bool) {
        return proxied.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount)
        external
        override
        returns (bool)
    {
        return proxied.approve(spender, amount);
    }

    function allowance(address owner, address spender)
        external
        view
        override
        returns (uint256)
    {
        return proxied.allowance(owner, spender);
    }
}
