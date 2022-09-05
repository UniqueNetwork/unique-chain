// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable function-call-argument-newline */
/* eslint-disable no-prototype-builtins */

import {ApiPromise, WsProvider, Keyring} from '@polkadot/api';
import {ApiInterfaceEvents} from '@polkadot/api/types';
import {encodeAddress, decodeAddress, keccakAsHex, evmToAddress, addressToEvm} from '@polkadot/util-crypto';
import {IKeyringPair} from '@polkadot/types/types';
import {IApiListeners, IChainEvent, IChainProperties, ICollectionCreationOptions, ICollectionLimits, ICollectionPermissions, ICrossAccountId, ICrossAccountIdLower, ILogger, INestingPermissions, IProperty, IToken, ITokenPropertyPermission, ITransactionResult, IUniqueHelperLog, TApiAllowedListeners, TEthereumAccount, TSigner, TSubstrateAccount, TUniqueNetworks} from './types';

const crossAccountIdFromLower = (lowerAddress: ICrossAccountIdLower): ICrossAccountId => {
  const address = {} as ICrossAccountId;
  if(lowerAddress.substrate) address.Substrate = lowerAddress.substrate;
  if(lowerAddress.ethereum) address.Ethereum = lowerAddress.ethereum;
  return address;
};


const nesting = {
  toChecksumAddress(address: string): string {
    if (typeof address === 'undefined') return '';

    if(!/^(0x)?[0-9a-f]{40}$/i.test(address)) throw new Error(`Given address "${address}" is not a valid Ethereum address.`);

    address = address.toLowerCase().replace(/^0x/i,'');
    const addressHash = keccakAsHex(address).replace(/^0x/i,'');
    const checksumAddress = ['0x'];

    for (let i = 0; i < address.length; i++) {
      // If ith character is 8 to f then make it uppercase
      if (parseInt(addressHash[i], 16) > 7) {
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

  static getNestingTokenAddress(collectionId: number, tokenId: number) {
    return nesting.tokenIdToAddress(collectionId, tokenId);
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
    if (typeof string !== 'string') return string;
    return Array.from(string).map(x => x.charCodeAt(0));
  }

  static fromSeed(seed: string, ss58Format = 42) {
    const keyring = new Keyring({type: 'sr25519', ss58Format});
    return keyring.addFromUri(seed);
  }

  static normalizeSubstrateAddress(address: string, ss58Format = 42) {
    return encodeAddress(decodeAddress(address), ss58Format);
  }

  static extractCollectionIdFromCreationResult(creationResult: ITransactionResult, label = 'new collection') {
    if (creationResult.status !== this.transactionStatus.SUCCESS) {
      throw Error(`Unable to create collection for ${label}`);
    }

    let collectionId = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if ((section === 'common') && (method === 'CollectionCreated')) {
        collectionId = parseInt(data[0].toString(), 10);
      }
    });

    if (collectionId === null) {
      throw Error(`No CollectionCreated event for ${label}`);
    }

    return collectionId;
  }

  static extractTokensFromCreationResult(creationResult: ITransactionResult, label = 'new tokens') {
    if (creationResult.status !== this.transactionStatus.SUCCESS) {
      throw Error(`Unable to create tokens for ${label}`);
    }
    let success = false;
    const tokens = [] as any;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemCreated')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toJSON(),
        });
      }
    });
    return {success, tokens};
  }

  static extractTokensFromBurnResult(burnResult: ITransactionResult, label = 'burned tokens') {
    if (burnResult.status !== this.transactionStatus.SUCCESS) {
      throw Error(`Unable to burn tokens for ${label}`);
    }
    let success = false;
    const tokens = [] as any;
    burnResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemDestroyed')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toJSON(),
        });
      }
    });
    return {success, tokens};
  }

  static findCollectionInEvents(events: {event: IChainEvent}[], collectionId: number, expectedSection: string, expectedMethod: string, label?: string) {
    let eventId = null;
    events.forEach(({event: {data, method, section}}) => {
      if ((section === expectedSection) && (method === expectedMethod)) {
        eventId = parseInt(data[0].toString(), 10);
      }
    });

    if (eventId === null) {
      throw Error(`No ${expectedMethod} event for ${label}`);
    }
    return eventId === collectionId;
  }

  static isTokenTransferSuccess(events: {event: IChainEvent}[], collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=1n) {
    const normalizeAddress = (address: string | ICrossAccountId) => {
      if(typeof address === 'string') return address;
      const obj = {} as any;
      Object.keys(address).forEach(k => {
        obj[k.toLocaleLowerCase()] = address[k as 'Substrate' | 'Ethereum'];
      });
      if(obj.substrate) return {Substrate: this.normalizeSubstrateAddress(obj.substrate)};
      if(obj.ethereum) return {Ethereum: obj.ethereum.toLocaleLowerCase()};
      return address;
    };
    let transfer = {collectionId: null, tokenId: null, from: null, to: null, amount: 1} as any;
    events.forEach(({event: {data, method, section}}) => {
      if ((section === 'common') && (method === 'Transfer')) {
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
}


class ChainHelperBase {
  transactionStatus = UniqueUtil.transactionStatus;
  chainLogType = UniqueUtil.chainLogType;
  util: typeof UniqueUtil;
  logger: ILogger;
  api: ApiPromise | null;
  forcedNetwork: TUniqueNetworks | null;
  network: TUniqueNetworks | null;
  chainLog: IUniqueHelperLog[];

  constructor(logger?: ILogger) {
    this.util = UniqueUtil;
    if (typeof logger == 'undefined') logger = this.util.getDefaultLogger();
    this.logger = logger;
    this.api = null;
    this.forcedNetwork = null;
    this.network = null;
    this.chainLog = [];
  }

  clearChainLog(): void {
    this.chainLog = [];
  }

  forceNetwork(value: TUniqueNetworks): void {
    this.forcedNetwork = value;
  }

  async connect(wsEndpoint: string, listeners?: IApiListeners) {
    if (this.api !== null) throw Error('Already connected');
    const {api, network} = await ChainHelperBase.createConnection(wsEndpoint, listeners, this.forcedNetwork);
    this.api = api;
    this.network = network;
  }

  async disconnect() {
    if (this.api === null) return;
    await this.api.disconnect();
    this.api = null;
    this.network = null;
  }

  static async detectNetwork(api: ApiPromise): Promise<TUniqueNetworks> {
    const spec = (await api.query.system.lastRuntimeUpgrade()).toJSON() as any;
    if(['quartz', 'unique'].indexOf(spec.specName) > -1) return spec.specName;
    return 'opal';
  }

  static async detectNetworkByWsEndpoint(wsEndpoint: string): Promise<TUniqueNetworks> {
    const api = new ApiPromise({provider: new WsProvider(wsEndpoint)});
    await api.isReady;

    const network = await this.detectNetwork(api);

    await api.disconnect();

    return network;
  }

  static async createConnection(wsEndpoint: string, listeners?: IApiListeners, network?: TUniqueNetworks | null): Promise<{ 
    api: ApiPromise; 
    network: TUniqueNetworks; 
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
    };
    if(!supportedRPC.hasOwnProperty(network)) network = await this.detectNetworkByWsEndpoint(wsEndpoint);
    const rpc = supportedRPC[network];

    // TODO: investigate how to replace rpc in runtime
    // api._rpcCore.addUserInterfaces(rpc);

    const api = new ApiPromise({provider: new WsProvider(wsEndpoint), rpc});

    await api.isReadyOrError;

    if (typeof listeners === 'undefined') listeners = {};
    for (const event of ['connected', 'disconnected', 'error', 'ready', 'decorated']) {
      if (!listeners.hasOwnProperty(event) || typeof listeners[event as TApiAllowedListeners] === 'undefined') continue;
      api.on(event as ApiInterfaceEvents, listeners[event as TApiAllowedListeners] as (...args: any[]) => any);
    }

    return {api, network};
  }

  getTransactionStatus(data: {events: {event: IChainEvent}[], status: any}) {
    const {events, status} = data;
    if (status.isReady) {
      return this.transactionStatus.NOT_READY;
    }
    if (status.isBroadcast) {
      return this.transactionStatus.NOT_READY;
    }
    if (status.isInBlock || status.isFinalized) {
      const errors = events.filter(e => e.event.data.method === 'ExtrinsicFailed');
      if (errors.length > 0) {
        return this.transactionStatus.FAIL;
      }
      if (events.filter(e => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
        return this.transactionStatus.SUCCESS;
      }
    }

    return this.transactionStatus.FAIL;
  }

  signTransaction(sender: TSigner, transaction: any, label = 'transaction', options: any = null) {
    const sign = (callback: any) => {
      if(options !== null) return transaction.signAndSend(sender, options, callback);
      return transaction.signAndSend(sender, callback);
    };
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const unsub = await sign((result: any) => {
          const status = this.getTransactionStatus(result);

          if (status === this.transactionStatus.SUCCESS) {
            this.logger.log(`${label} successful`);
            unsub();
            resolve({result, status});
          } else if (status === this.transactionStatus.FAIL) {
            let moduleError = null;

            if (result.hasOwnProperty('dispatchError')) {
              const dispatchError = result['dispatchError'];

              if (dispatchError && dispatchError.isModule) {
                const modErr = dispatchError.asModule;
                const errorMeta = dispatchError.registry.findMetaError(modErr);

                moduleError = `${errorMeta.section}.${errorMeta.name}`;
              }
              else {
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

  constructApiCall(apiCall: string, params: any[]) {
    if(!apiCall.startsWith('api.')) throw Error(`Invalid api call: ${apiCall}`);
    let call = this.api as any;
    for(const part of apiCall.slice(4).split('.')) {
      call = call[part];
    }
    return call(...params);
  }

  async executeExtrinsic(sender: TSigner, extrinsic: string, params: any[], expectSuccess=false, failureMessage='expected success') {
    if(this.api === null) throw Error('API not initialized');
    if(!extrinsic.startsWith('api.tx.')) throw Error(`${extrinsic} is not transaction`);

    const startTime = (new Date()).getTime();
    let result: ITransactionResult;
    let events = [];
    try {
      result = await this.signTransaction(sender, this.constructApiCall(extrinsic, params), extrinsic) as ITransactionResult;
      events = result.result.events.map((x: any) => x.toHuman());
    }
    catch(e) {
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

    if(result.status !== this.transactionStatus.SUCCESS && result.moduleError) log.moduleError = result.moduleError;
    if(events.length > 0) log.events = events;

    this.chainLog.push(log);

    if(expectSuccess && result.status !== this.transactionStatus.SUCCESS) throw Error(failureMessage);
    return result;
  }

  async callRpc(rpc: string, params?: any[]) {
    if(typeof params === 'undefined') params = [];
    if(this.api === null) throw Error('API not initialized');
    if(!rpc.startsWith('api.rpc.') && !rpc.startsWith('api.query.')) throw Error(`${rpc} is not RPC call`);

    const startTime = (new Date()).getTime();
    let result;
    let error = null;
    const log = {
      type: this.chainLogType.RPC,
      call: rpc,
      params,
    } as IUniqueHelperLog;

    try {
      result = await this.constructApiCall(rpc, params);
    }
    catch(e) {
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
}


class HelperGroup {
  helper: UniqueHelper;

  constructor(uniqueHelper: UniqueHelper) {
    this.helper = uniqueHelper;
  }
}


class CollectionGroup extends HelperGroup {
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
   * Get information about the collection with additional data, including the number of tokens it contains, its administrators, the normalized address of the collection's owner, and decoded name and description.
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
    admins: ICrossAccountId[];
    normalizedOwner: TSubstrateAccount;
    raw: any
  } | null> {
    const collection = await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId]);
    const humanCollection = collection.toHuman(), collectionData = {
      id: collectionId, name: null, description: null, tokensCount: 0, admins: [],
      raw: humanCollection,
    } as any, jsonCollection = collection.toJSON();
    if (humanCollection === null) return null;
    collectionData.raw.limits = jsonCollection.limits;
    collectionData.raw.permissions = jsonCollection.permissions;
    collectionData.normalizedOwner = this.helper.address.normalizeSubstrate(collectionData.raw.owner);
    for (const key of ['name', 'description']) {
      collectionData[key] = this.helper.util.vec2str(humanCollection[key]);
    }

    collectionData.tokensCount = (['RFT', 'NFT'].includes(humanCollection.mode)) ? await this.helper[humanCollection.mode.toLocaleLowerCase() as 'nft' | 'rft'].getLastTokenId(collectionId) : 0;
    collectionData.admins = await this.getAdmins(collectionId);

    return collectionData;
  }

  /**
   * Get the normalized addresses of the collection's administrators.
   * 
   * @param collectionId ID of collection
   * @example await getAdmins(1)
   * @returns array of administrators
   */
  async getAdmins(collectionId: number): Promise<ICrossAccountId[]> {
    const normalized = [];
    for(const admin of (await this.helper.callRpc('api.rpc.unique.adminlist', [collectionId])).toHuman()) {
      if(admin.Substrate) normalized.push({Substrate: this.helper.address.normalizeSubstrate(admin.Substrate)});
      else normalized.push(admin);
    }
    return normalized;
  }

  /**
   * Get the normalized addresses added to the collection allow-list.
   * @param collectionId ID of collection
   * @example await getAllowList(1)
   * @returns array of allow-listed addresses
   */
  async getAllowList(collectionId: number): Promise<ICrossAccountId[]> {
    const normalized = [];
    const allowListed = (await this.helper.callRpc('api.rpc.unique.allowlist', [collectionId])).toHuman();
    for (const address of allowListed) {
      if (address.Substrate) normalized.push({Substrate: this.helper.address.normalizeSubstrate(address.Substrate)});
      else normalized.push(address);
    }
    return normalized;
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
   * @param label extra label for log
   * @example await helper.collection.burn(aliceKeyring, 3);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burn(signer: TSigner, collectionId: number, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.destroyCollection', [collectionId],
      true, `Unable to burn collection for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionDestroyed', label);
  }

  /**
   * Sets the sponsor for the collection (Requires the Substrate address).
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param sponsorAddress Sponsor substrate address
   * @param label extra label for log
   * @example setSponsor(aliceKeyring, 10, "5DyN4Y92vZCjv38fg...")
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setSponsor(signer: TSigner, collectionId: number, sponsorAddress: TSubstrateAccount, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionSponsor', [collectionId, sponsorAddress],
      true, `Unable to set collection sponsor for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionSponsorSet', label);
  }

  /**
   * Confirms consent to sponsor the collection on behalf of the signer.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param label extra label for log
   * @example confirmSponsorship(aliceKeyring, 10)
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async confirmSponsorship(signer: TSigner, collectionId: number, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.confirmSponsorship', [collectionId],
      true, `Unable to confirm collection sponsorship for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'SponsorshipConfirmed', label);
  }

  /**
   * Sets the limits of the collection. At least one limit must be specified for a correct call.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param limits collection limits object
   * @param label extra label for log
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
  async setLimits(signer: TSigner, collectionId: number, limits: ICollectionLimits, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionLimits', [collectionId, limits],
      true, `Unable to set collection limits for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionLimitSet', label);
  }

  /**
   * Changes the owner of the collection to the new Substrate address.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param ownerAddress substrate address of new owner
   * @param label extra label for log
   * @example changeOwner(aliceKeyring, 10, "5DyN4Y92vZCjv38fg...")
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async changeOwner(signer: TSigner, collectionId: number, ownerAddress: TSubstrateAccount, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.changeCollectionOwner', [collectionId, ownerAddress],
      true, `Unable to change collection owner for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionOwnedChanged', label);
  }

  /**
   * Adds a collection administrator. 
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param adminAddressObj Administrator address (substrate or ethereum)
   * @param label extra label for log
   * @example addAdmin(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async addAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.addCollectionAdmin', [collectionId, adminAddressObj],
      true, `Unable to add collection admin for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionAdminAdded', label);
  }

  /**
   * Adds an address to allow list 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param addressObj address to add to the allow list
   * @param label extra label for log
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async addToAllowList(signer: TSigner, collectionId: number, addressObj: ICrossAccountId, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.addToAllowList', [collectionId, addressObj],
      true, `Unable to add address to allow list for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'AllowListAddressAdded');
  }

  /**
   * Removes a collection administrator.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param adminAddressObj Administrator address (substrate or ethereum)
   * @param label extra label for log
   * @example removeAdmin(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async removeAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.removeCollectionAdmin', [collectionId, adminAddressObj],
      true, `Unable to remove collection admin for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionAdminRemoved', label);
  }

  /**
   * Sets onchain permissions for selected collection.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions collection permissions object
   * @param label extra label for log
   * @example setPermissions(aliceKeyring, 10, {access:'AllowList', mintMode: true, nesting: {collectionAdmin: true, tokenOwner: true}});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setPermissions(signer: TSigner, collectionId: number, permissions: ICollectionPermissions, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionPermissions', [collectionId, permissions],
      true, `Unable to set collection permissions for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionPermissionSet', label);
  }

  /**
   * Enables nesting for selected collection. If `restricted` set, you can nest only tokens from specified collections.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions nesting permissions object
   * @param label extra label for log
   * @example enableNesting(aliceKeyring, 10, {collectionAdmin: true, tokenOwner: true});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async enableNesting(signer: TSigner, collectionId: number, permissions: INestingPermissions, label?: string): Promise<boolean> {
    return await this.setPermissions(signer, collectionId, {nesting: permissions}, label);
  }

  /**
   * Disables nesting for selected collection.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param label extra label for log
   * @example disableNesting(aliceKeyring, 10);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async disableNesting(signer: TSigner, collectionId: number, label?: string): Promise<boolean> {
    return await this.setPermissions(signer, collectionId, {nesting: {tokenOwner: false, collectionAdmin: false}}, label);
  }

  /**
   * Sets onchain properties to the collection.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param properties array of property objects
   * @param label extra label for log
   * @example setProperties(aliceKeyring, 10, [{key: "gender", value: "male"}]);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setProperties(signer: TSigner, collectionId: number, properties: IProperty[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionProperties', [collectionId, properties],
      true, `Unable to set collection properties for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPropertySet', label);
  }

  /**
   * Deletes onchain properties from the collection.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param propertyKeys array of property keys to delete
   * @param label
   * @example deleteProperties(aliceKeyring, 10, ["gender", "age"]);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async deleteProperties(signer: TSigner, collectionId: number, propertyKeys: string[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteCollectionProperties', [collectionId, propertyKeys],
      true, `Unable to delete collection properties for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPropertyDeleted', label);
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
  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount=1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transfer', [addressObj, collectionId, tokenId, amount],
      true, `Unable to transfer token #${tokenId} from collection #${collectionId}`,
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
  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transferFrom', [fromAddressObj, toAddressObj, collectionId, tokenId, amount],
      true, `Unable to transfer token #${tokenId} from collection #${collectionId}`,
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
   * @param label 
   * @param amount amount of tokens to be burned. For NFT must be set to 1n
   * @example burnToken(aliceKeyring, 10, 5);
   * @returns ```true``` and burnt token number is extrinsic success. Otherwise ```false``` and ```null```
   */
  async burnToken(signer: TSigner, collectionId: number, tokenId: number, label?: string, amount=1n): Promise<{
    success: boolean,
    token: number | null
  }> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnItem', [collectionId, tokenId, amount],
      true, `Unable to burn token for ${label}`,
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult, label);
    if (burnedTokens.tokens.length > 1) throw Error('Burned multiple tokens');
    return {success: burnedTokens.success, token: burnedTokens.tokens.length > 0 ? burnedTokens.tokens[0] : null};
  }

  /**
   * Destroys a concrete instance of NFT on behalf of the owner
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param fromAddressObj address on behalf of which the token will be burnt
   * @param tokenId ID of token
   * @param label 
   * @param amount amount of tokens to be burned. For NFT must be set to 1n
   * @example burnTokenFrom(aliceKeyring, 10, {Substrate: "5DyN4Y92vZCjv38fg..."}, 5, {Ethereum: "0x9F0583DbB85..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async burnTokenFrom(signer: TSigner, collectionId: number, fromAddressObj: ICrossAccountId, tokenId: number, label?: string, amount=1n): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnFrom', [collectionId, fromAddressObj, tokenId, amount],
      true, `Unable to burn token from for ${label}`,
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult, label);
    return burnedTokens.success && burnedTokens.tokens.length > 0;
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj 
   * @param label 
   * @param amount amount of token to be approved. For NFT must be set to 1n
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string, amount=1n) {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const approveResult = await this.helper.executeExtrinsic(
      signer, 
      'api.tx.unique.approve', [toAddressObj, collectionId, tokenId, amount],
      true, `Unable to approve token for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(approveResult.result.events, collectionId, 'common', 'Approved', label);
  }

  /**
   * Get the amount of token pieces approved to transfer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAccountObj 
   * @param fromAccountObj
   * @example getTokenApprovedPieces(10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."}, {Substrate: "5ERZNF88Mm7UGfPP3mdG..."})
   * @returns number of approved to transfer pieces
   */
  async getTokenApprovedPieces(collectionId: number, tokenId: number, toAccountObj: ICrossAccountId, fromAccountObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.allowance', [collectionId, fromAccountObj, toAccountObj, tokenId])).toBigInt();
  }

  /**
   * Get the last created token id
   * @param collectionId ID of collection
   * @example getLastTokenId(10);
   * @returns id of the last created token
   */
  async getLastTokenId(collectionId: number): Promise<number> {
    return (await this.helper.callRpc('api.rpc.unique.lastTokenId', [collectionId])).toNumber();
  }

  /**
   * Check if token exists
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example isTokenExists(10, 20);
   * @returns true if the token exists, otherwise false
   */
  async isTokenExists(collectionId: number, tokenId: number): Promise<boolean> {
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
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt 
   * @param propertyKeys
   * @example getToken(10, 5);
   * @returns human readable token data 
   */
  async getToken(collectionId: number, tokenId: number, blockHashAt?: string, propertyKeys?: string[]): Promise<{
    properties: IProperty[];
    owner: ICrossAccountId;
    normalizedOwner: ICrossAccountId;
  }| null> {
    let tokenData;
    if(typeof blockHashAt === 'undefined') {
      tokenData = await this.helper.callRpc('api.rpc.unique.tokenData', [collectionId, tokenId]);
    }
    else {
      if(typeof propertyKeys === 'undefined') {
        const collection = (await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId])).toHuman();
        if(!collection) return null;
        propertyKeys = collection.tokenPropertyPermissions.map((x: ITokenPropertyPermission) => x.key);
      }
      tokenData = await this.helper.callRpc('api.rpc.unique.tokenData', [collectionId, tokenId, propertyKeys, blockHashAt]);
    }
    tokenData = tokenData.toHuman();
    if (tokenData === null || tokenData.owner === null) return null;
    const owner = {} as any;
    for (const key of Object.keys(tokenData.owner)) {
      owner[key.toLocaleLowerCase()] = key.toLocaleLowerCase() === 'substrate' ? this.helper.address.normalizeSubstrate(tokenData.owner[key]) : tokenData.owner[key];
    }
    tokenData.normalizedOwner = crossAccountIdFromLower(owner);
    return tokenData;
  }

  /**
   * Set permissions to change token properties
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param permissions permissions to change a property by the collection owner or admin
   * @param label 
   * @example setTokenPropertyPermissions(
   *   aliceKeyring, 10, [{key: "gender", permission: {tokenOwner: true, mutable: true, collectionAdmin: true}}]
   * )
   * @returns true if extrinsic success otherwise false
   */
  async setTokenPropertyPermissions(signer: TSigner, collectionId: number, permissions: ITokenPropertyPermission[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenPropertyPermissions', [collectionId, permissions],
      true, `Unable to set token property permissions for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'PropertyPermissionSet', label);
  }

  /**
   * Set token properties
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param properties 
   * @param label 
   * @example setTokenProperties(aliceKeyring, 10, 5, [{key: "gender", value: "female"}, {key: "age", value: "23"}])
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async setTokenProperties(signer: TSigner, collectionId: number, tokenId: number, properties: IProperty[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `token #${tokenId} from collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenProperties', [collectionId, tokenId, properties],
      true, `Unable to set token properties for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertySet', label);
  }

  /**
   * Delete the provided properties of a token
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param propertyKeys property keys to be deleted 
   * @param label 
   * @example deleteTokenProperties(aliceKeyring, 10, 5, ["gender", "age"])
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async deleteTokenProperties(signer: TSigner, collectionId: number, tokenId: number, propertyKeys: string[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `token #${tokenId} from collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteTokenProperties', [collectionId, tokenId, propertyKeys],
      true, `Unable to delete token properties for ${label}`,
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertyDeleted', label);
  }

  /**
   * Mint new collection
   * @param signer keyring of signer
   * @param collectionOptions basic collection options and properties 
   * @param mode NFT or RFT type of a collection
   * @param errorLabel 
   * @example mintCollection(aliceKeyring, {name: 'New', description: "New collection", tokenPrefix: "NEW"}, "NFT")
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, mode: 'NFT' | 'RFT', errorLabel = 'Unable to mint collection'): Promise<UniqueCollectionBase> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    collectionOptions.mode = (mode === 'NFT') ? {nft: null} : {refungible: null};
    for (const key of ['name', 'description', 'tokenPrefix']) {
      if (typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true, errorLabel,
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult, errorLabel));
  }

  getCollectionObject(_collectionId: number): any {
    return null;
  }

  getTokenObject(_collectionId: number, _tokenId: number): any {
    return null;
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
  getTokenObject(collectionId: number, tokenId: number): UniqueNFTToken {
    return new UniqueNFTToken(tokenId, this.getCollectionObject(collectionId));
  }

  /**
   * Get token's owner
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt 
   * @example getTokenOwner(10, 5);
   * @returns Address in CrossAccountId format, e.g. {Substrate: "5DnSF6RRjwteE3BrCj..."}
   */
  async getTokenOwner(collectionId: number, tokenId: number, blockHashAt?: string): Promise<ICrossAccountId> {
    let owner;
    if (typeof blockHashAt === 'undefined') {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId]);
    } else {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId, blockHashAt]);
    }
    return crossAccountIdFromLower(owner.toJSON());
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
   * Recursively find the address that owns the token
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt 
   * @example getTokenTopmostOwner(10, 5);
   * @returns address in CrossAccountId format, e.g. {Substrate: "5DyN4Y92vZCjv38fg..."}
   */
  async getTokenTopmostOwner(collectionId: number, tokenId: number, blockHashAt?: string): Promise<ICrossAccountId | null> {
    let owner;
    if (typeof blockHashAt === 'undefined') {
      owner = await this.helper.callRpc('api.rpc.unique.topmostTokenOwner', [collectionId, tokenId]);
    } else {
      owner = await this.helper.callRpc('api.rpc.unique.topmostTokenOwner', [collectionId, tokenId, blockHashAt]);
    }

    if (owner === null) return null;

    owner = owner.toHuman();

    return owner.Substrate ? {Substrate: this.helper.address.normalizeSubstrate(owner.Substrate)} : owner;
  }

  /**
   * Get tokens nested in the provided token
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param blockHashAt 
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

    return children.toJSON().map((x: any) => {
      return {collectionId: x.collection, tokenId: x.token};
    });
  }

  /**
   * Nest one token into another
   * @param signer keyring of signer
   * @param tokenObj token to be nested
   * @param rootTokenObj token to be parent
   * @param label 
   * @example nestToken(aliceKeyring, {collectionId: 10, tokenId: 5}, {collectionId: 10, tokenId: 4});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async nestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken, label='nest token'): Promise<boolean> {
    const rootTokenAddress = {Ethereum: this.helper.util.getNestingTokenAddress(rootTokenObj.collectionId, rootTokenObj.tokenId)};
    const result = await this.transferToken(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress);
    if(!result) {
      throw Error(`Unable to nest token for ${label}`);
    }
    return result;
  }

  /**
   * Remove token from nested state
   * @param signer keyring of signer
   * @param tokenObj token to unnest
   * @param rootTokenObj parent of a token
   * @param toAddressObj address of a new token owner 
   * @param label 
   * @example unnestToken(aliceKeyring, {collectionId: 10, tokenId: 5}, {collectionId: 10, tokenId: 4}, {Substrate: "5DyN4Y92vZCjv38fg..."});
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async unnestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken, toAddressObj: ICrossAccountId, label='unnest token'): Promise<boolean> {
    const rootTokenAddress = {Ethereum: this.helper.util.getNestingTokenAddress(rootTokenObj.collectionId, rootTokenObj.tokenId)};
    const result = await this.transferTokenFrom(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress, toAddressObj);
    if(!result) {
      throw Error(`Unable to unnest token for ${label}`);
    }
    return result;
  }

  /**
   * Mint new collection
   * @param signer keyring of signer
   * @param collectionOptions Collection options
   * @param label 
   * @example 
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * })
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, label = 'new collection'): Promise<UniqueNFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'NFT', `Unable to mint NFT collection for ${label}`) as UniqueNFTCollection;
  }

  /**
   * Mint new token
   * @param signer keyring of signer
   * @param data token data
   * @param label 
   * @returns created token object
   */
  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; properties?: IProperty[]; }, label?: string): Promise<UniqueNFTToken> {
    if(typeof label === 'undefined') label = `collection #${data.collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        nft: {
          properties: data.properties,
        },
      }],
      true, `Unable to mint NFT token for ${label}`,
    );
    const createdTokens = this.helper.util.extractTokensFromCreationResult(creationResult, label);
    if (createdTokens.tokens.length > 1) throw Error('Minted multiple tokens');
    if (createdTokens.tokens.length < 1) throw Error('No tokens minted');
    return this.getTokenObject(data.collectionId, createdTokens.tokens[0].tokenId);
  }

  /**
   * Mint multiple NFT tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokens array of tokens with owner and properties
   * @param label 
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
  async mintMultipleTokens(signer: TSigner, collectionId: number, tokens: {owner: ICrossAccountId, properties?: IProperty[]}[], label?: string): Promise<UniqueNFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}],
      true, `Unable to mint NFT tokens for ${label}`,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Mint multiple NFT tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with owner and properties
   * @param label 
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
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {properties?: IProperty[]}[], label?: string): Promise<UniqueNFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const rawTokens = [];
    for (const token of tokens) {
      const raw = {NFT: {properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint NFT tokens for ${label}`,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Destroys a concrete instance of NFT.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param label 
   * @example burnToken(aliceKeyring, 10, 5);
   * @returns ```true``` and burnt token number is extrinsic success. Otherwise ```false``` and ```null```
   */
  async burnToken(signer: IKeyringPair, collectionId: number, tokenId: number, label?: string): Promise<{ success: boolean; token: number | null; }> {
    return await super.burnToken(signer, collectionId, tokenId, label, 1n);
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the NFT.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj address to approve
   * @param label 
   * @example approveToken(aliceKeyring, 10, 5, {Substrate: "5DyN4Y92vZCjv38fg..."})
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, label, 1n);
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
  getTokenObject(collectionId: number, tokenId: number): UniqueRFTToken {
    return new UniqueRFTToken(tokenId, this.getCollectionObject(collectionId));
  }

  /**
   * Get top 10 token owners with the largest number of pieces 
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @example getTokenTop10Owners(10, 5);
   * @returns array of top 10 owners
   */
  async getTokenTop10Owners(collectionId: number, tokenId: number): Promise<ICrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, tokenId])).toJSON().map(crossAccountIdFromLower);
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
  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount=100n): Promise<boolean> {
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
  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=100n): Promise<boolean> {
    return await super.transferTokenFrom(signer, collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  /**
   * Mint new collection
   * @param signer keyring of signer
   * @param collectionOptions Collection options
   * @param label 
   * @example
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * })
   * @returns object of the created collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, label = 'new collection'): Promise<UniqueRFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'RFT', `Unable to mint RFT collection for ${label}`) as UniqueRFTCollection;
  }

  /**
   * Mint new token
   * @param signer keyring of signer
   * @param data token data
   * @param label 
   * @example mintToken(aliceKeyring, {collectionId: 10, owner: {Substrate: '5GHoZe9c73RYbVzq...'}, pieces: 10000n});
   * @returns created token object
   */
  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; pieces: bigint; properties?: IProperty[]; }, label?: string): Promise<UniqueRFTToken> {
    if(typeof label === 'undefined') label = `collection #${data.collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        refungible: {
          pieces: data.pieces,
          properties: data.properties,
        },
      }],
      true, `Unable to mint RFT token for ${label}`,
    );
    const createdTokens = this.helper.util.extractTokensFromCreationResult(creationResult, label);
    if (createdTokens.tokens.length > 1) throw Error('Minted multiple tokens');
    if (createdTokens.tokens.length < 1) throw Error('No tokens minted');
    return this.getTokenObject(data.collectionId, createdTokens.tokens[0].tokenId);
  }

  async mintMultipleTokens(signer: TSigner, collectionId: number, tokens: {owner: ICrossAccountId, pieces: bigint, properties?: IProperty[]}[], label?: string): Promise<UniqueRFTToken[]> {
    throw Error('Not implemented');
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItemsEx', [collectionId, {RefungibleMultipleOwners: tokens}],
      true, `Unable to mint RFT tokens for ${label}`,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Mint multiple RFT tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with properties and pieces
   * @param label 
   * @example mintMultipleTokensWithOneOwner(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, [{pieces: 100000n, properties: [{key: "gender", value: "male"}]}]);
   * @returns array of newly created RFT tokens
   */
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {pieces: bigint, properties?: IProperty[]}[], label?: string): Promise<UniqueRFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const rawTokens = [];
    for (const token of tokens) {
      const raw = {ReFungible: {pieces: token.pieces, properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint RFT tokens for ${label}`,
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  /**
   * Destroys a concrete instance of RFT.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param label 
   * @param amount number of pieces to be burnt
   * @example burnToken(aliceKeyring, 10, 5);
   * @returns ```true``` and burnt token number is extrinsic success. Otherwise ```false``` and ```null```
   */
  async burnToken(signer: IKeyringPair, collectionId: number, tokenId: number, label?: string, amount=100n): Promise<{ success: boolean; token: number | null; }> {
    return await super.burnToken(signer, collectionId, tokenId, label, amount);
  }

  /**
   * Set, change, or remove approved address to transfer the ownership of the RFT.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param tokenId ID of token
   * @param toAddressObj address to approve
   * @param label 
   * @param amount number of pieces to be approved
   * @example approveToken(aliceKeyring, 10, 5, {Substrate: "5GHoZe9c73RYbVzq..."}, "", 10000n);
   * @returns true if the token success, otherwise false
   */
  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string, amount=100n) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, label, amount);
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
   * @param label 
   * @example repartitionToken(aliceKeyring, 10, 5, 12345n);
   * @returns true if the repartion was success, otherwise false
   */
  async repartitionToken(signer: TSigner, collectionId: number, tokenId: number, amount: bigint, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const currentAmount = await this.getTokenTotalPieces(collectionId, tokenId);
    const repartitionResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.repartition', [collectionId, tokenId, amount],
      true, `Unable to repartition RFT token for ${label}`,
    );
    if(currentAmount < amount) return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemCreated', label);
    return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemDestroyed', label);
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
   * @param errorLabel 
   * @example
   * mintCollection(aliceKeyring, {
   *   name: 'New',
   *   description: 'New collection',
   *   tokenPrefix: 'NEW',
   * }, 18)
   * @returns newly created fungible collection
   */
  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, decimalPoints = 0, errorLabel = 'Unable to mint collection'): Promise<UniqueFTCollection> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    if(collectionOptions.tokenPropertyPermissions) throw Error('Fungible collections has no tokenPropertyPermissions');
    collectionOptions.mode = {fungible: decimalPoints};
    for (const key of ['name', 'description', 'tokenPrefix']) {
      if (typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true, errorLabel,
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult, errorLabel));
  }

  /**
   * Mint tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner address owner of new tokens
   * @param amount amount of tokens to be meanted
   * @param label 
   * @example mintTokens(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq"}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async mintTokens(signer: TSigner, collectionId: number, owner: ICrossAccountId | string, amount: bigint, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [collectionId, (typeof owner === 'string') ? {Substrate: owner} : owner, {
        fungible: {
          value: amount,
        },
      }],
      true, `Unable to mint fungible tokens for ${label}`,
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated', label);
  }

  /**
   * Mint multiple Fungible tokens with one owner
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param owner tokens owner
   * @param tokens array of tokens with properties and pieces
   * @param label 
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {value: bigint}[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const rawTokens = [];
    for (const token of tokens) {
      const raw = {Fungible: {Value: token.value}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint RFT tokens for ${label}`,
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated', label);
  }

  /**
   * Get the top 10 owners with the largest balance for the Fungible collection 
   * @param collectionId ID of collection
   * @example getTop10Owners(10);
   * @returns array of ```ICrossAccountId```
   */
  async getTop10Owners(collectionId: number): Promise<ICrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, 0])).toJSON().map(crossAccountIdFromLower);
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
   * @param toAddressObj address recepient
   * @param amount amount of tokens to be sent
   * @example transfer(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async transfer(signer: TSigner, collectionId: number, toAddressObj: ICrossAccountId, amount: bigint) {
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
  async transferFrom(signer: TSigner, collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) {
    return await super.transferTokenFrom(signer, collectionId, 0, fromAddressObj, toAddressObj, amount);
  }

  /**
   * Destroy some amount of tokens
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param amount amount of tokens to be destroyed
   * @param label 
   * @example burnTokens(aliceKeyring, 10, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async burnTokens(signer: IKeyringPair, collectionId: number, amount=100n, label?: string): Promise<boolean> {
    return (await super.burnToken(signer, collectionId, 0, label, amount)).success;
  }

  /**
   * Burn some tokens on behalf of the owner.
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param fromAddressObj address on behalf of which tokens will be burnt
   * @param amount amount of tokens to be burnt
   * @param label 
   * @example burnTokensFrom(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n);
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async burnTokensFrom(signer: IKeyringPair, collectionId: number, fromAddressObj: ICrossAccountId, amount=100n, label?: string): Promise<boolean> {
    return await super.burnTokenFrom(signer, collectionId, fromAddressObj, 0, label, amount);
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
   * @param label 
   * @example approveTokens(aliceKeyring, 10, {Substrate: "5GHoZe9c73RYbVzq..."}, 1000n)
   * @returns ```true``` if extrinsic success, otherwise ```false``` 
   */
  async approveTokens(signer: IKeyringPair, collectionId: number, toAddressObj: ICrossAccountId, amount=100n, label?: string) {
    return super.approveToken(signer, collectionId, 0, toAddressObj, label, amount);
  }

  /**
   * Get amount of fungible tokens approved to transfer
   * @param collectionId ID of collection
   * @param fromAddressObj owner of tokens
   * @param toAddressObj the address approved for the transfer of tokens on behalf of the owner
   * @returns number of tokens approved for the transfer
   */
  async getApprovedTokens(collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return super.getTokenApprovedPieces(collectionId, 0, toAddressObj, fromAddressObj);
  }
}


class ChainGroup extends HelperGroup {
  /**
   * Get system properties of a chain
   * @example getChainProperties();
   * @returns ss58Format, token decimals, and token symbol
   */
  getChainProperties(): IChainProperties {
    const properties = (this.helper.api as any).registry.getChainProperties().toJSON();
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

  /**
   * Get account nonce
   * @param address substrate address
   * @example getNonce("5GrwvaEF5zXb26Fz...");
   * @returns number, account's nonce
   */
  async getNonce(address: TSubstrateAccount): Promise<number> {
    return (await (this.helper.api as any).query.system.account(address)).nonce.toNumber();
  }
}


class BalanceGroup extends HelperGroup {
  /**
   * Representation of the native token in the smallest unit
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
  async getSubstrate(address: TSubstrateAccount): Promise<bigint> {
    return (await this.helper.callRpc('api.query.system.account', [address])).data.free.toBigInt();
  }

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
   * Transfer tokens to substrate address
   * @param signer keyring of signer
   * @param address substrate address of a recepient
   * @param amount amount of tokens to be transfered
   * @example transferToSubstrate(aliceKeyring, "5GrwvaEF5zXb26Fz...", 100_000_000_000n);
   * @returns ```true``` if extrinsic success, otherwise ```false```
   */
  async transferToSubstrate(signer: TSigner, address: TSubstrateAccount, amount: bigint | string): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.balances.transfer', [address, amount], true, `Unable to transfer balance from ${this.helper.getSignerAddress(signer)} to ${address}`);

    let transfer = {from: null, to: null, amount: 0n} as any;
    result.result.events.forEach(({event: {data, method, section}}) => {
      if ((section === 'balances') && (method === 'Transfer')) {
        transfer = {
          from: this.helper.address.normalizeSubstrate(data[0]),
          to: this.helper.address.normalizeSubstrate(data[1]),
          amount: BigInt(data[2]),
        };
      }
    });
    let isSuccess = this.helper.address.normalizeSubstrate(typeof signer === 'string' ? signer : signer.address) === transfer.from;
    isSuccess = isSuccess && this.helper.address.normalizeSubstrate(address) === transfer.to;
    isSuccess = isSuccess && BigInt(amount) === transfer.amount;
    return isSuccess;
  }
}


class AddressGroup extends HelperGroup {
  /**
   * Normalizes the address to the specified ss58 format, by default ```42```.
   * @param address substrate address
   * @param ss58Format format for address conversion, by default ```42```
   * @example normalizeSubstrate("unjKJQJrRd238pkUZZvzDQrfKuM39zBSnQ5zjAGAGcdRhaJTx") // returns 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
   * @returns substrate address converted to normalized (i.e., starting with 5) or specified explicitly representation
   */
  normalizeSubstrate(address: TSubstrateAccount, ss58Format = 42): TSubstrateAccount {
    return this.helper.util.normalizeSubstrateAddress(address, ss58Format);
  }

  /**
   * Get address in the connected chain format
   * @param address substrate address
   * @example normalizeSubstrateToChainFormat("5GrwvaEF5zXb26Fz...") // returns unjKJQJrRd238pkUZZ... for Unique Network
   * @returns address in chain format
   */
  async normalizeSubstrateToChainFormat(address: TSubstrateAccount): Promise<TSubstrateAccount> {
    const info = this.helper.chain.getChainProperties();
    return encodeAddress(decodeAddress(address), info.ss58Format);
  }

  /**
   * Get substrate mirror of an ethereum address
   * @param ethAddress ethereum address
   * @param toChainFormat false for normalized account
   * @example ethToSubstrate('0x9F0583DbB855d...')
   * @returns substrate mirror of a provided ethereum address
   */
  async ethToSubstrate(ethAddress: TEthereumAccount, toChainFormat=false): Promise<TSubstrateAccount> {
    if(!toChainFormat) return evmToAddress(ethAddress);
    const info = this.helper.chain.getChainProperties();
    return evmToAddress(ethAddress, info.ss58Format);
  }

  /**
   * Get ethereum mirror of a substrate address
   * @param subAddress substrate account
   * @example substrateToEth("5DnSF6RRjwteE3BrC...")
   * @returns ethereum mirror of a provided substrate address
   */
  substrateToEth(subAddress: TSubstrateAccount): TEthereumAccount {
    return nesting.toChecksumAddress('0x' + Array.from(addressToEvm(subAddress), i => i.toString(16).padStart(2, '0')).join(''));
  }
}


export class UniqueHelper extends ChainHelperBase {
  chain: ChainGroup;
  balance: BalanceGroup;
  address: AddressGroup;
  collection: CollectionGroup;
  nft: NFTGroup;
  rft: RFTGroup;
  ft: FTGroup;

  constructor(logger?: ILogger) {
    super(logger);
    this.chain = new ChainGroup(this);
    this.balance = new BalanceGroup(this);
    this.address = new AddressGroup(this);
    this.collection = new CollectionGroup(this);
    this.nft = new NFTGroup(this);
    this.rft = new RFTGroup(this);
    this.ft = new FTGroup(this);
  }  
}


class UniqueCollectionBase {
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

  async isTokenExists(tokenId: number) {
    return await this.helper.collection.isTokenExists(this.collectionId, tokenId);
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

  async setSponsor(signer: TSigner, sponsorAddress: TSubstrateAccount, label?: string) {
    return await this.helper.collection.setSponsor(signer, this.collectionId, sponsorAddress, label);
  }

  async confirmSponsorship(signer: TSigner, label?: string) {
    return await this.helper.collection.confirmSponsorship(signer, this.collectionId, label);
  }

  async setLimits(signer: TSigner, limits: ICollectionLimits, label?: string) {
    return await this.helper.collection.setLimits(signer, this.collectionId, limits, label);
  }

  async changeOwner(signer: TSigner, ownerAddress: TSubstrateAccount, label?: string) {
    return await this.helper.collection.changeOwner(signer, this.collectionId, ownerAddress, label);
  }

  async addAdmin(signer: TSigner, adminAddressObj: ICrossAccountId, label?: string) {
    return await this.helper.collection.addAdmin(signer, this.collectionId, adminAddressObj, label);
  }

  async addToAllowList(signer: TSigner, addressObj: ICrossAccountId, label?: string) {
    return await this.helper.collection.addToAllowList(signer, this.collectionId, addressObj, label);
  }

  async removeAdmin(signer: TSigner, adminAddressObj: ICrossAccountId, label?: string) {
    return await this.helper.collection.removeAdmin(signer, this.collectionId, adminAddressObj, label);
  }

  async setProperties(signer: TSigner, properties: IProperty[], label?: string) {
    return await this.helper.collection.setProperties(signer, this.collectionId, properties, label);
  }

  async deleteProperties(signer: TSigner, propertyKeys: string[], label?: string) {
    return await this.helper.collection.deleteProperties(signer, this.collectionId, propertyKeys, label);
  }

  async getTokenNextSponsored(tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.collection.getTokenNextSponsored(this.collectionId, tokenId, addressObj);
  }

  async setPermissions(signer: TSigner, permissions: ICollectionPermissions, label?: string) {
    return await this.helper.collection.setPermissions(signer, this.collectionId, permissions, label);
  }

  async enableNesting(signer: TSigner, permissions: INestingPermissions, label?: string) {
    return await this.helper.collection.enableNesting(signer, this.collectionId, permissions, label);
  }

  async disableNesting(signer: TSigner, label?: string) {
    return await this.helper.collection.disableNesting(signer, this.collectionId, label);
  }

  async burn(signer: TSigner, label?: string) {
    return await this.helper.collection.burn(signer, this.collectionId, label);
  }
}


class UniqueNFTCollection extends UniqueCollectionBase {
  getTokenObject(tokenId: number) {
    return new UniqueNFTToken(tokenId, this);
  }

  async getTokensByAddress(addressObj: ICrossAccountId) {
    return await this.helper.nft.getTokensByAddress(this.collectionId, addressObj);
  }

  async getToken(tokenId: number, blockHashAt?: string) {
    return await this.helper.nft.getToken(this.collectionId, tokenId, blockHashAt);
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

  async transferToken(signer: TSigner, tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.nft.transferToken(signer, this.collectionId, tokenId, addressObj);
  }

  async transferTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.transferTokenFrom(signer, this.collectionId, tokenId, fromAddressObj, toAddressObj);
  }

  async approveToken(signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId, label?: string) {
    return await this.helper.nft.approveToken(signer, this.collectionId, tokenId, toAddressObj, label);
  }

  async isTokenApproved(tokenId: number, toAddressObj: ICrossAccountId) {
    return await this.helper.nft.isTokenApproved(this.collectionId, tokenId, toAddressObj);
  }

  async mintToken(signer: TSigner, owner: ICrossAccountId, properties?: IProperty[], label?: string) {
    return await this.helper.nft.mintToken(signer, {collectionId: this.collectionId, owner, properties}, label);
  }

  async mintMultipleTokens(signer: TSigner, tokens: {owner: ICrossAccountId, properties?: IProperty[]}[], label?: string) {
    return await this.helper.nft.mintMultipleTokens(signer, this.collectionId, tokens, label);
  }

  async burnToken(signer: TSigner, tokenId: number, label?: string) {
    return await this.helper.nft.burnToken(signer, this.collectionId, tokenId, label);
  }

  async setTokenProperties(signer: TSigner, tokenId: number, properties: IProperty[], label?: string) {
    return await this.helper.nft.setTokenProperties(signer, this.collectionId, tokenId, properties, label);
  }

  async deleteTokenProperties(signer: TSigner, tokenId: number, propertyKeys: string[], label?: string) {
    return await this.helper.nft.deleteTokenProperties(signer, this.collectionId, tokenId, propertyKeys, label);
  }

  async setTokenPropertyPermissions(signer: TSigner, permissions: ITokenPropertyPermission[], label?: string) {
    return await this.helper.nft.setTokenPropertyPermissions(signer, this.collectionId, permissions, label);
  }

  async nestToken(signer: TSigner, tokenId: number, toTokenObj: IToken, label?: string) {
    return await this.helper.nft.nestToken(signer, {collectionId: this.collectionId, tokenId}, toTokenObj, label);
  }

  async unnestToken(signer: TSigner, tokenId: number, fromTokenObj: IToken, toAddressObj: ICrossAccountId, label?: string) {
    return await this.helper.nft.unnestToken(signer, {collectionId: this.collectionId, tokenId}, fromTokenObj, toAddressObj, label);
  }
}


class UniqueRFTCollection extends UniqueCollectionBase {
  getTokenObject(tokenId: number) {
    return new UniqueRFTToken(tokenId, this);
  }

  async getTokensByAddress(addressObj: ICrossAccountId) {
    return await this.helper.rft.getTokensByAddress(this.collectionId, addressObj);
  }

  async getTop10TokenOwners(tokenId: number) {
    return await this.helper.rft.getTokenTop10Owners(this.collectionId, tokenId);
  }

  async getTokenBalance(tokenId: number, addressObj: ICrossAccountId) {
    return await this.helper.rft.getTokenBalance(this.collectionId, tokenId, addressObj);
  }

  async getTokenTotalPieces(tokenId: number) {
    return await this.helper.rft.getTokenTotalPieces(this.collectionId, tokenId);
  }

  async transferToken(signer: TSigner, tokenId: number, addressObj: ICrossAccountId, amount=100n) {
    return await this.helper.rft.transferToken(signer, this.collectionId, tokenId, addressObj, amount);
  }

  async transferTokenFrom(signer: TSigner, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=100n) {
    return await this.helper.rft.transferTokenFrom(signer, this.collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  async approveToken(signer: TSigner, tokenId: number, toAddressObj: ICrossAccountId, amount=100n, label?: string) {
    return await this.helper.rft.approveToken(signer, this.collectionId, tokenId, toAddressObj, label, amount);
  }

  async getTokenApprovedPieces(tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.rft.getTokenApprovedPieces(this.collectionId, tokenId, toAddressObj, fromAddressObj);
  }

  async repartitionToken(signer: TSigner, tokenId: number, amount: bigint, label?: string) {
    return await this.helper.rft.repartitionToken(signer, this.collectionId, tokenId, amount, label);
  }

  async mintToken(signer: TSigner, owner: ICrossAccountId, pieces=100n, properties?: IProperty[], label?: string) {
    return await this.helper.rft.mintToken(signer, {collectionId: this.collectionId, owner, pieces, properties}, label);
  }

  async mintMultipleTokens(signer: TSigner, tokens: {owner: ICrossAccountId, pieces: bigint, properties?: IProperty[]}[], label?: string) {
    return await this.helper.rft.mintMultipleTokens(signer, this.collectionId, tokens, label);
  }

  async burnToken(signer: TSigner, tokenId: number, amount=100n, label?: string) {
    return await this.helper.rft.burnToken(signer, this.collectionId, tokenId, label, amount);
  }

  async setTokenProperties(signer: TSigner, tokenId: number, properties: IProperty[], label?: string) {
    return await this.helper.rft.setTokenProperties(signer, this.collectionId, tokenId, properties, label);
  }

  async deleteTokenProperties(signer: TSigner, tokenId: number, propertyKeys: string[], label?: string) {
    return await this.helper.rft.deleteTokenProperties(signer, this.collectionId, tokenId, propertyKeys, label);
  }

  async setTokenPropertyPermissions(signer: TSigner, permissions: ITokenPropertyPermission[], label?: string) {
    return await this.helper.rft.setTokenPropertyPermissions(signer, this.collectionId, permissions, label);
  }
}


class UniqueFTCollection extends UniqueCollectionBase {
  async mint(signer: TSigner, owner: ICrossAccountId, amount: bigint, label?: string) {
    return await this.helper.ft.mintTokens(signer, this.collectionId, owner, amount, label);
  }

  async mintWithOneOwner(signer: TSigner, owner: ICrossAccountId, tokens: {value: bigint}[], label?: string) {
    return await this.helper.ft.mintMultipleTokensWithOneOwner(signer, this.collectionId, owner, tokens, label);
  }

  async getBalance(addressObj: ICrossAccountId) {
    return await this.helper.ft.getBalance(this.collectionId, addressObj);
  }

  async getTop10Owners() {
    return await this.helper.ft.getTop10Owners(this.collectionId);
  }

  async transfer(signer: TSigner, toAddressObj: ICrossAccountId, amount: bigint) {
    return await this.helper.ft.transfer(signer, this.collectionId, toAddressObj, amount);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) {
    return await this.helper.ft.transferFrom(signer, this.collectionId, fromAddressObj, toAddressObj, amount);
  }

  async burnTokens(signer: TSigner, amount: bigint, label?: string) {
    return await this.helper.ft.burnTokens(signer, this.collectionId, amount, label);
  }

  async burnTokensFrom(signer: TSigner, fromAddressObj: ICrossAccountId, amount: bigint, label?: string) {
    return await this.helper.ft.burnTokensFrom(signer, this.collectionId, fromAddressObj, amount, label);
  }

  async getTotalPieces() {
    return await this.helper.ft.getTotalPieces(this.collectionId);
  }

  async approveTokens(signer: TSigner, toAddressObj: ICrossAccountId, amount=100n, label?: string) {
    return await this.helper.ft.approveTokens(signer, this.collectionId, toAddressObj, amount, label);
  }

  async getApprovedTokens(fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.helper.ft.getApprovedTokens(this.collectionId, fromAddressObj, toAddressObj);
  }
}


class UniqueTokenBase implements IToken {
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

  async setProperties(signer: TSigner, properties: IProperty[], label?: string) {
    return await this.collection.setTokenProperties(signer, this.tokenId, properties, label);
  }

  async deleteProperties(signer: TSigner, propertyKeys: string[], label?: string) {
    return await this.collection.deleteTokenProperties(signer, this.tokenId, propertyKeys, label);
  }
}


class UniqueNFTToken extends UniqueTokenBase {
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

  async nest(signer: TSigner, toTokenObj: IToken, label?: string) {
    return await this.collection.nestToken(signer, this.tokenId, toTokenObj, label);
  }

  async unnest(signer: TSigner, fromTokenObj: IToken, toAddressObj: ICrossAccountId, label?: string) {
    return await this.collection.unnestToken(signer, this.tokenId, fromTokenObj, toAddressObj, label);
  }

  async transfer(signer: TSigner, addressObj: ICrossAccountId) {
    return await this.collection.transferToken(signer, this.tokenId, addressObj);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return await this.collection.transferTokenFrom(signer, this.tokenId, fromAddressObj, toAddressObj);
  }

  async approve(signer: TSigner, toAddressObj: ICrossAccountId, label?: string) {
    return await this.collection.approveToken(signer, this.tokenId, toAddressObj, label);
  }

  async isApproved(toAddressObj: ICrossAccountId) {
    return await this.collection.isTokenApproved(this.tokenId, toAddressObj);
  }

  async burn(signer: TSigner, label?: string) {
    return await this.collection.burnToken(signer, this.tokenId, label);
  }
}

class UniqueRFTToken extends UniqueTokenBase {
  collection: UniqueRFTCollection;

  constructor(tokenId: number, collection: UniqueRFTCollection) {
    super(tokenId, collection);
    this.collection = collection;
  }

  async getTop10Owners() {
    return await this.collection.getTop10TokenOwners(this.tokenId);
  }

  async getBalance(addressObj: ICrossAccountId) {
    return await this.collection.getTokenBalance(this.tokenId, addressObj);
  }

  async getTotalPieces() {
    return await this.collection.getTokenTotalPieces(this.tokenId);
  }

  async transfer(signer: TSigner, addressObj: ICrossAccountId, amount=100n) {
    return await this.collection.transferToken(signer, this.tokenId, addressObj, amount);
  }

  async transferFrom(signer: TSigner, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=100n) {
    return await this.collection.transferTokenFrom(signer, this.tokenId, fromAddressObj, toAddressObj, amount);
  }

  async approve(signer: TSigner, toAddressObj: ICrossAccountId, amount=100n, label?: string) {
    return await this.collection.approveToken(signer, this.tokenId, toAddressObj, amount, label);
  }

  async getApprovedPieces(fromAddressObj: ICrossAccountId, toAccountObj: ICrossAccountId) {
    return await this.collection.getTokenApprovedPieces(this.tokenId, fromAddressObj, toAccountObj);
  }

  async repartition(signer: TSigner, amount: bigint, label?: string) {
    return await this.collection.repartitionToken(signer, this.tokenId, amount, label);
  }

  async burn(signer: TSigner, amount=100n, label?: string) {
    return await this.collection.burnToken(signer, this.tokenId, amount, label);
  }
}