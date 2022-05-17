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

// Selector: 41369377
contract TokenProperties is Dummy, ERC165 {
	// Selector: setTokenPropertyPermission(string,bool,bool,bool) 222d97fa
	function setTokenPropertyPermission(
		string memory key,
		bool isMutable,
		bool collectionAdmin,
		bool tokenOwner
	) public {
		require(false, stub_error);
		key;
		isMutable;
		collectionAdmin;
		tokenOwner;
		dummy = 0;
	}

	// Selector: setProperty(uint256,string,bytes) 1752d67b
	function setProperty(
		uint256 tokenId,
		string memory key,
		bytes memory value
	) public {
		require(false, stub_error);
		tokenId;
		key;
		value;
		dummy = 0;
	}

	// Selector: deleteProperty(uint256,string) 066111d1
	function deleteProperty(uint256 tokenId, string memory key) public {
		require(false, stub_error);
		tokenId;
		key;
		dummy = 0;
	}

	// Throws error if key not found
	//
	// Selector: property(uint256,string) 7228c327
	function property(uint256 tokenId, string memory key)
		public
		view
		returns (bytes memory)
	{
		require(false, stub_error);
		tokenId;
		key;
		dummy;
		return hex"";
	}
}

// Selector: 42966c68
contract ERC721Burnable is Dummy, ERC165 {
	// Selector: burn(uint256) 42966c68
	function burn(uint256 tokenId) public {
		require(false, stub_error);
		tokenId;
		dummy = 0;
	}
}

// Selector: 58800161
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

	// Not implemented
	//
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

	// Not implemented
	//
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

	// Not implemented
	//
	// Selector: setApprovalForAll(address,bool) a22cb465
	function setApprovalForAll(address operator, bool approved) public {
		require(false, stub_error);
		operator;
		approved;
		dummy = 0;
	}

	// Not implemented
	//
	// Selector: getApproved(uint256) 081812fc
	function getApproved(uint256 tokenId) public view returns (address) {
		require(false, stub_error);
		tokenId;
		dummy;
		return 0x0000000000000000000000000000000000000000;
	}

	// Not implemented
	//
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

// Selector: 5b5e139f
contract ERC721Metadata is Dummy, ERC165 {
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

	// Returns token's const_metadata
	//
	// Selector: tokenURI(uint256) c87b56dd
	function tokenURI(uint256 tokenId) public view returns (string memory) {
		require(false, stub_error);
		tokenId;
		dummy;
		return "";
	}
}

// Selector: 68ccfe89
contract ERC721Mintable is Dummy, ERC165, ERC721MintableEvents {
	// Selector: mintingFinished() 05d2035b
	function mintingFinished() public view returns (bool) {
		require(false, stub_error);
		dummy;
		return false;
	}

	// `token_id` should be obtained with `next_token_id` method,
	// unlike standard, you can't specify it manually
	//
	// Selector: mint(address,uint256) 40c10f19
	function mint(address to, uint256 tokenId) public returns (bool) {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
		return false;
	}

	// `token_id` should be obtained with `next_token_id` method,
	// unlike standard, you can't specify it manually
	//
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

	// Not implemented
	//
	// Selector: finishMinting() 7d64bcb4
	function finishMinting() public returns (bool) {
		require(false, stub_error);
		dummy = 0;
		return false;
	}
}

// Selector: 780e9d63
contract ERC721Enumerable is Dummy, ERC165 {
	// Selector: tokenByIndex(uint256) 4f6ccce7
	function tokenByIndex(uint256 index) public view returns (uint256) {
		require(false, stub_error);
		index;
		dummy;
		return 0;
	}

	// Not implemented
	//
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

	// Selector: totalSupply() 18160ddd
	function totalSupply() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
	}
}

// Selector: 9b5e29c5
contract CollectionProperties is Dummy, ERC165 {
	// Selector: setCollectionProperty(string,bytes) 2f073f66
	function setCollectionProperty(string memory key, bytes memory value)
		public
	{
		require(false, stub_error);
		key;
		value;
		dummy = 0;
	}

	// Selector: deleteCollectionProperty(string) 7b7debce
	function deleteCollectionProperty(string memory key) public {
		require(false, stub_error);
		key;
		dummy = 0;
	}

	// Throws error if key not found
	//
	// Selector: collectionProperty(string) cf24fd6d
	function collectionProperty(string memory key)
		public
		view
		returns (bytes memory)
	{
		require(false, stub_error);
		key;
		dummy;
		return hex"";
	}
}

// Selector: d74d154f
contract ERC721UniqueExtensions is Dummy, ERC165 {
	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 tokenId) public {
		require(false, stub_error);
		to;
		tokenId;
		dummy = 0;
	}

	// Selector: burnFrom(address,uint256) 79cc6790
	function burnFrom(address from, uint256 tokenId) public {
		require(false, stub_error);
		from;
		tokenId;
		dummy = 0;
	}

	// Selector: nextTokenId() 75794a3c
	function nextTokenId() public view returns (uint256) {
		require(false, stub_error);
		dummy;
		return 0;
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
	ERC721Burnable,
	CollectionProperties,
	TokenProperties
{}
