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

export type AllChildrenRejected = ContractEventLog<{
  tokenId: string;
  0: string;
}>;
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
export type ChildAccepted = ContractEventLog<{
  tokenId: string;
  childIndex: string;
  childAddress: string;
  childId: string;
  0: string;
  1: string;
  2: string;
  3: string;
}>;
export type ChildProposed = ContractEventLog<{
  tokenId: string;
  childIndex: string;
  childAddress: string;
  childId: string;
  0: string;
  1: string;
  2: string;
  3: string;
}>;
export type ChildTransferred = ContractEventLog<{
  tokenId: string;
  childIndex: string;
  childAddress: string;
  childId: string;
  fromPending: boolean;
  toZero: boolean;
  0: string;
  1: string;
  2: string;
  3: string;
  4: boolean;
  5: boolean;
}>;
export type NestTransfer = ContractEventLog<{
  from: string;
  to: string;
  fromTokenId: string;
  toTokenId: string;
  tokenId: string;
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
}>;
export type Transfer = ContractEventLog<{
  from: string;
  to: string;
  tokenId: string;
  0: string;
  1: string;
  2: string;
}>;

export interface RMRKNestableMintable extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): RMRKNestableMintable;
  clone(): RMRKNestableMintable;
  methods: {
    RMRK_INTERFACE(): NonPayableTransactionObject<string>;

    VERSION(): NonPayableTransactionObject<string>;

    acceptChild(
      parentId: number | string | BN,
      childIndex: number | string | BN,
      childAddress: string,
      childId: number | string | BN
    ): NonPayableTransactionObject<void>;

    addChild(
      parentId: number | string | BN,
      childId: number | string | BN,
      data: string | number[]
    ): NonPayableTransactionObject<void>;

    approve(
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    balanceOf(owner: string): NonPayableTransactionObject<string>;

    "burn(uint256)"(
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    "burn(uint256,uint256)"(
      tokenId: number | string | BN,
      maxChildrenBurns: number | string | BN
    ): NonPayableTransactionObject<string>;

    childOf(
      parentId: number | string | BN,
      index: number | string | BN
    ): NonPayableTransactionObject<[string, string]>;

    childrenOf(
      parentId: number | string | BN
    ): NonPayableTransactionObject<[string, string][]>;

    directOwnerOf(tokenId: number | string | BN): NonPayableTransactionObject<{
      0: string;
      1: string;
      2: boolean;
    }>;

    getApproved(
      tokenId: number | string | BN
    ): NonPayableTransactionObject<string>;

    isApprovedForAll(
      owner: string,
      operator: string
    ): NonPayableTransactionObject<boolean>;

    mint(
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    name(): NonPayableTransactionObject<string>;

    nestMint(
      to: string,
      tokenId: number | string | BN,
      destinationId: number | string | BN
    ): NonPayableTransactionObject<void>;

    nestTransfer(
      to: string,
      tokenId: number | string | BN,
      destinationId: number | string | BN
    ): NonPayableTransactionObject<void>;

    nestTransferFrom(
      from: string,
      to: string,
      tokenId: number | string | BN,
      destinationId: number | string | BN,
      data: string | number[]
    ): NonPayableTransactionObject<void>;

    onERC721Received(
      _operator: string,
      _from: string,
      _tokenId: number | string | BN,
      _data: string | number[]
    ): NonPayableTransactionObject<string>;

    ownerOf(tokenId: number | string | BN): NonPayableTransactionObject<string>;

    pendingChildOf(
      parentId: number | string | BN,
      index: number | string | BN
    ): NonPayableTransactionObject<[string, string]>;

    pendingChildrenOf(
      parentId: number | string | BN
    ): NonPayableTransactionObject<[string, string][]>;

    rejectAllChildren(
      tokenId: number | string | BN,
      maxRejections: number | string | BN
    ): NonPayableTransactionObject<void>;

    safeMint(to: string): NonPayableTransactionObject<void>;

    "safeTransferFrom(address,address,uint256)"(
      from: string,
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    "safeTransferFrom(address,address,uint256,bytes)"(
      from: string,
      to: string,
      tokenId: number | string | BN,
      data: string | number[]
    ): NonPayableTransactionObject<void>;

    setApprovalForAll(
      operator: string,
      approved: boolean
    ): NonPayableTransactionObject<void>;

    supportsInterface(
      interfaceId: string | number[]
    ): NonPayableTransactionObject<boolean>;

    symbol(): NonPayableTransactionObject<string>;

    transfer(
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;

    transferChild(
      tokenId: number | string | BN,
      to: string,
      destinationId: number | string | BN,
      childIndex: number | string | BN,
      childAddress: string,
      childId: number | string | BN,
      isPending: boolean,
      data: string | number[]
    ): NonPayableTransactionObject<void>;

    transferFrom(
      from: string,
      to: string,
      tokenId: number | string | BN
    ): NonPayableTransactionObject<void>;
  };
  events: {
    AllChildrenRejected(cb?: Callback<AllChildrenRejected>): EventEmitter;
    AllChildrenRejected(
      options?: EventOptions,
      cb?: Callback<AllChildrenRejected>
    ): EventEmitter;

    Approval(cb?: Callback<Approval>): EventEmitter;
    Approval(options?: EventOptions, cb?: Callback<Approval>): EventEmitter;

    ApprovalForAll(cb?: Callback<ApprovalForAll>): EventEmitter;
    ApprovalForAll(
      options?: EventOptions,
      cb?: Callback<ApprovalForAll>
    ): EventEmitter;

    ChildAccepted(cb?: Callback<ChildAccepted>): EventEmitter;
    ChildAccepted(
      options?: EventOptions,
      cb?: Callback<ChildAccepted>
    ): EventEmitter;

    ChildProposed(cb?: Callback<ChildProposed>): EventEmitter;
    ChildProposed(
      options?: EventOptions,
      cb?: Callback<ChildProposed>
    ): EventEmitter;

    ChildTransferred(cb?: Callback<ChildTransferred>): EventEmitter;
    ChildTransferred(
      options?: EventOptions,
      cb?: Callback<ChildTransferred>
    ): EventEmitter;

    NestTransfer(cb?: Callback<NestTransfer>): EventEmitter;
    NestTransfer(
      options?: EventOptions,
      cb?: Callback<NestTransfer>
    ): EventEmitter;

    Transfer(cb?: Callback<Transfer>): EventEmitter;
    Transfer(options?: EventOptions, cb?: Callback<Transfer>): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "AllChildrenRejected", cb: Callback<AllChildrenRejected>): void;
  once(
    event: "AllChildrenRejected",
    options: EventOptions,
    cb: Callback<AllChildrenRejected>
  ): void;

  once(event: "Approval", cb: Callback<Approval>): void;
  once(event: "Approval", options: EventOptions, cb: Callback<Approval>): void;

  once(event: "ApprovalForAll", cb: Callback<ApprovalForAll>): void;
  once(
    event: "ApprovalForAll",
    options: EventOptions,
    cb: Callback<ApprovalForAll>
  ): void;

  once(event: "ChildAccepted", cb: Callback<ChildAccepted>): void;
  once(
    event: "ChildAccepted",
    options: EventOptions,
    cb: Callback<ChildAccepted>
  ): void;

  once(event: "ChildProposed", cb: Callback<ChildProposed>): void;
  once(
    event: "ChildProposed",
    options: EventOptions,
    cb: Callback<ChildProposed>
  ): void;

  once(event: "ChildTransferred", cb: Callback<ChildTransferred>): void;
  once(
    event: "ChildTransferred",
    options: EventOptions,
    cb: Callback<ChildTransferred>
  ): void;

  once(event: "NestTransfer", cb: Callback<NestTransfer>): void;
  once(
    event: "NestTransfer",
    options: EventOptions,
    cb: Callback<NestTransfer>
  ): void;

  once(event: "Transfer", cb: Callback<Transfer>): void;
  once(event: "Transfer", options: EventOptions, cb: Callback<Transfer>): void;
}
