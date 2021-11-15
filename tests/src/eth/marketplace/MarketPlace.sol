// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import "../api/UniqueNFT.sol";

// Inline
interface ERC20Events {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

interface ERC20 is Dummy, ERC165, ERC20Events {
    // Selector: name() 06fdde03
    function name() external view returns (string memory);

    // Selector: symbol() 95d89b41
    function symbol() external view returns (string memory);

    // Selector: totalSupply() 18160ddd
    function totalSupply() external view returns (uint256);

    // Selector: decimals() 313ce567
    function decimals() external view returns (uint8);

    // Selector: balanceOf(address) 70a08231
    function balanceOf(address owner) external view returns (uint256);

    // Selector: transfer(address,uint256) a9059cbb
    function transfer(address to, uint256 amount) external returns (bool);

    // Selector: transferFrom(address,address,uint256) 23b872dd
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    // Selector: approve(address,uint256) 095ea7b3
    function approve(address spender, uint256 amount) external returns (bool);

    // Selector: allowance(address,address) dd62ed3e
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
}

interface UniqueFungible is Dummy, ERC165, ERC20 {}

contract MarketPlace {
    struct Order {
        uint256 idNFT;
        address currencyCode; // UNIQ tokens as address address (1); wKSM
        uint256 price;
        uint256 time;
        address idCollection;
        address ownerAddr;
        uint8 flagActive;
        string name;
        string symbol;
        string tokenURI;
    }
    Order[] public orders;
    uint256 test;
    mapping(address => uint256) public balanceKSM; //  [ownerAddr][currency] => [KSMs]
    mapping(address => mapping(uint256 => uint256)) public asks; // [buyer][idCollection][idNFT] => idorder

    mapping(address => uint256[]) public asksbySeller; // [addressSeller] =>idorder

    address escrow;
    address owner;
    address nativecoin;

    constructor(address _escrow) {
        escrow = _escrow;
        owner = msg.sender;

        orders.push(
            Order(0, address(0), 0, 0, address(0), address(0), 0, "", "", "")
        );
    }

    function setowner(address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    function setEscrow(address _newEscrow) public onlyOwner {
        escrow = _newEscrow;
    }

    function setNativeCoin(address _coin) public onlyOwner {
        nativecoin = _coin;
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
     * Make bids (orders) to sell NFTs
     */

    receive() external payable {
        revert(
            "Can't accept payment without collection and IDs, use dApp to send"
        );
    }

    fallback() external payable {
        revert("No such function");
    }

    event AddedAsk(
        uint256 _price,
        address _currencyCode,
        address _idCollection,
        uint256 _idNFT,
        uint256 orderId
    );
    event EditedAsk(
        uint256 _price,
        address _currencyCode,
        address _idCollection,
        uint256 _idNFT,
        uint8 _active,
        uint256 orderId
    );

    event CanceledAsk(address _idCollection, uint256 _idNFT, uint256 orderId);

    event DepositedKSM(uint256 _amount, address _sender);

    event BoughtNFT4KSM(
        address _idCollection,
        uint256 _idNFT,
        uint256 orderID,
        uint256 orderPrice
    );

    event BoughtNFT(
        address _idCollection,
        uint256 _idNFT,
        uint256 orderID,
        uint256 orderPrice
    );

    event WithdrawnAllKSM(address _sender, uint256 balance);

    event Withdrawn(uint256 _amount, address _currencyCode, address _sender);

    function addAsk(
        uint256 _price,
        address _currencyCode,
        address _idCollection,
        uint256 _idNFT
    ) public {
        //
        address ownerNFT = UniqueNFT(_idCollection).ownerOf(_idNFT);
        require(ownerNFT == msg.sender, "Only token owner can make ask");
        string memory nameNFT;
        string memory symbolNFT;
        string memory uriNFT;
        try UniqueNFT(_idCollection).name() returns (string memory name_) {
            nameNFT = name_;
        } catch {
            nameNFT = "";
        }
        try UniqueNFT(_idCollection).symbol() returns (string memory symbol_) {
            symbolNFT = symbol_;
        } catch {
            symbolNFT = "";
        }
        try UniqueNFT(_idCollection).tokenURI(_idNFT) returns (
            string memory uri_
        ) {
            uriNFT = uri_;
        } catch {
            uriNFT = "";
        }
        orders.push(
            Order(
                _idNFT,
                _currencyCode,
                _price,
                block.timestamp,
                _idCollection,
                msg.sender,
                1, // 1 = is active
                nameNFT,
                symbolNFT,
                uriNFT
            )
        );

        uint256 orderId = orders.length - 1;
        asks[_idCollection][_idNFT] = orderId;
        asksbySeller[msg.sender].push(orderId);
        UniqueNFT(_idCollection).transferFrom(
            msg.sender,
            address(this),
            _idNFT
        );
        emit AddedAsk(_price, _currencyCode, _idCollection, _idNFT, orderId);
    }

    function editAsk(
        uint256 _price,
        address _currencyCode,
        address _idCollection,
        uint256 _idNFT,
        uint8 _active
    ) public {
        uint256 orderID = asks[_idCollection][_idNFT];

        require(
            orders[orderID].ownerAddr == msg.sender,
            "Only token owner can edit ask"
        );
        require(orders[orderID].flagActive != 0, "This ask is closed");
        if (_price > 0) {
            orders[orderID].price = _price;
        }

        if (_currencyCode != address(0)) {
            orders[orderID].currencyCode = _currencyCode;
        }

        orders[orderID].time = block.timestamp;
        orders[orderID].flagActive = _active;

        emit EditedAsk(
            _price,
            _currencyCode,
            _idCollection,
            _idNFT,
            _active,
            orderID
        );
    }

    function cancelAsk(address _idCollection, uint256 _idNFT) public {
        uint256 orderID = asks[_idCollection][_idNFT];

        require(
            orders[orderID].ownerAddr == msg.sender,
            "Only token owner can edit ask"
        );
        require(orders[orderID].flagActive != 0, "This ask is closed");

        orders[orderID].time = block.timestamp;
        orders[orderID].flagActive = 0;
        UniqueNFT(_idCollection).transferFrom(
            address(this),
            orders[orderID].ownerAddr,
            _idNFT
        );
        emit CanceledAsk(_idCollection, _idNFT, orderID);
    }

    function depositKSM(uint256 _amount, address _sender) public onlyEscrow {
        balanceKSM[_sender] = balanceKSM[_sender] + _amount;
        emit DepositedKSM(_amount, _sender);
    }

    function buyKSM(
        address _idCollection,
        uint256 _idNFT,
        address _buyer,
        address _receiver
    ) public {
        Order memory order = orders[asks[_idCollection][_idNFT]];
        require(msg.sender == escrow || msg.sender == _buyer, "Only escrow or buyer can call buyKSM" );
        //1. reduce balance
        balanceKSM[_buyer] = balanceKSM[_buyer] - order.price;
        balanceKSM[order.ownerAddr] = balanceKSM[order.ownerAddr] + order.price;
        // 2. close order
        orders[asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        UniqueNFT(_idCollection).transferFrom(address(this), _receiver, _idNFT);
        emit BoughtNFT4KSM(
            _idCollection,
            _idNFT,
            asks[_idCollection][_idNFT],
            order.price
        );
    }

    function buy(address _idCollection, uint256 _idNFT)
        public
        payable
        returns (bool result)
    {
        //buing for UNQ like as ethers

        Order memory order = orders[asks[_idCollection][_idNFT]];
        //1. check sent amount and send to seller
        require(
            msg.value == order.price,
            "Not right amount sent, have to be equal price"
        );
        // 2. close order
        orders[asks[_idCollection][_idNFT]].flagActive = 0;

        // 3. transfer NFT to buyer
        UniqueNFT(_idCollection).transferFrom(
            address(this),
            msg.sender,
            _idNFT
        );
        //uint balance  = address(this).balance;
        result = payable(order.ownerAddr).send(order.price);
        emit BoughtNFT(
            _idCollection,
            _idNFT,
            asks[_idCollection][_idNFT],
            order.price
        );
    }

    /*
        function buyOther (address _idCollection, uint256 _idNFT, address _currencyCode, uint _amount ) public  { //buy for sny token if seller wants

            Order memory order = orders[ asks[_idCollection][_idNFT]];
            //1. check sent amount and transfer from buyer to seller
            require (order.price == _amount && order.currencyCode == _currencyCode, "Not right amount or currency sent, have to be equal currency and price" );
            // !!! transfer have to be approved to marketplace!
            IERC20(order.currencyCode).transferFrom(msg.sender, address(this), order.price); //to not disclojure buyer's address
            IERC20(order.currencyCode).transfer(order.ownerAddr, order.price);
            // 2. close order
            orders[ asks[_idCollection][_idNFT]].flagActive = 0;
            // 3. transfer NFT to buyer
            IERC721ext(_idCollection).transferFrom(address(this), msg.sender, _idNFT);


        }
    */

    function withdrawAllKSM(address _sender)
        public
        onlyEscrow
        returns (uint256 lastBalance)
    {
        lastBalance = balanceKSM[_sender];
        balanceKSM[_sender] = 0;
        emit WithdrawnAllKSM(_sender, lastBalance);
    }

    function withdraw(
        uint256 _amount,
        address _currencyCode,
        address payable _sender
    ) public onlyOwner returns (bool result) {
        if (_currencyCode != nativecoin) {
            //erc20 compat. tokens on UNIQUE chain
            // uint balance = IERC20(_currencyCode).balanceOf(address(this));
            UniqueFungible(_currencyCode).transfer(_sender, _amount);
        } else {
            // uint balance  = address(this).balance;

            result = (_sender).send(_amount); // for UNQ like as ethers
        }
        emit Withdrawn(_amount, _currencyCode, _sender);
        return result;
    }

    // event GettedOrder(uint , Order);
    function getOrder(address _idCollection, uint256 _idNFT)
        public
        view
        returns (Order memory)
    {
        uint256 orderId = asks[_idCollection][_idNFT];
        Order memory order = orders[orderId];
        //       emit GettedOrder (orderId, order);
        return order;
    }

    function getOrdersLen() public view returns (uint256) {
        return orders.length;
    }
}
