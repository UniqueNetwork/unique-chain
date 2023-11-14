// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import type {IKeyringPair} from '@polkadot/types/types';

export const NON_EXISTENT_COLLECTION_ID = 4_294_967_295;

export const MILLISECS_PER_BLOCK = 12000;
export const MINUTES = 60_000 / MILLISECS_PER_BLOCK;
export const HOURS = MINUTES * 60;
export const DAYS = HOURS * 24;

export interface IEvent {
  section: string;
  method: string;
  index: [number, number] | string;
  data: any[];
  phase: {applyExtrinsic: number} | 'Initialization',
}

export interface IPhasicEvent {
  phase: any, // {ApplyExtrinsic: number} | 'Initialization',
  event: IEvent;
}

export interface ITransactionResult {
  status: 'Fail' | 'Success';
  result: {
      dispatchError: any,
      events: IPhasicEvent[];
  },
  blockHash: string,
  moduleError?: string | object;
}

export interface ISubscribeBlockEventsData {
  number: number;
  hash: string;
  timestamp: number;
  events: IEvent[];
}

export interface ILogger {
  log: (msg: any, level?: string) => void;
  level: {
    ERROR: 'ERROR';
    WARNING: 'WARNING';
    INFO: 'INFO';
    [key: string]: string;
  }
}

export interface IUniqueHelperLog {
  executedAt: number;
  executionTime: number;
  type: 'extrinsic' | 'rpc';
  status: 'Fail' | 'Success';
  call: string;
  params: any[];
  moduleError?: string;
  dispatchError?: any;
  events?: any;
}

export interface IApiListeners {
  connected?: (...args: any[]) => any;
  disconnected?: (...args: any[]) => any;
  error?: (...args: any[]) => any;
  ready?: (...args: any[]) => any;
  decorated?: (...args: any[]) => any;
}

export type ICrossAccountId = {
  Substrate: TSubstrateAccount;
} | {
  Ethereum: TEthereumAccount;
}

export type ICrossAccountIdLower = {
  substrate: TSubstrateAccount;
} | {
  ethereum: TEthereumAccount;
};

export interface IEthCrossAccountId {
  0: TEthereumAccount;
  1: TSubstrateAccount;
  eth: TEthereumAccount;
  sub: TSubstrateAccount;
}

export interface ICollectionLimits {
  accountTokenOwnershipLimit?: number | null;
  sponsoredDataSize?: number | null;
  sponsoredDataRateLimit?: {blocks: number} | {sponsoringDisabled: null} | null;
  tokenLimit?: number | null;
  sponsorTransferTimeout?: number | null;
  sponsorApproveTimeout?: number | null;
  ownerCanTransfer?: boolean | null;
  ownerCanDestroy?: boolean | null;
  transfersEnabled?: boolean | null;
}

export interface INestingPermissions {
  tokenOwner?: boolean;
  collectionAdmin?: boolean;
  restricted?: number[] | null;
}

export interface ICollectionPermissions {
  access?: 'Normal' | 'AllowList';
  mintMode?: boolean;
  nesting?: INestingPermissions;
}

export interface IProperty {
  key: string;
  value?: string;
}

export interface ITokenPropertyPermission {
  key: string;
  permission: {
    mutable?: boolean;
    tokenOwner?: boolean;
    collectionAdmin?: boolean;
  }
}

export interface IToken {
  collectionId: number;
  tokenId: number;
}

export interface IBlock {
  extrinsics: IExtrinsic[]
  header: {
    parentHash: string,
    number: number,
  };
}

export interface IExtrinsic {
  isSigned: boolean,
  method: {
    method: string,
    section: string,
    args: any[]
  }
}

export interface ICollectionFlags {
  foreign: boolean,
  erc721metadata: boolean,
}

export enum CollectionFlag {
  None = 0,
  /// External collections can't be managed using `unique` api
  External = 1,
  /// Supports ERC721Metadata
  Erc721metadata = 64,
  /// Tokens in foreign collections can be transferred, but not burnt
  Foreign = 128,
}

export interface ICollectionCreationOptions {
  name?: string | number[];
  description?: string | number[];
  tokenPrefix?: string | number[];
  mode?: {
    nft?: null;
    refungible?: null;
    fungible?: number;
  }
  permissions?: ICollectionPermissions;
  properties?: IProperty[];
  tokenPropertyPermissions?: ITokenPropertyPermission[];
  limits?: ICollectionLimits;
  pendingSponsor?: ICrossAccountId;
  adminList?: ICrossAccountId[];
  flags?: number[] | CollectionFlag[] ,
}

export interface IChainProperties {
  ss58Format: number;
  tokenDecimals: number[];
  tokenSymbol: string[]
}

export interface ISubstrateBalance {
  free: bigint,
  reserved: bigint,
  frozen: bigint,
}

export interface IStakingInfo {
  block: bigint,
  amount: bigint,
}

export interface IPovInfo {
  proofSize: number,
  compactProofSize: number,
  compressedProofSize: number,
  results: any[],
  kv: any,
}

export interface ISchedulerOptions {
  scheduledId?: string,
  priority?: number,
  periodic?: {
    period: number,
    repetitions: number,
  },
}

export interface DemocracySplitAccount {
  aye: bigint,
  nay: bigint,
}

export type TSubstrateAccount = string;
export type TEthereumAccount = string;
export type TApiAllowedListeners = 'connected' | 'disconnected' | 'error' | 'ready' | 'decorated';
export type TUniqueNetworks = 'opal' | 'quartz' | 'unique';
export type TSiblingNetworkds = 'moonbeam' | 'moonriver' | 'acala' | 'karura' | 'westmint';
export type TRelayNetworks = 'rococo' | 'westend';
export type TNetworks = TUniqueNetworks | TSiblingNetworkds | TRelayNetworks;
export type TSigner = IKeyringPair; // | 'string'
export type TCollectionMode = 'nft' | 'rft' | 'ft';
