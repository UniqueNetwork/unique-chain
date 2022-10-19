/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import type BN from "bn.js";
import type { ContractOptions } from "web3-eth-contract";
import type { EventLog } from "web3-core";
import type { EventEmitter } from "events";
import type {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

export interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export type Approval = ContractEventLog<{
  owner: string;
  approved: string;
  tokenId: string;
  0: string;
  1: string;
  2: string;
}>;
export type ApprovalForAll = ContractEventLog<{
  owner: string;
  operator: string;
  approved: boolean;
  0: string;
  1: string;
  2: boolean;
}>;
export type MintingFinished = ContractEventLog<{}>;
export type Transfer = ContractEventLog<{
  from: string;
  to: string;
  tokenId: string;
  0: string;
  1: string;
  2: string;
}>;

export interface ReFungibleAbi extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): ReFungibleAbi;
  clone(): ReFungibleAbi;
  methods: {
    addCollectionAdmin(newAdmin: string): NonPayableTransactionObject<void>;

    addCollectionAdminCross(
      newAdmin: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    addToCollectionAllowList(user: string): NonPayableTransactionObject<void>;

    addToCollectionAllowListCross(
      user: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    allowed(user: string): NonPayableTransactionObject<boolean>;

    approve(
      approved: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    balanceOf(owner: string): NonPayableTransactionObject<string>;

    burn(tokenId: number | string | BN): NonPayableTransactionObject<void>;

    burnFrom(
      from: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    burnFromCross(
      from: [string, number | string | BN],
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    changeCollectionOwner(newOwner: string): NonPayableTransactionObject<void>;

    collectionAdmins(): NonPayableTransactionObject<[string, string][]>;

    collectionOwner(): NonPayableTransactionObject<[string, string]>;

    collectionProperties(
      keys: string[]
    ): NonPayableTransactionObject<[string, string][]>;

    collectionProperty(key: string): NonPayableTransactionObject<string>;

    collectionSponsor(): NonPayableTransactionObject<[string, string]>;

    confirmCollectionSponsorship(): NonPayableTransactionObject<void>;

    contractAddress(): NonPayableTransactionObject<string>;

    deleteCollectionProperties(
      keys: string[]
    ): NonPayableTransactionObject<void>;

    deleteCollectionProperty(key: string): NonPayableTransactionObject<void>;

    deleteProperty(
      tokenId: number | string | BN,
      key: string
    ): NonPayableTransactionObject<void>;

    finishMinting(): NonPayableTransactionObject<boolean>;

    getApproved(
      tokenId: number | string | BN
    ): NonPayableTransactionObject<string>;

    hasCollectionPendingSponsor(): NonPayableTransactionObject<boolean>;

    isApprovedForAll(
      owner: string,
      operator: string
    ): NonPayableTransactionObject<string>;

    isOwnerOrAdmin(user: string): NonPayableTransactionObject<boolean>;

    isOwnerOrAdminCross(
      user: [string, number | string | BN]
    ): NonPayableTransactionObject<boolean>;

    mint(to: string): NonPayableTransactionObject<string>;

    mintWithTokenURI(
      to: string,
      tokenUri: string
    ): NonPayableTransactionObject<string>;

    mintingFinished(): NonPayableTransactionObject<boolean>;

    name(): NonPayableTransactionObject<string>;

    nextTokenId(): NonPayableTransactionObject<string>;

    ownerOf(tokenId: number | string | BN): NonPayableTransactionObject<string>;

    property(
      tokenId: number | string | BN,
      key: string
    ): NonPayableTransactionObject<string>;

    removeCollectionAdmin(admin: string): NonPayableTransactionObject<void>;

    removeCollectionAdminCross(
      admin: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    removeCollectionSponsor(): NonPayableTransactionObject<void>;

    removeFromCollectionAllowList(
      user: string
    ): NonPayableTransactionObject<void>;

    removeFromCollectionAllowListCross(
      user: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    safeTransferFrom(
      from: string,
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    safeTransferFromWithData(
      from: string,
      to: string,
      tokenId: number | string | BN,
      data: string | number[]
    ): NonPayableTransactionObject<void>;

    setApprovalForAll(
      operator: string,
      approved: boolean
    ): NonPayableTransactionObject<void>;

    setCollectionAccess(
      mode: number | string | BN
    ): NonPayableTransactionObject<void>;

    "setCollectionLimit(string,uint32)"(
      limit: string,
      value: number | string | BN
    ): NonPayableTransactionObject<void>;

    "setCollectionLimit(string,bool)"(
      limit: string,
      value: boolean
    ): NonPayableTransactionObject<void>;

    setCollectionMintMode(mode: boolean): NonPayableTransactionObject<void>;

    "setCollectionNesting(bool)"(
      enable: boolean
    ): NonPayableTransactionObject<void>;

    "setCollectionNesting(bool,address[])"(
      enable: boolean,
      collections: string[]
    ): NonPayableTransactionObject<void>;

    setCollectionProperties(
      properties: [string, string | number[]][]
    ): NonPayableTransactionObject<void>;

    setCollectionProperty(
      key: string,
      value: string | number[]
    ): NonPayableTransactionObject<void>;

    setCollectionSponsor(sponsor: string): NonPayableTransactionObject<void>;

    setCollectionSponsorCross(
      sponsor: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    setOwnerCross(
      newOwner: [string, number | string | BN]
    ): NonPayableTransactionObject<void>;

    setProperties(
      tokenId: number | string | BN,
      properties: [string, string | number[]][]
    ): NonPayableTransactionObject<void>;

    setProperty(
      tokenId: number | string | BN,
      key: string,
      value: string | number[]
    ): NonPayableTransactionObject<void>;

    setTokenPropertyPermission(
      key: string,
      isMutable: boolean,
      collectionAdmin: boolean,
      tokenOwner: boolean
    ): NonPayableTransactionObject<void>;

    supportsInterface(
      interfaceID: string | number[]
    ): NonPayableTransactionObject<boolean>;

    symbol(): NonPayableTransactionObject<string>;

    tokenByIndex(
      index: number | string | BN
    ): NonPayableTransactionObject<string>;

    tokenContractAddress(
      token: number | string | BN
    ): NonPayableTransactionObject<string>;

    tokenOfOwnerByIndex(
      owner: string,
      index: number | string | BN
    ): NonPayableTransactionObject<string>;

    tokenURI(
      tokenId: number | string | BN
    ): NonPayableTransactionObject<string>;

    totalSupply(): NonPayableTransactionObject<string>;

    transfer(
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    transferFrom(
      from: string,
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    transferFromCross(
      from: [string, number | string | BN],
      to: [string, number | string | BN],
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    uniqueCollectionType(): NonPayableTransactionObject<string>;
  };
  events: {
    Approval(cb?: Callback<Approval>): EventEmitter;
    Approval(options?: EventOptions, cb?: Callback<Approval>): EventEmitter;

    ApprovalForAll(cb?: Callback<ApprovalForAll>): EventEmitter;
    ApprovalForAll(
      options?: EventOptions,
      cb?: Callback<ApprovalForAll>
    ): EventEmitter;

    MintingFinished(cb?: Callback<MintingFinished>): EventEmitter;
    MintingFinished(
      options?: EventOptions,
      cb?: Callback<MintingFinished>
    ): EventEmitter;

    Transfer(cb?: Callback<Transfer>): EventEmitter;
    Transfer(options?: EventOptions, cb?: Callback<Transfer>): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "Approval", cb: Callback<Approval>): void;
  once(event: "Approval", options: EventOptions, cb: Callback<Approval>): void;

  once(event: "ApprovalForAll", cb: Callback<ApprovalForAll>): void;
  once(
    event: "ApprovalForAll",
    options: EventOptions,
    cb: Callback<ApprovalForAll>
  ): void;

  once(event: "MintingFinished", cb: Callback<MintingFinished>): void;
  once(
    event: "MintingFinished",
    options: EventOptions,
    cb: Callback<MintingFinished>
  ): void;

  once(event: "Transfer", cb: Callback<Transfer>): void;
  once(event: "Transfer", options: EventOptions, cb: Callback<Transfer>): void;
}
