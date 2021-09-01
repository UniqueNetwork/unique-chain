// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

// Anonymous struct
struct Tuple0 {
	uint256 field_0;
	string field_1;
}

// Common stubs holder
interface Dummy {

}

// Inline
interface ERC721Events {
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
interface ERC721MintableEvents {
	event MintingFinished();
}

// Inline
interface InlineNameSymbol is Dummy {
	// Selector: name() 06fdde03
	function name() external view returns (string memory);

	// Selector: symbol() 95d89b41
	function symbol() external view returns (string memory);
}

// Inline
interface InlineTotalSupply is Dummy {
	// Selector: totalSupply() 18160ddd
	function totalSupply() external view returns (uint256);
}

interface ERC165 is Dummy {
	// Selector: supportsInterface(bytes4) 01ffc9a7
	function supportsInterface(uint32 interfaceId) external view returns (bool);
}

interface ERC721 is Dummy, ERC165, ERC721Events {
	// Selector: balanceOf(address) 70a08231
	function balanceOf(address owner) external view returns (uint256);

	// Selector: ownerOf(uint256) 6352211e
	function ownerOf(uint256 tokenId) external view returns (address);

	// Selector: safeTransferFromWithData(address,address,uint256,bytes) 60a11672
	function safeTransferFromWithData(
		address from,
		address to,
		uint256 tokenId,
		bytes memory data
	) external;

	// Selector: safeTransferFrom(address,address,uint256) 42842e0e
	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	// Selector: transferFrom(address,address,uint256) 23b872dd
	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	// Selector: approve(address,uint256) 095ea7b3
	function approve(address approved, uint256 tokenId) external;

	// Selector: setApprovalForAll(address,bool) a22cb465
	function setApprovalForAll(address operator, bool approved) external;

	// Selector: getApproved(uint256) 081812fc
	function getApproved(uint256 tokenId) external view returns (address);

	// Selector: isApprovedForAll(address,address) e985e9c5
	function isApprovedForAll(address owner, address operator)
		external
		view
		returns (address);
}

interface ERC721Burnable is Dummy {
	// Selector: burn(uint256) 42966c68
	function burn(uint256 tokenId) external;
}

interface ERC721Enumerable is Dummy, InlineTotalSupply {
	// Selector: tokenByIndex(uint256) 4f6ccce7
	function tokenByIndex(uint256 index) external view returns (uint256);

	// Selector: tokenOfOwnerByIndex(address,uint256) 2f745c59
	function tokenOfOwnerByIndex(address owner, uint256 index)
		external
		view
		returns (uint256);
}

interface ERC721Metadata is Dummy, InlineNameSymbol {
	// Selector: tokenURI(uint256) c87b56dd
	function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface ERC721Mintable is Dummy, ERC721MintableEvents {
	// Selector: mintingFinished() 05d2035b
	function mintingFinished() external view returns (bool);

	// Selector: mint(address,uint256) 40c10f19
	function mint(address to, uint256 tokenId) external returns (bool);

	// Selector: mintWithTokenURI(address,uint256,string) 50bb4e7f
	function mintWithTokenURI(
		address to,
		uint256 tokenId,
		string memory tokenUri
	) external returns (bool);

	// Selector: finishMinting() 7d64bcb4
	function finishMinting() external returns (bool);
}

interface ERC721UniqueExtensions is Dummy {
	// Selector: transfer(address,uint256) a9059cbb
	function transfer(address to, uint256 tokenId) external;

	// Selector: nextTokenId() 75794a3c
	function nextTokenId() external view returns (uint256);

	// Selector: setVariableMetadata(uint256,bytes) d4eac26d
	function setVariableMetadata(uint256 tokenId, bytes memory data) external;

	// Selector: getVariableMetadata(uint256) e6c5ce6f
	function getVariableMetadata(uint256 tokenId)
		external
		view
		returns (bytes memory);

	// Selector: mintBulk(address,uint256[]) 44a9945e
	function mintBulk(address to, uint256[] memory tokenIds)
		external
		returns (bool);

	// Selector: mintBulkWithTokenURI(address,(uint256,string)[]) 36543006
	function mintBulkWithTokenURI(address to, Tuple0[] memory tokens)
		external
		returns (bool);
}

interface UniqueNFT is
	Dummy,
	ERC165,
	ERC721,
	ERC721Metadata,
	ERC721Enumerable,
	ERC721UniqueExtensions,
	ERC721Mintable,
	ERC721Burnable
{}
