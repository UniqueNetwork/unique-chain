// SPDX-License-Identifier: MIT

pragma solidity >=0.8.17;

import "./UniqueRoyalty.sol";
import "./LibPart.sol";

string constant ROYALTIES_PROPERTY = "royalties";

interface ICollection {
    function collectionProperty(string memory key) external view returns (bytes memory);
    function property(uint256 tokenId, string memory key) external view returns (bytes memory);
}

struct RoyaltyAmount {
    CrossAddress crossAddress;
    uint amount;
}

library UniqueRoyaltyHelper {
    function encodePart(UniqueRoyaltyPart memory part) internal pure returns (bytes memory) {
        (uint256 encodedMeta, uint256 encodedAddress) = UniqueRoyalty.encodePart(part);

        return abi.encodePacked(encodedMeta, encodedAddress);
    }

    function decodePart(bytes memory data) internal pure returns (UniqueRoyaltyPart memory) {
        return UniqueRoyalty.decodePart(data);
    }

    // todo - implement smth better - check royalties sum is lte 100%
    function validatePart(bytes memory b) internal pure returns (bool isValid) {
        isValid = b.length == 64;
    }

    function encode(UniqueRoyaltyPart[] memory royalties) internal pure returns (bytes memory) {
        return UniqueRoyalty.encode(royalties);
    }

    function decode(bytes memory data) internal pure returns (UniqueRoyaltyPart[] memory) {
        return UniqueRoyalty.decode(data);
    }

    // todo - implement smth better - check royalties sum is lte 100%
    function validate(bytes memory b) internal pure returns (bool) {
        return b.length % 64 == 0;
    }

    function getTokenRoyalty(address collection, uint tokenId) internal view returns (UniqueRoyaltyPart[] memory) {
        try ICollection(collection).property(tokenId, ROYALTIES_PROPERTY) returns (bytes memory encoded) {
            return UniqueRoyalty.decode(encoded);
        } catch {
            return new UniqueRoyaltyPart[](0);
        }
    }

    function getCollectionRoyalty(address collection) internal view returns (UniqueRoyaltyPart[] memory) {
        try ICollection(collection).collectionProperty(ROYALTIES_PROPERTY) returns (bytes memory encoded) {
            return UniqueRoyalty.decode(encoded);
        } catch {
            return new UniqueRoyaltyPart[](0);
        }
    }

    function getRoyalty(address collection, uint tokenId) internal view returns (UniqueRoyaltyPart[] memory royalty) {
        royalty = getTokenRoyalty(collection, tokenId);

        if (royalty.length == 0) {
            royalty = getCollectionRoyalty(collection);
        }
    }

    function calculateRoyalties(UniqueRoyaltyPart[] memory royalties, bool isPrimarySale, uint sellPrice) internal pure returns (RoyaltyAmount[] memory) {
        RoyaltyAmount[] memory royaltyAmounts = new RoyaltyAmount[](royalties.length);
        uint amountsCount = 0;

        for (uint i = 0; i < royalties.length; i++) {
            if (isPrimarySale == royalties[i].isPrimarySaleOnly) {
                uint amount = (sellPrice * royalties[i].value) / (10 ** (royalties[i].decimals));

                royaltyAmounts[amountsCount] = RoyaltyAmount({
                    crossAddress: royalties[i].crossAddress,
                    amount: amount
                });

                amountsCount += 1;
            }
        }

        // shrink royaltyAmounts to amountsCount length
        assembly { mstore(royaltyAmounts, amountsCount) }

        return royaltyAmounts;
    }

    function calculateForPrimarySale(address collection, uint tokenId, uint sellPrice) internal view returns (RoyaltyAmount[] memory) {
        UniqueRoyaltyPart[] memory royalties = getRoyalty(collection, tokenId);

        return calculateRoyalties(royalties, true, sellPrice);
    }

    function calculate(address collection, uint tokenId, uint sellPrice) internal view returns (RoyaltyAmount[] memory) {
        UniqueRoyaltyPart[] memory royalties = getRoyalty(collection, tokenId);

        return calculateRoyalties(royalties, false, sellPrice);
    }
}