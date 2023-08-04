import {TCollectionMode} from '../../../util/playgrounds/types';

export interface ContractImports {
  solPath: string;
  fsPath: string;
}

export interface CompiledContract {
  abi: any;
  object: string;
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
	Fungible,
	Nonfungible,
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
  restricted: number[],
}

export const CREATE_COLLECTION_DATA_DEFAULTS = {
  decimals: 18,
  properties: [],
  tokenPropertyPermissions: [],
  adminList: [],
  nestingSettings: {token_owner: false, collection_admin: false, restricted: []},
  limits: [],
  pendingSponsor: [],
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
  decimals? = 18;
  properties?: Property[] = [];
  tokenPropertyPermissions?: TokenPropertyPermission[] = [];
  adminList?: CrossAddress[] = [];
  nestingSettings?: CollectionNestingAndPermission = {token_owner: false, collection_admin: false, restricted: []};
  limits?: CollectionLimitValue[] = [];
  pendingSponsor?: EthAddress[] = [];

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
    this.decimals = decimals;
  }
}

export enum CollectionFlag {
	/// Tokens in foreign collections can be transferred, but not burnt
	Foreign = 1,
	/// Supports ERC721Metadata
	Erc721metadata = 2,
	/// External collections can't be managed using `unique` api
	External = 64
}