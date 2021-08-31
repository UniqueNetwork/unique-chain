// SPDX-License-Identifier: OTHER
// This code is automatically generated

pragma solidity >=0.8.0 <0.9.0;

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
	function name() external view returns (string memory);

	function symbol() external view returns (string memory);
}

// Inline
interface InlineTotalSupply is Dummy {
	function totalSupply() external view returns (uint256);
}

interface ERC165 is Dummy {
	function supportsInterface(uint32 interfaceId) external view returns (bool);
}

interface ERC721 is Dummy, ERC165, ERC721Events {
	function balanceOf(address owner) external view returns (uint256);

	function ownerOf(uint256 tokenId) external view returns (address);

	function safeTransferFromWithData(
		address from,
		address to,
		uint256 tokenId,
		bytes memory data
	) external;

	function safeTransferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	function transferFrom(
		address from,
		address to,
		uint256 tokenId
	) external;

	function approve(address approved, uint256 tokenId) external;

	function setApprovalForAll(address operator, bool approved) external;

	function getApproved(uint256 tokenId) external view returns (address);

	function isApprovedForAll(address owner, address operator)
		external
		view
		returns (address);
}

interface ERC721Burnable is Dummy {
	function burn(uint256 tokenId) external;
}

interface ERC721Enumerable is Dummy, InlineTotalSupply {
	function tokenByIndex(uint256 index) external view returns (uint256);

	function tokenOfOwnerByIndex(address owner, uint256 index)
		external
		view
		returns (uint256);
}

interface ERC721Metadata is Dummy, InlineNameSymbol {
	function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface ERC721Mintable is Dummy, ERC721MintableEvents {
	function mintingFinished() external view returns (bool);

	function mint(address to, uint256 tokenId) external returns (bool);

	function mintWithTokenURI(
		address to,
		uint256 tokenId,
		string memory tokenUri
	) external returns (bool);

	function finishMinting() external returns (bool);
}

interface ERC721UniqueExtensions is Dummy {
	function transfer(address to, uint256 tokenId) external;

	function nextTokenId() external view returns (uint256);
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
