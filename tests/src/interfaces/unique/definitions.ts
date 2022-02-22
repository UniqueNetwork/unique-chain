import types from '../lookup';

type RpcParam = {
  name: string;
  type: string;
  isOptional?: true;
};

const CROSS_ACCOUNT_ID_TYPE = 'PalletCommonAccountBasicCrossAccountIdRepr';

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
    adminlist: fun('Get admin list', [collectionParam], 'Vec<PalletCommonAccountBasicCrossAccountIdRepr>'),
    allowlist: fun('Get allowlist', [collectionParam], 'Vec<PalletCommonAccountBasicCrossAccountIdRepr>'),

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
  },
};
