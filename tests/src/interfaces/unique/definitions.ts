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

import types from '../lookup';

type RpcParam = {
  name: string;
  type: string;
  isOptional?: true;
};

const CROSS_ACCOUNT_ID_TYPE = 'PalletEvmAccountBasicCrossAccountIdRepr';

const collectionParam = {name: 'collection', type: 'u32'};
const tokenParam = {name: 'tokenId', type: 'u32'};
const crossAccountParam = (name = 'account') => ({name, type: CROSS_ACCOUNT_ID_TYPE});
const atParam = {name: 'at', type: 'Hash', isOptional: true};

const fun = (description: string, params: RpcParam[], type: string) => ({
  description,
  params: [...params, atParam],
  type,
});

export default {
  types,
  rpc: {
    adminlist: fun('Get admin list', [collectionParam], 'Vec<PalletEvmAccountBasicCrossAccountIdRepr>'),
    allowlist: fun('Get allowlist', [collectionParam], 'Vec<PalletEvmAccountBasicCrossAccountIdRepr>'),

    accountTokens: fun('Get tokens owned by account', [collectionParam, crossAccountParam()], 'Vec<u32>'),
    collectionTokens: fun('Get tokens contained in collection', [collectionParam], 'Vec<u32>'),

    lastTokenId: fun('Get last token id', [collectionParam], 'u32'),
    accountBalance: fun('Get amount of different user tokens', [collectionParam, crossAccountParam()], 'u32'),
    balance: fun('Get amount of specific account token', [collectionParam, crossAccountParam(), tokenParam], 'u128'),
    allowance: fun('Get allowed amount', [collectionParam, crossAccountParam('sender'), crossAccountParam('spender'), tokenParam], 'u128'),
    tokenOwner: fun('Get token owner', [collectionParam, tokenParam], CROSS_ACCOUNT_ID_TYPE),
    constMetadata: fun('Get token constant metadata', [collectionParam, tokenParam], 'Vec<u8>'),
    variableMetadata: fun('Get token variable metadata', [collectionParam, tokenParam], 'Vec<u8>'),
    tokenExists: fun('Check if token exists', [collectionParam, tokenParam], 'bool'),
    collectionById: fun('Get collection by specified id', [collectionParam], 'Option<UpDataStructsCollection>'),
    collectionStats: fun('Get collection stats', [], 'UpDataStructsCollectionStats'),
    allowed: fun('Check if user is allowed to use collection', [collectionParam, crossAccountParam()], 'bool'),
    nextSponsored: fun('Get number of blocks when sponsored transaction is available', [collectionParam, crossAccountParam(), tokenParam], 'Option<u64>'),
    effectiveCollectionLimits: fun('Get effective collection limits', [collectionParam], 'Option<UpDataStructsCollectionLimits>'),
  },
};
