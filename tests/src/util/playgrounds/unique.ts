// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable function-call-argument-newline */
/* eslint-disable no-prototype-builtins */

import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import {SignerOptions} from '@polkadot/api/types/submittable';
import '../../interfaces/augment-api';
import {AugmentedSubmittables} from '@polkadot/api-base/types/submittable';
import {ApiInterfaceEvents} from '@polkadot/api/types';
import {encodeAddress, decodeAddress, keccakAsHex, evmToAddress, addressToEvm, base58Encode, blake2AsU8a, blake2AsHex} from '@polkadot/util-crypto';
import {IKeyringPair} from '@polkadot/types/types';
import {hexToU8a} from '@polkadot/util/hex';
import {u8aConcat} from '@polkadot/util/u8a';
import {
  IApiListeners,
  IBlock,
  IEvent,
  IChainProperties,
  ICollectionCreationOptions,
  ICollectionLimits,
  ICollectionPermissions,
  ICrossAccountId,
  ICrossAccountIdLower,
  ILogger,
  INestingPermissions,
  IProperty,
  IStakingInfo,
  ISchedulerOptions,
  ISubstrateBalance,
  IToken,
  ITokenPropertyPermission,
  ITransactionResult,
  IUniqueHelperLog,
  TApiAllowedListeners,
  TEthereumAccount,
  TSigner,
  TSubstrateAccount,
  TNetworks,
  IForeignAssetMetadata,
  AcalaAssetMetadata,
  MoonbeamAssetInfo,
  DemocracyStandardAccountVote,
  IEthCrossAccountId,
  CollectionFlag,
  IPhasicEvent,
  DemocracySplitAccount,
} from './types';
import {RuntimeDispatchInfo} from '@polkadot/types/interfaces';
import type {Vec} from '@polkadot/types-codec';
import {FrameSupportPreimagesBounded, FrameSupportScheduleDispatchTime, FrameSystemEventRecord, PalletBalancesIdAmount, PalletDemocracyConviction, PalletDemocracyVoteAccountVote} from '@polkadot/types/lookup';
import {arrayUnzip} from '@polkadot/util';
import {Event} from './unique.dev';

export class CrossAccountId {
  Substrate!: TSubstrateAccount;
  Ethereum!: TEthereumAccount;

  constructor(account: ICrossAccountId) {
    if('Substrate' in account) this.Substrate = account.Substrate;
    else this.Ethereum = account.Ethereum;
  }

  static fromKeyring(account: IKeyringPair, domain: 'Substrate' | 'Ethereum' = 'Substrate') {
    switch (domain) {
      case 'Substrate': return new CrossAccountId({Substrate: account.address});
      case 'Ethereum': return new CrossAccountId({Substrate: account.address}).toEthereum();
    }
  }

  static fromLowerCaseKeys(address: ICrossAccountIdLower): CrossAccountId {
    if('substrate' in address) return new CrossAccountId({Substrate: address.substrate});
    else return new CrossAccountId({Ethereum: address.ethereum});
  }

  static normalizeSubstrateAddress(address: TSubstrateAccount, ss58Format = 42): TSubstrateAccount {
    return encodeAddress(decodeAddress(address), ss58Format);
  }

  static withNormalizedSubstrate(address: TSubstrateAccount, ss58Format = 42): CrossAccountId {
    return new CrossAccountId({Substrate: CrossAccountId.normalizeSubstrateAddress(address, ss58Format)});
  }

  withNormalizedSubstrate(ss58Format = 42): CrossAccountId {
    if(this.Substrate) return CrossAccountId.withNormalizedSubstrate(this.Substrate, ss58Format);
    return this;
  }

  static translateSubToEth(address: TSubstrateAccount): TEthereumAccount {
    return nesting.toChecksumAddress('0x' + Array.from(addressToEvm(address), i => i.toString(16).padStart(2, '0')).join(''));
  }

  toEthereum(): CrossAccountId {
    if(this.Substrate) return new CrossAccountId({Ethereum: CrossAccountId.translateSubToEth(this.Substrate)});
    return this;
  }

  static translateEthToSub(address: TEthereumAccount, ss58Format?: number): TSubstrateAccount {
    return evmToAddress(address, ss58Format);
  }

  toSubstrate(ss58Format?: number): CrossAccountId {
    if(this.Ethereum) return new CrossAccountId({Substrate: CrossAccountId.translateEthToSub(this.Ethereum, ss58Format)});
    return this;
  }

  toLowerCase(): CrossAccountId {
    if(this.Substrate) this.Substrate = this.Substrate.toLowerCase();
    if(this.Ethereum) this.Ethereum = this.Ethereum.toLowerCase();
    return this;
  }
}

const nesting = {
  toChecksumAddress(address: string): string {
    if(typeof address === 'undefined') return '';

    if(!/^(0x)?[0-9a-f]{40}$/i.test(address)) throw new Error(`Given address "${address}" is not a valid Ethereum address.`);

    address = address.toLowerCase().replace(/^0x/i, '');
    const addressHash = keccakAsHex(address).replace(/^0x/i, '');
    const checksumAddress = ['0x'];

    for(let i = 0; i < address.length; i++) {
      // If ith character is 8 to f then make it uppercase
      if(parseInt(addressHash[i], 16) > 7) {
        checksumAddress.push(address[i].toUpperCase());
      } else {
        checksumAddress.push(address[i]);
      }
    }
    return checksumAddress.join('');
  },
  tokenIdToAddress(collectionId: number, tokenId: number) {
    return this.toChecksumAddress(`0xf8238ccfff8ed887463fd5e0${collectionId.toString(16).padStart(8, '0')}${tokenId.toString(16).padStart(8, '0')}`);
  },
};

class UniqueUtil {
  static transactionStatus = {
    NOT_READY: 'NotReady',
    FAIL: 'Fail',
    SUCCESS: 'Success',
  };

  static chainLogType = {
    EXTRINSIC: 'extrinsic',
    RPC: 'rpc',
  };

  static getTokenAccount(token: IToken): CrossAccountId {
    return new CrossAccountId({Ethereum: this.getTokenAddress(token)});
  }

  static getTokenAddress(token: IToken): string {
    return nesting.tokenIdToAddress(token.collectionId, token.tokenId);
  }

  static getDefaultLogger(): ILogger {
    return {
      log(msg: any, level = 'INFO') {
        console[level.toLocaleLowerCase() === 'error' ? 'error' : 'log'](...(Array.isArray(msg) ? msg : [msg]));
      },
      level: {
        ERROR: 'ERROR',
        WARNING: 'WARNING',
        INFO: 'INFO',
      },
    };
  }

  static vec2str(arr: string[] | number[]) {
    return arr.map(x => String.fromCharCode(parseInt(x.toString()))).join('');
  }

  static str2vec(string: string) {
    if(typeof string !== 'string') return string;
    return Array.from(string).map(x => x.charCodeAt(0));
  }

  static fromSeed(seed: string, ss58Format = 42) {
    const keyring = new Keyring({type: 'sr25519', ss58Format});
    return keyring.addFromUri(seed);
  }

  static extractCollectionIdFromCreationResult(creationResult: ITransactionResult): number {
    if(creationResult.status !== this.transactionStatus.SUCCESS) {
      throw Error('Unable to create collection!');
    }

    let collectionId = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if((section === 'common') && (method === 'CollectionCreated')) {
        collectionId = parseInt(data[0].toString(), 10);
      }
    });

    if(collectionId === null) {
      throw Error('No CollectionCreated event was found!');
    }

    return collectionId;
  }

  static extractTokensFromCreationResult(creationResult: ITransactionResult): {
    success: boolean,
    tokens: { collectionId: number, tokenId: number, owner: CrossAccountId, amount: bigint }[],
  } {
    if(creationResult.status !== this.transactionStatus.SUCCESS) {
      throw Error('Unable to create tokens!');
    }
    let success = false;
    const tokens = [] as { collectionId: number, tokenId: number, owner: CrossAccountId, amount: bigint }[];
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if(method === 'ExtrinsicSuccess') {
        success = true;
      } else if((section === 'common') && (method === 'ItemCreated')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toHuman(),
          amount: data[3].toBigInt(),
        });
      }
    });
    return {success, tokens};
  }

  static extractTokensFromBurnResult(burnResult: ITransactionResult): {
    success: boolean,
    tokens: { collectionId: number, tokenId: number, owner: CrossAccountId, amount: bigint }[],
  } {
    if(burnResult.status !== this.transactionStatus.SUCCESS) {
      throw Error('Unable to burn tokens!');
    }
    let success = false;
    const tokens = [] as { collectionId: number, tokenId: number, owner: CrossAccountId, amount: bigint }[];
    burnResult.result.events.forEach(({event: {data, method, section}}) => {
      if(method === 'ExtrinsicSuccess') {
        success = true;
      } else if((section === 'common') && (method === 'ItemDestroyed')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toHuman(),
          amount: data[3].toBigInt(),
        });
      }
    });
    return {success, tokens};
  }

  static findCollectionInEvents(events: { event: IEvent }[], collectionId: number, expectedSection: string, expectedMethod: string): boolean {
    let eventId = null;
    events.forEach(({event: {data, method, section}}) => {
      if((section === expectedSection) && (method === expectedMethod)) {
        eventId = parseInt(data[0].toString(), 10);
      }
    });

    if(eventId === null) {
      throw Error(`No ${expectedMethod} event was found!`);
    }
    return eventId === collectionId;
  }

  static isTokenTransferSuccess(events: { event: IEvent }[], collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    const normalizeAddress = (address: string | ICrossAccountId) => {
      if(typeof address === 'string') return address;
      const obj = {} as any;
      Object.keys(address).forEach(k => {
        obj[k.toLocaleLowerCase()] = (address as any)[k];
      });
      if(obj.substrate) return CrossAccountId.withNormalizedSubstrate(obj.substrate);
      if(obj.ethereum) return CrossAccountId.fromLowerCaseKeys(obj).toLowerCase();
      return address;
    };
    let transfer = {collectionId: null, tokenId: null, from: null, to: null, amount: 1} as any;
    events.forEach(({event: {data, method, section}}) => {
      if((section === 'common') && (method === 'Transfer')) {
        const hData = (data as any).toJSON();
        transfer = {
          collectionId: hData[0],
          tokenId: hData[1],
          from: normalizeAddress(hData[2]),
          to: normalizeAddress(hData[3]),
          amount: BigInt(hData[4]),
        };
      }
    });
    let isSuccess = parseInt(collectionId.toString()) === transfer.collectionId && parseInt(tokenId.toString()) === transfer.tokenId;
    isSuccess = isSuccess && JSON.stringify(normalizeAddress(fromAddressObj)) === JSON.stringify(transfer.from);
    isSuccess = isSuccess && JSON.stringify(normalizeAddress(toAddressObj)) === JSON.stringify(transfer.to);
    isSuccess = isSuccess && amount === transfer.amount;
    return isSuccess;
  }

  static bigIntToDecimals(number: bigint, decimals = 18) {
    const numberStr = number.toString();
    const dotPos = numberStr.length - decimals;

    if(dotPos <= 0) {
      return '0.' + '0'.repeat(Math.abs(dotPos)) + numberStr;
    } else {
      const intPart = numberStr.substring(0, dotPos);
      const fractPart = numberStr.substring(dotPos);
      return intPart + '.' + fractPart;
    }
  }
}

class UniqueEventHelper {
  private static extractIndex(index: any): [number, number] | string {
    if(index.toRawType() === '[u8;2]') return [index[0], index[1]];
    return index.toJSON();
  }

  private static extractSub(data: any, subTypes: any): { [key: string]: any } {
    let obj: any = {};
    let index = 0;

    if(data.entries) {
      for(const [key, value] of data.entries()) {
        obj[key] = this.extractData(value, subTypes[index]);
        index++;
      }
    } else obj = data.toJSON();

    return obj;
  }

  private static toHuman(data: any) {
    return data && data.toHuman ? data.toHuman() : `${data}`;
  }

  private static extractData(data: any, type: any): any {
    if(!type) return this.toHuman(data);
    if(['u16', 'u32'].indexOf(type.type) > -1) return data.toNumber();
    if(['u64', 'u128', 'u256'].indexOf(type.type) > -1) return data.toBigInt();
    if(type.hasOwnProperty('sub')) return this.extractSub(data, type.sub);
    return this.toHuman(data);
  }

  public static extractEvents(events: { event: any, phase: any }[]): IEvent[] {
    const parsedEvents: IEvent[] = [];

    events.forEach((record) => {
      const {event, phase} = record;
      const types = event.typeDef;

      const eventData: IEvent = {
        section: event.section.toString(),
        method: event.method.toString(),
        index: this.extractIndex(event.index),
        data: [],
        phase: phase.toJSON(),
      };

      event.data.forEach((val: any, index: number) => {
        eventData.data.push(this.extractData(val, types[index]));
      });

      parsedEvents.push(eventData);
    });

    return parsedEvents;
  }
}
const InvalidTypeSymbol = Symbol('Invalid type');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Invalid<ErrorMessage> =
  | ((
    invalidType: typeof InvalidTypeSymbol,
    ..._: typeof InvalidTypeSymbol[]
  ) => typeof InvalidTypeSymbol)
  | null
  | undefined;
// Has slightly better error messages than Get
type Get2<T, P extends string, E> =
  P extends `${infer Key}.${infer Key2}` ? Key extends keyof T ? Key2 extends keyof T[Key] ? T[Key][Key2] : E : E : E;
type ForceFunction<T> = T extends (...args: any) => any ? T : (...args: any) => Invalid<'not a function'>;

export class ChainHelperBase {
  helperBase: any;

  transactionStatus = UniqueUtil.transactionStatus;
  chainLogType = UniqueUtil.chainLogType;
  util: typeof UniqueUtil;
  eventHelper: typeof UniqueEventHelper;
  logger: ILogger;
  api: ApiPromise | null;
  forcedNetwork: TNetworks | null;
  network: TNetworks | null;
  wsEndpoint: string | null;
  chainLog: IUniqueHelperLog[];
  children: ChainHelperBase[];
  address: AddressGroup;
  chain: ChainGroup;

  constructor(logger?: ILogger, helperBase?: any) {
    this.helperBase = helperBase;

    this.util = UniqueUtil;
    this.eventHelper = UniqueEventHelper;
    if(typeof logger == 'undefined') logger = this.util.getDefaultLogger();
    this.logger = logger;
    this.api = null;
    this.forcedNetwork = null;
    this.network = null;
    this.wsEndpoint = null;
    this.chainLog = [];
    this.children = [];
    this.address = new AddressGroup(this);
    this.chain = new ChainGroup(this);
  }

  clone(helperCls: ChainHelperBaseConstructor, options: { [key: string]: any } = {}) {
    Object.setPrototypeOf(helperCls.prototype, this);
    const newHelper = new helperCls(this.logger, options);

    newHelper.api = this.api;
    newHelper.network = this.network;
    newHelper.forceNetwork = this.forceNetwork;

    this.children.push(newHelper);

    return newHelper;
  }

  getEndpoint(): string {
    if(this.wsEndpoint === null) throw Error('No connection was established');
    return this.wsEndpoint;
  }

  getApi(): ApiPromise {
    if(this.api === null) throw Error('API not initialized');
    return this.api;
  }

  async subscribeEvents(expectedEvents: { section: string, names: string[] }[]) {
    const collectedEvents: IEvent[] = [];
    const unsubscribe = await this.getApi().query.system.events((events: Vec<FrameSystemEventRecord>) => {
      const ievents = this.eventHelper.extractEvents(events);
      ievents.forEach((event) => {
        expectedEvents.forEach((e => {
          if(event.section === e.section && e.names.includes(event.method)) {
            collectedEvents.push(event);
          }
        }));
      });
    });
    return {unsubscribe: unsubscribe as any, collectedEvents};
  }

  clearChainLog(): void {
    this.chainLog = [];
  }

  forceNetwork(value: TNetworks): void {
    this.forcedNetwork = value;
  }

  async connect(wsEndpoint: string, listeners?: IApiListeners) {
    if(this.api !== null) throw Error('Already connected');
    const {api, network} = await ChainHelperBase.createConnection(wsEndpoint, listeners, this.forcedNetwork);
    this.wsEndpoint = wsEndpoint;
    this.api = api;
    this.network = network;
  }

  async disconnect() {
    for(const child of this.children) {
      child.clearApi();
    }

    if(this.api === null) return;
    await this.api.disconnect();
    this.clearApi();
  }

  clearApi() {
    this.api = null;
    this.network = null;
  }

  static async detectNetwork(api: ApiPromise): Promise<TNetworks> {
    const spec = (await api.query.system.lastRuntimeUpgrade()).toJSON() as any;
    const xcmChains = ['rococo', 'westend', 'westmint', 'acala', 'karura', 'moonbeam', 'moonriver'];

    if(xcmChains.indexOf(spec.specName) > -1) return spec.specName;

    if(['quartz', 'unique', 'sapphire'].indexOf(spec.specName) > -1) return spec.specName;
    return 'opal';
  }

  static async detectNetworkByWsEndpoint(wsEndpoint: string): Promise<TNetworks> {
    const api = new ApiPromise({provider: new WsProvider(wsEndpoint)});
    await api.isReady;

    const network = await this.detectNetwork(api);

    await api.disconnect();

    return network;
  }

