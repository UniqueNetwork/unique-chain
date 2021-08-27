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

contract MarketPlaceUNQ {
    struct Offer {
        uint256 idNFT;
        address currencyCode; //address of currency  token, = address(0) for UNQ
        uint256 price;
        uint256 time;
        address idCollection;
        address userAddr;
        uint8 flagActive;
    }
    Offer[] public offers;

    mapping(address => mapping(uint256 => uint256)) public asks; // [idCollection][idNFT] => idOffer

    mapping(address => uint256[]) public asksbySeller; // [addressSeller] =>idOffer

    address owner;

    constructor() {
        owner = msg.sender;
    }

    function setowner(address _newOwner) public onlyOwner {
        owner = _newOwner;
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
        address _currencyCode,
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

    function buy(address _idCollection, uint256 _idNFT) public payable {
        //buing for UNQ like as ethers
        Offer memory offer = offers[asks[_idCollection][_idNFT]];
        //1. check sent amount and send to seller
        require(
            msg.value == offer.price,
            "Not right amount UNQ sent, have to be equal price"
        );
        payable(offer.userAddr).transfer(offer.price);
        // 2. close offer
        offers[asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);
    }

    function buy(
        address _idCollection,
        uint256 _idNFT,
        address _currencyCode,
        uint256 _amount
    ) public payable {
        Offer memory offer = offers[asks[_idCollection][_idNFT]];
        //1. check sent amount and transfer from buyer to seller
        require(
            offer.price == _amount && offer.currencyCode == _currencyCode,
            "Not right amount or currency sent, have to be equal currency and price"
        );
        // !!! transfer have to be approved to marketplace!
        IERC20(offer.currencyCode).transferFrom(
            msg.sender,
            address(this),
            offer.price
        );
        //to not disclojure buyer's address
        IERC20(offer.currencyCode).transfer(offer.userAddr, offer.price);
        // 2. close offer
        offers[asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        IERC721(_idCollection).transferFrom(address(this), msg.sender, _idNFT);
    }
}
