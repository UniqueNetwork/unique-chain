// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./RMRKNestableMintable.sol";

contract Relayer is RMRKNestableMintable {
	address _receiver;

	constructor(address recevier) {
		_receiver = recevier;
	}

	function relay(bytes calldata payload) external {
		(bool succes, bytes memory _returnData) = address(_receiver).call(payload);
		require(succes);
	}
}