  static async createConnection(wsEndpoint: string, listeners?: IApiListeners, network?: TNetworks | null): Promise<{
    api: ApiPromise;
    network: TNetworks;
  }> {
    if(typeof network === 'undefined' || network === null) network = 'opal';
    const supportedRPC = {
      opal: {
        unique: require('@unique-nft/opal-testnet-types/definitions').unique.rpc,
      },
      quartz: {
        unique: require('@unique-nft/quartz-mainnet-types/definitions').unique.rpc,
      },
      unique: {
        unique: require('@unique-nft/unique-mainnet-types/definitions').unique.rpc,
      },
      rococo: {},
      westend: {},
      moonbeam: {},
      moonriver: {},
      acala: {},
      karura: {},
      westmint: {},
    };
    if(!supportedRPC.hasOwnProperty(network)) network = await this.detectNetworkByWsEndpoint(wsEndpoint);
    const rpc = supportedRPC[network];

    // TODO: investigate how to replace rpc in runtime
    // api._rpcCore.addUserInterfaces(rpc);

    const api = new ApiPromise({provider: new WsProvider(wsEndpoint), rpc});

    await api.isReadyOrError;

    if(typeof listeners === 'undefined') listeners = {};
    for(const event of ['connected', 'disconnected', 'error', 'ready', 'decorated']) {
      if(!listeners.hasOwnProperty(event) || typeof listeners[event as TApiAllowedListeners] === 'undefined') continue;
      api.on(event as ApiInterfaceEvents, listeners[event as TApiAllowedListeners] as (...args: any[]) => any);
    }

    return {api, network};
  }

  getTransactionStatus(data: { events: { event: IEvent }[], status: any }) {
    const {events, status} = data;
    if(status.isReady) {
      return this.transactionStatus.NOT_READY;
    }
    if(status.isBroadcast) {
      return this.transactionStatus.NOT_READY;
    }
    if(status.isInBlock || status.isFinalized) {
      const errors = events.filter(e => e.event.method === 'ExtrinsicFailed');
      if(errors.length > 0) {
        return this.transactionStatus.FAIL;
      }
      if(events.filter(e => e.event.method === 'ExtrinsicSuccess').length > 0) {
        return this.transactionStatus.SUCCESS;
      }
    }

    return this.transactionStatus.FAIL;
  }

  signTransaction(sender: TSigner, transaction: any, options: Partial<SignerOptions> | null = null, label = 'transaction') {
    const sign = (callback: any) => {
      if(options !== null) return transaction.signAndSend(sender, options, callback);
      return transaction.signAndSend(sender, callback);
    };
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const unsub = await sign((result: any) => {
          const status = this.getTransactionStatus(result);

          if(status === this.transactionStatus.SUCCESS) {
            this.logger.log(`${label} successful`);
            unsub();
            resolve({result, status, blockHash: result.status.asInBlock.toHuman()});
          } else if(status === this.transactionStatus.FAIL) {
            let moduleError = null;

            if(result.hasOwnProperty('dispatchError')) {
              const dispatchError = result['dispatchError'];

              if(dispatchError) {
                if(dispatchError.isModule) {
                  const modErr = dispatchError.asModule;
                  const errorMeta = dispatchError.registry.findMetaError(modErr);

                  moduleError = `${errorMeta.section}.${errorMeta.name}`;
                } else if(dispatchError.isToken) {
                  moduleError = `Token: ${dispatchError.asToken}`;
                } else {
                  // May be [object Object] in case of unhandled non-unit enum
                  moduleError = `Misc: ${dispatchError.toHuman()}`;
                }
              } else {
                this.logger.log(result, this.logger.level.ERROR);
              }
            }

            this.logger.log(`Something went wrong with ${label}. Status: ${status}`, this.logger.level.ERROR);
            unsub();
            reject({status, moduleError, result});
          }
        });
      } catch (e) {
        this.logger.log(e, this.logger.level.ERROR);
        reject(e);
      }
    });
  }

  async signTransactionWithoutSending(signer: TSigner, tx: any) {
    const api = this.getApi();
    const signingInfo = await api.derive.tx.signingInfo(signer.address);

    tx.sign(signer, {
      blockHash: api.genesisHash,
      genesisHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      nonce: signingInfo.nonce,
    });

    return tx.toHex();
  }

  async getPaymentInfo(signer: TSigner, tx: any, len: number | null) {
    const api = this.getApi();
    const signingInfo = await api.derive.tx.signingInfo(signer.address);

    // We need to sign the tx because
    // unsigned transactions does not have an inclusion fee
    tx.sign(signer, {
      blockHash: api.genesisHash,
      genesisHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      nonce: signingInfo.nonce,
    });

    if(len === null) {
      return (await this.callRpc('api.rpc.payment.queryInfo', [tx.toHex()])) as RuntimeDispatchInfo;
    } else {
      return (await api.call.transactionPaymentApi.queryInfo(tx, len)) as RuntimeDispatchInfo;
    }
  }

  constructApiCall(apiCall: string, params: any[]) {
    if(!apiCall.startsWith('api.')) throw Error(`Invalid api call: ${apiCall}`);
    let call = this.getApi() as any;
    for(const part of apiCall.slice(4).split('.')) {
      call = call[part];
      if(!call) {
        const advice = part.includes('_') ? ' Looks like it needs to be converted to camel case.' : '';
        throw Error(`Function ${part} of api call ${apiCall} not found.${advice}`);
      }
    }
    return call(...params);
  }

  encodeApiCall(apiCall: string, params: any[]) {
    return this.constructApiCall(apiCall, params).method.toHex();
  }

  async executeExtrinsic<
    E extends string,
    V extends (
      ...args: any) => any = ForceFunction<
        Get2<
          AugmentedSubmittables<'promise'>,
          E, (...args: any) => Invalid<'not found'>
        >
      >
  >(
    sender: TSigner,
    extrinsic: `api.tx.${E}`,
    params: Parameters<V>,
    expectSuccess = true,
    options: Partial<SignerOptions> | null = null,/*, failureMessage='expected success'*/
  ): Promise<ITransactionResult> {
    if(this.api === null) throw Error('API not initialized');

    const startTime = (new Date()).getTime();
    let result: ITransactionResult;
    let events: IEvent[] = [];
    try {
      result = await this.signTransaction(sender, this.constructApiCall(extrinsic, params), options, extrinsic) as ITransactionResult;
      events = this.eventHelper.extractEvents(result.result.events);
      const errorEvent = events.find((event) => event.method == 'ExecutedFailed' || event.method == 'CreatedFailed');
      if(errorEvent)
        throw Error(errorEvent.method + ': ' + extrinsic);
    }
    catch (e) {
      if(!(e as object).hasOwnProperty('status')) throw e;
      result = e as ITransactionResult;
    }

    const endTime = (new Date()).getTime();

    const log = {
      executedAt: endTime,
      executionTime: endTime - startTime,
      type: this.chainLogType.EXTRINSIC,
      status: result.status,
      call: extrinsic,
      signer: this.getSignerAddress(sender),
      params,
    } as IUniqueHelperLog;

    let errorMessage = '';

    if(result.status !== this.transactionStatus.SUCCESS) {
      if(result.moduleError) {
        errorMessage = typeof result.moduleError === 'string'
          ? result.moduleError
          : `${Object.keys(result.moduleError)[0]}: ${Object.values(result.moduleError)[0]}`;
        log.moduleError = errorMessage;
      }
      else if(result.result.dispatchError) log.dispatchError = result.result.dispatchError;
    }
    if(events.length > 0) log.events = events;

    this.chainLog.push(log);

    if(expectSuccess && result.status !== this.transactionStatus.SUCCESS) {
      if(result.moduleError) throw Error(`${errorMessage}`);
      else if(result.result.dispatchError) throw Error(JSON.stringify(result.result.dispatchError));
    }
    return result as any;
  }

  async callRpc
  // TODO: make it strongly typed, or use api.query/api.rpc directly
  // <
  // K extends 'rpc' | 'query',
  // E extends string,
  // V extends (...args: any) => any = ForceFunction<
  //   Get2<
  //     K extends 'rpc' ? DecoratedRpc<'promise', RpcInterface> : QueryableStorage<'promise'>,
  //     E, (...args: any) => Invalid<'not found'>
  //   >
  // >,
  // P = Parameters<V>,
  // >
  (rpc: string, params?: any[]): Promise<any> {

    if(typeof params === 'undefined') params = [] as any;
    if(this.api === null) throw Error('API not initialized');
    if(!rpc.startsWith('api.rpc.') && !rpc.startsWith('api.query.')) throw Error(`${rpc} is not RPC call`);

    const startTime = (new Date()).getTime();
    let result;
    let error = null;
    const log = {
      type: this.chainLogType.RPC,
      call: rpc,
      params,
    } as any as IUniqueHelperLog;

    try {
      result = await this.constructApiCall(rpc, params as any);
    }
    catch (e) {
      error = e;
    }

    const endTime = (new Date()).getTime();

    log.executedAt = endTime;
    log.status = (error === null ? this.transactionStatus.SUCCESS : this.transactionStatus.FAIL) as 'Fail' | 'Success';
    log.executionTime = endTime - startTime;

    this.chainLog.push(log);

    if(error !== null) throw error;

    return result;
  }

  getSignerAddress(signer: IKeyringPair | string): string {
    if(typeof signer === 'string') return signer;
    return signer.address;
  }

  fetchAllPalletNames(): string[] {
    if(this.api === null) throw Error('API not initialized');
    return this.api.runtimeMetadata.asLatest.pallets.map(m => m.name.toString().toLowerCase()).sort();
  }

  fetchMissingPalletNames(requiredPallets: readonly string[]): string[] {
    const palletNames = this.fetchAllPalletNames();
    return requiredPallets.filter(p => !palletNames.includes(p));
  }
}


class HelperGroup<T extends ChainHelperBase> {
  helper: T;

  constructor(uniqueHelper: T) {
    this.helper = uniqueHelper;
  }
}


class CollectionGroup extends HelperGroup<UniqueHelper> {
  /**
 * Get number of blocks when sponsored transaction is available.
 *
 * @param collectionId ID of collection
 * @param tokenId ID of token
 * @param addressObj address for which the sponsorship is checked
 * @example await getTokenNextSponsored(1, 2, {Substrate: '5DfhbVfww7ThF8q6f3...'});
 * @returns number of blocks or null if sponsorship hasn't been set
 */
  async getTokenNextSponsored(collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<number | null> {
    return (await this.helper.callRpc('api.rpc.unique.nextSponsored', [collectionId, addressObj, tokenId])).toJSON();
  }

  /**
   * Get the number of created collections.
   *
   * @returns number of created collections
   */
  async getTotalCount(): Promise<number> {
    return (await this.helper.callRpc('api.rpc.unique.collectionStats')).created.toNumber();
  }

  /**
   * Get information about the collection with additional data,
   * including the number of tokens it contains, its administrators,
   * the normalized address of the collection's owner, and decoded name and description.
   *
   * @param collectionId ID of collection
   * @example await getData(2)
   * @returns collection information object
   */
  async getData(collectionId: number): Promise<{
    id: number;
    name: string;
    description: string;
    tokensCount: number;
    admins: CrossAccountId[];
    normalizedOwner: TSubstrateAccount;
    raw: any
  } | null> {
    const collection = await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId]);
    const humanCollection = collection.toHuman(), collectionData = {
      id: collectionId, name: null, description: null, tokensCount: 0, admins: [],
      raw: humanCollection,
    } as any, jsonCollection = collection.toJSON();
    if(humanCollection === null) return null;
    collectionData.raw.limits = jsonCollection.limits;
    collectionData.raw.permissions = jsonCollection.permissions;
    collectionData.normalizedOwner = this.helper.address.normalizeSubstrate(collectionData.raw.owner);
    for(const key of ['name', 'description']) {
      collectionData[key] = this.helper.util.vec2str(humanCollection[key]);
    }

    collectionData.tokensCount = (['RFT', 'NFT'].includes(humanCollection.mode))
      ? await this.helper[humanCollection.mode.toLocaleLowerCase() as 'nft' | 'rft'].getLastTokenId(collectionId)
      : 0;
    collectionData.admins = await this.getAdmins(collectionId);

    return collectionData;
  }

  /**
   * Get the addresses of the collection's administrators, optionally normalized.
   *
   * @param collectionId ID of collection
   * @param normalize whether to normalize the addresses to the default ss58 format
   * @example await getAdmins(1)
   * @returns array of administrators
   */
  async getAdmins(collectionId: number, normalize = false): Promise<CrossAccountId[]> {
    const admins = (await this.helper.callRpc('api.rpc.unique.adminlist', [collectionId])).toHuman();

    return normalize
      ? admins.map((address: CrossAccountId) => address.withNormalizedSubstrate())
      : admins;
  }

  /**
   * Get the addresses added to the collection allow-list, optionally normalized.
   * @param collectionId ID of collection
   * @param normalize whether to normalize the addresses to the default ss58 format
   * @example await getAllowList(1)
   * @returns array of allow-listed addresses
   */
  async getAllowList(collectionId: number, normalize = false): Promise<CrossAccountId[]> {
    const allowListed = (await this.helper.callRpc('api.rpc.unique.allowlist', [collectionId])).toHuman();
    return normalize
      ? allowListed.map((address: CrossAccountId) => address.withNormalizedSubstrate())
      : allowListed;
  }

  /**
   * Get the effective limits of the collection instead of null for default values
   *
   * @param collectionId ID of collection
   * @example await getEffectiveLimits(2)
   * @returns object of collection limits
   */
  async getEffectiveLimits(collectionId: number): Promise<ICollectionLimits> {
    return (await this.helper.callRpc('api.rpc.unique.effectiveCollectionLimits', [collectionId])).toJSON();
  }

  /**
   * Burns the collection if the signer has sufficient permissions and collection is empty.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @example await helper.collection.burn(aliceKeyring, 3);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burn(signer: TSigner, collectionId: number): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.destroyCollection', [collectionId],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionDestroyed');
  }

  /**
   * Sets the sponsor for the collection (Requires the Substrate address). Needs confirmation by the sponsor.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param sponsorAddress Sponsor substrate address
   * @example setSponsor(aliceKeyring, 10, "5DyN4Y92vZCjv38fg...")
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setSponsor(signer: TSigner, collectionId: number, sponsorAddress: TSubstrateAccount): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionSponsor', [collectionId, sponsorAddress],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionSponsorSet');
  }

  /**
   * Confirms consent to sponsor the collection on behalf of the signer.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @example confirmSponsorship(aliceKeyring, 10)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async confirmSponsorship(signer: TSigner, collectionId: number): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.confirmSponsorship', [collectionId],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'SponsorshipConfirmed');
  }

  /**
   * Removes the sponsor of a collection, regardless if it consented or not.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @example removeSponsor(aliceKeyring, 10)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async removeSponsor(signer: TSigner, collectionId: number): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.removeCollectionSponsor', [collectionId],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionSponsorRemoved');
  }

  /**
   * Sets the limits of the collection. At least one limit must be specified for a correct call.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param limits collection limits object
   * @example
   * await setLimits(
   *   aliceKeyring,
   *   10,
   *   {
   *     sponsorTransferTimeout: 0,
   *     ownerCanDestroy: false
   *   }
   * )
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setLimits(signer: TSigner, collectionId: number, limits: ICollectionLimits): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionLimits', [collectionId, limits],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionLimitSet');
  }

  /**
   * Changes the owner of the collection to the new Substrate address.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param ownerAddress substrate address of new owner
   * @example changeOwner(aliceKeyring, 10, "5DyN4Y92vZCjv38fg...")
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async changeOwner(signer: TSigner, collectionId: number, ownerAddress: TSubstrateAccount): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.changeCollectionOwner', [collectionId, ownerAddress],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionOwnerChanged');
  }

  /**
   * Adds a collection administrator.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param adminAddressObj Administrator address (substrate or ethereum)
   * @example addAdmin(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async addAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.addCollectionAdmin', [collectionId, adminAddressObj],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionAdminAdded');
  }

  /**
   * Removes a collection administrator.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param adminAddressObj Administrator address (substrate or ethereum)
   * @example removeAdmin(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async removeAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.removeCollectionAdmin', [collectionId, adminAddressObj],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionAdminRemoved');
  }

  /**
   * Check if user is in allow list.
   *
   * @param collectionId ID of collection
   * @param user Account to check
   * @example await getAdmins(1)
   * @returns is user in allow list
   */
  async allowed(collectionId: number, user: ICrossAccountId): Promise<boolean> {
    return (await this.helper.callRpc('api.rpc.unique.allowed', [collectionId, user])).toJSON();
  }

  /**
   * Adds an address to allow list
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param addressObj address to add to the allow list
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async addToAllowList(signer: TSigner, collectionId: number, addressObj: ICrossAccountId): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.addToAllowList', [collectionId, addressObj],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'AllowListAddressAdded');
  }

  /**
   * Removes an address from allow list
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param addressObj address to remove from the allow list
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async removeFromAllowList(signer: TSigner, collectionId: number, addressObj: ICrossAccountId): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.removeFromAllowList', [collectionId, addressObj],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'AllowListAddressRemoved');
  }

  /**
   * Sets onchain permissions for selected collection.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions collection permissions object
   * @example setPermissions(aliceKeyring, 10, {access:'AllowList', mintMode: true, nesting: {collectionAdmin: true, tokenOwner: true}});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setPermissions(signer: TSigner, collectionId: number, permissions: ICollectionPermissions): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionPermissions', [collectionId, permissions],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPermissionSet');
  }

  /**
   * Enables nesting for selected collection. If `restricted` set, you can nest only tokens from specified collections.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions nesting permissions object
   * @example enableNesting(aliceKeyring, 10, {collectionAdmin: true, tokenOwner: true});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async enableNesting(signer: TSigner, collectionId: number, permissions: INestingPermissions): Promise<boolean> {
    return await this.setPermissions(signer, collectionId, {nesting: permissions});
  }

  /**
   * Disables nesting for selected collection.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @example disableNesting(aliceKeyring, 10);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async disableNesting(signer: TSigner, collectionId: number): Promise<boolean> {
    return await this.setPermissions(signer, collectionId, {nesting: {tokenOwner: false, collectionAdmin: false}});
  }

  /**
   * Sets onchain properties to the collection.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param properties array of property objects
   * @example setProperties(aliceKeyring, 10, [{key: "gender", value: "male"}]);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setProperties(signer: TSigner, collectionId: number, properties: IProperty[]): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionProperties', [collectionId, properties],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPropertySet');
  }

  /**
   * Get collection properties.
   *
   * @param collectionId ID of collection
   * @param propertyKeys optionally filter the returned properties to only these keys
   * @example getProperties(1219, ['location', 'date', 'time', 'isParadise']);
   * @returns array of key-value pairs
   */
  async getProperties(collectionId: number, propertyKeys?: string[] | null): Promise<IProperty[]> {
    return (await this.helper.callRpc('api.rpc.unique.collectionProperties', [collectionId, propertyKeys])).toHuman();
  }

  async getPropertiesConsumedSpace(collectionId: number): Promise<number> {
    const api = this.helper.getApi();
    const props = (await api.query.common.collectionProperties(collectionId)).toJSON();

    return (props! as any).consumedSpace;
  }

  async getCollectionOptions(collectionId: number) {
    return (await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId])).toHuman();
  }

  /**
   * Deletes onchain properties from the collection.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param propertyKeys array of property keys to delete
   * @example deleteProperties(aliceKeyring, 10, ["gender", "age"]);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async deleteProperties(signer: TSigner, collectionId: number, propertyKeys: string[]): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteCollectionProperties', [collectionId, propertyKeys],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPropertyDeleted');
  }

  /**
   * Changes the owner of the token.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param addressObj address of a new owner
   * @param amount amount of tokens to be transfered. For NFT must be set to 1n
   * @example transferToken(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns true if the token success, otherwise false
   */
  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transfer', [addressObj, collectionId, tokenId, amount],
      true, // `Unable to transfer token #${tokenId} from collection #${collectionId}`,
    );

    return this.helper.util.isTokenTransferSuccess(result.result.events, collectionId, tokenId, {Substrate: typeof signer === 'string' ? signer : signer.address}, addressObj, amount);
  }

  /**
   *
   * Change ownership of a token(s) on behalf of the owner.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj address on behalf of which the token will be sent
   * @param toAddressObj new token owner
   * @param amount amount of tokens to be transfered. For NFT must be set to 1n
   * @example transferTokenFrom(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg"}, {Ethereum: "0x9F0583DbB85..."})
   * @returns true if the token success, otherwise false
   */
  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transferFrom', [fromAddressObj, toAddressObj, collectionId, tokenId, amount],
      true, // `Unable to transfer token #${tokenId} from collection #${collectionId}`,
    );
    return this.helper.util.isTokenTransferSuccess(result.result.events, collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  /**
   *
   * Destroys a concrete instance of NFT/RFT or burns a specified amount of fungible tokens.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param amount amount of tokens to be burned. For NFT must be set to 1n
   * @example burnToken(aliceKeyring, 10, 5);
   * @returns ```true``` if the extrinsic is successful, otherwise ```false```
   */
  async burnToken(signer: TSigner, collectionId: number, tokenId: number, amount = 1n): Promise<boolean> {
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnItem', [collectionId, tokenId, amount],
      true, // `Unable to burn token for ${label}`,
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult);
    if(burnedTokens.tokens.length > 1) throw Error('Burned multiple tokens');
    return burnedTokens.success;
  }

  /**
   * Destroys a concrete instance of NFT on behalf of the owner
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj address on behalf of which the token will be burnt
   * @param amount amount of tokens to be burned. For NFT must be set to 1n
   * @example burnTokenFrom(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."}, 5, {Ethereum: "0x9F0583DbB85..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burnTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnFrom', [collectionId, fromAddressObj, tokenId, amount],
      true, // `Unable to burn token from for ${label}`,
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult);
    return burnedTokens.success && burnedTokens.tokens.length > 0;
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj Substrate or Ethereum address which gets approved use of the signer's tokens
   * @param amount amount of token to be approved. For NFT must be set to 1n
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    const approveResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.approve', [toAddressObj, collectionId, tokenId, amount],
      true, // `Unable to approve token for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(approveResult.result.events, collectionId, 'common', 'Approved');
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT from eth mirror.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj Signer's Ethereum address containing her tokens
   * @param toAddressObj Substrate or Ethereum address which gets approved use of the signer's tokens
   * @param amount amount of token to be approved. For NFT must be set to 1n
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async approveTokenFrom(signer: IKeyringPair, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    const approveResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.approveFrom', [fromAddressObj, toAddressObj, collectionId, tokenId, amount],
      true, // `Unable to approve token for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(approveResult.result.events, collectionId, 'common', 'Approved');
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT from eth mirror.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj Substrate or Ethereum address which gets approved use of the signer's tokens
   * @param amount amount of token to be approved. For NFT must be set to 1n
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async approveTokenFromEth(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    const ethMirror = CrossAccountId.fromKeyring(signer).toEthereum();
    return await this.approveTokenFrom(signer, collectionId, tokenId, ethMirror, toAddressObj, amount);
  }

  /**
   * Get the amount of token pieces approved to transfer or burn. Normally 0.
   *
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAccountObj address which is approved to use token pieces
   * @param fromAccountObj address which may have allowed the use of its owned tokens
   * @example getTokenApprovedPieces(10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, {Substrate: "5ERZNF88Mm7UGfPP3mdG..."})
   * @returns number of approved to transfer pieces
   */
  async getTokenApprovedPieces(collectionId: number, tokenId: number, toAccountObj: ICrossAccountId, fromAccountObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.allowance', [collectionId, fromAccountObj, toAccountObj, tokenId])).toBigInt();
  }

  /**
   * Get the last created token ID in a collection
   *
   * @param collectionId ID of collection
   * @example getLastTokenId(10);
   * @returns id of the last created token
   */
  async getLastTokenId(collectionId: number): Promise<number> {
    return (await this.helper.callRpc('api.rpc.unique.lastTokenId', [collectionId])).toNumber();
  }

  /**
   * Check if token exists
   *
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example doesTokenExist(10, 20);
   * @returns true if the token exists, otherwise false
   */
  async doesTokenExist(collectionId: number, tokenId: number): Promise<boolean> {
    return (await this.helper.callRpc('api.rpc.unique.tokenExists', [collectionId, tokenId])).toJSON();
  }
}

