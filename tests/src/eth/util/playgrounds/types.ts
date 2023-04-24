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

export interface CrossAddress {
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

export interface CollectionLimit {
  field: CollectionLimitField,
  value: OptionUint,
}

export const NON_EXISTENT_COLLECTION_ID = 4_294_967_295;