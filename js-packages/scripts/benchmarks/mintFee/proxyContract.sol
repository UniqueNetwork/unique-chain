// SPDX-License-Identifier:  Apache License
pragma solidity >=0.8.0;
import {CollectionHelpers} from "eth/api/CollectionHelpers.sol";
import {ContractHelpers} from "eth/api/ContractHelpers.sol";
import {UniqueRefungibleToken} from "eth/api/UniqueRefungibleToken.sol";
import {UniqueRefungible, Collection, CrossAddress as RftCrossAccountId, Property as RftProperty} from "eth/api/UniqueRefungible.sol";
import {UniqueNFT, CrossAddress as NftCrossAccountId, Property as NftProperty} from "eth/api/UniqueNFT.sol";

struct Property {
	string key;
	bytes value;
}

interface SoftDeprecatedMethods {
	/// @notice Set token property value.
	/// @dev Throws error if `msg.sender` has no permission to edit the property.
	/// @param tokenId ID of the token.
	/// @param key Property key.
	/// @param value Property value.
	/// @dev EVM selector for this function is: 0x1752d67b,
	///  or in textual repr: setProperty(uint256,string,bytes)
	function setProperty(
		uint256 tokenId,
		string memory key,
		bytes memory value
	) external;
}

interface BenchUniqueRefungible is UniqueRefungible, SoftDeprecatedMethods {}
interface BenchUniqueNFT is UniqueNFT, SoftDeprecatedMethods {}



contract ProxyMint {
	bytes32 constant REFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("ReFungible"));
	bytes32 constant NONFUNGIBLE_COLLECTION_TYPE = keccak256(bytes("NFT"));

	modifier checkRestrictions(address _collection) {
		Collection commonContract = Collection(_collection);
		require(
			commonContract.isOwnerOrAdminCross(RftCrossAccountId(msg.sender, 0)),
			"Only collection admin/owner can call this method"
		);
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
		Property[] calldata _properties
	) external checkRestrictions(_collection) {
		uint256 propertiesLength = _properties.length;
		require(propertiesLength > 0, "Properies is empty");

		Collection commonContract = Collection(_collection);
		bytes32 collectionType = keccak256(bytes(commonContract.uniqueCollectionType()));
		uint256 tokenId;

		if (collectionType == REFUNGIBLE_COLLECTION_TYPE) {
			BenchUniqueRefungible rftCollection = BenchUniqueRefungible(_collection);
			tokenId = rftCollection.nextTokenId();
			rftCollection.mint(address(this));

			for (uint256 i = 0; i < propertiesLength; ++i) {
				rftCollection.setProperty(tokenId, _properties[i].key, _properties[i].value);
			}
			rftCollection.transferFromCross(
				RftCrossAccountId(address(this), 0),
				RftCrossAccountId(address(0), _substrateReceiver),
				tokenId
			);
		} else if (collectionType == NONFUNGIBLE_COLLECTION_TYPE) {
			BenchUniqueNFT nftCollection = BenchUniqueNFT(_collection);
			tokenId = nftCollection.mint(address(this));
			for (uint256 i = 0; i < propertiesLength; ++i) {
				nftCollection.setProperty(tokenId, _properties[i].key, _properties[i].value);
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
