// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

type RpcParam = {
  name: string;
  type: string;
  isOptional?: true;
};

const atParam = {name: 'at', type: 'Hash', isOptional: true};
const fn = (description: string, params: RpcParam[], type: string) => ({
  description,
  params: [...params, atParam],
  type,
});

export default {
  types: {},
  rpc: {
    lastCollectionIdx: fn('Get the latest created collection id', [], 'u32'),
    collectionById: fn('Get collection by id', [{name: 'id', type: 'u32'}], 'Option<RmrkTraitsCollectionCollectionInfo>'),
    nftById: fn(
      'Get NFT by collection id and NFT id',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'nftId', type: 'u32'},
      ],
      'Option<RmrkTraitsNftNftInfo>',
    ),
    accountTokens: fn(
      'Get tokens owned by an account in a collection',
      [
        {name: 'accountId', type: 'AccountId32'},
        {name: 'collectionId', type: 'u32'},
      ],
      'Vec<u32>',
    ),
    nftChildren: fn(
      'Get NFT children',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'nftId', type: 'u32'},
      ],
      'Vec<RmrkTraitsNftNftChild>',
    ),
    collectionProperties: fn(
      'Get collection properties',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'filterKeys', type: 'Vec<String>', isOptional: true},
      ],
      'Vec<RmrkTraitsPropertyPropertyInfo>',
    ),
    nftProperties: fn(
      'Get NFT properties',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'nftId', type: 'u32'},
        {name: 'filterKeys', type: 'Vec<String>', isOptional: true},
      ],
      'Vec<RmrkTraitsPropertyPropertyInfo>',
    ),
    nftResources: fn(
      'Get NFT resources',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'nftId', type: 'u32'},
      ],
      'Vec<RmrkTraitsResourceResourceInfo>',
    ),
    nftResourcePriority: fn(
      'Get NFT resource priorities',
      [
        {name: 'collectionId', type: 'u32'},
        {name: 'nftId', type: 'u32'},
        {name: 'resourceId', type: 'u32'},
      ],
      'Option<u32>',
    ),
    base: fn(
      'Get base info',
      [{name: 'baseId', type: 'u32'}],
      'Option<RmrkTraitsBaseBaseInfo>',
    ),
    baseParts: fn(
      'Get all Base\'s parts',
      [{name: 'baseId', type: 'u32'}],
      'Vec<RmrkTraitsPartPartType>',
    ),
    themeNames: fn(
      'Get Base\'s theme names',
      [{name: 'baseId', type: 'u32'}],
      'Vec<Bytes>',
    ),
    themes: fn(
      'Get Theme\'s keys values',
      [
        {name: 'baseId', type: 'u32'},
        {name: 'themeName', type: 'String'},
        {name: 'keys', type: 'Option<Vec<String>>'},
      ],
      'Option<RmrkTraitsTheme>',
    ),
  },
};
