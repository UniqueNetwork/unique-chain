import {CollectionFlag} from '@unique-nft/playgrounds/types.js';
import type {TCollectionMode} from '@unique-nft/playgrounds/types.js';

export interface ContractImports {
  solPath: string;
  fsPath: string;
}

export interface CompiledContract {
  abi: any;
  bytecode: string;
}

export type NormalizedEvent = {
  address: string,
  event: string,
  args: { [key: string]: string }
};

export interface OptionUint {
  status: boolean,
  value: bigint,
}

export type EthAddress = string;

export interface CrossAddress {
  readonly eth: EthAddress,
  readonly sub: string | Uint8Array,
}

export type EthProperty = string[];

export enum TokenPermissionField {
  Mutable,
  TokenOwner,
  CollectionAdmin
}

export enum CollectionLimitField {
  AccountTokenOwnership,
	SponsoredDataSize,
	SponsoredDataRateLimit,
	TokenLimit,
	SponsorTransferTimeout,
	SponsorApproveTimeout,
	OwnerCanTransfer,
	OwnerCanDestroy,
	TransferEnabled
}

export interface CollectionLimit {
  field: CollectionLimitField,
  value: OptionUint,
}

export interface CollectionLimitValue {
  field: CollectionLimitField,
  value: bigint,
}

export enum CollectionMode {
	Nonfungible,
	Fungible,
	Refungible,
}

export interface PropertyPermission {
  code: TokenPermissionField,
  value: boolean,
}
export interface TokenPropertyPermission {
  key: string,
  permissions: PropertyPermission[],
}
export interface CollectionNestingAndPermission {
  token_owner: boolean,
  collection_admin: boolean,
  restricted: string[],
}

export const emptyAddress: [string, string] = [
  '0x0000000000000000000000000000000000000000',
  '0',
];

export const CREATE_COLLECTION_DATA_DEFAULTS = {
  decimals: 0,
  properties: [],
  tokenPropertyPermissions: [],
  adminList: [],
  nestingSettings: {token_owner: false, collection_admin: false, restricted: []},
  limits: [],
  pendingSponsor: emptyAddress,
  flags: 0,
};

export interface Property {
  key: string;
  value: Buffer;
}

export class CreateCollectionData {
  name: string;
  description: string;
  tokenPrefix: string;
  collectionMode: TCollectionMode;
  decimals? = 0;
  properties?: Property[] = [];
  tokenPropertyPermissions?: TokenPropertyPermission[] = [];
  adminList?: CrossAddress[] = [];
  nestingSettings?: CollectionNestingAndPermission = {token_owner: false, collection_admin: false, restricted: []};
  limits?: CollectionLimitValue[] = [];
  pendingSponsor?: [string, string] = emptyAddress;
  flags?: number | CollectionFlag[] = [0];

  constructor(
    name: string,
    description: string,
    tokenPrefix: string,
    collectionMode: TCollectionMode,
    decimals = 18,
  ) {
    this.name = name;
    this.description = description;
    this.tokenPrefix = tokenPrefix;
    this.collectionMode = collectionMode;
    if(collectionMode == 'ft')
      this.decimals = decimals;
    else
      this.decimals = 0;
  }
}
