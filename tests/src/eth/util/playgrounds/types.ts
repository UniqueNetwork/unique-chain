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
export interface TEthCrossAccount {
  readonly eth: string,
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

export interface EthCollectionLimit {
  field: CollectionLimitField,
  status: boolean,
  value: bigint,
}