class NFTnRFT extends CollectionGroup {
  /**
   * Get tokens owned by account
   *
   * @param collectionId ID of collection
   * @param addressObj tokens owner
   * @example getTokensByAddress(10, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns array of token ids owned by account
   */
  async getTokensByAddress(collectionId: number, addressObj: ICrossAccountId): Promise<number[]> {
    return (await this.helper.callRpc('api.rpc.unique.accountTokens', [collectionId, addressObj])).toJSON();
  }

  /**
   * Get token data
   *
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param propertyKeys optionally filter the token properties to only these keys
   * @param blockHashAt optionally query the data at some block with this hash
   * @example getToken(10, 5);
   * @returns human readable token data
   */
  async getToken(collectionId: number, tokenId: number, propertyKeys: string[] = [], blockHashAt?: string): Promise<{
    properties: IProperty[];
    owner: CrossAccountId;
    normalizedOwner: CrossAccountId;
  } | null> {
    let tokenData;
    if(typeof blockHashAt === 'undefined') {
      tokenData = await this.helper.callRpc('api.rpc.unique.tokenData', [collectionId, tokenId]);
    }
    else {
      if(propertyKeys.length == 0) {
        const collection = (await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId])).toHuman();
        if(!collection) return null;
        propertyKeys = collection.tokenPropertyPermissions.map((x: ITokenPropertyPermission) => x.key);
      }
      tokenData = await this.helper.callRpc('api.rpc.unique.tokenData', [collectionId, tokenId, propertyKeys, blockHashAt]);
    }
    tokenData = tokenData.toHuman();
    if(tokenData === null || tokenData.owner === null) return null;
    const owner = {} as any;
    for(const key of Object.keys(tokenData.owner)) {
      owner[key.toLocaleLowerCase()] = key.toLocaleLowerCase() == 'substrate'
        ? CrossAccountId.normalizeSubstrateAddress(tokenData.owner[key])
        : tokenData.owner[key];
    }
    tokenData.normalizedOwner = CrossAccountId.fromLowerCaseKeys(owner);
    return tokenData;
  }

  /**
   * Get token's owner
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt optionally query the data at the block with this hash
   * @example getTokenOwner(10, 5);
   * @returns Address in CrossAccountId format, e.g. {Substrate: "5DnSF6RRjwteE3BrCj..."}
   */
  async getTokenOwner(collectionId: number, tokenId: number, blockHashAt?: string): Promise<CrossAccountId> {
    let owner;
    if(typeof blockHashAt === 'undefined') {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId]);
    } else {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId, blockHashAt]);
    }
    return CrossAccountId.fromLowerCaseKeys(owner.toJSON());
  }

  /**
   * Recursively find the address that owns the token
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt
   * @example getTokenTopmostOwner(10, 5);
   * @returns address in CrossAccountId format, e.g. {Substrate: "5DyN4Y92vZCjv38fg..."}
   */
  async getTokenTopmostOwner(collectionId: number, tokenId: number, blockHashAt?: string): Promise<CrossAccountId | null> {
    let owner;
    if(typeof blockHashAt === 'undefined') {
      owner = await this.helper.callRpc('api.rpc.unique.topmostTokenOwner', [collectionId, tokenId]);
    } else {
      owner = await this.helper.callRpc('api.rpc.unique.topmostTokenOwner', [collectionId, tokenId, blockHashAt]);
    }

    if(owner === null) return null;

    return owner.toHuman();
  }

  /**
   * Nest one token into another
   * @param signer keyring of signer
   * @param tokenObj token to be nested
   * @param rootTokenObj token to be parent
   * @example nestToken(aliceKeyring, {collectionId: 10, tokenId: 5}, {collectionId: 10, tokenId: 4});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async nestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken): Promise<boolean> {
    const rootTokenAddress = this.helper.util.getTokenAccount(rootTokenObj);
    const result = await this.transferToken(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress);
    if(!result) {
      throw Error('Unable to nest token!');
    }
    return result;
  }

  /**
     * Remove token from nested state
     * @param signer keyring of signer
     * @param tokenObj token to unnest
     * @param rootTokenObj parent of a token
     * @param toAddressObj address of a new token owner
     * @example unnestToken(aliceKeyring, {collectionId: 10, tokenId: 5}, {collectionId: 10, tokenId: 4}, {Substrate: "5DyN4Y92vZCjv38fg..."});
     * @returns ```true``` if extrinsic success, otherwise ```false```
     */
  async unnestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken, toAddressObj: ICrossAccountId): Promise<boolean> {
    const rootTokenAddress = this.helper.util.getTokenAccount(rootTokenObj);
    const result = await this.transferTokenFrom(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress, toAddressObj);
    if(!result) {
      throw Error('Unable to unnest token!');
    }
    return result;
  }

  /**
   * Set permissions to change token properties
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions permissions to change a property by the collection admin or token owner
   * @example setTokenPropertyPermissions(
   *   aliceKeyring, 10, [{key: "gender", permission: {tokenOwner: true, mutable: true, collectionAdmin: true}}]
   * )
   * @returns true if extrinsic success otherwise false
   */
  async setTokenPropertyPermissions(signer: TSigner, collectionId: number, permissions: ITokenPropertyPermission[]): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenPropertyPermissions', [collectionId, permissions],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'PropertyPermissionSet');
  }

  /**
   * Get token property permissions.
   *
   * @param collectionId ID of collection
   * @param propertyKeys optionally filter the returned property permissions to only these keys
   * @example getPropertyPermissions(1219, ['location', 'date', 'time', 'isParadise']);
   * @returns array of key-permission pairs
   */
  async getPropertyPermissions(collectionId: number, propertyKeys: string[] | null = null): Promise<ITokenPropertyPermission[]> {
    return (await this.helper.callRpc('api.rpc.unique.propertyPermissions', [collectionId, ...(propertyKeys === null ? [] : [propertyKeys])])).toHuman();
  }

  /**
   * Set token properties
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param properties key-value pairs of metadata which to add to a token. Keys must be permitted in the collection
   * @example setTokenProperties(aliceKeyring, 10, 5, [{key: "gender", value: "female"}, {key: "age", value: "23"}])
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setTokenProperties(signer: TSigner, collectionId: number, tokenId: number, properties: IProperty[]): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenProperties', [collectionId, tokenId, properties],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertySet');
  }

  /**
   * Get properties, metadata assigned to a token.
   *
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param propertyKeys optionally filter the returned properties to only these keys
   * @example getTokenProperties(1219, ['location', 'date', 'time', 'isParadise']);
   * @returns array of key-value pairs
   */
  async getTokenProperties(collectionId: number, tokenId: number, propertyKeys?: string[] | null): Promise<IProperty[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenProperties', [collectionId, tokenId, propertyKeys])).toHuman();
  }

  /**
   * Delete the provided properties of a token
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param propertyKeys property keys to be deleted
   * @example deleteTokenProperties(aliceKeyring, 10, 5, ["gender", "age"])
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async deleteTokenProperties(signer: TSigner, collectionId: number, tokenId: number, propertyKeys: string[]): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteTokenProperties', [collectionId, tokenId, propertyKeys],
      true,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertyDeleted');
  }

  /**
   * Mint new collection
   *
   * @param signer keyring of signer
   * @param collectionOptions basic collection options and properties
   * @param mode NFT or RFT type of a collection
   * @example mintCollection(aliceKeyring, {name: 'New', description: "New collection", tokenPrefix: "NEW"}, "NFT")
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, mode: 'NFT' | 'RFT'): Promise<UniqueBaseCollection> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    collectionOptions.mode = (mode === 'NFT') ? {nft: null} : {refungible: null};
    for(const key of ['name', 'description', 'tokenPrefix']) {
      if(typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }

    let flags = 0;
    // convert CollectionFlags to number and join them in one number
    if(collectionOptions.flags) {
      for(let i = 0; i < collectionOptions.flags.length; i++){
        const flag = collectionOptions.flags[i];
        flags = flags | flag;
      }
    }
    collectionOptions.flags = [flags];

    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true, // errorLabel,
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult));
  }

  getCollectionObject(_collectionId: number): any {
    return null;
  }

  getTokenObject(_collectionId: number, _tokenId: number): any {
    return null;
  }

  /**
   * Tells whether the given `owner` approves the `operator`.
   * @param collectionId ID of collection
   * @param owner owner address
   * @param operator operator addrees
   * @returns true if operator is enabled
   */
  async allowanceForAll(collectionId: number, owner: ICrossAccountId, operator: ICrossAccountId): Promise<boolean> {
    return (await this.helper.callRpc('api.rpc.unique.allowanceForAll', [collectionId, owner, operator])).toJSON();
  }

  /** Sets or unsets the approval of a given operator.
   *  The `operator` is allowed to transfer all tokens of the `caller` on their behalf.
   *  @param operator Operator
   *  @param approved Should operator status be granted or revoked?
   *  @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setAllowanceForAll(signer: TSigner, collectionId: number, operator: ICrossAccountId, approved: boolean): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setAllowanceForAll', [collectionId, operator, approved],
      true,
    );
    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'ApprovedForAll');
  }
}


class NFTGroup extends NFTnRFT {
  /**
   * Get collection object
   * @param collectionId ID of collection
   * @example getCollectionObject(2);
   * @returns instance of UniqueNFTCollection
   */
  getCollectionObject(collectionId: number): UniqueNFTCollection {
    return new UniqueNFTCollection(collectionId, this.helper);
  }

  /**
   * Get token object
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example getTokenObject(10, 5);
   * @returns instance of UniqueNFTToken
   */
  getTokenObject(collectionId: number, tokenId: number): UniqueNFToken {
    return new UniqueNFToken(tokenId, this.getCollectionObject(collectionId));
  }

  /**
   * Is token approved to transfer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAccountObj address to be approved
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async isTokenApproved(collectionId: number, tokenId: number, toAccountObj: ICrossAccountId): Promise<boolean> {
    return (await this.getTokenApprovedPieces(collectionId, tokenId, toAccountObj, await this.getTokenOwner(collectionId, tokenId))) === 1n;
  }

  /**
   * Changes the owner of the token.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param addressObj address of a new owner
   * @example transferToken(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<boolean> {
    return await super.transferToken(signer, collectionId, tokenId, addressObj, 1n);
  }

  /**
   *
   * Change ownership of a NFT on behalf of the owner.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj address on behalf of which the token will be sent
   * @param toAddressObj new token owner
   * @example transferTokenFrom(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, {Ethereum: "0x9F0583DbB85..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId): Promise<boolean> {
    return await super.transferTokenFrom(signer, collectionId, tokenId, fromAddressObj, toAddressObj, 1n);
  }

  /**
   * Get tokens nested in the provided token
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt optionally query the data at the block with this hash
   * @example getTokenChildren(10, 5);
   * @returns tokens whose depth of nesting is <= 5
   */
  async getTokenChildren(collectionId: number, tokenId: number, blockHashAt?: string): Promise<IToken[]> {
    let children;
    if(typeof blockHashAt === 'undefined') {
      children = await this.helper.callRpc('api.rpc.unique.tokenChildren', [collectionId, tokenId]);
    } else {
      children = await this.helper.callRpc('api.rpc.unique.tokenChildren', [collectionId, tokenId, blockHashAt]);
    }

    return children.toJSON().map((x: any) => ({collectionId: x.collection, tokenId: x.token}));
  }

  /**
   * Mint new collection
   * @param signer keyring of signer
   * @param collectionOptions Collection options
   * @example
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * })
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions = {}): Promise<UniqueNFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'NFT') as UniqueNFTCollection;
  }

  /**
   * Mint new token
   * @param signer keyring of signer
   * @param data token data
   * @returns created token object
   */
  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; properties?: IProperty[]; }): Promise<UniqueNFToken> {
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        NFT: {
          properties: data.properties,
        },
      }],
      true,
    );
    const createdTokens = this.helper.util.extractTokensFromCreationResult(creationResult);
    if(createdTokens.tokens.length > 1) throw Error('Minted multiple tokens');
    if(createdTokens.tokens.length < 1) throw Error('No tokens minted');
    return this.getTokenObject(data.collectionId, createdTokens.tokens[0].tokenId);
  }

  /**
   * Mint multiple NFT tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokens array of tokens with owner and properties
   * @example
   * mintMultipleTokens(aliceKeyring, 10, [{
   *     owner: {Substrate: "5DyN4Y92vZCjv38fg..."},
   *     properties: [{key: "gender", value: "male"},{key: "age", value: "45"}],
   *   },{
   *     owner: {Ethereum: "0x9F0583DbB855d..."},
   *     properties: [{key: "gender", value: "female"},{key: "age", value: "22"}],
   * }]);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async mintMultipleTokens(signer: TSigner, collectionId: number, tokens: { owner: ICrossAccountId, properties?: IProperty[] }[]): Promise<UniqueNFToken[]> {
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}],
      true,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Mint multiple NFT tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with owner and properties
   * @example
   * mintMultipleTokensWithOneOwner(aliceKeyring, 10, "5DyN4Y92vZCjv38fg...", [{
   *   properties: [{
   *   key: "gender",
   *   value: "female",
   *  },{
   *   key: "age",
   *   value: "33",
   *  }],
   * }]);
   * @returns array of newly created tokens
   */
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: { properties?: IProperty[] }[]): Promise<UniqueNFToken[]> {
    const rawTokens = [];
    for(const token of tokens) {
      const raw = {NFT: {properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj address to approve
   * @example approveToken(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, amount);
  }
}


class RFTGroup extends NFTnRFT {
  /**
   * Get collection object
   * @param collectionId ID of collection
   * @example getCollectionObject(2);
   * @returns instance of UniqueRFTCollection
   */
  getCollectionObject(collectionId: number): UniqueRFTCollection {
    return new UniqueRFTCollection(collectionId, this.helper);
  }

  /**
   * Get token object
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example getTokenObject(10, 5);
   * @returns instance of UniqueNFTToken
   */
  getTokenObject(collectionId: number, tokenId: number): UniqueRFToken {
    return new UniqueRFToken(tokenId, this.getCollectionObject(collectionId));
  }

  /**
   * Get top 10 token owners with the largest number of pieces
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example getTokenTop10Owners(10, 5);
   * @returns array of top 10 owners
   */
  async getTokenTop10Owners(collectionId: number, tokenId: number): Promise<CrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, tokenId])).toJSON().map(CrossAccountId.fromLowerCaseKeys);
  }

  /**
   * Get number of pieces owned by address
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param addressObj address token owner
   * @example getTokenBalance(10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."});
   * @returns number of pieces ownerd by address
   */
  async getTokenBalance(collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.balance', [collectionId, addressObj, tokenId])).toBigInt();
  }

  /**
   * Transfer pieces of token to another address
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param addressObj address of a new owner
   * @param amount number of pieces to be transfered
   * @example transferTokenFrom(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, 2000n)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    return await super.transferToken(signer, collectionId, tokenId, addressObj, amount);
  }

  /**
   * Change ownership of some pieces of RFT on behalf of the owner.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj address on behalf of which the token will be sent
   * @param toAddressObj new token owner
   * @param amount number of pieces to be transfered
   * @example transferTokenFrom(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, {Substrate: "5DfhbVfww7ThF8q6f3i..."}, 2000n)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    return await super.transferTokenFrom(signer, collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  /**
   * Mint new collection
   * @param signer keyring of signer
   * @param collectionOptions Collection options
   * @example
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * })
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions = {}): Promise<UniqueRFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'RFT') as UniqueRFTCollection;
  }

  /**
   * Mint new token
   * @param signer keyring of signer
   * @param data token data
   * @example mintToken(aliceKeyring, {collectionId: 10, owner: {Substrate: '5GHoZe9c73RYbVzq...'}, pieces: 10000n});
   * @returns created token object
   */
  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; pieces: bigint; properties?: IProperty[]; }): Promise<UniqueRFToken> {
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        ReFungible: {
          pieces: data.pieces,
          properties: data.properties,
        },
      }],
      true,
    );
    const createdTokens = this.helper.util.extractTokensFromCreationResult(creationResult);
    if(createdTokens.tokens.length > 1) throw Error('Minted multiple tokens');
    if(createdTokens.tokens.length < 1) throw Error('No tokens minted');
    return this.getTokenObject(data.collectionId, createdTokens.tokens[0].tokenId);
  }

  async mintMultipleTokens(signer: TSigner, collectionId: number, tokens: { owner: ICrossAccountId, pieces: bigint, properties?: IProperty[] }[]): Promise<UniqueRFToken[]> {
    throw Error('Not implemented');
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItemsEx', [collectionId, {RefungibleMultipleOwners: tokens}],
      true, // `Unable to mint RFT tokens for ${label}`,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Mint multiple RFT tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with properties and pieces
   * @example mintMultipleTokensWithOneOwner(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, [{pieces: 100000n, properties: [{key: "gender", value: "male"}]}]);
   * @returns array of newly created RFT tokens
   */
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: { pieces: bigint, properties?: IProperty[] }[]): Promise<UniqueRFToken[]> {
    const rawTokens = [];
    for(const token of tokens) {
      const raw = {ReFungible: {pieces: token.pieces, properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Destroys a concrete instance of RFT.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param amount number of pieces to be burnt
   * @example burnToken(aliceKeyring, 10, 5);
   * @returns ```true``` if the extrinsic is successful, otherwise ```false```
   */
  async burnToken(signer: IKeyringPair, collectionId: number, tokenId: number, amount = 1n): Promise<boolean> {
    return await super.burnToken(signer, collectionId, tokenId, amount);
  }

  /**
   * Destroys a concrete instance of RFT on behalf of the owner.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param fromAddressObj address on behalf of which the token will be burnt
   * @param amount number of pieces to be burnt
   * @example burnTokenFrom(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, 2n)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burnTokenFrom(signer: IKeyringPair, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    return await super.burnTokenFrom(signer, collectionId, tokenId, fromAddressObj, amount);
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the RFT.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj address to approve
   * @param amount number of pieces to be approved
   * @example approveToken(aliceKeyring, 10, 5, {Substrate: "5GHoZe9c73RYbVzq..."}, "", 10000n);
   * @returns true if the token success, otherwise false
   */
  approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, amount);
  }

  /**
   * Get total number of pieces
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example getTokenTotalPieces(10, 5);
   * @returns number of pieces
   */
  async getTokenTotalPieces(collectionId: number, tokenId: number): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.totalPieces', [collectionId, tokenId])).unwrap().toBigInt();
  }

  /**
   * Change number of token pieces. Signer must be the owner of all token pieces.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param amount new number of pieces
   * @example repartitionToken(aliceKeyring, 10, 5, 12345n);
   * @returns true if the repartion was success, otherwise false
   */
  async repartitionToken(signer: TSigner, collectionId: number, tokenId: number, amount: bigint): Promise<boolean> {
    const currentAmount = await this.getTokenTotalPieces(collectionId, tokenId);
    const repartitionResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.repartition', [collectionId, tokenId, amount],
      true,
    );
    if(currentAmount < amount) return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemCreated');
    return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemDestroyed');
  }
}


