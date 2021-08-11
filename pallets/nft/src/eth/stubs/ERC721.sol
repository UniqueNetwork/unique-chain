// SPDX-License-Identifier: OTHER
// This code is automatically generated with `cargo test --package pallet-nft -- eth::erc::name --exact --nocapture --ignored`

pragma solidity >=0.8.0 <0.9.0;

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

// Inline
contract ERC721Events {
	event Transfer(address from, address to, uint256 tokenId);
	event Approval(address owner, address approved, uint256 tokenId);
	event ApprovalForAll(address owner, address operator, bool approved);
}

// Inline
contract ERC721MintableEvents {
	event MintingFinished();
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

contract ERC721 is Dummy, ERC165, ERC721Events {
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}
	function ownerOf(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
	function safeTransferFromWithData(address from, address to, uint256 tokenId, bytes memory data) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		data;
		dummy = 0;
	}
	function safeTransferFrom(address from, address to, uint256 tokenId) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}
	function transferFrom(address from, address to, uint256 tokenId) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}
	function approve(address approved, uint256 tokenId) public {
		require(false, stub_error);
		approved;
		tokenId;
		dummy = 0;
	}
	function setApprovalForAll(address operator, bool approved) public {
		require(false, stub_error);
		operator;
		approved;
		dummy = 0;
	}
	function getApproved(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
	function isApprovedForAll(address owner, address operator) public view returns (address) {
		require(false, stub_error);
		owner;
		operator;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
}

contract ERC721Burnable is Dummy {
	function burn(uint256 tokenId) public {
		require(false, stub_error);
		tokenId;
		dummy = 0;
	}
}

contract ERC721Enumerable is Dummy, InlineTotalSupply {
	function tokenByIndex(uint256 index) public view returns (uint256) {
		require(false, stub_error);
		index;
		dummy;
		return 0;
	}
	function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
		require(false, stub_error);
		owner;
		index;
		dummy;
		return 0;
	}
}

contract ERC721Metadata is Dummy, InlineNameSymbol {
	function tokenURI(uint256 tokenId) public view returns (string memory) {
		require(false, stub_error);
		tokenId;
		dummy;
		return "";
	}
}

contract ERC721Mintable is Dummy, ERC721MintableEvents {
	function mintingFinished() public view returns (bool) {
		require(false, stub_error);
		dummy;
		return false;
	}
	function mint(address to, uint256 tokenId) public returns (bool) {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
		return false;
	}
	function mintWithTokenURI(address to, uint256 tokenId, string memory tokenUri) public returns (bool) {
		require(false, stub_error);
		to;
		tokenId;
		tokenUri;
		dummy = 0;
		return false;
	}
	function finishMinting() public returns (bool) {
		require(false, stub_error);
		dummy = 0;
		return false;
	}
}

contract ERC721UniqueExtensions is Dummy {
	function transfer(address to, uint256 tokenId) public {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
	}
	function nextTokenId() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}
}

contract UniqueNFT is Dummy, ERC165, ERC721, ERC721Metadata, ERC721Enumerable, ERC721UniqueExtensions, ERC721Mintable, ERC721Burnable {
}