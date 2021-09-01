// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;

interface IERC721 {
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

    function ownerOf(uint256 tokenId) external view returns (address owner);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function debug(string memory value) external;
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract MarketPlaceKSM {
    struct Offer {
        uint256 idNFT;
        uint256 currencyCode;
        uint256 price;
        uint256 time;
        address idCollection;
        address userAddr;
        uint8 flagActive;
    }
    Offer[] public offers;

    mapping(address => mapping(uint256 => uint256)) public balanceKSM; //  [userAddr] => [KSMs]
    mapping(address => mapping(uint256 => uint256)) public asks; // [buyer][idCollection][idNFT] => idOffer

    mapping(address => uint256[]) public asksbySeller; // [addressSeller] =>idOffer

    address escrow;
    address owner;

    constructor(address _escrow) {
        escrow = _escrow;
        owner = msg.sender;
    }

    function setowner(address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    function setEscrow(address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    modifier onlyEscrow() {
        require(msg.sender == escrow, "Only escrow can");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can");
        _;
    }

    /**
     * Make bids (offers) to sell NFTs
     */
    function setAsk(
        uint256 _price,
        uint256 _currencyCode,
        address _idCollection,
        uint256 _idNFT,
        uint8 _active
    ) public {
        require(
            IERC721(_idCollection).ownerOf(_idNFT) == msg.sender,
            "Not right token owner"
        );
        uint256 offerID = asks[_idCollection][_idNFT];
        if (offers.length == 0 || offers[offerID].idCollection == address(0)) {
            offers.push(
                Offer(
                    _idNFT,
                    _currencyCode,
                    _price,
                    block.timestamp,
                    _idCollection,
                    msg.sender,
                    _active
                )
            );
            asks[_idCollection][_idNFT] = offers.length - 1;
            asksbySeller[msg.sender].push(offers.length - 1);
        }
        //edit existing offer
        else {
            offers[asks[_idCollection][_idNFT]] = Offer(
                offers[asks[_idCollection][_idNFT]].idNFT,
                _currencyCode,
                _price,
                block.timestamp,
                offers[asks[_idCollection][_idNFT]].idCollection,
                msg.sender,
                _active
            );
        }

        IERC721(_idCollection).transferFrom(msg.sender, address(this), _idNFT);
    }

    function deposit(
        uint256 _amount,
        uint256 _currencyCode,
        address _sender
    ) public onlyEscrow {
        balanceKSM[_sender][_currencyCode] =
            balanceKSM[_sender][_currencyCode] +
            _amount;
    }

    function buy(address _idCollection, uint256 _idNFT) public {
        Offer memory offer = offers[asks[_idCollection][_idNFT]];
        // 1. reduce balance
        balanceKSM[msg.sender][offer.currencyCode] =
            balanceKSM[msg.sender][offer.currencyCode] -
            offer.price;
        // 2. increase balance
        balanceKSM[offer.userAddr][offer.currencyCode] =
            balanceKSM[offer.userAddr][offer.currencyCode] +
            offer.price;
        // 3. close offer
        offers[asks[_idCollection][_idNFT]].flagActive = 0;
        // 4. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);
    }

    function withdraw(
        uint256 _amount,
        uint256 _currencyCode,
        address _sender
    ) public onlyEscrow returns (bool) {
        balanceKSM[_sender][_currencyCode] =
            balanceKSM[_sender][_currencyCode] -
            _amount;
        return true;
    }

    function escrowBalance(uint256 _currencyCode, address _sender)
        public
        view
        returns (uint256)
    {
        return balanceKSM[_sender][_currencyCode];
    }
}
