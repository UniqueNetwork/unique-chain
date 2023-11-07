// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {UniqueNFT, Dummy, ERC165} from "../api/UniqueNFT.sol";

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
    Order[] public  orders;
    uint test;
    mapping (address => uint256) public balanceKSM;  //  [ownerAddr][currency] => [KSMs]
    mapping (address => mapping (uint256 => uint256)) public  asks ; // [buyer][idCollection][idNFT] => idorder
    mapping (address => mapping (uint => uint[])) public ordersbyNFT; // [addressCollection] =>idNFT =>idorder

    mapping (address => uint[]) public asksbySeller; // [addressSeller] =>idorder

    mapping (address =>bool) internal isEscrow;

    //address escrow;
    address owner;
    address nativecoin;

    // from abstract contract ReentrancyGuard 
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;

    uint8 private _status;

    struct NFT {
        address  collection;
        uint256 id;
    }
    
     //function initialize() public initializer {
   constructor () { // call setEscrow directly
        owner = msg.sender;

         orders.push(Order(        
                    0,
                    address(0),
                    0,
                    0,
                    address(0),
                    address(0),
                    0, "","",""));
         _status = _NOT_ENTERED;

    }

    modifier nonReentrant() { // from abstract contract ReentrancyGuard 
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    modifier onlyEscrow () {
        require(isEscrow [msg.sender] , "Only escrow can");
        _;
    }

    modifier onlyOwner () {
        require(msg.sender == owner, "Only owner can");
        _;
    }

    /**
    * Make bids (orders) to sell NFTs 
    */

     
    receive  () external payable  {
     //   revert ("Can't accept payment without collection and IDs, use dApp to send");
    }
    fallback () external payable {
        revert ("No such function");
    } 

    event AddedAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT,
                    uint256 orderId
                  );
    event EditedAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT,
                    uint8  _active,
                    uint orderId);

    event  CanceledAsk (address _idCollection, 
                        uint256 _idNFT, 
                        uint orderId
                        );

    event DepositedKSM (uint256 _amount,  address _sender);

    event BoughtNFT4KSM (address _idCollection, uint256 _idNFT, uint orderID, uint orderPrice );

    event BoughtNFT (address _idCollection, uint256 _idNFT, uint orderID, uint orderPrice );

    event WithdrawnAllKSM (address _sender, uint256 balance); 

    event WithdrawnKSM (address _sender, uint256 balance); 

    event Withdrawn (uint256 _amount, address _currencyCode, address _sender);
    

   function setOwner  (address _newOwner) public onlyOwner {
        owner = _newOwner;
    }

    function setEscrow  (address _escrow, bool _state) public onlyOwner returns (bool) {
        if (isEscrow[_escrow] != _state)  {
            isEscrow[_escrow] = _state;
            return true;
        }
        return false;
    }

    function setNativeCoin  (address _coin) public onlyOwner {
        nativecoin = _coin;
    }


    function addAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT
                  ) public  { //
        address ownerNFT = UniqueNFT(_idCollection).ownerOf(_idNFT);
        require (ownerNFT == msg.sender, "Only token owner can make ask");
        string memory nameNFT;
        string memory symbolNFT;
        string memory uriNFT;
        try UniqueNFT(_idCollection).name() returns (string memory name_) {
            nameNFT = name_;
        }
        catch {
            nameNFT="";
        }   
        try UniqueNFT(_idCollection).symbol() returns (string memory symbol_) {
            symbolNFT = symbol_;
        }
        catch {
            symbolNFT="";
        }  
        try UniqueNFT(_idCollection).tokenURI(_idNFT) returns (string memory uri_) {
            uriNFT = uri_;
        }
        catch {
            uriNFT="";
        }        
        orders.push(Order(        
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
             ));
            
            uint orderId = orders.length-1;
            asks[_idCollection][_idNFT] = orderId;
            asksbySeller[msg.sender].push(orderId);
            UniqueNFT(_idCollection).transferFrom(msg.sender, address(this), _idNFT);
            emit AddedAsk(_price, _currencyCode, _idCollection, _idNFT, orderId);     
    }

    function editAsk (uint256 _price, 
                    address  _currencyCode, 
                    address _idCollection, 
                    uint256 _idNFT,
                    uint8  _active) public {
        

        uint orderID =  asks[_idCollection][_idNFT];

        require (orders[orderID].ownerAddr == msg.sender, "Only token owner can edit ask");
        require (orders[orderID].flagActive != 0, "This ask is closed");
        if (_price> 0 ) {
            orders[orderID].price = _price ;  
        }
        
        if (_currencyCode != address(0) ) {
            orders[orderID].currencyCode = _currencyCode ;  
        }

        orders[orderID].time = block.timestamp;
        orders[orderID].flagActive = _active;
        
        emit EditedAsk(_price, _currencyCode, _idCollection, _idNFT, _active, orderID);
        }
        

    function cancelAsk (address _idCollection, 
                        uint256 _idNFT
                        ) public {

        uint orderID =  asks[_idCollection][_idNFT];

        require (orders[orderID].ownerAddr == msg.sender, "Only token owner can edit ask");
        require (orders[orderID].flagActive != 0, "This ask is closed");

        orders[orderID].time = block.timestamp;
        orders[orderID].flagActive = 0;
        UniqueNFT(_idCollection).transferFrom(address(this),orders[orderID].ownerAddr, _idNFT);
        emit CanceledAsk(_idCollection, _idNFT, orderID);
        }


    function depositKSM (uint256 _amount,  address _sender) public onlyEscrow {
        balanceKSM[_sender] = balanceKSM[_sender] + _amount;
        emit DepositedKSM(_amount, _sender);
    }

    function buyKSM (address _idCollection, uint256 _idNFT, address _buyer, address _receiver ) public {
        
        Order memory order = orders[ asks[_idCollection][_idNFT]];
        require(isEscrow[msg.sender]  || msg.sender == _buyer, "Only escrow or buyer can call buyKSM" );
        //1. reduce balance

        balanceKSM[_buyer] = balanceKSM[_buyer] - order.price;
        balanceKSM[order.ownerAddr] = balanceKSM[order.ownerAddr] + order.price;
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        UniqueNFT(_idCollection).transferFrom(address(this), _receiver, _idNFT);
        emit BoughtNFT4KSM(_idCollection, _idNFT, asks[_idCollection][_idNFT], order.price);

    }
    function buy (address _idCollection, uint256 _idNFT ) public payable returns (bool result) { //buing for UNQ like as ethers 
        
        Order memory order = orders[asks[_idCollection][_idNFT]]; 
        //1. check sent amount and send to seller
        require (msg.value == order.price, "Not right amount sent, have to be equal price" );     
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        
        // 3. transfer NFT to buyer
        UniqueNFT(_idCollection).transferFrom(address(this), msg.sender, _idNFT);
        //uint balance  = address(this).balance;
        result = payable(order.ownerAddr).send (order.price); 
        emit BoughtNFT(_idCollection, _idNFT, asks[_idCollection][_idNFT], order.price);
        
    }

