// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {CollectionHelpers} from "../api/CollectionHelpers.sol";
import {ContractHelpers} from "../api/ContractHelpers.sol";
import {UniqueRefungibleToken} from "../api/UniqueRefungibleToken.sol";
import {UniqueRefungible} from "../api/UniqueRefungible.sol";
import {UniqueNFT} from "../api/UniqueNFT.sol";

/// @dev Fractionalization contract. It stores mappings between NFT and RFT tokens,
///  stores allowlist of NFT tokens available for fractionalization, has methods
///  for fractionalization and defractionalization of NFT tokens.
contract Fractionalizer {
    struct Token {
        address _collection;
        uint256 _tokenId;
    }
    address rftCollection;
    mapping(address => bool) nftCollectionAllowList;
    mapping(address => mapping(uint256 => uint256)) nft2rftMapping;
    mapping(address => Token) rft2nftMapping;
    bytes32 refungibleCollectionType = keccak256(bytes("ReFungible"));

    receive() external payable onlyOwner {}

    /// @dev Method modifier to only allow contract owner to call it.
    modifier onlyOwner() {
        address contracthelpersAddress = 0x842899ECF380553E8a4de75bF534cdf6fBF64049;
        ContractHelpers contractHelpers = ContractHelpers(contracthelpersAddress);
        address contractOwner = contractHelpers.contractOwner(address(this));
        require(msg.sender == contractOwner, "Only owner can");
        _;
    }

    /// @dev This emits when RFT collection setting is changed.
    event RFTCollectionSet(address _collection);

    /// @dev This emits when NFT collection is allowed or disallowed.
    event AllowListSet(address _collection, bool _status);

    /// @dev This emits when NFT token is fractionalized by contract.
    event Fractionalized(address _collection, uint256 _tokenId, address _rftToken, uint128 _amount);

    /// @dev This emits when NFT token is defractionalized by contract.
    event Defractionalized(address _rftToken, address _nftCollection, uint256 _nftTokenId);

    /// Set RFT collection that contract will work with. RFT tokens for fractionalized NFT tokens
    /// would be created in this collection.
    /// @dev Throws if RFT collection is already configured for this contract.
    ///  Throws if collection of wrong type (NFT, Fungible) is provided instead
    ///  of RFT collection.
    ///  Throws if `msg.sender` is not owner or admin of provided RFT collection.
    ///  Can only be called by contract owner.
    /// @param _collection address of RFT collection.
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
            refungibleContract.verifyOwnerOrAdmin(address(this)),
            "Fractionalizer contract should be an admin of the collection"
        );
        rftCollection = _collection;
        emit RFTCollectionSet(rftCollection);
    }

    /// Creates and sets RFT collection that contract will work with. RFT tokens for fractionalized NFT tokens
    /// would be created in this collection.
    /// @dev Throws if RFT collection is already configured for this contract.
    ///  Can only be called by contract owner.
    /// @param _name name for created RFT collection.
    /// @param _description description for created RFT collection.
    /// @param _tokenPrefix token prefix for created RFT collection.
    function createAndSetRFTCollection(string calldata _name, string calldata _description, string calldata _tokenPrefix) public onlyOwner {
        require(
            rftCollection == address(0),
            "RFT collection is already set"
        );
        address collectionHelpers = 0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F;
        rftCollection = CollectionHelpers(collectionHelpers).createRefungibleCollection(_name, _description, _tokenPrefix);
        emit RFTCollectionSet(rftCollection);
    }

    /// Allow or disallow NFT collection tokens from being fractionalized by this contract.
    /// @dev Can only be called by contract owner.
    /// @param collection NFT token address.
    /// @param status `true` to allow and `false` to disallow NFT token.
    function setNftCollectionIsAllowed(address collection, bool status) public onlyOwner {
        nftCollectionAllowList[collection] = status;
        emit AllowListSet(collection, status);
    }

    /// Fractionilize NFT token.
    /// @dev Takes NFT token from `msg.sender` and transfers RFT token to `msg.sender`
    ///  instead. Creates new RFT token if provided NFT token never was fractionalized
    ///  by this contract or existing RFT token if it was.
    ///  Throws if RFT collection isn't configured for this contract.
    ///  Throws if fractionalization of provided NFT token is not allowed
    ///  Throws if `msg.sender` is not owner of provided NFT token
    /// @param  _collection NFT collection address
    /// @param  _token id of NFT token to be fractionalized
    /// @param  _pieces number of pieces new RFT token would have
    function nft2rft(address _collection, uint256 _token, uint128 _pieces) public {
        require(
            rftCollection != address(0),
            "RFT collection is not set"
        );
        UniqueRefungible rftCollectionContract = UniqueRefungible(rftCollection);
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

    /// Defrationalize NFT token.
    /// @dev Takes RFT token from `msg.sender` and transfers corresponding NFT token
    ///  to `msg.sender` instead.
    ///  Throws if RFT collection isn't configured for this contract.
    ///  Throws if provided RFT token is no from configured RFT collection.
    ///  Throws if RFT token was not created by this contract.
    ///  Throws if `msg.sender` isn't owner of all RFT token pieces.
    /// @param _collection RFT collection address
    /// @param _token id of RFT token
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