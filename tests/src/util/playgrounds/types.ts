// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

import {IKeyringPair} from '@polkadot/types/types';
import {UniqueHelper} from './unique';

export interface IEvent {
  section: string;
  method: string;
  index: [number, number] | string;
  data: any[];
  phase: {applyExtrinsic: number} | 'Initialization',
}

export interface ITransactionResult {
  status: 'Fail' | 'Success';
  result: {
      events: {
        phase: any, // {ApplyExtrinsic: number} | 'Initialization',
        event: IEvent;
      }[];
  },
  moduleError?: string;
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

export interface ITokenAddress {
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

export interface IStakingInfo {
  block: bigint,
  amount: bigint,
}

export type TSubstrateAccount = string;
export type TEthereumAccount = string;
export type TApiAllowedListeners = 'connected' | 'disconnected' | 'error' | 'ready' | 'decorated';
export type TUniqueNetworks = 'opal' | 'quartz' | 'unique';
export type TSigner = IKeyringPair; // | 'string'

export interface ICollectionBase {
  helper: UniqueHelper;
  collectionId: number;
  getData: () => Promise<{
    id: number;
    name: string;
    description: string;
    tokensCount: number;
    admins: ICrossAccountId[];
    normalizedOwner: TSubstrateAccount;
    raw: any
  } | null>;
  getLastTokenId: () => Promise<number>;
  isTokenExists: (tokenId: number) => Promise<boolean>;
  getAdmins: () => Promise<ICrossAccountId[]>;
  getAllowList: () => Promise<ICrossAccountId[]>;
  getEffectiveLimits: () => Promise<ICollectionLimits>;
  getProperties: (propertyKeys?: string[]) => Promise<IProperty[]>;
  getTokenNextSponsored: (tokenId: number, addressObj: ICrossAccountId) => Promise<number | null>;
  setSponsor: (signer: TSigner, sponsorAddress: TSubstrateAccount) => Promise<boolean>;
  confirmSponsorship: (signer: TSigner) => Promise<boolean>;
  removeSponsor: (signer: TSigner) => Promise<boolean>;
  setLimits: (signer: TSigner, limits: ICollectionLimits) => Promise<boolean>;
  changeOwner: (signer: TSigner, ownerAddress: TSubstrateAccount) => Promise<boolean>;
  addAdmin: (signer: TSigner, adminAddressObj: ICrossAccountId) => Promise<boolean>;
  addToAllowList: (signer: TSigner, addressObj: ICrossAccountId) => Promise<boolean>;
  removeFromAllowList: (signer: TSigner, addressObj: ICrossAccountId) => Promise<boolean>;
  removeAdmin: (signer: TSigner, adminAddressObj: ICrossAccountId) => Promise<boolean>;
  setProperties: (signer: TSigner, properties: IProperty[]) => Promise<boolean>;
  deleteProperties: (signer: TSigner, propertyKeys: string[]) => Promise<boolean>;
  setPermissions: (signer: TSigner, permissions: ICollectionPermissions) => Promise<boolean>;
  enableNesting: (signer: TSigner, permissions: INestingPermissions) => Promise<boolean>;
  disableNesting: (signer: TSigner) => Promise<boolean>;
  burn: (signer: TSigner) => Promise<boolean>;
}

export interface ICollectionNFT extends ICollectionBase {
  getTokenObject: (tokenId: number) => ITokenNonfungible; // todo:playgrounds
  getTokensByAddress: (addressObj: ICrossAccountId) => Promise<number[]>;
  getToken: (tokenId: number, blockHashAt?: string) => Promise<{
    properties: IProperty[];
    owner: ICrossAccountId;
    normalizedOwner: ICrossAccountId;
  }| null>;
  getTokenOwner: (tokenId: number, blockHashAt?: string) => Promise<ICrossAccountId>;
  getTokenTopmostOwner: (tokenId: number, blockHashAt?: string) => Promise<ICrossAccountId | null>;
  getTokenChildren: (tokenId: number, blockHashAt?: string) => Promise<ITokenAddress[]>; // todo:playgrounds
  getPropertyPermissions: (propertyKeys?: string[]) => Promise<ITokenPropertyPermission[]>;
  getTokenProperties: (tokenId: number, propertyKeys?: string[]) => Promise<IProperty[]>;
  transferToken: (signer: TSigner, tokenId: number, addressObj: ICrossAccountId) => Promise<boolean>;
  transferTokenFrom: (signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) => Promise<boolean>;
  approveToken: (signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId) => Promise<boolean>;
  isTokenApproved: (tokenId: number, toAddressObj: ICrossAccountId) => Promise<boolean>;
  mintToken: (signer: TSigner, owner: ICrossAccountId, properties?: IProperty[]) => Promise<ITokenNonfungible>;// todo:playgrounds
  mintMultipleTokens: (signer: TSigner, tokens: {owner: ICrossAccountId, properties?: IProperty[]}[]) => Promise<ITokenNonfungible[]>;// todo:playgrounds
  burnToken: (signer: TSigner, tokenId: number) => Promise<{
    success: boolean,
    token: number | null
  }>;
  burnTokenFrom: (signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId) => Promise<boolean>;
  setTokenProperties: (signer: TSigner, tokenId: number, properties: IProperty[]) => Promise<boolean>;
  deleteTokenProperties: (signer: TSigner, tokenId: number, propertyKeys: string[]) => Promise<boolean>;
  setTokenPropertyPermissions: (signer: TSigner, permissions: ITokenPropertyPermission[]) => Promise<boolean>;
  nestToken: (signer: TSigner, tokenId: number, toTokenObj: ITokenAddress) => Promise<boolean>;
  unnestToken: (signer: TSigner, tokenId: number, fromTokenObj: ITokenAddress, toAddressObj: ICrossAccountId) => Promise<boolean>;
}

export interface ICollectionRFT extends ICollectionBase {
  getTokenObject: (tokenId: number) => ITokenRefungible;
  getToken: (tokenId: number, blockHashAt?: string) => Promise<{
    properties: IProperty[];
    owner: ICrossAccountId;
    normalizedOwner: ICrossAccountId;
  }| null>;
  getTokensByAddress: (addressObj: ICrossAccountId) => Promise<number[]>;
  getTop10TokenOwners: (tokenId: number) => Promise<ICrossAccountId[]>;
  getTokenBalance: (tokenId: number, addressObj: ICrossAccountId) => Promise<bigint>;
  getTokenTotalPieces: (tokenId: number) => Promise<bigint>;
  getTokenApprovedPieces: (tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) => Promise<bigint>;
  getPropertyPermissions: (propertyKeys?: string[] | null) => Promise<ITokenPropertyPermission[]>;
  getTokenProperties: (tokenId: number, propertyKeys?: string[]) => Promise<IProperty[]>;
  transferToken: (signer: TSigner, tokenId: number, addressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  transferTokenFrom: (signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  approveToken: (signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  repartitionToken: (signer: TSigner, tokenId: number, amount: bigint) => Promise<boolean>;
  mintToken: (signer: TSigner, pieces: bigint, owner: ICrossAccountId, properties?: IProperty[]) => Promise<ITokenRefungible>;
  mintMultipleTokens: (signer: TSigner, tokens: {pieces: bigint, owner: ICrossAccountId, properties?: IProperty[]}[]) => Promise<ITokenRefungible[]>; // todo:playgrounds
  burnToken: (signer: TSigner, tokenId: number, amount: bigint) => Promise<{
    success: boolean,
    token: number | null
  }>;
  burnTokenFrom: (signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId,  amount: bigint) => Promise<boolean>;
  setTokenProperties: (signer: TSigner, tokenId: number, properties: IProperty[]) => Promise<boolean>;
  deleteTokenProperties: (signer: TSigner, tokenId: number, propertyKeys: string[]) => Promise<boolean>;
  setTokenPropertyPermissions: (signer: TSigner, permissions: ITokenPropertyPermission[]) => Promise<boolean>;
}

export interface ICollectionFT extends ICollectionBase {
  getBalance: (addressObj: ICrossAccountId) => Promise<bigint>;
  getTotalPieces: () => Promise<bigint>;
  getApprovedTokens: (fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) => Promise<bigint>;
  getTop10Owners: () => Promise<ICrossAccountId[]>;
  mint: (signer: TSigner, amount: bigint, owner: ICrossAccountId) => Promise<boolean>;
  mintWithOneOwner: (signer: TSigner, tokens: {value: bigint}[], owner: ICrossAccountId) => Promise<boolean>;
  transfer: (signer: TSigner, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  transferFrom: (signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  burnTokens: (signer: TSigner, amount: bigint) => Promise<boolean>;
  burnTokensFrom: (signer: TSigner, fromAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  approveTokens: (signer: TSigner, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
}

export interface ITokenBase extends ITokenAddress {
  collection: ICollectionNFT | ICollectionRFT;
  getNextSponsored: (addressObj: ICrossAccountId) => Promise<number|null>;
  getProperties: (propertyKeys?: string[]) => Promise<IProperty[]>;
  setProperties: (signer: TSigner, properties: IProperty[]) => Promise<boolean>;
  deleteProperties: (signer: TSigner, propertyKeys: string[]) => Promise<boolean>;
  nestingAccount: () => ICrossAccountId;
  nestingAccountInLowerCase: () => ICrossAccountId;
}

export interface ITokenNonfungible extends ITokenBase {
  collection: ICollectionNFT;
  getData: (blockHashAt?: string) => Promise<{
    properties: IProperty[];
    owner: ICrossAccountId;
    normalizedOwner: ICrossAccountId;
  }| null>;
  getOwner: (blockHashAt?: string) => Promise<ICrossAccountId>;
  getTopmostOwner: (blockHashAt?: string) => Promise<ICrossAccountId | null>;
  getChildren: (blockHashAt?: string) => Promise<ITokenAddress[]>; // todo:playgrounds
  nest: (signer: TSigner, toTokenObj: ITokenAddress) => Promise<boolean>;
  unnest: (signer: TSigner, fromTokenObj: ITokenAddress, toAddressObj: ICrossAccountId) => Promise<boolean>;
  transfer: (signer: TSigner, addressObj: ICrossAccountId) => Promise<boolean>;
  transferFrom: (signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) => Promise<boolean>;
  approve: (signer: TSigner, toAddressObj: ICrossAccountId) => Promise<boolean>;
  isApproved: (toAddressObj: ICrossAccountId) => Promise<boolean>;
  burn: (signer: TSigner) => Promise<{
    success: boolean,
    token: number | null
  }>;
  burnFrom: (signer: TSigner, fromAddressObj: ICrossAccountId) => Promise<boolean>;
}

export interface ITokenRefungible extends ITokenBase {
  collection: ICollectionRFT;
  getData: (blockHashAt?: string) => Promise<{
    properties: IProperty[];
    owner: ICrossAccountId;
    normalizedOwner: ICrossAccountId;
  }| null>;
  getTop10Owners: () => Promise<ICrossAccountId[]>;
  getBalance: (addressObj: ICrossAccountId) => Promise<bigint>;
  getTotalPieces: () => Promise<bigint>;
  getApprovedPieces: (fromAddressObj: ICrossAccountId, toAccountObj: ICrossAccountId) => Promise<bigint>;
  transfer: (signer: TSigner, addressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  transferFrom: (signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  approve: (signer: TSigner, toAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
  repartition: (signer: TSigner, amount: bigint) => Promise<boolean>;
  burn: (signer: TSigner, amount: bigint) => Promise<{
    success: boolean,
    token: number | null
  }>;
  burnFrom: (signer: TSigner, fromAddressObj: ICrossAccountId, amount: bigint) => Promise<boolean>;
}
