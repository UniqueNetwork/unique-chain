// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@rmrk-team/evm-contracts/contracts/RMRK/nestable/RMRKNestable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract RMRKNestableMintable is RMRKNestable, IERC721Receiver {
	uint256 private _counter;

	constructor() RMRKNestable("RMRK", "nesting") {
		_counter = 1;
	}

	function safeMint(address to) external {
		_safeMint(to, _counter, "");
		_counter++;
	}

	function mint(address to, uint256 tokenId) external {
		_mint(to, tokenId, "");
	}

	function nestMint(address to, uint256 tokenId, uint256 destinationId) external {
		_nestMint(to, tokenId, destinationId, "");
	}

	function nestTransfer(address to, uint256 tokenId, uint256 destinationId) public virtual {
		nestTransferFrom(_msgSender(), to, tokenId, destinationId, "");
	}

	function transfer(address to, uint256 tokenId) public virtual {
		transferFrom(_msgSender(), to, tokenId);
	}

	function onERC721Received(
		address _operator,
		address _from,
		uint256 _tokenId,
		bytes calldata _data
	) external returns (bytes4) {
		return IERC721Receiver.onERC721Received.selector;
	}
}
