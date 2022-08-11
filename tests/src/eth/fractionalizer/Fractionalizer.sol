// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {CollectionHelpers} from "../api/CollectionHelpers.sol";
import {ContractHelpers} from "../api/ContractHelpers.sol";
import {UniqueRefungibleToken} from "../api/UniqueRefungibleToken.sol";
import {UniqueRefungible} from "../api/UniqueRefungible.sol";
import {UniqueNFT} from "../api/UniqueNFT.sol";

contract Fractionalizer {
    struct Token {
        address _collection;
        uint256 _tokenId;
    }
    address rftCollection;
    mapping(address => bool) nftCollectionAllowList;
    mapping(address => mapping(uint256 => uint256)) nft2rftMapping;
    mapping(address => Token) rft2nftMapping;
    address owner;
    bytes32 refungibleCollectionType = keccak256(bytes("ReFungible"));

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can");
        _;
    }

    event RFTCollectionSet(address _collection);
    event AllowListSet(address _collection, bool _status);
    event Fractionalized(address _collection, uint256 _tokenId, address _rftToken, uint128 _amount);
    event Defractionalized(address _rftToken, address _nftCollection, uint256 _nftTokenId);

    function setRFTCollection(address _collection) public onlyOwner {
        require(
            rftCollection == address(0),
            "RFT collection is already set"
        );
        UniqueRefungible refungibleContract = UniqueRefungible(_collection);
        string memory collectionType = refungibleContract.uniqueCollectionType();
        
        require(
            keccak256(bytes(collectionType)) == refungibleCollectionType,
            "Wrong collection type. Collection is not refungible."
        );
        require(
            refungibleContract.verifyOwnerOrAdmin(),
            "Fractionalizer contract should be an admin of the collection"
        );
        rftCollection = _collection;
        emit RFTCollectionSet(rftCollection);
    }

    function createAndSetRFTCollection(string calldata _name, string calldata _description, string calldata _tokenPrefix) public onlyOwner {
        require(
            rftCollection == address(0),
            "RFT collection is already set"
        );
        address collectionHelpers = 0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F;
        rftCollection = CollectionHelpers(collectionHelpers).createRefungibleCollection(_name, _description, _tokenPrefix);
        emit RFTCollectionSet(rftCollection);
    }

    function setNftCollectionIsAllowed(address collection, bool status) public onlyOwner {
        nftCollectionAllowList[collection] = status;
        emit AllowListSet(collection, status);
    }

    function nft2rft(address _collection, uint256 _token, uint128 _pieces) public {
        require(
            rftCollection != address(0),
            "RFT collection is not set"
        );
        UniqueRefungible rftCollectionContract = UniqueRefungible(rftCollection);
        require(
            UniqueNFT(_collection).ownerOf(_token) == msg.sender,
            "Only token owner could fractionalize it"
        );
        require(
            nftCollectionAllowList[_collection] == true,
            "Fractionalization of this collection is not allowed by admin"
        );
        require(
            UniqueNFT(_collection).ownerOf(_token) == msg.sender,
            "Only token owner could fractionalize it"
        );
        UniqueNFT(_collection).transferFrom(
            msg.sender,
            address(this),
            _token
        );
        uint256 rftTokenId;
        address rftTokenAddress;
        UniqueRefungibleToken rftTokenContract;
        if (nft2rftMapping[_collection][_token] == 0) {
            rftTokenId = rftCollectionContract.nextTokenId();
            rftCollectionContract.mint(address(this), rftTokenId);
            rftTokenAddress = rftCollectionContract.tokenContractAddress(rftTokenId);
            nft2rftMapping[_collection][_token] = rftTokenId;
            rft2nftMapping[rftTokenAddress] = Token(_collection, _token);

            rftTokenContract = UniqueRefungibleToken(rftTokenAddress);
            rftTokenContract.setParentNFT(_collection, _token);
        } else {
            rftTokenId = nft2rftMapping[_collection][_token];
            rftTokenAddress = rftCollectionContract.tokenContractAddress(rftTokenId);
            rftTokenContract = UniqueRefungibleToken(rftTokenAddress);
        }
        rftTokenContract.repartition(_pieces);
        rftTokenContract.transfer(msg.sender, _pieces);
        emit Fractionalized(_collection, _token, rftTokenAddress, _pieces);
    }

    function rft2nft(address _collection, uint256 _token) public {
        require(
            rftCollection != address(0),
            "RFT collection is not set"
        );
        require(
            rftCollection == _collection,
            "Wrong RFT collection"
        );
        UniqueRefungible rftCollectionContract = UniqueRefungible(rftCollection);
        address rftTokenAddress = rftCollectionContract.tokenContractAddress(_token);
        Token memory nftToken = rft2nftMapping[rftTokenAddress];
        require(
            nftToken._collection != address(0),
            "No corresponding NFT token found"
        );
        UniqueRefungibleToken rftTokenContract = UniqueRefungibleToken(rftTokenAddress);
        require(
            rftTokenContract.balanceOf(msg.sender) == rftTokenContract.totalSupply(),
            "Not all pieces are owned by the caller"
        );
        rftCollectionContract.transferFrom(msg.sender, address(this), _token);
        UniqueNFT(nftToken._collection).transferFrom(
            address(this),
            msg.sender,
            nftToken._tokenId
        );
        emit Defractionalized(rftTokenAddress, nftToken._collection, nftToken._tokenId);
    }
}