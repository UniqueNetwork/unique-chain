function mkDummy(name: string) {
  return {
    ['dummy' + name]: 'u32',
  };
}

type RpcParam = {
  name: string;
  type: string;
  isOptional?: true;
};

const CROSS_ACCOUNT_ID_TYPE = 'PalletCommonAccountBasicCrossAccountIdRepr';
const TOKEN_ID_TYPE = 'UpDataStructsTokenId';

const collectionParam = {name: 'collection', type: 'UpDataStructsCollectionId'};
const tokenParam = {name: 'tokenId', type: TOKEN_ID_TYPE};
const crossAccountParam = (name = 'account') => ({name, type: CROSS_ACCOUNT_ID_TYPE});
const atParam = {name: 'at', type: 'Hash', isOptional: true};

const fun = (description: string, params: RpcParam[], type: string) => ({
  description,
  params: [...params, atParam],
  type,
});

export default {
  rpc: {
    adminlist: fun('Get admin list', [collectionParam], 'Vec<PalletCommonAccountBasicCrossAccountIdRepr>'),
    allowlist: fun('Get allowlist', [collectionParam], 'Vec<PalletCommonAccountBasicCrossAccountIdRepr>'),

    accountTokens: fun('Get tokens owned by account', [collectionParam, crossAccountParam()], 'Vec<UpDataStructsTokenId>'),
    collectionTokens: fun('Get tokens contained in collection', [collectionParam], 'Vec<UpDataStructsTokenId>'),

    lastTokenId: fun('Get last token id', [collectionParam], TOKEN_ID_TYPE),
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
  types: {
    PalletCommonAccountBasicCrossAccountIdRepr: {
      _enum: {
        Substrate: 'AccountId',
        Ethereum: 'H160',
      },
    },
    UpDataStructsCollection: {
      owner: 'AccountId',
      mode: 'UpDataStructsCollectionMode',
      access: 'UpDataStructsAccessMode',
      name: 'Vec<u16>',
      description: 'Vec<u16>',
      tokenPrefix: 'Vec<u8>',
      mintMode: 'bool',
      offchainSchema: 'Vec<u8>',
      schemaVersion: 'UpDataStructsSchemaVersion',
      sponsorship: 'UpDataStructsSponsorshipState',
      limits: 'UpDataStructsCollectionLimits',
      variableOnChainSchema: 'Vec<u8>',
      constOnChainSchema: 'Vec<u8>',
      metaUpdatePermission: 'UpDataStructsMetaUpdatePermission',
    },
    UpDataStructsCollectionStats: {
      created: 'u32',
      destroyed: 'u32',
      alive: 'u32',
    },
    UpDataStructsCollectionId: 'u32',
    UpDataStructsTokenId: 'u32',
    PalletNonfungibleItemData: mkDummy('NftItemData'),
    PalletRefungibleItemData: mkDummy('RftItemData'),
    UpDataStructsCollectionMode: mkDummy('CollectionMode'),
    UpDataStructsCreateItemData: mkDummy('CreateItemData'),
    UpDataStructsCollectionLimits: {
      accountTokenOwnershipLimit: 'Option<u32>',
      sponsoredDataSize: 'Option<u32>',
      sponsoredDataRateLimit: 'Option<u32>',
      tokenLimit: 'Option<u32>',
      sponsorTransferTimeout: 'Option<u32>',
      ownerCanTransfer: 'Option<bool>',
      ownerCanDestroy: 'Option<bool>',
      transfersEnabled: 'Option<bool>',
    },
    UpDataStructsMetaUpdatePermission: {
      _enum: ['ItemOwner', 'Admin', 'None'],
    },
    UpDataStructsSponsorshipState: {
      _enum: {
        Disabled: null,
        Unconfirmed: 'AccountId',
        Confirmed: 'AccountId',
      },
    },
    UpDataStructsAccessMode: {
      _enum: ['Normal', 'AllowList'],
    },
    UpDataStructsSchemaVersion: mkDummy('SchemaVersion'),

    PalletUnqSchedulerScheduledV2: mkDummy('ScheduledV2'),
    PalletUnqSchedulerCallSpec: mkDummy('CallSpec'),
    PalletUnqSchedulerReleases: mkDummy('Releases'),
  },
};
