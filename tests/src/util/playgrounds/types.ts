// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';

export interface IChainEvent {
  data: any;
  method: string;
  section: string;
}

export interface ITransactionResult {
    status: 'Fail' | 'Success';
    result: {
        events: {
          event: IChainEvent
        }[];
    },
    moduleError?: string;
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
  events?: any;
}

export interface IApiListeners {
  connected?: (...args: any[]) => any;
  disconnected?: (...args: any[]) => any;
  error?: (...args: any[]) => any;
  ready?: (...args: any[]) => any; 
  decorated?: (...args: any[]) => any;
}

export interface ICrossAccountId {
  Substrate?: TSubstrateAccount;
  Ethereum?: TEthereumAccount;
}

export interface ICrossAccountIdLower {
  substrate?: TSubstrateAccount;
  ethereum?: TEthereumAccount;
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
  value: string;
}

export interface ITokenPropertyPermission {
  key: string;
  permission: {
    mutable: boolean;
    tokenOwner: boolean;
    collectionAdmin: boolean;
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

export interface ICollectionCreationOptions {
  name: string | number[];
  description: string | number[];
  tokenPrefix: string | number[];
  mode?: {
    nft?: null;
    refungible?: null;
    fungible?: number;
  }
  permissions?: ICollectionPermissions;
  properties?: IProperty[];
  tokenPropertyPermissions?: ITokenPropertyPermission[];
  limits?: ICollectionLimits;
  pendingSponsor?: TSubstrateAccount;
}

export interface IChainProperties {
  ss58Format: number;
  tokenDecimals: number[];
  tokenSymbol: string[]
}

export interface ISubstrateBalance {
  free: bigint,
  reserved: bigint,
  miscFrozen: bigint,
  feeFrozen: bigint
}

export type TSubstrateAccount = string;
export type TEthereumAccount = string;
export type TApiAllowedListeners = 'connected' | 'disconnected' | 'error' | 'ready' | 'decorated';
export type TUniqueNetworks = 'opal' | 'quartz' | 'unique';
export type TSigner = IKeyringPair; // | 'string'
