// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Anonymous struct
struct Tuple0 {
	uint256 field_0;
	string field_1;
}

// Common stubs holder
contract Dummy {
	uint8 dummy;
	string stub_error = "this contract is implemented in native";
}

// Inline
contract ERC721Events {
	event Transfer(
		address indexed from,
		address indexed to,
		uint256 indexed tokenId
	);
	event Approval(
		address indexed owner,
		address indexed approved,
		uint256 indexed tokenId
	);
	event ApprovalForAll(
		address indexed owner,
		address indexed operator,
		bool approved
	);
}

// Inline
contract ERC721MintableEvents {
	event MintingFinished();
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

contract ERC721 is Dummy, ERC165, ERC721Events {
	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) public view returns (uint256) {
		require(false, stub_error);
		owner;
		dummy;
		return 0;
	}

	// Selector: ownerOf(uint256) 6352211e
	function ownerOf(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: safeTransferFromWithData(address,address,uint256,bytes) 60a11672
	function safeTransferFromWithData(
		address from,
		address to,
		uint256 tokenId,
		bytes memory data
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		data;
		dummy = 0;
	}

	// Selector: safeTransferFrom(address,address,uint256) 42842e0e
	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}

	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) public {
		require(false, stub_error);
		from;
		to;
		tokenId;
		dummy = 0;
	}

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address approved, uint256 tokenId) public {
		require(false, stub_error);
		approved;
		tokenId;
		dummy = 0;
	}

	// Selector: setApprovalForAll(address,bool) a22cb465
	function setApprovalForAll(address operator, bool approved) public {
		require(false, stub_error);
		operator;
		approved;
		dummy = 0;
	}

	// Selector: getApproved(uint256) 081812fc
	function getApproved(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Selector: isApprovedForAll(address,address) e985e9c5
	function isApprovedForAll(address owner, address operator)
		public
		view
		returns (address)
	{
		require(false, stub_error);
		owner;
		operator;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}
}

contract ERC721Burnable is Dummy {
	// Selector: burn(uint256) 42966c68
	function burn(uint256 tokenId) public {
		require(false, stub_error);
		tokenId;
		dummy = 0;
	}
}

contract ERC721Enumerable is Dummy, InlineTotalSupply {
	// Selector: tokenByIndex(uint256) 4f6ccce7
	function tokenByIndex(uint256 index) public view returns (uint256) {
		require(false, stub_error);
		index;
		dummy;
		return 0;
	}

	// Selector: tokenOfOwnerByIndex(address,uint256) 2f745c59
	function tokenOfOwnerByIndex(address owner, uint256 index)
		public
		view
		returns (uint256)
	{
		require(false, stub_error);
		owner;
		index;
		dummy;
		return 0;
	}
}

contract ERC721Metadata is Dummy, InlineNameSymbol {
	// Selector: tokenURI(uint256) c87b56dd
	function tokenURI(uint256 tokenId) public view returns (string memory) {
		require(false, stub_error);
		tokenId;
		dummy;
		return "";
	}
}

contract ERC721Mintable is Dummy, ERC721MintableEvents {
	// Selector: mintingFinished() 05d2035b
	function mintingFinished() public view returns (bool) {
		require(false, stub_error);
		dummy;
		return false;
	}

	// Selector: mint(address,uint256) 40c10f19
	function mint(address to, uint256 tokenId) public returns (bool) {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
		return false;
	}

	// Selector: mintWithTokenURI(address,uint256,string) 50bb4e7f
	function mintWithTokenURI(
		address to,
		uint256 tokenId,
		string memory tokenUri
	) public returns (bool) {
		require(false, stub_error);
		to;
		tokenId;
		tokenUri;
		dummy = 0;
		return false;
	}

	// Selector: finishMinting() 7d64bcb4
	function finishMinting() public returns (bool) {
		require(false, stub_error);
		dummy = 0;
		return false;
	}
}

contract ERC721UniqueExtensions is Dummy {
	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 tokenId) public {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
	}

	// Selector: nextTokenId() 75794a3c
	function nextTokenId() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}

	// Selector: setVariableMetadata(uint256,bytes) d4eac26d
	function setVariableMetadata(uint256 tokenId, bytes memory data) public {
		require(false, stub_error);
		tokenId;
		data;
		dummy = 0;
	}

	// Selector: getVariableMetadata(uint256) e6c5ce6f
	function getVariableMetadata(uint256 tokenId)
		public
		view
		returns (bytes memory)
	{
		require(false, stub_error);
		tokenId;
		dummy;
		return hex"";
	}

	// Selector: mintBulk(address,uint256[]) 44a9945e
	function mintBulk(address to, uint256[] memory tokenIds)
		public
		returns (bool)
	{
		require(false, stub_error);
		to;
		tokenIds;
		dummy = 0;
		return false;
	}

	// Selector: mintBulkWithTokenURI(address,(uint256,string)[]) 36543006
	function mintBulkWithTokenURI(address to, Tuple0[] memory tokens)
		public
		returns (bool)
	{
		require(false, stub_error);
		to;
		tokens;
		dummy = 0;
		return false;
	}
}

contract UniqueNFT is
	Dummy,
	ERC165,
	ERC721,
	ERC721Metadata,
	ERC721Enumerable,
	ERC721UniqueExtensions,
	ERC721Mintable,
	ERC721Burnable
{}
