// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {CollectionHelpers} from "../../eth/api/CollectionHelpers.sol";
import {ContractHelpers} from "../../eth/api/ContractHelpers.sol";
import {UniqueRefungibleToken} from "../../eth/api/UniqueRefungibleToken.sol";
import {UniqueRefungible, Collection, EthCrossAccount as RftCrossAccountId, Tuple20 as RftProperties} from "../../eth/api/UniqueRefungible.sol";
import {UniqueNFT, EthCrossAccount as NftCrossAccountId, Tuple21 as NftProperty, TokenProperties} from "../../eth/api/UniqueNFT.sol";

struct Property {
	string key;
	bytes value;
}

contract ProxyMint {
	bytes32 constant REFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("ReFungible"));
	bytes32 constant NONFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("NFT"));

	modifier checkRestrictions(address _collection) {
		Collection commonContract = Collection(_collection);
		require(commonContract.isOwnerOrAdmin(msg.sender), "Only collection admin/owner can call this method");
		_;
	}

	/// @dev This emits when a mint to a substrate address has been made.
	event MintToSub(address _toEth, uint256 _toSub, address _collection, uint256 _tokenId);

	function mintToSubstrate(address _collection, uint256 _substrateReceiver) external checkRestrictions(_collection) {
		Collection commonContract = Collection(_collection);
		bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
		uint256 tokenId;

		if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {
			UniqueRefungible rftCollection = UniqueRefungible(_collection);

			tokenId = rftCollection.mint(address(this));

			rftCollection.transferFromCross(
				RftCrossAccountId(address(this), 0),
				RftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
			UniqueNFT nftCollection = UniqueNFT(_collection);
			tokenId = nftCollection.mint(address(this));

			nftCollection.transferFromCross(
				NftCrossAccountId(address(this), 0),
				NftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else {
			revert("Wrong collection type. Works only with NFT or RFT");
		}

		emit MintToSub(address(0), _substrateReceiver, _collection, tokenId);
	}

	function mintToSubstrateWithProperty(
		address _collection,
		uint256 _substrateReceiver,
		Property[] calldata properties
	) external checkRestrictions(_collection) {
		uint256 propertiesLength = properties.length;
		require(propertiesLength > 0, "Properies is empty");

		Collection commonContract = Collection(_collection);
		bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
		uint256 tokenId;

		if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {
			UniqueRefungible rftCollection = UniqueRefungible(_collection);
			tokenId = rftCollection.nextTokenId();
			rftCollection.mint(address(this));
			for (uint256 i = 0; i < propertiesLength; ++i) {
				rftCollection.setProperty(tokenId, properties[i].key, properties[i].value);
			}
			rftCollection.transferFromCross(
				RftCrossAccountId(address(this), 0),
				RftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
			UniqueNFT nftCollection = UniqueNFT(_collection);
			tokenId = nftCollection.mint(address(this));
			for (uint256 i = 0; i < propertiesLength; ++i) {
				nftCollection.setProperty(tokenId, properties[i].key, properties[i].value);
			}
			nftCollection.transferFromCross(
				NftCrossAccountId(address(this), 0),
				NftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else {
			revert("Wrong collection type. Works only with NFT or RFT");
		}

		emit MintToSub(address(0), _substrateReceiver, _collection, tokenId);
	}

	function mintToSubstrateBulkProperty(
		address _collection,
		uint256 _substrateReceiver,
		NftProperty[] calldata _properties
	) external checkRestrictions(_collection) {
		uint256 propertiesLength = _properties.length;
		require(propertiesLength > 0, "Properies is empty");

		Collection commonContract = Collection(_collection);
		bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
		uint256 tokenId;

		if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {} else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
			UniqueNFT nftCollection = UniqueNFT(_collection);
			tokenId = nftCollection.mint(address(this));

			nftCollection.setProperties(tokenId, _properties);

			nftCollection.transferFromCross(
				NftCrossAccountId(address(this), 0),
				NftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else {
			revert("Wrong collection type. Works only with NFT or RFT");
		}

		emit MintToSub(address(0), _substrateReceiver, _collection, tokenId);
	}
}
