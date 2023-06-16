// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { UniqueNFT, CrossAddress } from "@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol";
import { UniqueFungible, CrossAddress as CrossAddressF } from "@unique-nft/solidity-interfaces/contracts/UniqueFungible.sol";
import "@unique-nft/solidity-interfaces/contracts/CollectionHelpers.sol";
import "./royalty/UniqueRoyaltyHelper.sol";

contract Market {
    using ERC165Checker for address;

    struct Order {
      uint32 id;
      uint32 collectionId;
      uint32 tokenId;
      uint32 amount;
      uint256 price;
      CrossAddress seller;
    }

    uint32 public constant version = 0;
    uint32 public constant buildVersion = 1;
    bytes4 private constant InterfaceId_ERC721 = 0x80ac58cd;
    bytes4 private constant InterfaceId_ERC165 = 0x5755c3f2;
    CollectionHelpers private constant collectionHelpers =
        CollectionHelpers(0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F);

    mapping(uint32 => mapping(uint32 => Order)) orders;
    uint32 private idCount = 1;
    uint32 public marketFee;
    uint64 public ctime;
    address selfAddress;
    address public ownerAddress;
    mapping(address => bool) public admins;

    event TokenIsUpForSale(uint32 version, Order item);
    event TokenRevoke(uint32 version, Order item, uint32 amount);
    event TokenIsApproved(uint32 version, Order item);
    event TokenIsPurchased(
      uint32 version,
      Order item,
      uint32 salesAmount,
      CrossAddress buyer,
      RoyaltyAmount[] royalties
    );
    event Log(string message);

    error InvalidArgument(string info);
    error InvalidMarketFee();
    error SellerIsNotOwner();
    error TokenIsAlreadyOnSale();
    error TokenIsNotApproved();
    error CollectionNotFound();
    error CollectionNotSupportedERC721();
    error OrderNotFound();
    error TooManyAmountRequested();
    error NotEnoughMoneyError();
    error FailTransferToken(string reason);

    modifier onlyOwner() {
      require(msg.sender == ownerAddress, "Only owner can");
      _;
    }

    modifier onlyAdmin() {
      require(msg.sender == ownerAddress || admins[msg.sender], "Only admin can");
      _;
    }

    modifier validCrossAddress(address eth, uint256 sub) {
      if (eth == address(0) && sub == 0) {
        revert InvalidArgument("Ethereum and Substrate addresses cannot be null at the same time");
      }

      if (eth != address(0) && sub != 0) {
        revert InvalidArgument("Ethereum and Substrate addresses cannot be not null at the same time");
      }

      _;
    }

    constructor(uint32 fee, uint64 timestamp) {
        marketFee = fee;
        ctime = timestamp;

        if (marketFee == 0 || marketFee >= 100) {
            revert InvalidMarketFee();
        }

        ownerAddress = msg.sender;
        selfAddress = address(this);
    }

    function getErc721(uint32 collectionId) private view returns (IERC721) {
        address collectionAddress = collectionHelpers.collectionAddress(
            collectionId
        );

        uint size;
        assembly {
            size := extcodesize(collectionAddress)
        }

        if (size == 0) {
            revert CollectionNotFound();
        }

        if (!collectionAddress.supportsInterface(InterfaceId_ERC721)) {
            revert CollectionNotSupportedERC721();
        }

        return IERC721(collectionAddress);
    }

    // ################################################################
    // Set new contract owner                                         #
    // ################################################################

    function setOwner() public onlyOwner {
        ownerAddress = msg.sender;
    }

    // ################################################################
    // Add new admin                                                  #
    // ################################################################

    function addAdmin(address admin) public onlyAdmin {
      admins[admin] = true;
    }

    // ################################################################
    // Remove admin                                                  #
    // ################################################################

    function removeAdmin(address admin) public onlyAdmin {
      delete admins[admin];
    }

    // ################################################################
    // Place a token for sale                                         #
    // ################################################################

    function put(
        uint32 collectionId,
        uint32 tokenId,
        uint256 price,
        uint32 amount,
        CrossAddress memory seller
    ) public validCrossAddress(seller.eth, seller.sub) {
        if (price == 0) {
          revert InvalidArgument("price must not be zero");
        }
        if (amount == 0) {
          revert InvalidArgument("amount must not be zero");
        }

        if (orders[collectionId][tokenId].price > 0) {
            revert TokenIsAlreadyOnSale();
        }

        IERC721 erc721 = getErc721(collectionId);

        if (erc721.ownerOf(tokenId) != msg.sender) {
          revert SellerIsNotOwner();
        }

        if (erc721.getApproved(tokenId) != selfAddress) {
          revert TokenIsNotApproved();
        }

        Order memory order = Order(
            0,
            collectionId,
            tokenId,
            amount,
            price,
            seller
        );

        order.id = idCount++;
        orders[collectionId][tokenId] = order;

        emit TokenIsUpForSale(version, order);
    }

    // ################################################################
    // Get order                                                      #
    // ################################################################

    function getOrder(
        uint32 collectionId,
        uint32 tokenId
    ) external view returns (Order memory) {
        return orders[collectionId][tokenId];
    }

    // ################################################################
    // Revoke the token from the sale                                 #
    // ################################################################

    function revoke(
        uint32 collectionId,
        uint32 tokenId,
        uint32 amount
    ) external {
        if (amount == 0) {
          revert InvalidArgument("amount must not be zero");
        }

        Order memory order = orders[collectionId][tokenId];

        if (order.price == 0) {
          revert OrderNotFound();
        }

        if (amount > order.amount) {
          revert TooManyAmountRequested();
        }

        IERC721 erc721 = getErc721(collectionId);

        address ethAddress;
        if (order.seller.eth != address(0)) {
          ethAddress = order.seller.eth;
        } else {
          ethAddress = payable(address(uint160(order.seller.sub >> 96)));
        }
        if (erc721.ownerOf(tokenId) != ethAddress) {
          revert SellerIsNotOwner();
        }

        order.amount -= amount;
        if (order.amount == 0) {
            delete orders[collectionId][tokenId];
        } else {
            orders[collectionId][tokenId] = order;
        }

        emit TokenRevoke(version, order, amount);
    }

    // ################################################################
    // Check approved                                                 #
    // ################################################################

    function checkApproved(uint32 collectionId, uint32 tokenId) public onlyAdmin {
        Order memory order = orders[collectionId][tokenId];
        if (order.price == 0) {
            revert OrderNotFound();
        }

        IERC721 erc721 = getErc721(collectionId);

        if (erc721.getApproved(tokenId) != selfAddress || erc721.ownerOf(tokenId) != getAddressFromCrossAccount(order.seller)) {
          uint32 amount = order.amount;
          order.amount = 0;
          emit TokenRevoke(version, order, amount);

          delete orders[collectionId][tokenId];
        } else {
          emit TokenIsApproved(version, order);
        }
    }

    function getAddressFromCrossAccount(CrossAddress memory account) private pure returns (address) {
        if (account.eth != address(0)) {
            return account.eth;
        } else {
            return address(uint160(account.sub >> 96));
        }
    }

    function revokeAdmin(uint32 collectionId, uint32 tokenId) public onlyAdmin {
        Order memory order = orders[collectionId][tokenId];
        if (order.price == 0) {
          revert OrderNotFound();
        }

        uint32 amount = order.amount;
        order.amount = 0;
        emit TokenRevoke(version, order, amount);

        delete orders[collectionId][tokenId];
    }

    // ################################################################
    // Buy a token                                                    #
    // ################################################################

    function buy(
        uint32 collectionId,
        uint32 tokenId,
        uint32 amount,
        CrossAddress memory buyer
    ) public payable validCrossAddress(buyer.eth, buyer.sub) {
        if (msg.value == 0) {
          revert InvalidArgument("msg.value must not be zero");
        }
        if (amount == 0) {
          revert InvalidArgument("amount must not be zero");
        }

        Order memory order = orders[collectionId][tokenId];
        if (order.price == 0) {
            revert OrderNotFound();
        }

        if (amount > order.amount) {
            revert TooManyAmountRequested();
        }

        uint256 totalValue = order.price * amount;
        uint256 feeValue = (totalValue * marketFee) / 100;

        if (msg.value < totalValue) {
            revert NotEnoughMoneyError();
        }

        IERC721 erc721 = getErc721(order.collectionId);
        if (erc721.getApproved(tokenId) != selfAddress) {
          revert TokenIsNotApproved();
        }

        order.amount -= amount;
        if (order.amount == 0) {
            delete orders[collectionId][tokenId];
        } else {
            orders[collectionId][tokenId] = order;
        }

        address collectionAddress = collectionHelpers.collectionAddress(collectionId);
        UniqueNFT nft = UniqueNFT(collectionAddress);

        nft.transferFromCross(
          order.seller,
          buyer,
          order.tokenId
        );

        (uint256 totalRoyalty, RoyaltyAmount[] memory royalties) = sendRoyalties(collectionAddress, tokenId, totalValue);

        sendMoney(order.seller, totalValue - feeValue - totalRoyalty);

        if (msg.value > totalValue) {
            // todo, send money to signer or buyer ?
            payable(msg.sender).transfer(msg.value - totalValue);
        }

        emit TokenIsPurchased(version, order, amount, buyer, royalties);
    }

    function sendMoney(CrossAddress memory to, uint256 money) private {
      address collectionAddress = collectionHelpers.collectionAddress(0);

      UniqueFungible fungible = UniqueFungible(collectionAddress);

      CrossAddressF memory fromF = CrossAddressF(selfAddress, 0);
      CrossAddressF memory toF = CrossAddressF(to.eth, to.sub);

      fungible.transferFromCross(fromF, toF, money);
    }

    function sendRoyalties(address collection, uint tokenId, uint sellPrice) private returns (uint256, RoyaltyAmount[] memory) {
      RoyaltyAmount[] memory royalties = UniqueRoyaltyHelper.calculate(collection, tokenId, sellPrice);

      uint256 totalRoyalty = 0;

      for (uint256 i=0; i<royalties.length; i++) {
        RoyaltyAmount memory royalty = royalties[i];

        totalRoyalty += royalty.amount;

        sendMoney(royalty.crossAddress, royalty.amount);
      }

      return (totalRoyalty, royalties);
    }

    function withdraw(address transferTo) public onlyOwner {
        uint256 balance = selfAddress.balance;

        if (balance > 0) {
            payable(transferTo).transfer(balance);
        }
    }
}