class FTGroup extends CollectionGroup {
  /**
   * Get collection object
   * @param collectionId ID of collection
   * @example getCollectionObject(2);
   * @returns instance of UniqueFTCollection
   */
  getCollectionObject(collectionId: number): UniqueFTCollection {
    return new UniqueFTCollection(collectionId, this.helper);
  }

  /**
   * Mint new fungible collection
   * @param signer keyring of signer
   * @param collectionOptions Collection options
   * @param decimalPoints number of token decimals
   * @example
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * }, 18)
   * @returns newly created fungible collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions = {}, decimalPoints = 0): Promise<UniqueFTCollection> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    if(collectionOptions.tokenPropertyPermissions) throw Error('Fungible collections has no tokenPropertyPermissions');
    collectionOptions.mode = {fungible: decimalPoints};
    for(const key of ['name', 'description', 'tokenPrefix']) {
      if(typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true,
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult));
  }

  /**
   * Mint tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner address owner of new tokens
   * @param amount amount of tokens to be meanted
   * @example mintTokens(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq"}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async mintTokens(signer: TSigner, collectionId: number, amount: bigint, owner: ICrossAccountId | string): Promise<boolean> {
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [collectionId, (typeof owner === 'string') ? {Substrate: owner} : owner, {
        Fungible: {
          value: amount,
        },
      }],
      true, // `Unable to mint fungible tokens for ${label}`,
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated');
  }

  /**
   * Mint multiple Fungible tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with properties and pieces
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, tokens: { value: bigint }[], owner: ICrossAccountId): Promise<boolean> {
    const rawTokens = [];
    for(const token of tokens) {
      const raw = {Fungible: {Value: token.value}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true,
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated');
  }

  /**
   * Get the top 10 owners with the largest balance for the Fungible collection
   * @param collectionId ID of collection
   * @example getTop10Owners(10);
   * @returns array of ```ICrossAccountId```
   */
  async getTop10Owners(collectionId: number): Promise<CrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, 0])).toJSON().map(CrossAccountId.fromLowerCaseKeys);
  }

  /**
   * Get account balance
   * @param collectionId ID of collection
   * @param addressObj address of owner
   * @example getBalance(10, {Substrate: "5GHoZe9c73RYbVzq..."})
   * @returns amount of fungible tokens owned by address
   */
  async getBalance(collectionId: number, addressObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.balance', [collectionId, addressObj, 0])).toBigInt();
  }

  /**
   * Transfer tokens to address
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param toAddressObj address recipient
   * @param amount amount of tokens to be sent
   * @example transfer(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transfer(signer: TSigner, collectionId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    return await super.transferToken(signer, collectionId, 0, toAddressObj, amount);
  }

  /**
   * Transfer some tokens on behalf of the owner.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param fromAddressObj address on behalf of which tokens will be sent
   * @param toAddressObj address where token to be sent
   * @param amount number of tokens to be sent
   * @example transferFrom(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, {Substrate: "5DfhbVfww7ThF8q6f3ij..."}, 10000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferFrom(signer: TSigner, collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    return await super.transferTokenFrom(signer, collectionId, 0, fromAddressObj, toAddressObj, amount);
  }

  /**
   * Destroy some amount of tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param amount amount of tokens to be destroyed
   * @example burnTokens(aliceKeyring, 10, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burnTokens(signer: IKeyringPair, collectionId: number, amount = 1n): Promise<boolean> {
    return await super.burnToken(signer, collectionId, 0, amount);
  }

  /**
   * Burn some tokens on behalf of the owner.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param fromAddressObj address on behalf of which tokens will be burnt
   * @param amount amount of tokens to be burnt
   * @example burnTokensFrom(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burnTokensFrom(signer: IKeyringPair, collectionId: number, fromAddressObj: ICrossAccountId, amount = 1n): Promise<boolean> {
    return await super.burnTokenFrom(signer, collectionId, 0, fromAddressObj, amount);
  }

  /**
   * Get total collection supply
   * @param collectionId
   * @returns
   */
  async getTotalPieces(collectionId: number): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.totalPieces', [collectionId, 0])).unwrap().toBigInt();
  }

  /**
   * Set, change, or remove approved address to transfer tokens.
   *
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param toAddressObj address to be approved
   * @param amount amount of tokens to be approved
   * @example approveTokens(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  approveTokens(signer: IKeyringPair, collectionId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    return super.approveToken(signer, collectionId, 0, toAddressObj, amount);
  }

  /**
   * Get amount of fungible tokens approved to transfer
   * @param collectionId ID of collection
   * @param fromAddressObj owner of tokens
   * @param toAddressObj the address approved for the transfer of tokens on behalf of the owner
   * @returns number of tokens approved for the transfer
   */
  getApprovedTokens(collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return super.getTokenApprovedPieces(collectionId, 0, toAddressObj, fromAddressObj);
  }
}


class ChainGroup extends HelperGroup<ChainHelperBase> {
  /**
   * Get system properties of a chain
   * @example getChainProperties();
   * @returns ss58Format, token decimals, and token symbol
   */
  getChainProperties(): IChainProperties {
    const properties = (this.helper.getApi() as any).registry.getChainProperties().toJSON();
    return {
      ss58Format: properties.ss58Format.toJSON(),
      tokenDecimals: properties.tokenDecimals.toJSON(),
      tokenSymbol: properties.tokenSymbol.toJSON(),
    };
  }

  /**
   * Get chain header
   * @example getLatestBlockNumber();
   * @returns the number of the last block
   */
  async getLatestBlockNumber(): Promise<number> {
    return (await this.helper.callRpc('api.rpc.chain.getHeader')).number.toNumber();
  }

  /**
   * Get block hash by block number
   * @param blockNumber number of block
   * @example getBlockHashByNumber(12345);
   * @returns hash of a block
   */
  async getBlockHashByNumber(blockNumber: number): Promise<string | null> {
    const blockHash = (await this.helper.callRpc('api.rpc.chain.getBlockHash', [blockNumber])).toJSON();
    if(blockHash === '0x0000000000000000000000000000000000000000000000000000000000000000') return null;
    return blockHash;
  }

  // TODO add docs
  async getBlock(blockHashOrNumber: string | number): Promise<IBlock | null> {
    const blockHash = typeof blockHashOrNumber === 'string' ? blockHashOrNumber : await this.getBlockHashByNumber(blockHashOrNumber);
    if(!blockHash) return null;
    return (await this.helper.callRpc('api.rpc.chain.getBlock', [blockHash])).toHuman().block;
  }

  /**
   * Get latest relay block
   * @returns {number} relay block
   */
  async getRelayBlockNumber(): Promise<bigint> {
    const blockNumber = (await this.helper.callRpc('api.query.parachainSystem.validationData')).toJSON().relayParentNumber;
    return BigInt(blockNumber);
  }

  /**
   * Get account nonce
   * @param address substrate address
   * @example getNonce("5GrwvaEF5zXb26Fz...");
   * @returns number, account's nonce
   */
  async getNonce(address: TSubstrateAccount): Promise<number> {
    return (await this.helper.callRpc('api.query.system.account', [address])).nonce.toNumber();
  }
}

class SubstrateBalanceGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  /**
 * Get substrate address balance
 * @param address substrate address
 * @example getSubstrate("5GrwvaEF5zXb26Fz...")
 * @returns amount of tokens on address
 */
  async getSubstrate(address: TSubstrateAccount): Promise<bigint> {
    return (await this.helper.callRpc('api.query.system.account', [address])).data.free.toBigInt();
  }

  /**
   * Transfer tokens to substrate address
   * @param signer keyring of signer
   * @param address substrate address of a recipient
   * @param amount amount of tokens to be transfered
   * @example transferToSubstrate(aliceKeyring, "5GrwvaEF5zXb26Fz...", 100_000_000_000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferToSubstrate(signer: TSigner, address: TSubstrateAccount, amount: bigint | string): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.balances.transfer', [address, amount], true/*, `Unable to transfer balance from ${this.helper.getSignerAddress(signer)} to ${address}`*/);

    let transfer = {from: null, to: null, amount: 0n} as any;
    result.result.events.forEach(({event: {data, method, section}}) => {
      if((section === 'balances') && (method === 'Transfer')) {
        transfer = {
          from: this.helper.address.normalizeSubstrate(data[0]),
          to: this.helper.address.normalizeSubstrate(data[1]),
          amount: BigInt(data[2]),
        };
      }
    });
    const isSuccess = this.helper.address.normalizeSubstrate(typeof signer === 'string' ? signer : signer.address) === transfer.from
      && this.helper.address.normalizeSubstrate(address) === transfer.to
      && BigInt(amount) === transfer.amount;
    return isSuccess;
  }

  /**
   * Get full substrate balance including free, frozen, and reserved
   * @param address substrate address
   * @returns
   */
  async getSubstrateFull(address: TSubstrateAccount): Promise<ISubstrateBalance> {
    const accountInfo = (await this.helper.callRpc('api.query.system.account', [address])).data;
    return {free: accountInfo.free.toBigInt(), frozen: accountInfo.frozen.toBigInt(), reserved: accountInfo.reserved.toBigInt()};
  }

  /**
   * Get total issuance
   * @returns
   */
  async getTotalIssuance(): Promise<bigint> {
    const total = (await this.helper.callRpc('api.query.balances.totalIssuance', []));
    return total.toBigInt();
  }

  async getLocked(address: TSubstrateAccount): Promise<{ id: string, amount: bigint, reason: string }[]> {
    const locks = (await this.helper.callRpc('api.query.balances.locks', [address])).toHuman();
    return locks.map((lock: any) => ({id: lock.id, amount: BigInt(lock.amount.replace(/,/g, '')), reasons: lock.reasons}));
  }
  async getFrozen(address: TSubstrateAccount): Promise<{ id: string, amount: bigint }[]> {
    const locks = (await this.helper.api!.query.balances.freezes(address)) as unknown as Array<any>;
    return locks.map(lock => ({id: lock.id.toUtf8(), amount: lock.amount.toBigInt()}));
  }
}

class EthereumBalanceGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  /**
   * Get ethereum address balance
   * @param address ethereum address
   * @example getEthereum("0x9F0583DbB855d...")
   * @returns amount of tokens on address
   */
  async getEthereum(address: TEthereumAccount): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.eth.getBalance', [address])).toBigInt();
  }

  /**
   * Transfer tokens to address
   * @param signer keyring of signer
   * @param address Ethereum address of a recipient
   * @param amount amount of tokens to be transfered
   * @example transferToEthereum(alithKeyring, "0x9F0583DbB855d...", 100_000_000_000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferToEthereum(signer: TSigner, address: TEthereumAccount, amount: bigint | string): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.balances.transfer', [address, amount], true);

    let transfer = {from: null, to: null, amount: 0n} as any;
    result.result.events.forEach(({event: {data, method, section}}) => {
      if((section === 'balances') && (method === 'Transfer')) {
        transfer = {
          from: data[0].toString(),
          to: data[1].toString(),
          amount: BigInt(data[2]),
        };
      }
    });
    const isSuccess = (typeof signer === 'string' ? signer : signer.address) === transfer.from
      && address === transfer.to
      && BigInt(amount) === transfer.amount;
    return isSuccess;
  }
}

class BalanceGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  subBalanceGroup: SubstrateBalanceGroup<T>;
  ethBalanceGroup: EthereumBalanceGroup<T>;

  constructor(helper: T) {
    super(helper);
    this.subBalanceGroup = new SubstrateBalanceGroup(helper);
    this.ethBalanceGroup = new EthereumBalanceGroup(helper);
  }

  getCollectionCreationPrice(): bigint {
    return 2n * this.getOneTokenNominal();
  }
  /**
   * Representation of the native token in the smallest unit - one OPAL (OPL), QUARTZ (QTZ), or UNIQUE (UNQ).
   * @example getOneTokenNominal()
   * @returns ```BigInt``` representation of the native token in the smallest unit, e.g. ```1_000_000_000_000_000_000n``` for QTZ.
   */
  getOneTokenNominal(): bigint {
    const chainProperties = this.helper.chain.getChainProperties();
    return 10n ** BigInt((chainProperties.tokenDecimals || [18])[0]);
  }

  /**
   * Get substrate address balance
   * @param address substrate address
   * @example getSubstrate("5GrwvaEF5zXb26Fz...")
   * @returns amount of tokens on address
   */
  getSubstrate(address: TSubstrateAccount): Promise<bigint> {
    return this.subBalanceGroup.getSubstrate(address);
  }

  /**
   * Get full substrate balance including free, miscFrozen, feeFrozen, and reserved
   * @param address substrate address
   * @returns
   */
  getSubstrateFull(address: TSubstrateAccount): Promise<ISubstrateBalance> {
    return this.subBalanceGroup.getSubstrateFull(address);
  }

  /**
   * Get total issuance
   * @returns
   */
  getTotalIssuance(): Promise<bigint> {
    return this.subBalanceGroup.getTotalIssuance();
  }

  /**
   * Get locked balances
   * @param address substrate address
   * @returns locked balances with reason via api.query.balances.locks
   * @deprecated all the methods should switch to getFrozen
   */
  getLocked(address: TSubstrateAccount) {
    return this.subBalanceGroup.getLocked(address);
  }

  /**
   * Get frozen balances
   * @param address substrate address
   * @returns frozen balances with id via api.query.balances.freezes
   */
  getFrozen(address: TSubstrateAccount) {
    return this.subBalanceGroup.getFrozen(address);
  }

  /**
   * Get ethereum address balance
   * @param address ethereum address
   * @example getEthereum("0x9F0583DbB855d...")
   * @returns amount of tokens on address
   */
  getEthereum(address: TEthereumAccount): Promise<bigint> {
    return this.ethBalanceGroup.getEthereum(address);
  }

  async setBalanceSubstrate(signer: TSigner, address: TSubstrateAccount, amount: bigint) {
    await this.helper.executeExtrinsic(signer, 'api.tx.balances.forceSetBalance', [address, amount], true);
  }

  /**
   * Transfer tokens to substrate address
   * @param signer keyring of signer
   * @param address substrate address of a recipient
   * @param amount amount of tokens to be transfered
   * @example transferToSubstrate(aliceKeyring, "5GrwvaEF5zXb26Fz...", 100_000_000_000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  transferToSubstrate(signer: TSigner, address: TSubstrateAccount, amount: bigint | string): Promise<boolean> {
    return this.subBalanceGroup.transferToSubstrate(signer, address, amount);
  }

  async forceTransferToSubstrate(signer: TSigner, from: TSubstrateAccount, to: TSubstrateAccount, amount: bigint | string): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.balances.forceTransfer', [from, to, amount], true);

    let transfer = {from: null, to: null, amount: 0n} as any;
    result.result.events.forEach(({event: {data, method, section}}) => {
      if((section === 'balances') && (method === 'Transfer')) {
        transfer = {
          from: this.helper.address.normalizeSubstrate(data[0]),
          to: this.helper.address.normalizeSubstrate(data[1]),
          amount: BigInt(data[2]),
        };
      }
    });
    let isSuccess = this.helper.address.normalizeSubstrate(from) === transfer.from;
    isSuccess = isSuccess && this.helper.address.normalizeSubstrate(to) === transfer.to;
    isSuccess = isSuccess && BigInt(amount) === transfer.amount;
    return isSuccess;
  }

  /**
   * Transfer tokens with the unlock period
   * @param signer signers Keyring
   * @param address Substrate address of recipient
   * @param schedule Schedule params
   * @example vestedTransfer(signer, recepient.address, 20000, 100, 10, 50 * nominal); // total amount of vested tokens will be 100 * 50 = 5000
   */
  async vestedTransfer(signer: TSigner, address: TSubstrateAccount, schedule: { start: bigint, period: bigint, periodCount: bigint, perPeriod: bigint }): Promise<void> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.vesting.vestedTransfer', [address, schedule]);
    const event = result.result.events
      .find(e => e.event.section === 'vesting' &&
        e.event.method === 'VestingScheduleAdded' &&
        e.event.data[0].toHuman() === signer.address);
    if(!event) throw Error('Cannot find transfer in events');
  }

  /**
   * Get schedule for recepient of vested transfer
   * @param address Substrate address of recipient
   * @returns
   */
  async getVestingSchedules(address: TSubstrateAccount): Promise<{ start: bigint, period: bigint, periodCount: bigint, perPeriod: bigint }[]> {
    const schedule = (await this.helper.callRpc('api.query.vesting.vestingSchedules', [address])).toJSON();
    return schedule.map((schedule: any) => ({
      start: BigInt(schedule.start),
      period: BigInt(schedule.period),
      periodCount: BigInt(schedule.periodCount),
      perPeriod: BigInt(schedule.perPeriod),
    }));
  }

  /**
   * Claim vested tokens
   * @param signer signers Keyring
   */
  async claim(signer: TSigner) {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.vesting.claim', []);
    const event = result.result.events
      .find(e => e.event.section === 'vesting' &&
        e.event.method === 'Claimed' &&
        e.event.data[0].toHuman() === signer.address);
    if(!event) throw Error('Cannot find claim in events');
  }
}

class AddressGroup extends HelperGroup<ChainHelperBase> {
  /**
   * Normalizes the address to the specified ss58 format, by default ```42```.
   * @param address substrate address
   * @param ss58Format format for address conversion, by default ```42```
   * @example normalizeSubstrate("unjKJQJrRd238pkUZZvzDQrfKuM39zBSnQ5zjAGAGcdRhaJTx") // returns 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
   * @returns substrate address converted to normalized (i.e., starting with 5) or specified explicitly representation
   */
  normalizeSubstrate(address: TSubstrateAccount, ss58Format = 42): TSubstrateAccount {
    return CrossAccountId.normalizeSubstrateAddress(address, ss58Format);
  }

  /**
   * Get address in the connected chain format
   * @param address substrate address
   * @example normalizeSubstrateToChainFormat("5GrwvaEF5zXb26Fz...") // returns unjKJQJrRd238pkUZZ... for Unique Network
   * @returns address in chain format
   */
  normalizeSubstrateToChainFormat(address: TSubstrateAccount): TSubstrateAccount {
    return this.normalizeSubstrate(address, this.helper.chain.getChainProperties().ss58Format);
  }

  /**
   * Get substrate mirror of an ethereum address
   * @param ethAddress ethereum address
   * @param toChainFormat false for normalized account
   * @example ethToSubstrate('0x9F0583DbB855d...')
   * @returns substrate mirror of a provided ethereum address
   */
  ethToSubstrate(ethAddress: TEthereumAccount, toChainFormat = false): TSubstrateAccount {
    return CrossAccountId.translateEthToSub(ethAddress, toChainFormat ? this.helper.chain.getChainProperties().ss58Format : undefined);
  }

  /**
   * Get ethereum mirror of a substrate address
   * @param subAddress substrate account
   * @example substrateToEth("5DnSF6RRjwteE3BrC...")
   * @returns ethereum mirror of a provided substrate address
   */
  substrateToEth(subAddress: TSubstrateAccount): TEthereumAccount {
    return CrossAccountId.translateSubToEth(subAddress);
  }

  /**
   * Encode key to substrate address
   * @param key key for encoding address
   * @param ss58Format prefix for encoding to the address of the corresponding network
   * @returns encoded substrate address
   */
  encodeSubstrateAddress(key: Uint8Array | string | bigint, ss58Format = 42): string {
    const u8a: Uint8Array = typeof key === 'string'
      ? hexToU8a(key)
      : typeof key === 'bigint'
        ? hexToU8a(key.toString(16))
        : key;

    if(ss58Format < 0 || ss58Format > 16383 || [46, 47].includes(ss58Format)) {
      throw new Error(`ss58Format is not valid, received ${typeof ss58Format} "${ss58Format}"`);
    }

    const allowedDecodedLengths = [1, 2, 4, 8, 32, 33];
    if(!allowedDecodedLengths.includes(u8a.length)) {
      throw new Error(`key length is not valid, received ${u8a.length}, valid values are ${allowedDecodedLengths.join(', ')}`);
    }

    const u8aPrefix = ss58Format < 64
      ? new Uint8Array([ss58Format])
      : new Uint8Array([
        ((ss58Format & 0xfc) >> 2) | 0x40,
        (ss58Format >> 8) | ((ss58Format & 0x03) << 6),
      ]);

    const input = u8aConcat(u8aPrefix, u8a);

    return base58Encode(u8aConcat(
      input,
      blake2AsU8a(input).subarray(0, [32, 33].includes(u8a.length) ? 2 : 1),
    ));
  }

  /**
   * Restore substrate address from bigint representation
   * @param number decimal representation of substrate address
   * @returns substrate address
   */
  restoreCrossAccountFromBigInt(number: bigint): TSubstrateAccount {
    if(this.helper.api === null) {
      throw 'Not connected';
    }
    const res = this.helper.api.registry.createType('AccountId', '0x' + number.toString(16).padStart(64, '0')).toJSON();
    if(res === undefined || res === null) {
      throw 'Restore address error';
    }
    return res.toString();
  }

  /**
   * Convert etherium cross account id to substrate cross account id
   * @param ethCrossAccount etherium cross account
   * @returns substrate cross account id
   */
  convertCrossAccountFromEthCrossAccount(ethCrossAccount: IEthCrossAccountId): ICrossAccountId {
    if(ethCrossAccount.sub === '0') {
      return {Ethereum: ethCrossAccount.eth.toLocaleLowerCase()};
    }

    const ss58 = this.restoreCrossAccountFromBigInt(BigInt(ethCrossAccount.sub));
    return {Substrate: ss58};
  }

  paraSiblingSovereignAccount(paraid: number) {
    // We are getting a *sibling* parachain sovereign account,
    // so we need a sibling prefix: encoded(b"sibl") == 0x7369626c
    const siblingPrefix = '0x7369626c';

    const encodedParaId = this.helper.getApi().createType('u32', paraid).toHex(true).substring(2);
    const suffix = '000000000000000000000000000000000000000000000000';

    return siblingPrefix + encodedParaId + suffix;
  }
}

class StakingGroup extends HelperGroup<UniqueHelper> {
  /**
   * Stake tokens for App Promotion
   * @param signer keyring of signer
   * @param amountToStake amount of tokens to stake
   * @param label extra label for log
   * @returns
   */
  async stake(signer: TSigner, amountToStake: bigint, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `${signer.address} amount: ${amountToStake}`;
    const _stakeResult = await this.helper.executeExtrinsic(
      signer, 'api.tx.appPromotion.stake',
      [amountToStake], true,
    );
    // TODO extract info from stakeResult
    return true;
  }

  /**
   * Unstake all staked tokens
   * @param signer keyring of signer
   * @param amountToUnstake amount of tokens to unstake
   * @param label extra label for log
   * @returns block hash where unstake happened
   */
  async unstakeAll(signer: TSigner, label?: string): Promise<string> {
    if(typeof label === 'undefined') label = `${signer.address}`;
    const unstakeResult = await this.helper.executeExtrinsic(
      signer, 'api.tx.appPromotion.unstakeAll',
      [], true,
    );
    return unstakeResult.blockHash;
  }

  /**
   * Unstake the part of a staked tokens
   * @param signer keyring of signer
   * @param amount amount of tokens to unstake
   * @param label extra label for log
   * @returns block hash where unstake happened
   */
  async unstakePartial(signer: TSigner, amount: bigint, label?: string): Promise<string> {
    if(typeof label === 'undefined') label = `${signer.address}`;
    const unstakeResult = await this.helper.executeExtrinsic(
      signer, 'api.tx.appPromotion.unstakePartial',
      [amount], true,
    );
    return unstakeResult.blockHash;
  }

  /**
   * Get total number of active stakes
   * @param address substrate address
   * @returns {number}
   */
  async getStakesNumber(address: ICrossAccountId): Promise<number> {
    if('Ethereum' in address) throw Error('only substrate address');
    return (await this.helper.callRpc('api.query.appPromotion.stakesPerAccount', [address.Substrate])).toNumber();
  }

  /**
   * Get total staked amount for address
   * @param address substrate or ethereum address
   * @returns total staked amount
   */
  async getTotalStaked(address?: ICrossAccountId): Promise<bigint> {
    if(address) return (await this.helper.callRpc('api.rpc.appPromotion.totalStaked', [address])).toBigInt();
    return (await this.helper.callRpc('api.rpc.appPromotion.totalStaked')).toBigInt();
  }

  /**
   * Get total staked per block
   * @param address substrate or ethereum address
   * @returns array of stakes. `block` – the number of the block in which the stake was made. `amount` - the number of tokens staked in the block
   */
  async getTotalStakedPerBlock(address: ICrossAccountId): Promise<IStakingInfo[]> {
    const rawTotalStakerdPerBlock = await this.helper.callRpc('api.rpc.appPromotion.totalStakedPerBlock', [address]);
    return rawTotalStakerdPerBlock.map(([block, amount]: any[]) => ({
      block: block.toBigInt(),
      amount: amount.toBigInt(),
    }));
  }

  /**
   * Get total pending unstake amount for address
   * @param address substrate or ethereum address
   * @returns total pending unstake amount
   */
  async getPendingUnstake(address: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.appPromotion.pendingUnstake', [address])).toBigInt();
  }

  /**
   * Get pending unstake amount per block for address
   * @param address substrate or ethereum address
   * @returns array of pending stakes. `block` – the number of the block in which the unstake was made. `amount` - the number of tokens unstaked in the block
   */
  async getPendingUnstakePerBlock(address: ICrossAccountId): Promise<IStakingInfo[]> {
    const rawUnstakedPerBlock = await this.helper.callRpc('api.rpc.appPromotion.pendingUnstakePerBlock', [address]);
    const result = rawUnstakedPerBlock.map(([block, amount]: any[]) => ({
      block: block.toBigInt(),
      amount: amount.toBigInt(),
    }));
    return result;
  }
}

class SchedulerGroup extends HelperGroup<UniqueHelper> {
  constructor(helper: UniqueHelper) {
    super(helper);
  }

  cancelScheduled(signer: TSigner, scheduledId: string) {
    return this.helper.executeExtrinsic(
      signer,
      'api.tx.scheduler.cancelNamed',
      [scheduledId],
      true,
    );
  }

  changePriority(signer: TSigner, scheduledId: string, priority: number) {
    return this.helper.executeExtrinsic(
      signer,
      'api.tx.scheduler.changeNamedPriority',
      [scheduledId, priority],
      true,
    );
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    return this.schedule<T>('schedule', executionBlockNumber, options);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    return this.schedule<T>('scheduleAfter', blocksBeforeExecution, options);
  }

  schedule<T extends UniqueHelper>(
    scheduleFn: 'schedule' | 'scheduleAfter',
    blocksNum: number,
    options: ISchedulerOptions = {},
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const ScheduledHelperType = ScheduledUniqueHelper(this.helper.helperBase);
    return this.helper.clone(ScheduledHelperType, {
      scheduleFn,
      blocksNum,
      options,
    }) as T;
  }
}

class CollatorSelectionGroup extends HelperGroup<UniqueHelper> {
  //todo:collator documentation
  addInvulnerable(signer: TSigner, address: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.addInvulnerable', [address]);
  }

  removeInvulnerable(signer: TSigner, address: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.removeInvulnerable', [address]);
  }

  async getInvulnerables(): Promise<string[]> {
    return (await this.helper.callRpc('api.query.collatorSelection.invulnerables')).map((x: any) => x.toHuman());
  }

  /** and also total max invulnerables */
  maxCollators(): number {
    return (this.helper.getApi().consts.configuration.defaultCollatorSelectionMaxCollators.toJSON() as number);
  }

  async getDesiredCollators(): Promise<number> {
    return (await this.helper.callRpc('api.query.configuration.collatorSelectionDesiredCollatorsOverride')).toNumber();
  }

  setLicenseBond(signer: TSigner, amount: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.configuration.setCollatorSelectionLicenseBond', [amount]);
  }

  async getLicenseBond(): Promise<bigint> {
    return (await this.helper.callRpc('api.query.configuration.collatorSelectionLicenseBondOverride')).toBigInt();
  }

  obtainLicense(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.getLicense', []);
  }

  releaseLicense(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.releaseLicense', []);
  }

  forceReleaseLicense(signer: TSigner, released: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.forceReleaseLicense', [released]);
  }

  async hasLicense(address: string): Promise<bigint> {
    return (await this.helper.callRpc('api.query.collatorSelection.licenseDepositOf', [address])).toBigInt();
  }

  onboard(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.onboard', []);
  }

  offboard(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.collatorSelection.offboard', []);
  }

  async getCandidates(): Promise<string[]> {
    return (await this.helper.callRpc('api.query.collatorSelection.candidates')).map((x: any) => x.toHuman());
  }
}

class CollectiveGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'council', 'technicalCommittee'
   */
  private collective: string;

  constructor(helper: UniqueHelper, collective: string) {
    super(helper);
    this.collective = collective;
  }

  /**
   * Check the result of a proposal execution for the success of the underlying proposed extrinsic.
   * @param events events of the proposal execution
   * @returns proposal hash
   */
  private checkExecutedEvent(events: IPhasicEvent[]): string {
    const executionEvents = events.filter(x =>
      x.event.section === this.collective && (x.event.method === 'Executed' || x.event.method === 'MemberExecuted'));

    if(executionEvents.length != 1) {
      if(events.filter(x => x.event.section === this.collective && x.event.method === 'Disapproved').length > 0)
        throw new Error(`Disapproved by ${this.collective}`);
      else
        throw new Error(`Expected one 'Executed' or 'MemberExecuted' event for ${this.collective}`);
    }

    const result = (executionEvents[0].event.data as any).result;

    if(result.isErr) {
      if(result.asErr.isModule) {
        const error = result.asErr.asModule;
        const metaError = this.helper.getApi()?.registry.findMetaError(error);
        throw new Error(`Proposal execution failed with ${metaError.section}.${metaError.name}`);
      } else {
        throw new Error('Proposal execution failed with ' + result.asErr.toHuman());
      }
    }

    return (executionEvents[0].event.data as any).proposalHash;
  }

  /**
   * Returns an array of members' addresses.
   */
  async getMembers() {
    return (await this.helper.callRpc(`api.query.${this.collective}.members`, [])).toHuman();
  }

  /**
   * Returns the optional address of the prime member of the collective.
   */
  async getPrimeMember() {
    return (await this.helper.callRpc(`api.query.${this.collective}.prime`, [])).toHuman();
  }

  /**
   * Returns an array of proposal hashes that are currently active for this collective.
   */
  async getProposals() {
    return (await this.helper.callRpc(`api.query.${this.collective}.proposals`, [])).toHuman();
  }

  /**
   * Returns the call originally encoded under the specified hash.
   * @param hash h256-encoded proposal
   * @returns the optional call that the proposal hash stands for.
   */
  async getProposalCallOf(hash: string) {
    return (await this.helper.callRpc(`api.query.${this.collective}.proposalOf`, [hash])).toHuman();
  }

  /**
   * Returns the total number of proposals so far.
   */
  async getTotalProposalsCount() {
    return (await this.helper.callRpc(`api.query.${this.collective}.proposalCount`, [])).toNumber();
  }

  /**
   * Creates a new proposal up for voting. If the threshold is set to 1, the proposal will be executed immediately.
   * @param signer keyring of the proposer
   * @param proposal constructed call to be executed if the proposal is successful
   * @param voteThreshold minimal number of votes for the proposal to be verified and executed
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution and its result
   */
  async propose(signer: TSigner, proposal: any, voteThreshold: number, lengthBound = 10000) {
    return await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.propose`, [voteThreshold, proposal, lengthBound]);
  }

  /**
   * Casts a vote to either approve or reject a proposal.
   * @param signer keyring of the voter
   * @param proposalHash hash of the proposal to be voted for
   * @param proposalIndex absolute index of the proposal used for absolutely nothing but throwing pointless errors
   * @param approve aye or nay
   * @returns promise of extrinsic execution and its result
   */
  vote(signer: TSigner, proposalHash: string, proposalIndex: number, approve: boolean) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [proposalHash, proposalIndex, approve]);
  }

  /**
   * Executes a call immediately as a member of the collective. Needed for the Member origin.
   * @param signer keyring of the executor member
   * @param proposal constructed call to be executed by the member
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution
   */
  async execute(signer: TSigner, proposal: any, lengthBound = 10000) {
    const result = await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.execute`, [proposal, lengthBound]);
    this.checkExecutedEvent(result.result.events);
    return result;
  }

  /**
   * Attempt to close and execute a proposal. Note that there must already be enough votes to meet the threshold set when proposing.
   * @param signer keyring of the executor. Can be absolutely anyone.
   * @param proposalHash hash of the proposal to close
   * @param proposalIndex index of the proposal generated on its creation
   * @param weightBound weight of the proposed call. Can be obtained by calling `paymentInfo()` on the call.
   * @param lengthBound byte length of the encoded call
   * @returns promise of extrinsic execution and its result
   */
  async close(
    signer: TSigner,
    proposalHash: string,
    proposalIndex: number,
    weightBound: [number, number] | any = [20_000_000_000, 1000_000],
    lengthBound = 10_000,
  ) {
    const result = await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.close`, [
      proposalHash,
      proposalIndex,
      weightBound,
      lengthBound,
    ]);
    this.checkExecutedEvent(result.result.events);
    return result;
  }

  /**
   * Shut down a proposal, regardless of its current state.
   * @param signer keyring of the disapprover. Must be root
   * @param proposalHash hash of the proposal to close
   * @returns promise of extrinsic execution and its result
   */
  disapproveProposal(signer: TSigner, proposalHash: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.disapproveProposal`, [proposalHash]);
  }
}

class CollectiveMembershipGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'councilMembership', 'technicalCommitteeMembership'
   */
  private membership: string;

  constructor(helper: UniqueHelper, membership: string) {
    super(helper);
    this.membership = membership;
  }

  /**
   * Returns an array of members' addresses according to the membership pallet's perception.
   * Note that it does not recognize the original pallet's members set with `setMembers()`.
   */
  async getMembers() {
    return (await this.helper.callRpc(`api.query.${this.membership}.members`, [])).toHuman();
  }

  /**
   * Returns the optional address of the prime member of the collective.
   */
  async getPrimeMember() {
    return (await this.helper.callRpc(`api.query.${this.membership}.prime`, [])).toHuman();
  }

  /**
   * Add a member to the collective.
   * @param signer keyring of the setter. Must be root
   * @param member address of the member to add
   * @returns promise of extrinsic execution and its result
   */
  addMember(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.addMember`, [member]);
  }

  addMemberCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.addMember`, [member]);
  }

  /**
   * Remove a member from the collective.
   * @param signer keyring of the setter. Must be root
   * @param member address of the member to remove
   * @returns promise of extrinsic execution and its result
   */
  removeMember(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.removeMember`, [member]);
  }

  removeMemberCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.removeMember`, [member]);
  }

  /**
   * Set members of the collective to the given list of addresses.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @param members addresses of the members to set
   * @returns promise of extrinsic execution and its result
   */
  resetMembers(signer: TSigner, members: string[]) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.resetMembers`, [members]);
  }

  /**
   * Set the collective's prime member to the given address.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @param prime address of the prime member of the collective
   * @returns promise of extrinsic execution and its result
   */
  setPrime(signer: TSigner, prime: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.setPrime`, [prime]);
  }

  setPrimeCall(member: string) {
    return this.helper.constructApiCall(`api.tx.${this.membership}.setPrime`, [member]);
  }

  /**
   * Remove the collective's prime member.
   * @param signer keyring of the setter. Must be root (for the direct call, bypassing a public motion)
   * @returns promise of extrinsic execution and its result
   */
  clearPrime(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.membership}.clearPrime`, []);
  }

  clearPrimeCall() {
    return this.helper.constructApiCall(`api.tx.${this.membership}.clearPrime`, []);
  }
}

class RankedCollectiveGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'FellowshipCollective'
   */
  private collective: string;

  constructor(helper: UniqueHelper, collective: string) {
    super(helper);
    this.collective = collective;
  }

  addMember(signer: TSigner, newMember: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.addMember`, [newMember]);
  }

  addMemberCall(newMember: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.addMember`, [newMember]);
  }

  removeMember(signer: TSigner, member: string, minRank: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.removeMember`, [member, minRank]);
  }

  removeMemberCall(newMember: string, minRank: number) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.removeMember`, [newMember, minRank]);
  }

  promote(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.promoteMember`, [member]);
  }

  promoteCall(newMember: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.promoteMember`, [newMember]);
  }

  demote(signer: TSigner, member: string) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.demoteMember`, [member]);
  }

  demoteCall(newMember: string) {
    return this.helper.constructApiCall(`api.tx.${this.collective}.demoteMember`, [newMember]);
  }

  vote(signer: TSigner, pollIndex: number, aye: boolean) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [pollIndex, aye]);
  }

  async getMembers() {
    return (await this.helper.getApi().query.fellowshipCollective.members.keys())
      .map((key) => key.args[0].toString());
  }
}

class ReferendaGroup extends HelperGroup<UniqueHelper> {
  /**
   * Pallet name to make an API call to. Examples: 'FellowshipReferenda'
   */
  private referenda: string;

  constructor(helper: UniqueHelper, referenda: string) {
    super(helper);
    this.referenda = referenda;
  }

  submit(
    signer: TSigner,
    proposalOrigin: string,
    proposal: any,
    enactmentMoment: any,
  ) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.submit`, [
      {Origins: proposalOrigin},
      proposal,
      enactmentMoment,
    ]);
  }

  placeDecisionDeposit(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.placeDecisionDeposit`, [referendumIndex]);
  }

  cancel(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, `api.tx.${this.referenda}.cancel`, [referendumIndex]);
  }

  cancelCall(referendumIndex: number) {
    return this.helper.constructApiCall(`api.tx.${this.referenda}.cancel`, [referendumIndex]);
  }

  async referendumInfo(referendumIndex: number) {
    return (await this.helper.callRpc(`api.query.${this.referenda}.referendumInfoFor`, [referendumIndex])).toJSON();
  }

  async enactmentEventId(referendumIndex: number) {
    const api = await this.helper.getApi();

    const bytes = api.createType('([u8;8], Text, u32)', ['assembly', 'enactment', referendumIndex]).toU8a();
    return blake2AsHex(bytes, 256);
  }
}

export interface IFellowshipGroup {
  collective: RankedCollectiveGroup;
  referenda: ReferendaGroup;
}

export interface ICollectiveGroup {
  collective: CollectiveGroup;
  membership: CollectiveMembershipGroup;
}

class DemocracyGroup extends HelperGroup<UniqueHelper> {
  // todo displace proposal into types?
  propose(signer: TSigner, call: any, deposit: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.propose', [{Inline: call.method.toHex()}, deposit]);
  }

  proposeWithPreimage(signer: TSigner, preimage: string, deposit: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.propose', [{Legacy: preimage}, deposit]);
  }

  proposeCall(call: any, deposit: bigint) {
    return this.helper.constructApiCall('api.tx.democracy.propose', [{Inline: call.method.toHex()}, deposit]);
  }

  second(signer: TSigner, proposalIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.second', [proposalIndex]);
  }

  externalPropose(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalPropose', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeMajority(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeMajority', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefault(signer: TSigner, proposalCall: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeDefault', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefaultWithPreimage(signer: TSigner, preimage: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.externalProposeDefault', [{Legacy: preimage}]);
  }

  externalProposeCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalPropose', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeMajorityCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeMajority', [{Inline: proposalCall.method.toHex()}]);
  }

  externalProposeDefaultCall(proposalCall: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeDefault', [{Inline: proposalCall.method.toHex()}]);
  }

  // ... and blacklist external proposal hash.
  vetoExternal(signer: TSigner, proposalHash: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vetoExternal', [proposalHash]);
  }

  vetoExternalCall(proposalHash: string) {
    return this.helper.constructApiCall('api.tx.democracy.vetoExternal', [proposalHash]);
  }

  blacklist(signer: TSigner, proposalHash: string, referendumIndex: number | null = null) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.blacklist', [proposalHash, referendumIndex]);
  }

  blacklistCall(proposalHash: string, referendumIndex: number | null = null) {
    return this.helper.constructApiCall('api.tx.democracy.blacklist', [proposalHash, referendumIndex]);
  }

  // proposal. CancelProposalOrigin (root or all techcom)
  cancelProposal(signer: TSigner, proposalIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.cancelProposal', [proposalIndex]);
  }

  cancelProposalCall(proposalIndex: number) {
    return this.helper.constructApiCall('api.tx.democracy.cancelProposal', [proposalIndex]);
  }

  clearPublicProposals(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.clearPublicProposals', []);
  }

  fastTrack(signer: TSigner, proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  fastTrackCall(proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.constructApiCall('api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  // referendum. CancellationOrigin (TechCom member)
  emergencyCancel(signer: TSigner, referendumIndex: number) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.emergencyCancel', [referendumIndex]);
  }

  emergencyCancelCall(referendumIndex: number) {
    return this.helper.constructApiCall('api.tx.democracy.emergencyCancel', [referendumIndex]);
  }

  vote(signer: TSigner, referendumIndex: number, vote: any) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, vote]);
  }

  removeVote(signer: TSigner, referendumIndex: number, targetAccount?: string) {
    if(targetAccount) {
      return this.helper.executeExtrinsic(signer, 'api.tx.democracy.removeOtherVote', [targetAccount, referendumIndex]);
    } else {
      return this.helper.executeExtrinsic(signer, 'api.tx.democracy.removeVote', [referendumIndex]);
    }
  }

  unlock(signer: TSigner, targetAccount: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.unlock', [targetAccount]);
  }

  delegate(signer: TSigner, toAccount: string, conviction: PalletDemocracyConviction, balance: bigint) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.delegate', [toAccount, conviction, balance]);
  }

  undelegate(signer: TSigner) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.undelegate', []);
  }

  async referendumInfo(referendumIndex: number) {
    return (await this.helper.callRpc('api.query.democracy.referendumInfoOf', [referendumIndex])).toJSON();
  }

  async publicProposals() {
    return (await this.helper.callRpc('api.query.democracy.publicProps', [])).toJSON();
  }

  async findPublicProposal(proposalIndex: number) {
    const proposalInfo = (await this.publicProposals()).find((proposalInfo: any[]) => proposalInfo[0] == proposalIndex);

    return proposalInfo ? proposalInfo[1] : null;
  }

  async expectPublicProposal(proposalIndex: number) {
    const proposal = await this.findPublicProposal(proposalIndex);

    if(proposal) {
      return proposal;
    } else {
      throw Error(`Proposal #${proposalIndex} is expected to exist`);
    }
  }

  async getExternalProposal() {
    return (await this.helper.callRpc('api.query.democracy.nextExternal', []));
  }

  async expectExternalProposal() {
    const proposal = await this.getExternalProposal();

    if(proposal) {
      return proposal;
    } else {
      throw Error('An external proposal is expected to exist');
    }
  }

  /* setMetadata? */

  /* todo?
  referendumVote(signer: TSigner, referendumIndex: number, accountVote: DemocracyStandardAccountVote) {
    return this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, {Standard: accountVote}], true);
  }*/
}

class PreimageGroup extends HelperGroup<UniqueHelper> {
  async getPreimageInfo(h256: string) {
    return (await this.helper.callRpc('api.query.preimage.statusFor', [h256])).toJSON();
  }

  /**
   * Create a preimage from an API call.
   * @param signer keyring of the signer.
   * @param call an extrinsic call
   * @example await notePreimageFromCall(preimageMaker,
   *   helper.constructApiCall('api.tx.identity.forceInsertIdentities', [identitiesToAdd])
   * );
   * @returns promise of extrinsic execution.
   */
  notePreimageFromCall(signer: TSigner, call: any, returnPreimageHash = false) {
    return this.notePreimage(signer, call.method.toHex(), returnPreimageHash);
  }

  /**
   * Create a preimage with a hex or a byte array.
   * @param signer keyring of the signer.
   * @param bytes preimage encoded in hex or a byte array, e.g. an extrinsic call.
   * @example await notePreimage(preimageMaker,
   *   helper.constructApiCall('api.tx.identity.forceInsertIdentities', [identitiesToAdd]).method.toHex()
   * );
   * @returns promise of extrinsic execution.
   */
  async notePreimage(signer: TSigner, bytes: string | Uint8Array, returnPreimageHash = false) {
    const promise = this.helper.executeExtrinsic(signer, 'api.tx.preimage.notePreimage', [bytes]);
    if(returnPreimageHash) {
      const result = await promise;
      const events = result.result.events.filter(x => x.event.method === 'Noted' && x.event.section === 'preimage');
      const preimageHash = events[0].event.data[0].toHuman();
      return preimageHash;
    }
    return promise;
  }

  /**
   * Delete an existing preimage and return the deposit.
   * @param signer keyring of the signer - either the owner or the preimage manager (sudo).
   * @param h256 hash of the preimage.
   * @returns promise of extrinsic execution.
   */
  unnotePreimage(signer: TSigner, h256: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.preimage.unnotePreimage', [h256]);
  }

  /**
   * Request a preimage be uploaded to the chain without paying any fees or deposits.
   * @param signer keyring of the signer - either the owner or the preimage manager (sudo).
   * @param h256 hash of the preimage.
   * @returns promise of extrinsic execution.
   */
  requestPreimage(signer: TSigner, h256: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.preimage.requestPreimage', [h256]);
  }

  /**
   * Clear a previously made request for a preimage.
   * @param signer keyring of the signer - either the owner or the preimage manager (sudo).
   * @param h256 hash of the preimage.
   * @returns promise of extrinsic execution.
   */
  unrequestPreimage(signer: TSigner, h256: string) {
    return this.helper.executeExtrinsic(signer, 'api.tx.preimage.unrequestPreimage', [h256]);
  }
}

class ForeignAssetsGroup extends HelperGroup<UniqueHelper> {
  async register(signer: TSigner, ownerAddress: TSubstrateAccount, location: any, metadata: IForeignAssetMetadata) {
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.foreignAssets.registerForeignAsset',
      [ownerAddress, location, metadata],
      true,
    );
  }

  async update(signer: TSigner, foreignAssetId: number, location: any, metadata: IForeignAssetMetadata) {
    await this.helper.executeExtrinsic(
      signer,
      'api.tx.foreignAssets.updateForeignAsset',
      [foreignAssetId, location, metadata],
      true,
    );
  }
}

class XcmGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  palletName: string;

  constructor(helper: T, palletName: string) {
    super(helper);

    this.palletName = palletName;
  }

  async limitedReserveTransferAssets(signer: TSigner, destination: any, beneficiary: any, assets: any, feeAssetItem: number, weightLimit: any) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.limitedReserveTransferAssets`, [destination, beneficiary, assets, feeAssetItem, weightLimit], true);
  }

  async setSafeXcmVersion(signer: TSigner, version: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.forceDefaultXcmVersion`, [version], true);
  }

  async teleportAssets(signer: TSigner, destination: any, beneficiary: any, assets: any, feeAssetItem: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.palletName}.teleportAssets`, [destination, beneficiary, assets, feeAssetItem], true);
  }

  async teleportNativeAsset(signer: TSigner, destinationParaId: number, targetAccount: Uint8Array, amount: bigint, xcmVersion = 3) {
    const destinationContent = {
      parents: 0,
      interior: {
        X1: {
          Parachain: destinationParaId,
        },
      },
    };

    const beneficiaryContent = {
      parents: 0,
      interior: {
        X1: {
          AccountId32: {
            network: 'Any',
            id: targetAccount,
          },
        },
      },
    };

    const assetsContent = [
      {
        id: {
          Concrete: {
            parents: 0,
            interior: 'Here',
          },
        },
        fun: {
          Fungible: amount,
        },
      },
    ];

    let destination;
    let beneficiary;
    let assets;

    if(xcmVersion == 2) {
      destination = {V1: destinationContent};
      beneficiary = {V1: beneficiaryContent};
      assets = {V1: assetsContent};

    } else if(xcmVersion == 3) {
      destination = {V2: destinationContent};
      beneficiary = {V2: beneficiaryContent};
      assets = {V2: assetsContent};

    } else {
      throw Error('Unknown XCM version: ' + xcmVersion);
    }

    const feeAssetItem = 0;

    await this.teleportAssets(signer, destination, beneficiary, assets, feeAssetItem);
  }

  async send(signer: IKeyringPair, destination: any, message: any) {
    await this.helper.executeExtrinsic(
      signer,
      `api.tx.${this.palletName}.send`,
      [
        destination,
        message,
      ],
      true,
    );
  }
}

class XTokensGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async transfer(signer: TSigner, currencyId: any, amount: bigint, destination: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transfer', [currencyId, amount, destination, destWeight], true);
  }

  async transferMultiasset(signer: TSigner, asset: any, destination: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transferMultiasset', [asset, destination, destWeight], true);
  }

  async transferMulticurrencies(signer: TSigner, currencies: any[], feeItem: number, destLocation: any, destWeight: any) {
    await this.helper.executeExtrinsic(signer, 'api.tx.xTokens.transferMulticurrencies', [currencies, feeItem, destLocation, destWeight], true);
  }
}

class TokensGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async accounts(address: string, currencyId: any) {
    const {free} = (await this.helper.callRpc('api.query.tokens.accounts', [address, currencyId])).toJSON() as any;
    return BigInt(free);
  }
}

class AssetsGroup<T extends ChainHelperBase> extends HelperGroup<T> {
  async create(signer: TSigner, assetId: number, admin: string, minimalBalance: bigint) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.create', [assetId, admin, minimalBalance], true);
  }

  async setMetadata(signer: TSigner, assetId: number, name: string, symbol: string, decimals: number) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.setMetadata', [assetId, name, symbol, decimals], true);
  }

  async mint(signer: TSigner, assetId: number, beneficiary: string, amount: bigint) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assets.mint', [assetId, beneficiary, amount], true);
  }

  async account(assetId: string | number, address: string) {
    const accountAsset = (
      await this.helper.callRpc('api.query.assets.account', [assetId, address])
    ).toJSON()! as any;

    if(accountAsset !== null) {
      return BigInt(accountAsset['balance']);
    } else {
      return null;
    }
  }
}

class AcalaAssetRegistryGroup extends HelperGroup<AcalaHelper> {
  async registerForeignAsset(signer: TSigner, destination: any, metadata: AcalaAssetMetadata) {
    await this.helper.executeExtrinsic(signer, 'api.tx.assetRegistry.registerForeignAsset', [destination, metadata], true);
  }
}

class MoonbeamAssetManagerGroup extends HelperGroup<MoonbeamHelper> {
  makeRegisterForeignAssetProposal(assetInfo: MoonbeamAssetInfo) {
    const apiPrefix = 'api.tx.assetManager.';

    const registerTx = this.helper.constructApiCall(
      apiPrefix + 'registerForeignAsset',
      [assetInfo.location, assetInfo.metadata, assetInfo.existentialDeposit, assetInfo.isSufficient],
    );

    const setUnitsTx = this.helper.constructApiCall(
      apiPrefix + 'setAssetUnitsPerSecond',
      [assetInfo.location, assetInfo.unitsPerSecond, assetInfo.numAssetsWeightHint],
    );

    const batchCall = this.helper.getApi().tx.utility.batchAll([registerTx, setUnitsTx]);
    const encodedProposal = batchCall?.method.toHex() || '';
    return encodedProposal;
  }

  async assetTypeId(location: any) {
    return await this.helper.callRpc('api.query.assetManager.assetTypeId', [location]);
  }
}

class MoonbeamDemocracyGroup extends HelperGroup<MoonbeamHelper> {
  notePreimagePallet: string;

  constructor(helper: MoonbeamHelper, options: { [key: string]: any } = {}) {
    super(helper);
    this.notePreimagePallet = options.notePreimagePallet;
  }

  async notePreimage(signer: TSigner, encodedProposal: string) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.notePreimagePallet}.notePreimage`, [encodedProposal], true);
  }

  externalProposeMajority(proposal: any) {
    return this.helper.constructApiCall('api.tx.democracy.externalProposeMajority', [proposal]);
  }

  fastTrack(proposalHash: string, votingPeriod: number, delayPeriod: number) {
    return this.helper.constructApiCall('api.tx.democracy.fastTrack', [proposalHash, votingPeriod, delayPeriod]);
  }

  async referendumVote(signer: TSigner, referendumIndex: number, accountVote: DemocracyStandardAccountVote) {
    await this.helper.executeExtrinsic(signer, 'api.tx.democracy.vote', [referendumIndex, {Standard: accountVote}], true);
  }
}

class MoonbeamCollectiveGroup extends HelperGroup<MoonbeamHelper> {
  collective: string;

  constructor(helper: MoonbeamHelper, collective: string) {
    super(helper);

    this.collective = collective;
  }

  async propose(signer: TSigner, threshold: number, proposalHash: string, lengthBound: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.propose`, [threshold, proposalHash, lengthBound], true);
  }

  async vote(signer: TSigner, proposalHash: string, proposalIndex: number, approve: boolean) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.vote`, [proposalHash, proposalIndex, approve], true);
  }

  async close(signer: TSigner, proposalHash: string, proposalIndex: number, weightBound: any, lengthBound: number) {
    await this.helper.executeExtrinsic(signer, `api.tx.${this.collective}.close`, [proposalHash, proposalIndex, weightBound, lengthBound], true);
  }

  async proposalCount() {
    return Number(await this.helper.callRpc(`api.query.${this.collective}.proposalCount`, []));
  }
}

export type ChainHelperBaseConstructor = new (...args: any[]) => ChainHelperBase;
export type UniqueHelperConstructor = new (...args: any[]) => UniqueHelper;

export class UniqueHelper extends ChainHelperBase {
  balance: BalanceGroup<UniqueHelper>;
  collection: CollectionGroup;
  nft: NFTGroup;
  rft: RFTGroup;
  ft: FTGroup;
  staking: StakingGroup;
  scheduler: SchedulerGroup;
  collatorSelection: CollatorSelectionGroup;
  council: ICollectiveGroup;
  technicalCommittee: ICollectiveGroup;
  fellowship: IFellowshipGroup;
  democracy: DemocracyGroup;
  preimage: PreimageGroup;
  foreignAssets: ForeignAssetsGroup;
  xcm: XcmGroup<UniqueHelper>;
  xTokens: XTokensGroup<UniqueHelper>;
  tokens: TokensGroup<UniqueHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? UniqueHelper);

    this.balance = new BalanceGroup(this);
    this.collection = new CollectionGroup(this);
    this.nft = new NFTGroup(this);
    this.rft = new RFTGroup(this);
    this.ft = new FTGroup(this);
    this.staking = new StakingGroup(this);
    this.scheduler = new SchedulerGroup(this);
    this.collatorSelection = new CollatorSelectionGroup(this);
    this.council = {
      collective: new CollectiveGroup(this, 'council'),
      membership: new CollectiveMembershipGroup(this, 'councilMembership'),
    };
    this.technicalCommittee = {
      collective: new CollectiveGroup(this, 'technicalCommittee'),
      membership: new CollectiveMembershipGroup(this, 'technicalCommitteeMembership'),
    };
    this.fellowship = {
      collective: new RankedCollectiveGroup(this, 'fellowshipCollective'),
      referenda: new ReferendaGroup(this, 'fellowshipReferenda'),
    };
    this.democracy = new DemocracyGroup(this);
    this.preimage = new PreimageGroup(this);
    this.foreignAssets = new ForeignAssetsGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
    this.xTokens = new XTokensGroup(this);
    this.tokens = new TokensGroup(this);
  }

  getSudo<T extends UniqueHelper>() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as T;
  }
}

export class XcmChainHelper extends ChainHelperBase {
  async connect(wsEndpoint: string, _listeners?: any): Promise<void> {
    const wsProvider = new WsProvider(wsEndpoint);
    this.api = new ApiPromise({
      provider: wsProvider,
    });
    await this.api.isReadyOrError;
    this.network = await UniqueHelper.detectNetwork(this.api);
  }
}

export class RelayHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<RelayHelper>;
  xcm: XcmGroup<RelayHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? RelayHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.xcm = new XcmGroup(this, 'xcmPallet');
  }
}

export class WestmintHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<WestmintHelper>;
  xcm: XcmGroup<WestmintHelper>;
  assets: AssetsGroup<WestmintHelper>;
  xTokens: XTokensGroup<WestmintHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? WestmintHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
    this.assets = new AssetsGroup(this);
    this.xTokens = new XTokensGroup(this);
  }
}

export class MoonbeamHelper extends XcmChainHelper {
  balance: EthereumBalanceGroup<MoonbeamHelper>;
  assetManager: MoonbeamAssetManagerGroup;
  assets: AssetsGroup<MoonbeamHelper>;
  xTokens: XTokensGroup<MoonbeamHelper>;
  democracy: MoonbeamDemocracyGroup;
  collective: {
    council: MoonbeamCollectiveGroup,
    techCommittee: MoonbeamCollectiveGroup,
  };

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? MoonbeamHelper);

    this.balance = new EthereumBalanceGroup(this);
    this.assetManager = new MoonbeamAssetManagerGroup(this);
    this.assets = new AssetsGroup(this);
    this.xTokens = new XTokensGroup(this);
    this.democracy = new MoonbeamDemocracyGroup(this, options);
    this.collective = {
      council: new MoonbeamCollectiveGroup(this, 'councilCollective'),
      techCommittee: new MoonbeamCollectiveGroup(this, 'techCommitteeCollective'),
    };
  }
}

export class AstarHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<AstarHelper>;
  assets: AssetsGroup<AstarHelper>;
  xcm: XcmGroup<AstarHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? AstarHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.assets = new AssetsGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
  }

  getSudo<T extends UniqueHelper>() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as T;
  }
}

export class AcalaHelper extends XcmChainHelper {
  balance: SubstrateBalanceGroup<AcalaHelper>;
  assetRegistry: AcalaAssetRegistryGroup;
  xTokens: XTokensGroup<AcalaHelper>;
  tokens: TokensGroup<AcalaHelper>;
  xcm: XcmGroup<AcalaHelper>;

  constructor(logger?: ILogger, options: { [key: string]: any } = {}) {
    super(logger, options.helperBase ?? AcalaHelper);

    this.balance = new SubstrateBalanceGroup(this);
    this.assetRegistry = new AcalaAssetRegistryGroup(this);
    this.xTokens = new XTokensGroup(this);
    this.tokens = new TokensGroup(this);
    this.xcm = new XcmGroup(this, 'polkadotXcm');
  }

  getSudo<T extends AcalaHelper>() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const SudoHelperType = SudoHelper(this.helperBase);
    return this.clone(SudoHelperType) as T;
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function ScheduledUniqueHelper<T extends UniqueHelperConstructor>(Base: T) {
  return class extends Base {
    scheduleFn: 'schedule' | 'scheduleAfter';
    blocksNum: number;
    options: ISchedulerOptions;

    constructor(...args: any[]) {
      const logger = args[0] as ILogger;
      const options = args[1] as {
        scheduleFn: 'schedule' | 'scheduleAfter',
        blocksNum: number,
        options: ISchedulerOptions
      };

      super(logger);

      this.scheduleFn = options.scheduleFn;
      this.blocksNum = options.blocksNum;
      this.options = options.options;
    }

    executeExtrinsic(sender: IKeyringPair, scheduledExtrinsic: string, scheduledParams: any[], expectSuccess?: boolean): Promise<ITransactionResult> {
      const scheduledTx = this.constructApiCall(scheduledExtrinsic, scheduledParams);

      const mandatorySchedArgs = [
        this.blocksNum,
        this.options.periodic ? [this.options.periodic.period, this.options.periodic.repetitions] : null,
        this.options.priority ?? null,
        scheduledTx,
      ];

      let schedArgs;
      let scheduleFn;

      if(this.options.scheduledId) {
        schedArgs = [this.options.scheduledId!, ...mandatorySchedArgs];

        if(this.scheduleFn == 'schedule') {
          scheduleFn = 'scheduleNamed';
        } else if(this.scheduleFn == 'scheduleAfter') {
          scheduleFn = 'scheduleNamedAfter';
        }
      } else {
        schedArgs = mandatorySchedArgs;
        scheduleFn = this.scheduleFn;
      }

      const extrinsic = 'api.tx.scheduler.' + scheduleFn;

      return super.executeExtrinsic(
        sender,
        extrinsic as any,
        schedArgs,
        expectSuccess,
      );
    }
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function SudoHelper<T extends ChainHelperBaseConstructor>(Base: T) {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
    }

    async executeExtrinsic(
      sender: IKeyringPair,
      extrinsic: string,
      params: any[],
      expectSuccess?: boolean,
      options: Partial<SignerOptions> | null = null,
    ): Promise<ITransactionResult> {
      const call = this.constructApiCall(extrinsic, params);
      const result = await super.executeExtrinsic(
        sender,
        'api.tx.sudo.sudo',
        [call],
        expectSuccess,
        options,
      );

      if(result.status === 'Fail') return result;

      const data = (result.result.events.find(x => x.event.section == 'sudo' && x.event.method == 'Sudid')?.event.data as any).sudoResult;
      if(data.isErr) {
        if(data.asErr.isModule) {
          const error = (result.result.events[1].event.data as any).sudoResult.asErr.asModule;
          const metaError = super.getApi()?.registry.findMetaError(error);
          throw new Error(`${metaError.section}.${metaError.name}`);
        } else if(data.asErr.isToken) {
          throw new Error(`Token: ${data.asErr.asToken}`);
        }
        // May be [object Object] in case of unhandled non-unit enum
        throw new Error(`Misc: ${data.asErr.toHuman()}`);
      }
      return result;
    }
  };
}

export class UniqueBaseCollection {
  helper: UniqueHelper;
  collectionId: number;

  constructor(collectionId: number, uniqueHelper: UniqueHelper) {
    this.collectionId = collectionId;
    this.helper = uniqueHelper;
  }

  async getData() {
    return await this.helper.collection.getData(this.collectionId);
  }

  async getLastTokenId() {
    return await this.helper.collection.getLastTokenId(this.collectionId);
  }

  async doesTokenExist(tokenId: number) {
    return await this.helper.collection.doesTokenExist(this.collectionId, tokenId);
  }

  async getAdmins() {
    return await this.helper.collection.getAdmins(this.collectionId);
  }

  async getAllowList() {
    return await this.helper.collection.getAllowList(this.collectionId);
  }

  async getEffectiveLimits() {
    return await this.helper.collection.getEffectiveLimits(this.collectionId);
  }

  async getProperties(propertyKeys?: string[] | null) {
    return await this.helper.collection.getProperties(this.collectionId, propertyKeys);
  }

  async getPropertiesConsumedSpace() {
    return await this.helper.collection.getPropertiesConsumedSpace(this.collectionId);
  }

  async getTokenNextSponsored(tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.collection.getTokenNextSponsored(this.collectionId, tokenId, addressObj);
  }

  async getOptions() {
    return await this.helper.collection.getCollectionOptions(this.collectionId);
  }

  async setSponsor(signer: TSigner, sponsorAddress: TSubstrateAccount) {
    return await this.helper.collection.setSponsor(signer, this.collectionId, sponsorAddress);
  }

  async confirmSponsorship(signer: TSigner) {
    return await this.helper.collection.confirmSponsorship(signer, this.collectionId);
  }

  async removeSponsor(signer: TSigner) {
    return await this.helper.collection.removeSponsor(signer, this.collectionId);
  }

  async setLimits(signer: TSigner, limits: ICollectionLimits) {
    return await this.helper.collection.setLimits(signer, this.collectionId, limits);
  }

  async changeOwner(signer: TSigner, ownerAddress: TSubstrateAccount) {
    return await this.helper.collection.changeOwner(signer, this.collectionId, ownerAddress);
  }

  async addAdmin(signer: TSigner, adminAddressObj: ICrossAccountId) {
    return await this.helper.collection.addAdmin(signer, this.collectionId, adminAddressObj);
  }

  async addToAllowList(signer: TSigner, addressObj: ICrossAccountId) {
    return await this.helper.collection.addToAllowList(signer, this.collectionId, addressObj);
  }

  async removeFromAllowList(signer: TSigner, addressObj: ICrossAccountId) {
    return await this.helper.collection.removeFromAllowList(signer, this.collectionId, addressObj);
  }

  async removeAdmin(signer: TSigner, adminAddressObj: ICrossAccountId) {
    return await this.helper.collection.removeAdmin(signer, this.collectionId, adminAddressObj);
  }

  async setProperties(signer: TSigner, properties: IProperty[]) {
    return await this.helper.collection.setProperties(signer, this.collectionId, properties);
  }

  async deleteProperties(signer: TSigner, propertyKeys: string[]) {
    return await this.helper.collection.deleteProperties(signer, this.collectionId, propertyKeys);
  }

