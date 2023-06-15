// SPDX-License-Identifier: MIT

pragma solidity >=0.8.17;

import { CrossAddress } from "@unique-nft/solidity-interfaces/contracts/UniqueNFT.sol";

struct UniqueRoyaltyPart {
    uint8 version;
    uint8 decimals;
    uint64 value;
    bool isPrimarySaleOnly;
    CrossAddress crossAddress;
}

library CrossAddressLib {
    function toAddress(CrossAddress memory crossAddress) internal pure returns (address) {
        return crossAddress.eth != address(0) ? crossAddress.eth : address(uint160(crossAddress.sub >> 96));
    }
}

library UniqueRoyalty {
    uint private constant DECIMALS_OFFSET = 4 * 16;
    uint private constant ADDRESS_TYPE_OFFSET = 4 * (16 + 2);           // 0 - eth, 1 - sub
    uint private constant ROYALTY_TYPE_OFFSET = 4 * (16 + 2 + 1);       // 0 - default, 1 - primary sale only
    uint private constant VERSION_OFFSET = 4 * (16 + 2 + 1 + 1 + 42);

    uint private constant PART_LENGTH = 32 * 2;

    function decode(bytes memory b) internal pure returns (UniqueRoyaltyPart[] memory) {
        if (b.length == 0) return new UniqueRoyaltyPart[](0);

        require((b.length % PART_LENGTH) == 0, "Invalid bytes length, expected (32 * 2) * UniqueRoyaltyParts count");
        uint partsCount = b.length / PART_LENGTH;
        uint numbersCount = partsCount * 2;

        UniqueRoyaltyPart[] memory parts = new UniqueRoyaltyPart[](partsCount);

        // need this because numbers encoded via abi.encodePacked
        bytes memory prefix = new bytes(64);

        assembly {
            mstore(add(prefix, 32), 32)
            mstore(add(prefix, 64), numbersCount)
        }

        uint256[] memory encoded = abi.decode(bytes.concat(prefix, b), (uint256[]));

        for (uint i = 0; i < partsCount; i++) {
            parts[i] = decodePart(encoded[i * 2], encoded[i * 2 + 1]);
        }

        return parts;
    }

    function encode(UniqueRoyaltyPart[] memory parts) internal pure returns (bytes memory) {
        if (parts.length == 0) return "";

        uint256[] memory encoded = new uint256[](parts.length * 2);

        for (uint i = 0; i < parts.length; i++) {
            (uint256 encodedMeta, uint256 encodedAddress) = encodePart(parts[i]);

            encoded[i * 2] = encodedMeta;
            encoded[i * 2 + 1] = encodedAddress;
        }

        return abi.encodePacked(encoded);
    }

    function decodePart(bytes memory b) internal pure returns (UniqueRoyaltyPart memory) {
        require(b.length == PART_LENGTH, "Invalid bytes length, expected 32 * 2");

        uint256[2] memory encoded = abi.decode(b, (uint256[2]));

        return decodePart(encoded[0], encoded[1]);
    }

    function decodePart(
        uint256 _meta,
        uint256 _address
    ) internal pure returns (UniqueRoyaltyPart memory) {
        uint256 version = _meta >> VERSION_OFFSET;
        bool isPrimarySaleOnly = (_meta & (1 << ROYALTY_TYPE_OFFSET)) > 0;
        bool isEthereumAddress = (_meta & (1 << ADDRESS_TYPE_OFFSET)) == 0;
        uint256 decimals = (_meta >> 4 * 16) & 0xFF;
        uint256 value = _meta & 0xFFFFFFFFFFFFFFFF;

        CrossAddress memory crossAddress = isEthereumAddress
            ? CrossAddress({ sub: 0, eth: address(uint160(_address)) })
            : CrossAddress({ sub: _address, eth: address(0) });

        UniqueRoyaltyPart memory royaltyPart = UniqueRoyaltyPart({
            version: uint8(version),
            decimals: uint8(decimals),
            value: uint64(value),
            isPrimarySaleOnly: isPrimarySaleOnly,
            crossAddress: crossAddress
        });

        return royaltyPart;
    }

    function encodePart(UniqueRoyaltyPart memory royaltyPart) internal pure returns (uint256, uint256) {
        uint256 encodedMeta = 0;
        uint256 encodedAddress = 0;

        encodedMeta |= uint256(royaltyPart.version) << VERSION_OFFSET;
        if (royaltyPart.isPrimarySaleOnly) encodedMeta |= 1 << ROYALTY_TYPE_OFFSET;

        if (royaltyPart.crossAddress.eth == address(0x0)) {
            encodedMeta |= 1 << ADDRESS_TYPE_OFFSET;
            encodedAddress = royaltyPart.crossAddress.sub;
        } else {
            encodedAddress = uint256(uint160(royaltyPart.crossAddress.eth));
        }

        encodedMeta |= uint256(royaltyPart.decimals) << DECIMALS_OFFSET;
        encodedMeta |= uint256(royaltyPart.value);

        return (encodedMeta, encodedAddress);
    }
}