/* 
    function buyOther (address _idCollection, uint256 _idNFT, address _currencyCode, uint _amount ) public  { //buy for sny token if seller wants
        
        Order memory order = orders[ asks[_idCollection][_idNFT]];
        //1. check sent amount and transfer from buyer to seller
        require (order.price == _amount && order.currencyCode == _currencyCode, "Not right amount or currency sent, have to be equal currency and price" );
        // !!! transfer have to be approved to marketplace!
        UniqueFungible(order.currencyCode).transferFrom(msg.sender, address(this), order.price); //to not disclojure buyer's address 
        UniqueFungible(order.currencyCode).transfer(order.ownerAddr, order.price);
        // 2. close order
        orders[ asks[_idCollection][_idNFT]].flagActive = 0;
        // 3. transfer NFT to buyer
        UniqueNFT(_idCollection).transferFrom(address(this), msg.sender, _idNFT);


    }
 */

    function withdrawAllKSM (address _sender) public  nonReentrant returns (uint lastBalance ){
        require(isEscrow[msg.sender]  || msg.sender == _sender, "Only escrow or balance owner can withdraw all KSM" );

        lastBalance = balanceKSM[_sender];
        balanceKSM[_sender] =0;
        emit WithdrawnAllKSM(_sender, lastBalance);
    }

    function withdrawKSM (uint _amount, address _sender) onlyEscrow public {
        balanceKSM[_sender] = balanceKSM[_sender] - _amount;
        emit WithdrawnKSM(_sender, balanceKSM[_sender]);
        
    }

    function withdraw (uint256 _amount, address _currencyCode) public  nonReentrant returns (bool result ){ //onlyOwner
        address payable _sender = payable( msg.sender);
        if (_currencyCode != nativecoin ) { //erc20 compat. tokens on UNIQUE chain
            // uint balance = UniqueFungible(_currencyCode).balanceOf(address(this));
            UniqueFungible(_currencyCode).transfer(_sender, _amount);
        } else {
            // uint balance  = address(this).balance;

            result =  (_sender).send(_amount); // for UNQ like as ethers 
        }
        emit Withdrawn(_amount, _currencyCode, _sender);
        return result;

    }

    
   // event GettedOrder(uint , Order);
    function getOrder (address _idCollection, uint256 _idNFT) public view returns (Order memory) {
        uint orderId = asks[_idCollection][_idNFT];
        Order memory order = orders[orderId];
 //       emit GettedOrder (orderId, order);
        return order;
    }

    function getOrdersLen () public view returns (uint) {
        return orders.length;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) public pure returns(bytes4) {
            return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
        }
     
    //TODO make destructing function to return all 
    function terminate(address[] calldata tokens, NFT[] calldata nfts) public onlyOwner {
    // Transfer tokens to owner (TODO: error handling)
        for (uint i = 0; i < tokens.length; i++) {
            address addr = tokens[i];
            UniqueFungible token = UniqueFungible(addr);
            uint256 balance = token.balanceOf(address(this));
            token.transfer(owner, balance);
        }
        for (uint i = 0; i < nfts.length; i++) {
            address addr = nfts[i].collection;
            UniqueNFT token = UniqueNFT(addr);
            token.transferFrom(address(this), owner, nfts[i].id);
        }    
    // Transfer Eth to owner and terminate contract
        address payable owner1 = payable (owner);
        uint balance = address(this).balance;
        owner1.transfer(balance);
        
    } 
    
}
