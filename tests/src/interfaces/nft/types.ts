// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Bytes, Enum, Option, Struct, Vec, bool, u16, u32 } from '@polkadot/types';
import type { AccountId, H160 } from '@polkadot/types/interfaces/runtime';

/** @name NftDataStructsAccessMode */
export interface NftDataStructsAccessMode extends Enum {
  readonly isNormal: boolean;
  readonly isWhiteList: boolean;
}

/** @name NftDataStructsCollection */
export interface NftDataStructsCollection extends Struct {
  readonly owner: AccountId;
  readonly mode: NftDataStructsCollectionMode;
  readonly access: NftDataStructsAccessMode;
  readonly name: Vec<u16>;
  readonly description: Vec<u16>;
  readonly tokenPrefix: Bytes;
  readonly mintMode: bool;
  readonly offchainSchema: Bytes;
  readonly schemaVersion: NftDataStructsSchemaVersion;
  readonly sponsorship: NftDataStructsSponsorshipState;
  readonly limits: NftDataStructsCollectionLimits;
  readonly variableOnChainSchema: Bytes;
  readonly constOnChainSchema: Bytes;
  readonly metaUpdatePermission: NftDataStructsMetaUpdatePermission;
}

/** @name NftDataStructsCollectionId */
export interface NftDataStructsCollectionId extends u32 {}

/** @name NftDataStructsCollectionLimits */
export interface NftDataStructsCollectionLimits extends Struct {
  readonly accountTokenOwnershipLimit: Option<u32>;
  readonly sponsoredDataSize: Option<u32>;
  readonly sponsoredDataRateLimit: Option<u32>;
  readonly tokenLimit: Option<u32>;
  readonly sponsorTransferTimeout: Option<u32>;
  readonly ownerCanTransfer: Option<bool>;
  readonly ownerCanDestroy: Option<bool>;
  readonly transfersEnabled: Option<bool>;
}

/** @name NftDataStructsCollectionMode */
export interface NftDataStructsCollectionMode extends Struct {
  readonly dummyCollectionMode: u32;
}

/** @name NftDataStructsCreateItemData */
export interface NftDataStructsCreateItemData extends Struct {
  readonly dummyCreateItemData: u32;
}

/** @name NftDataStructsMetaUpdatePermission */
export interface NftDataStructsMetaUpdatePermission extends Enum {
  readonly isItemOwner: boolean;
  readonly isAdmin: boolean;
  readonly isNone: boolean;
}

/** @name NftDataStructsSchemaVersion */
export interface NftDataStructsSchemaVersion extends Struct {
  readonly dummySchemaVersion: u32;
}

/** @name NftDataStructsSponsorshipState */
export interface NftDataStructsSponsorshipState extends Enum {
  readonly isDisabled: boolean;
  readonly isUnconfirmed: boolean;
  readonly asUnconfirmed: AccountId;
  readonly isConfirmed: boolean;
  readonly asConfirmed: AccountId;
}

/** @name NftDataStructsTokenId */
export interface NftDataStructsTokenId extends u32 {}

/** @name PalletCommonAccountBasicCrossAccountIdRepr */
export interface PalletCommonAccountBasicCrossAccountIdRepr extends Enum {
  readonly isSubstrate: boolean;
  readonly asSubstrate: AccountId;
  readonly isEthereum: boolean;
  readonly asEthereum: H160;
}

/** @name PalletNonfungibleItemData */
export interface PalletNonfungibleItemData extends Struct {
  readonly dummyNftItemData: u32;
}

/** @name PalletRefungibleItemData */
export interface PalletRefungibleItemData extends Struct {
  readonly dummyRftItemData: u32;
}

/** @name PalletUnqSchedulerCallSpec */
export interface PalletUnqSchedulerCallSpec extends Struct {
  readonly dummyCallSpec: u32;
}

/** @name PalletUnqSchedulerReleases */
export interface PalletUnqSchedulerReleases extends Struct {
  readonly dummyReleases: u32;
}

/** @name PalletUnqSchedulerScheduledV2 */
export interface PalletUnqSchedulerScheduledV2 extends Struct {
  readonly dummyScheduledV2: u32;
}

export type PHANTOM_NFT = 'nft';
