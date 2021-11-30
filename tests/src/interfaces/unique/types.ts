// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Bytes, Enum, Option, Struct, Vec, bool, u16, u32 } from '@polkadot/types';
import type { AccountId, H160 } from '@polkadot/types/interfaces/runtime';

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

/** @name UpDataStructsAccessMode */
export interface UpDataStructsAccessMode extends Enum {
  readonly isNormal: boolean;
  readonly isAllowList: boolean;
}

/** @name UpDataStructsCollection */
export interface UpDataStructsCollection extends Struct {
  readonly owner: AccountId;
  readonly mode: UpDataStructsCollectionMode;
  readonly access: UpDataStructsAccessMode;
  readonly name: Vec<u16>;
  readonly description: Vec<u16>;
  readonly tokenPrefix: Bytes;
  readonly mintMode: bool;
  readonly offchainSchema: Bytes;
  readonly schemaVersion: UpDataStructsSchemaVersion;
  readonly sponsorship: UpDataStructsSponsorshipState;
  readonly limits: UpDataStructsCollectionLimits;
  readonly variableOnChainSchema: Bytes;
  readonly constOnChainSchema: Bytes;
  readonly metaUpdatePermission: UpDataStructsMetaUpdatePermission;
}

/** @name UpDataStructsCollectionId */
export interface UpDataStructsCollectionId extends u32 {}

/** @name UpDataStructsCollectionLimits */
export interface UpDataStructsCollectionLimits extends Struct {
  readonly accountTokenOwnershipLimit: Option<u32>;
  readonly sponsoredDataSize: Option<u32>;
  readonly sponsoredDataRateLimit: Option<u32>;
  readonly tokenLimit: Option<u32>;
  readonly sponsorTransferTimeout: Option<u32>;
  readonly ownerCanTransfer: Option<bool>;
  readonly ownerCanDestroy: Option<bool>;
  readonly transfersEnabled: Option<bool>;
}

/** @name UpDataStructsCollectionMode */
export interface UpDataStructsCollectionMode extends Struct {
  readonly dummyCollectionMode: u32;
}

/** @name UpDataStructsCollectionStats */
export interface UpDataStructsCollectionStats extends Struct {
  readonly created: u32;
  readonly destroyed: u32;
  readonly alive: u32;
}

/** @name UpDataStructsCreateItemData */
export interface UpDataStructsCreateItemData extends Struct {
  readonly dummyCreateItemData: u32;
}

/** @name UpDataStructsMetaUpdatePermission */
export interface UpDataStructsMetaUpdatePermission extends Enum {
  readonly isItemOwner: boolean;
  readonly isAdmin: boolean;
  readonly isNone: boolean;
}

/** @name UpDataStructsSchemaVersion */
export interface UpDataStructsSchemaVersion extends Struct {
  readonly dummySchemaVersion: u32;
}

/** @name UpDataStructsSponsorshipState */
export interface UpDataStructsSponsorshipState extends Enum {
  readonly isDisabled: boolean;
  readonly isUnconfirmed: boolean;
  readonly asUnconfirmed: AccountId;
  readonly isConfirmed: boolean;
  readonly asConfirmed: AccountId;
}

/** @name UpDataStructsTokenId */
export interface UpDataStructsTokenId extends u32 {}

export type PHANTOM_UNIQUE = 'unique';
