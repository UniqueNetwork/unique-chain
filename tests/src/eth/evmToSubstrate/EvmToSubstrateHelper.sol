// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {CollectionHelpers} from "../api/CollectionHelpers.sol";
import {ContractHelpers} from "../api/ContractHelpers.sol";
import {UniqueRefungibleToken} from "../api/UniqueRefungibleToken.sol";
import {UniqueRefungible, Collection, EthCrossAccount as RftCrossAccountId, Tuple20 as RftProperties} from "../api/UniqueRefungible.sol";
import {UniqueNFT, EthCrossAccount as NftCrossAccountId, Tuple21 as NftProperty, TokenProperties} from "../api/UniqueNFT.sol";

struct Property {
	string key;
	bytes value;
}

// interface Foo {
// 	struct Tuple19 {
// 		string field_0;
// 		bytes field_1;
// 	}

// }

contract EvmToSubstrate {
	bytes32 constant REFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("ReFungible"));
	bytes32 constant NONFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("NFT"));
	// bytes32 collectionType;

	// Collection commonContract;
	// UniqueNFT nftCollection;
	// UniqueRefungible rftCollection;

	// function(address, uint256) external returns (bool) mintInvoke;
	// function(address, address, uint256) external transferInvoke;

	modifier checkRestrictions(address _collection) {
		Collection commonContract = Collection(_collection);
		require(commonContract.isOwnerOrAdmin(msg.sender), "Only collection admin/owner can call this method");

		// bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
		// uint256 tokenId;

		// if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {
		// 	UniqueRefungible rftCollection = UniqueRefungible(_collection);
		// 	mintInvoke = rftCollection.mint;
		// 	transferInvoke = rftCollection.transferFrom;
		// 	tokenId = rftCollection.nextTokenId();
		// } else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
		// 	UniqueNFT nftCollection = UniqueNFT(_collection);
		// 	mintInvoke = nftCollection.mint;
		// 	transferInvoke = nftCollection.transferFrom;

		// 	tokenId = nftCollection.nextTokenId();
		// } else {
		// 	revert("Wrong collection type. Works only with NFT or RFT");
		// }

		_;
	}

	/// @dev This emits when a mint to a substrate address has been made.
	event MintToSub(address _toEth, uint256 _toSub, address _collection, uint256 _tokenId);

	function mintToSubstrate(address _collection, uint256 _substrateReceiver) external checkRestrictions(_collection) {
		// function(address, uint256) external returns (bool) mintInvoke;
		// function(Tuple8 memory, Tuple8 memory, uint256) external transferInvoke;
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
			// tokenId = nftCollection.nextTokenId();
			tokenId = nftCollection.mint(address(this));

			nftCollection.transferFromCross(
				NftCrossAccountId(address(this), 0),
				NftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else {
			revert("Wrong collection type. Works only with NFT or RFT");
		}

		// mintInvoke(address(this), tokenId);
		// Tuple8 memory sender = Tuple8(address(this), 0);
		// Tuple8 memory receiver = Tuple8(address(0), _substrateReceiver);

		// transferInvoke(sender, receiver, tokenId);

		emit MintToSub(address(0), _substrateReceiver, _collection, tokenId);
	}

	function mintToSubstrateWithProperty(
		address _collection,
		uint256 _substrateReceiver,
		Property[] calldata properties
	) external checkRestrictions(_collection) {
		// function(address, uint256, string memory) external returns (bool) mintInvoke;
		// function(address, address, uint256) external transferInvoke;
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
			// tokenId = nftCollection.nextTokenId();
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

		// transferInvoke(address(this), _gap, tokenId);

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
			// tokenId = nftCollection.nextTokenId();
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

	function proxyProperties(
		address _collection,
		uint256 _tokenId,
		NftProperty[] calldata _properties
	) external checkRestrictions(_collection) {
		uint256 propertiesLength = _properties.length;
		require(propertiesLength > 0, "Properies is empty");

		Collection commonContract = Collection(_collection);
		bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
	
		if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {
			revert("Wrong collection type. Works only with NFT or RFT");
		} else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
			UniqueNFT nftCollection = UniqueNFT(_collection);
			

			nftCollection.setProperties(_tokenId, _properties);
		} else {
			revert("Wrong collection type. Works only with NFT or RFT");
		}
	}
}
