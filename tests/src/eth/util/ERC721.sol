contract ERC721 {
    uint8 _dummy = 0;
    address _dummy_addr = 0x0000000000000000000000000000000000000000;
    string _dummy_string = "";
    string stub_error =
        "this contract does not exists, code for collections is implemented at pallet side";

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

	// 0x18160ddd
    function totalSupply() external view returns (uint256) {
        require(false, stub_error);
        return 0;
    }

    function name() external view returns (string memory res_name) {
        require(false, stub_error);
        res_name = _dummy_string;
    }

    function symbol() external view returns (string memory res_symbol) {
        require(false, stub_error);
        res_symbol = _dummy_string;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(false, stub_error);
        tokenId;
        return _dummy_string;
    }

    function tokenByIndex(uint256 index) external view returns (uint256) {
        require(false, stub_error);
        index;
		return 0;
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        require(false, stub_error);
		owner;
		index;
		return 0;
    }

    // 0x70a08231
    function balanceOf(address owner) external view returns (uint256) {
        require(false, stub_error);
        owner;
        return 0;
    }

    // 0x6352211e
    function ownerOf(uint256 tokenId) external view returns (address) {
        require(false, stub_error);
        tokenId;
        return _dummy_addr;
    }

    // 0xb88d4fde
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external payable {
        require(false, stub_error);
        from;
        to;
        tokenId;
        data;
    }

    // 0x42842e0e
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external payable {
        require(false, stub_error);
        from;
        to;
        tokenId;
    }

    // 0x23b872dd
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external payable {
        require(false, stub_error);
        from;
        to;
        tokenId;
    }

    // 0x095ea7b3
    function approve(address approved, uint256 tokenId) external payable {
        require(false, stub_error);
        approved;
        tokenId;
    }

    // 0xa22cb465
    function setApprovalForAll(address operator, bool approved) external {
        require(false, stub_error);
        operator;
        approved;
        _dummy = 0;
    }

    // 0x081812fc
    function getApproved(uint256 tokenId) external view returns (address) {
        require(false, stub_error);
        tokenId;
        return _dummy_addr;
    }

    // 0xe985e9c5
    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool)
    {
        require(false, stub_error);
        owner;
        operator;
        return false;
    }

    // 0x01ffc9a7
    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return
            // ERC721
            interfaceID == 0x80ac58cd ||
            // ERC721Metadata
            interfaceID == 0x5b5e139f ||
            // ERC721Enumerable
            interfaceID == 0x780e9d63 ||
            // ERC165
            interfaceID == 0x01ffc9a7;
    }
}