  async setPermissions(signer: TSigner, permissions: ICollectionPermissions) {
    return await this.helper.collection.setPermissions(signer, this.collectionId, permissions);
  }

  async enableNesting(signer: TSigner, permissions: INestingPermissions) {
    return await this.helper.collection.enableNesting(signer, this.collectionId, permissions);
  }

  async disableNesting(signer: TSigner) {
    return await this.helper.collection.disableNesting(signer, this.collectionId);
  }

  async burn(signer: TSigner) {
    return await this.helper.collection.burn(signer, this.collectionId);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueBaseCollection(this.collectionId, scheduledHelper);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueBaseCollection(this.collectionId, scheduledHelper);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueBaseCollection(this.collectionId, this.helper.getSudo<T>());
  }
}


export class UniqueNFTCollection extends UniqueBaseCollection {
  getTokenObject(tokenId: number) {
    return new UniqueNFToken(tokenId, this);
  }

  async getTokensByAddress(addressObj: ICrossAccountId) {
    return await this.helper.nft.getTokensByAddress(this.collectionId, addressObj);
  }

  async getToken(tokenId: number, blockHashAt?: string) {
    return await this.helper.nft.getToken(this.collectionId, tokenId, [], blockHashAt);
  }

  async getTokenOwner(tokenId: number, blockHashAt?: string) {
    return await this.helper.nft.getTokenOwner(this.collectionId, tokenId, blockHashAt);
  }

  async getTokenTopmostOwner(tokenId: number, blockHashAt?: string) {
    return await this.helper.nft.getTokenTopmostOwner(this.collectionId, tokenId, blockHashAt);
  }

  async getTokenChildren(tokenId: number, blockHashAt?: string) {
    return await this.helper.nft.getTokenChildren(this.collectionId, tokenId, blockHashAt);
  }

  async getPropertyPermissions(propertyKeys: string[] | null = null) {
    return await this.helper.nft.getPropertyPermissions(this.collectionId, propertyKeys);
  }

  async getTokenProperties(tokenId: number, propertyKeys?: string[] | null) {
    return await this.helper.nft.getTokenProperties(this.collectionId, tokenId, propertyKeys);
  }

  async getTokenPropertiesConsumedSpace(tokenId: number): Promise<number> {
    const api = this.helper.getApi();
    const props = (await api.query.nonfungible.tokenProperties(this.collectionId, tokenId)).toJSON();

    return (props! as any).consumedSpace;
  }

  async transferToken(signer: TSigner, tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.nft.transferToken(signer, this.collectionId, tokenId, addressObj);
  }

  async transferTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.transferTokenFrom(signer, this.collectionId, tokenId, fromAddressObj, toAddressObj);
  }

  async approveToken(signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.approveToken(signer, this.collectionId, tokenId, toAddressObj);
  }

  async isTokenApproved(tokenId: number, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.isTokenApproved(this.collectionId, tokenId, toAddressObj);
  }

  async mintToken(signer: TSigner, owner: ICrossAccountId = {Substrate: signer.address}, properties?: IProperty[]) {
    return await this.helper.nft.mintToken(signer, {collectionId: this.collectionId, owner, properties});
  }

  async mintMultipleTokens(signer: TSigner, tokens: { owner: ICrossAccountId, properties?: IProperty[] }[]) {
    return await this.helper.nft.mintMultipleTokens(signer, this.collectionId, tokens);
  }

  async burnToken(signer: TSigner, tokenId: number) {
    return await this.helper.nft.burnToken(signer, this.collectionId, tokenId);
  }

  async burnTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId) {
    return await this.helper.nft.burnTokenFrom(signer, this.collectionId, tokenId, fromAddressObj);
  }

  async setTokenProperties(signer: TSigner, tokenId: number, properties: IProperty[]) {
    return await this.helper.nft.setTokenProperties(signer, this.collectionId, tokenId, properties);
  }

  async deleteTokenProperties(signer: TSigner, tokenId: number, propertyKeys: string[]) {
    return await this.helper.nft.deleteTokenProperties(signer, this.collectionId, tokenId, propertyKeys);
  }

  async setTokenPropertyPermissions(signer: TSigner, permissions: ITokenPropertyPermission[]) {
    return await this.helper.nft.setTokenPropertyPermissions(signer, this.collectionId, permissions);
  }

  async nestToken(signer: TSigner, tokenId: number, toTokenObj: IToken) {
    return await this.helper.nft.nestToken(signer, {collectionId: this.collectionId, tokenId}, toTokenObj);
  }

  async unnestToken(signer: TSigner, tokenId: number, fromTokenObj: IToken, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.unnestToken(signer, {collectionId: this.collectionId, tokenId}, fromTokenObj, toAddressObj);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueNFTCollection(this.collectionId, scheduledHelper);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueNFTCollection(this.collectionId, scheduledHelper);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueNFTCollection(this.collectionId, this.helper.getSudo<T>());
  }
}


export class UniqueRFTCollection extends UniqueBaseCollection {
  getTokenObject(tokenId: number) {
    return new UniqueRFToken(tokenId, this);
  }

  async getToken(tokenId: number, blockHashAt?: string) {
    return await this.helper.rft.getToken(this.collectionId, tokenId, [], blockHashAt);
  }

  async getTokenOwner(tokenId: number, blockHashAt?: string) {
    return await this.helper.rft.getTokenOwner(this.collectionId, tokenId, blockHashAt);
  }

  async getTokensByAddress(addressObj: ICrossAccountId) {
    return await this.helper.rft.getTokensByAddress(this.collectionId, addressObj);
  }

  async getTop10TokenOwners(tokenId: number) {
    return await this.helper.rft.getTokenTop10Owners(this.collectionId, tokenId);
  }

  async getTokenTopmostOwner(tokenId: number, blockHashAt?: string) {
    return await this.helper.rft.getTokenTopmostOwner(this.collectionId, tokenId, blockHashAt);
  }

  async getTokenBalance(tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.rft.getTokenBalance(this.collectionId, tokenId, addressObj);
  }

  async getTokenTotalPieces(tokenId: number) {
    return await this.helper.rft.getTokenTotalPieces(this.collectionId, tokenId);
  }

  async getTokenApprovedPieces(tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.rft.getTokenApprovedPieces(this.collectionId, tokenId, toAddressObj, fromAddressObj);
  }

  async getPropertyPermissions(propertyKeys: string[] | null = null) {
    return await this.helper.rft.getPropertyPermissions(this.collectionId, propertyKeys);
  }

  async getTokenProperties(tokenId: number, propertyKeys?: string[] | null) {
    return await this.helper.rft.getTokenProperties(this.collectionId, tokenId, propertyKeys);
  }

  async getTokenPropertiesConsumedSpace(tokenId: number): Promise<number> {
    const api = this.helper.getApi();
    const props = (await api.query.refungible.tokenProperties(this.collectionId, tokenId)).toJSON();

    return (props! as any).consumedSpace;
  }

  async transferToken(signer: TSigner, tokenId: number, addressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.rft.transferToken(signer, this.collectionId, tokenId, addressObj, amount);
  }

  async transferTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.rft.transferTokenFrom(signer, this.collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  async approveToken(signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.rft.approveToken(signer, this.collectionId, tokenId, toAddressObj, amount);
  }

  async repartitionToken(signer: TSigner, tokenId: number, amount: bigint) {
    return await this.helper.rft.repartitionToken(signer, this.collectionId, tokenId, amount);
  }

  async mintToken(signer: TSigner, pieces = 1n, owner: ICrossAccountId = {Substrate: signer.address}, properties?: IProperty[]) {
    return await this.helper.rft.mintToken(signer, {collectionId: this.collectionId, owner, pieces, properties});
  }

  async mintMultipleTokens(signer: TSigner, tokens: { pieces: bigint, owner: ICrossAccountId, properties?: IProperty[] }[]) {
    return await this.helper.rft.mintMultipleTokens(signer, this.collectionId, tokens);
  }

  async burnToken(signer: TSigner, tokenId: number, amount = 1n) {
    return await this.helper.rft.burnToken(signer, this.collectionId, tokenId, amount);
  }

  async burnTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.rft.burnTokenFrom(signer, this.collectionId, tokenId, fromAddressObj, amount);
  }

  async setTokenProperties(signer: TSigner, tokenId: number, properties: IProperty[]) {
    return await this.helper.rft.setTokenProperties(signer, this.collectionId, tokenId, properties);
  }

  async deleteTokenProperties(signer: TSigner, tokenId: number, propertyKeys: string[]) {
    return await this.helper.rft.deleteTokenProperties(signer, this.collectionId, tokenId, propertyKeys);
  }

  async setTokenPropertyPermissions(signer: TSigner, permissions: ITokenPropertyPermission[]) {
    return await this.helper.rft.setTokenPropertyPermissions(signer, this.collectionId, permissions);
  }

  async nestToken(signer: TSigner, tokenId: number, toTokenObj: IToken) {
    return await this.helper.rft.nestToken(signer, {collectionId: this.collectionId, tokenId}, toTokenObj);
  }

  async unnestToken(signer: TSigner, tokenId: number, fromTokenObj: IToken, toAddressObj: ICrossAccountId) {
    return await this.helper.rft.unnestToken(signer, {collectionId: this.collectionId, tokenId}, fromTokenObj, toAddressObj);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueRFTCollection(this.collectionId, scheduledHelper);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueRFTCollection(this.collectionId, scheduledHelper);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueRFTCollection(this.collectionId, this.helper.getSudo<T>());
  }
}


export class UniqueFTCollection extends UniqueBaseCollection {
  async getBalance(addressObj: ICrossAccountId) {
    return await this.helper.ft.getBalance(this.collectionId, addressObj);
  }

  async getTotalPieces() {
    return await this.helper.ft.getTotalPieces(this.collectionId);
  }

  async getApprovedTokens(fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.ft.getApprovedTokens(this.collectionId, fromAddressObj, toAddressObj);
  }

  async getTop10Owners() {
    return await this.helper.ft.getTop10Owners(this.collectionId);
  }

  async mint(signer: TSigner, amount = 1n, owner: ICrossAccountId = {Substrate: signer.address}) {
    return await this.helper.ft.mintTokens(signer, this.collectionId, amount, owner);
  }

  async mintWithOneOwner(signer: TSigner, tokens: { value: bigint }[], owner: ICrossAccountId = {Substrate: signer.address}) {
    return await this.helper.ft.mintMultipleTokensWithOneOwner(signer, this.collectionId, tokens, owner);
  }

  async transfer(signer: TSigner, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.ft.transfer(signer, this.collectionId, toAddressObj, amount);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.ft.transferFrom(signer, this.collectionId, fromAddressObj, toAddressObj, amount);
  }

  async burnTokens(signer: TSigner, amount = 1n) {
    return await this.helper.ft.burnTokens(signer, this.collectionId, amount);
  }

  async burnTokensFrom(signer: TSigner, fromAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.ft.burnTokensFrom(signer, this.collectionId, fromAddressObj, amount);
  }

  async approveTokens(signer: TSigner, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.helper.ft.approveTokens(signer, this.collectionId, toAddressObj, amount);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueFTCollection(this.collectionId, scheduledHelper);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledHelper = this.helper.scheduler.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueFTCollection(this.collectionId, scheduledHelper);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueFTCollection(this.collectionId, this.helper.getSudo<T>());
  }
}


export class UniqueBaseToken {
  collection: UniqueNFTCollection | UniqueRFTCollection;
  collectionId: number;
  tokenId: number;

  constructor(tokenId: number, collection: UniqueNFTCollection | UniqueRFTCollection) {
    this.collection = collection;
    this.collectionId = collection.collectionId;
    this.tokenId = tokenId;
  }

  async getNextSponsored(addressObj: ICrossAccountId) {
    return await this.collection.getTokenNextSponsored(this.tokenId, addressObj);
  }

  async getProperties(propertyKeys?: string[] | null) {
    return await this.collection.getTokenProperties(this.tokenId, propertyKeys);
  }

  async getTokenPropertiesConsumedSpace() {
    return await this.collection.getTokenPropertiesConsumedSpace(this.tokenId);
  }

  async setProperties(signer: TSigner, properties: IProperty[]) {
    return await this.collection.setTokenProperties(signer, this.tokenId, properties);
  }

  async deleteProperties(signer: TSigner, propertyKeys: string[]) {
    return await this.collection.deleteTokenProperties(signer, this.tokenId, propertyKeys);
  }

  async doesExist() {
    return await this.collection.doesTokenExist(this.tokenId);
  }

  nestingAccount() {
    return this.collection.helper.util.getTokenAccount(this);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueBaseToken(this.tokenId, scheduledCollection);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueBaseToken(this.tokenId, scheduledCollection);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueBaseToken(this.tokenId, this.collection.getSudo<T>());
  }
}


export class UniqueNFToken extends UniqueBaseToken {
  collection: UniqueNFTCollection;

  constructor(tokenId: number, collection: UniqueNFTCollection) {
    super(tokenId, collection);
    this.collection = collection;
  }

  async getData(blockHashAt?: string) {
    return await this.collection.getToken(this.tokenId, blockHashAt);
  }

  async getOwner(blockHashAt?: string) {
    return await this.collection.getTokenOwner(this.tokenId, blockHashAt);
  }

  async getTopmostOwner(blockHashAt?: string) {
    return await this.collection.getTokenTopmostOwner(this.tokenId, blockHashAt);
  }

  async getChildren(blockHashAt?: string) {
    return await this.collection.getTokenChildren(this.tokenId, blockHashAt);
  }

  async nest(signer: TSigner, toTokenObj: IToken) {
    return await this.collection.nestToken(signer, this.tokenId, toTokenObj);
  }

  async unnest(signer: TSigner, fromTokenObj: IToken, toAddressObj: ICrossAccountId) {
    return await this.collection.unnestToken(signer, this.tokenId, fromTokenObj, toAddressObj);
  }

  async transfer(signer: TSigner, addressObj: ICrossAccountId) {
    return await this.collection.transferToken(signer, this.tokenId, addressObj);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.collection.transferTokenFrom(signer, this.tokenId, fromAddressObj, toAddressObj);
  }

  async approve(signer: TSigner, toAddressObj: ICrossAccountId) {
    return await this.collection.approveToken(signer, this.tokenId, toAddressObj);
  }

  async isApproved(toAddressObj: ICrossAccountId) {
    return await this.collection.isTokenApproved(this.tokenId, toAddressObj);
  }

  async burn(signer: TSigner) {
    return await this.collection.burnToken(signer, this.tokenId);
  }

  async burnFrom(signer: TSigner, fromAddressObj: ICrossAccountId) {
    return await this.collection.burnTokenFrom(signer, this.tokenId, fromAddressObj);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueNFToken(this.tokenId, scheduledCollection);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueNFToken(this.tokenId, scheduledCollection);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueNFToken(this.tokenId, this.collection.getSudo<T>());
  }
}

export class UniqueRFToken extends UniqueBaseToken {
  collection: UniqueRFTCollection;

  constructor(tokenId: number, collection: UniqueRFTCollection) {
    super(tokenId, collection);
    this.collection = collection;
  }

  async getData(blockHashAt?: string) {
    return await this.collection.getToken(this.tokenId, blockHashAt);
  }

  async getOwner(blockHashAt?: string) {
    return await this.collection.getTokenOwner(this.tokenId, blockHashAt);
  }

  async getTop10Owners() {
    return await this.collection.getTop10TokenOwners(this.tokenId);
  }

  async getTopmostOwner(blockHashAt?: string) {
    return await this.collection.getTokenTopmostOwner(this.tokenId, blockHashAt);
  }

  async nest(signer: TSigner, toTokenObj: IToken) {
    return await this.collection.nestToken(signer, this.tokenId, toTokenObj);
  }

  async unnest(signer: TSigner, fromTokenObj: IToken, toAddressObj: ICrossAccountId) {
    return await this.collection.unnestToken(signer, this.tokenId, fromTokenObj, toAddressObj);
  }

  async getBalance(addressObj: ICrossAccountId) {
    return await this.collection.getTokenBalance(this.tokenId, addressObj);
  }

  async getTotalPieces() {
    return await this.collection.getTokenTotalPieces(this.tokenId);
  }

  async getApprovedPieces(fromAddressObj: ICrossAccountId, toAccountObj: ICrossAccountId) {
    return await this.collection.getTokenApprovedPieces(this.tokenId, fromAddressObj, toAccountObj);
  }

  async transfer(signer: TSigner, addressObj: ICrossAccountId, amount = 1n) {
    return await this.collection.transferToken(signer, this.tokenId, addressObj, amount);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.collection.transferTokenFrom(signer, this.tokenId, fromAddressObj, toAddressObj, amount);
  }

  async approve(signer: TSigner, toAddressObj: ICrossAccountId, amount = 1n) {
    return await this.collection.approveToken(signer, this.tokenId, toAddressObj, amount);
  }

  async repartition(signer: TSigner, amount: bigint) {
    return await this.collection.repartitionToken(signer, this.tokenId, amount);
  }

  async burn(signer: TSigner, amount = 1n) {
    return await this.collection.burnToken(signer, this.tokenId, amount);
  }

  async burnFrom(signer: TSigner, fromAddressObj: ICrossAccountId, amount = 1n) {
    return await this.collection.burnTokenFrom(signer, this.tokenId, fromAddressObj, amount);
  }

  scheduleAt<T extends UniqueHelper>(
    executionBlockNumber: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAt<T>(executionBlockNumber, options);
    return new UniqueRFToken(this.tokenId, scheduledCollection);
  }

  scheduleAfter<T extends UniqueHelper>(
    blocksBeforeExecution: number,
    options: ISchedulerOptions = {},
  ) {
    const scheduledCollection = this.collection.scheduleAfter<T>(blocksBeforeExecution, options);
    return new UniqueRFToken(this.tokenId, scheduledCollection);
  }

  getSudo<T extends UniqueHelper>() {
    return new UniqueRFToken(this.tokenId, this.collection.getSudo<T>());
  }
}
