
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { ApiInterfaceEvents } from '@polkadot/api/types';
import { IKeyringPair } from '@polkadot/types/types';
import { encodeAddress, decodeAddress, keccakAsHex, evmToAddress, addressToEvm } from '@polkadot/util-crypto';


const crossAccountIdFromLower = (lowerAddress: ICrossAccountIdLower): ICrossAccountId => {
  let address = {} as ICrossAccountId;
  if(lowerAddress.substrate) address.Substrate = lowerAddress.substrate;
  if(lowerAddress.ethereum) address.Ethereum = lowerAddress.ethereum;
  return address;
}


const nesting = {
  toChecksumAddress(address: string): string {
    if (typeof address === 'undefined') return '';

    if(!/^(0x)?[0-9a-f]{40}$/i.test(address)) throw new Error(`Given address "${address}" is not a valid Ethereum address.`);

    address = address.toLowerCase().replace(/^0x/i,'');
    const addressHash = keccakAsHex(address).replace(/^0x/i,'');
    let checksumAddress = ['0x'];

    for (let i = 0; i < address.length; i++ ) {
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
    return this.toChecksumAddress(
      `0xf8238ccfff8ed887463fd5e0${collectionId.toString(16).padStart(8, '0')}${tokenId.toString(16).padStart(8, '0')}`
    );
  }
};


interface IChainEvent {
  data: any;
  method: string;
  section: string;
}

interface ITransactionResult {
    status: 'Fail' | 'Success';
    result: {
        events: {
          event: IChainEvent
        }[];
    },
    moduleError?: string;
}

interface ILogger {
  log: (msg: any, level?: string) => void;
  level: {
    ERROR: 'ERROR';
    WARNING: 'WARNING';
    INFO: 'INFO';
    [key: string]: string;
  }
}

interface IUniqueHelperLog {
  executedAt: number;
  executionTime: number;
  type: 'extrinsic' | 'rpc';
  status: 'Fail' | 'Success';
  call: string;
  params: any[];
  moduleError?: string;
  events?: any;
}

interface IApiListeners {
  connected?: (...args: any[]) => any;
  disconnected?: (...args: any[]) => any;
  error?: (...args: any[]) => any;
  ready?: (...args: any[]) => any; 
  decorated?: (...args: any[]) => any;
}

interface ICrossAccountId {
  Substrate?: TSubstrateAccount;
  Ethereum?: TEthereumAccount;
}

interface ICrossAccountIdLower {
  substrate?: TSubstrateAccount;
  ethereum?: TEthereumAccount;
}

interface ICollectionLimits {
  accountTokenOwnershipLimit?: number | null;
  sponsoredDataSize?: number | null;
  sponsoredDataRateLimit?: {blocks: number} | {sponsoringDisabled: null} | null;
  tokenLimit?: number | null;
  sponsorTransferTimeout?: number | null;
  sponsorApproveTimeout?: number | null;
  ownerCanTransfer?: boolean | null;
  ownerCanDestroy?: boolean | null;
  transfersEnabled?: boolean | null;
}

interface INestingPermissions {
  tokenOwner?: boolean;
  collectionAdmin?: boolean;
  restricted?: number[] | null;
}

interface ICollectionPermissions {
  access?: 'Normal' | 'AllowList';
  mintMode?: boolean;
  nesting?: INestingPermissions;
}

interface IProperty {
  key: string;
  value: string;
}

interface ITokenPropertyPermission {
  key: string;
  permission: {
    mutable: boolean;
    tokenOwner: boolean;
    collectionAdmin: boolean;
  }
}

interface IToken {
  collectionId: number;
  tokenId: number;
}

interface ICollectionCreationOptions {
  name: string | number[];
  description: string | number[];
  tokenPrefix: string | number[];
  mode?: {
    nft?: null;
    refungible?: null;
    fungible?: number;
  }
  permissions?: ICollectionPermissions;
  properties?: IProperty[];
  tokenPropertyPermissions?: ITokenPropertyPermission[];
  limits?: ICollectionLimits;
  pendingSponsor?: TSubstrateAccount;
}

interface IChainProperties {
  ss58Format: number;
  tokenDecimals: number[];
  tokenSymbol: string[]
}

type TSubstrateAccount = string;
type TEthereumAccount = string;
type TApiAllowedListeners = 'connected' | 'disconnected' | 'error' | 'ready' | 'decorated';
type TUniqueNetworks = 'opal' | 'quartz' | 'unique';
type TSigner = IKeyringPair; // | 'string'

class UniqueUtil {
  static transactionStatus = {
    NOT_READY: 'NotReady',
    FAIL: 'Fail',
    SUCCESS: 'Success'
  }

  static chainLogType = {
    EXTRINSIC: 'extrinsic',
    RPC: 'rpc'
  }

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
        INFO: 'INFO'
      }
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
      throw Error(`No CollectionCreated event for ${label}`)
    }

    return collectionId;
  }

  static extractTokensFromCreationResult(creationResult: ITransactionResult, label = 'new tokens') {
    if (creationResult.status !== this.transactionStatus.SUCCESS) {
      throw Error(`Unable to create tokens for ${label}`);
    }
    let success = false, tokens = [] as any;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemCreated')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toJSON()
        });
      }
    });
    return {success, tokens};
  }

  static extractTokensFromBurnResult(burnResult: ITransactionResult, label = 'burned tokens') {
    if (burnResult.status !== this.transactionStatus.SUCCESS) {
      throw Error(`Unable to burn tokens for ${label}`);
    }
    let success = false, tokens = [] as any;
    burnResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemDestroyed')) {
        tokens.push({
          collectionId: parseInt(data[0].toString(), 10),
          tokenId: parseInt(data[1].toString(), 10),
          owner: data[2].toJSON()
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
      let obj = {} as any;
      Object.keys(address).forEach(k => {
        obj[k.toLocaleLowerCase()] = address[k as 'Substrate' | 'Ethereum'];
      });
      if(obj.substrate) return {Substrate: this.normalizeSubstrateAddress(obj.substrate)};
      if(obj.ethereum) return {Ethereum: obj.ethereum.toLocaleLowerCase()};
      return address;
    }
    let transfer = {collectionId: null, tokenId: null, from: null, to: null, amount: 1} as any;
    events.forEach(({event: {data, method, section}}) => {
      if ((section === 'common') && (method === 'Transfer')) {
        let hData = (data as any).toJSON();
        transfer = {
          collectionId: hData[0],
          tokenId: hData[1],
          from: normalizeAddress(hData[2]),
          to: normalizeAddress(hData[3]),
          amount: BigInt(hData[4])
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
    const { api, network } = await ChainHelperBase.createConnection(wsEndpoint, listeners, this.forcedNetwork);
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
    let spec = (await api.query.system.lastRuntimeUpgrade()).toJSON() as any;
    if(['quartz', 'unique'].indexOf(spec.specName) > -1) return spec.specName;
    return 'opal';
  }

  static async detectNetworkByWsEndpoint(wsEndpoint: string): Promise<TUniqueNetworks> {
    let api = new ApiPromise({provider: new WsProvider(wsEndpoint)});
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
        unique: require('@unique-nft/opal-testnet-types/definitions').unique.rpc
      },
      quartz: {
        unique: require('@unique-nft/quartz-mainnet-types/definitions').unique.rpc
      },
      unique: {
        unique: require('@unique-nft/unique-mainnet-types/definitions').unique.rpc
      }
    }
    if(!supportedRPC.hasOwnProperty(network)) network = await this.detectNetworkByWsEndpoint(wsEndpoint);
    const rpc = supportedRPC[network];

    // TODO: investigate how to replace rpc in runtime
    // api._rpcCore.addUserInterfaces(rpc);

    const api = new ApiPromise({provider: new WsProvider(wsEndpoint), rpc});

    await api.isReadyOrError;

    if (typeof listeners === 'undefined') listeners = {};
    for (let event of ['connected', 'disconnected', 'error', 'ready', 'decorated']) {
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

  signTransaction(sender: TSigner, transaction: any, label = 'transaction', options = null) {
    const sign = (callback: any) => {
      if(options !== null) return transaction.signAndSend(sender, options, callback);
      return transaction.signAndSend(sender, callback);
    }
    return new Promise(async (resolve, reject) => {
      try {
        let unsub = await sign((result: any) => {
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
    for(let part of apiCall.slice(4).split('.')) {
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

    let log = {
      executedAt: endTime,
      executionTime: endTime - startTime,
      type: this.chainLogType.EXTRINSIC,
      status: result.status,
      call: extrinsic,
      params
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
    let result, log = {
      type: this.chainLogType.RPC,
      call: rpc,
      params
    } as IUniqueHelperLog, error = null;

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
 * @param addressObj 
 * @returns number of blocks or null if sponsorship hasn't been set
 */
  async getTokenNextSponsored(collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<number | null> {
    return (await this.helper.callRpc('api.rpc.unique.nextSponsored', [collectionId, addressObj, tokenId])).toJSON();
  }

  /**
   * Get number of collection created on current chain.
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
    let humanCollection = collection.toHuman(), collectionData = {
      id: collectionId, name: null, description: null, tokensCount: 0, admins: [],
      raw: humanCollection
    } as any, jsonCollection = collection.toJSON();
    if (humanCollection === null) return null;
    collectionData.raw.limits = jsonCollection.limits;
    collectionData.raw.permissions = jsonCollection.permissions;
    collectionData.normalizedOwner = this.helper.address.normalizeSubstrate(collectionData.raw.owner);
    for (let key of ['name', 'description']) {
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
   * @returns array of administrators
   */
  async getAdmins(collectionId: number): Promise<ICrossAccountId[]> {
    let normalized = [];
    for(let admin of (await this.helper.callRpc('api.rpc.unique.adminlist', [collectionId])).toHuman()) {
      if(admin.Substrate) normalized.push({Substrate: this.helper.address.normalizeSubstrate(admin.Substrate)});
      else normalized.push(admin);
    }
    return normalized;
  }

  /**
   * Get the effective limits of the collection instead of null for default values
   * 
   * @param collectionId ID of collection
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
   * @returns bool true on success
   */
  async burn(signer: TSigner, collectionId: number, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.destroyCollection', [collectionId],
      true, `Unable to burn collection for ${label}`
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
   * @returns bool true on success
   */
  async setSponsor(signer: TSigner, collectionId: number, sponsorAddress: TSubstrateAccount, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionSponsor', [collectionId, sponsorAddress],
      true, `Unable to set collection sponsor for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionSponsorSet', label);
  }

  /**
   * Confirms consent to sponsor the collection on behalf of the signer.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param label extra label for log
   * @returns bool true on success
   */
  async confirmSponsorship(signer: TSigner, collectionId: number, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.confirmSponsorship', [collectionId],
      true, `Unable to confirm collection sponsorship for ${label}`
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
   * @returns bool true on success
   */
  async setLimits(signer: TSigner, collectionId: number, limits: ICollectionLimits, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionLimits', [collectionId, limits],
      true, `Unable to set collection limits for ${label}`
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
   * @returns bool true on success
   */
  async changeOwner(signer: TSigner, collectionId: number, ownerAddress: TSubstrateAccount, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.changeCollectionOwner', [collectionId, ownerAddress],
      true, `Unable to change collection owner for ${label}`
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
   * @returns bool true on success
   */
  async addAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.addCollectionAdmin', [collectionId, adminAddressObj],
      true, `Unable to add collection admin for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'unique', 'CollectionAdminAdded', label);
  }

  /**
   * Removes a collection administrator.
   * 
   * @param signer keyring of signer
   * @param collectionId ID of collection
   * @param adminAddressObj Administrator address (substrate or ethereum)
   * @param label extra label for log
   * @returns bool true on success
   */
  async removeAdmin(signer: TSigner, collectionId: number, adminAddressObj: ICrossAccountId, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.removeCollectionAdmin', [collectionId, adminAddressObj],
      true, `Unable to remove collection admin for ${label}`
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
   * @returns bool true on success
   */
  async setPermissions(signer: TSigner, collectionId: number, permissions: ICollectionPermissions, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionPermissions', [collectionId, permissions],
      true, `Unable to set collection permissions for ${label}`
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
   * @returns bool true on success
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
   * @returns bool true on success
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
   * @returns bool true on success
   */
  async setProperties(signer: TSigner, collectionId: number, properties: IProperty[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setCollectionProperties', [collectionId, properties],
      true, `Unable to set collection properties for ${label}`
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
   * @returns 
   */
  async deleteProperties(signer: TSigner, collectionId: number, propertyKeys: string[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteCollectionProperties', [collectionId, propertyKeys],
      true, `Unable to delete collection properties for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'CollectionPropertyDeleted', label);
  }

  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount=1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transfer', [addressObj, collectionId, tokenId, amount],
      true, `Unable to transfer token #${tokenId} from collection #${collectionId}`
    );

    return this.helper.util.isTokenTransferSuccess(result.result.events, collectionId, tokenId, {Substrate: typeof signer === 'string' ? signer : signer.address}, addressObj, amount);
  }

  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=1n): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.transferFrom', [fromAddressObj, toAddressObj, collectionId, tokenId, amount],
      true, `Unable to transfer token #${tokenId} from collection #${collectionId}`
    );
    return this.helper.util.isTokenTransferSuccess(result.result.events, collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  async burnToken(signer: TSigner, collectionId: number, tokenId: number, label?: string, amount=1n): Promise<{
    success: boolean,
    token: number | null
  }> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnItem', [collectionId, tokenId, amount],
      true, `Unable to burn token for ${label}`
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult, label);
    if (burnedTokens.tokens.length > 1) throw Error('Burned multiple tokens');
    return {success: burnedTokens.success, token: burnedTokens.tokens.length > 0 ? burnedTokens.tokens[0] : null};
  }

  async burnTokenFrom(signer: TSigner, collectionId: number, fromAddressObj: ICrossAccountId, tokenId: number, label?: string, amount=1n): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const burnResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.burnFrom', [collectionId, fromAddressObj, tokenId, amount],
      true, `Unable to burn token from for ${label}`
    );
    const burnedTokens = this.helper.util.extractTokensFromBurnResult(burnResult, label);
    return burnedTokens.success && burnedTokens.tokens.length > 0;
  }

  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string, amount=1n) {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const approveResult = await this.helper.executeExtrinsic(
      signer, 
      'api.tx.unique.approve', [toAddressObj, collectionId, tokenId, amount],
      true, `Unable to approve token for ${label}`
    );

    return this.helper.util.findCollectionInEvents(approveResult.result.events, collectionId, 'common', 'Approved', label);
  }

  async getTokenApprovedPieces(collectionId: number, tokenId: number, toAccountObj: ICrossAccountId, fromAccountObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.allowance', [collectionId, fromAccountObj, toAccountObj, tokenId])).toBigInt();
  }

  async getLastTokenId(collectionId: number): Promise<number> {
    return (await this.helper.callRpc('api.rpc.unique.lastTokenId', [collectionId])).toNumber();
  }

  async isTokenExists(collectionId: number, tokenId: number): Promise<boolean> {
    return (await this.helper.callRpc('api.rpc.unique.tokenExists', [collectionId, tokenId])).toJSON()
  }
}

class NFTnRFT extends CollectionGroup {
  async getTokensByAddress(collectionId: number, addressObj: ICrossAccountId): Promise<number[]> {
    return (await this.helper.callRpc('api.rpc.unique.accountTokens', [collectionId, addressObj])).toJSON()
  }

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
        let collection = (await this.helper.callRpc('api.rpc.unique.collectionById', [collectionId])).toHuman();
        if(!collection) return null;
        propertyKeys = collection.tokenPropertyPermissions.map((x: ITokenPropertyPermission) => x.key);
      }
      tokenData = await this.helper.callRpc('api.rpc.unique.tokenData', [collectionId, tokenId, propertyKeys, blockHashAt]);
    }
    tokenData = tokenData.toHuman();
    if (tokenData === null || tokenData.owner === null) return null;
    let owner = {} as any;
    for (let key of Object.keys(tokenData.owner)) {
      owner[key.toLocaleLowerCase()] = key.toLocaleLowerCase() === 'substrate' ? this.helper.address.normalizeSubstrate(tokenData.owner[key]) : tokenData.owner[key];
    }
    tokenData.normalizedOwner = crossAccountIdFromLower(owner);
    return tokenData;
  }

  async setTokenPropertyPermissions(signer: TSigner, collectionId: number, permissions: ITokenPropertyPermission[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenPropertyPermissions', [collectionId, permissions],
      true, `Unable to set token property permissions for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'PropertyPermissionSet', label);
  }

  async setTokenProperties(signer: TSigner, collectionId: number, tokenId: number, properties: IProperty[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `token #${tokenId} from collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.setTokenProperties', [collectionId, tokenId, properties],
      true, `Unable to set token properties for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertySet', label);
  }

  async deleteTokenProperties(signer: TSigner, collectionId: number, tokenId: number, propertyKeys: string[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `token #${tokenId} from collection #${collectionId}`;
    const result = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.deleteTokenProperties', [collectionId, tokenId, propertyKeys],
      true, `Unable to delete token properties for ${label}`
    );

    return this.helper.util.findCollectionInEvents(result.result.events, collectionId, 'common', 'TokenPropertyDeleted', label);
  }

  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, mode: 'NFT' | 'RFT', errorLabel = 'Unable to mint collection'): Promise<UniqueCollectionBase> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    collectionOptions.mode = (mode === 'NFT') ? {nft: null} : {refungible: null};
    for (let key of ['name', 'description', 'tokenPrefix']) {
      if (typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true, errorLabel
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult, errorLabel));
  }

  getCollectionObject(collectionId: number): any {
    return null;
  }

  getTokenObject(collectionId: number, tokenId: number): any {
    return null;
  }
}


class NFTGroup extends NFTnRFT {
  getCollectionObject(collectionId: number): UniqueNFTCollection {
    return new UniqueNFTCollection(collectionId, this.helper);
  }

  getTokenObject(collectionId: number, tokenId: number): UniqueNFTToken {
    return new UniqueNFTToken(tokenId, this.getCollectionObject(collectionId));
  }

  async getTokenOwner(collectionId: number, tokenId: number, blockHashAt?: string): Promise<ICrossAccountId> {
    let owner;
    if (typeof blockHashAt === 'undefined') {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId]);
    } else {
      owner = await this.helper.callRpc('api.rpc.unique.tokenOwner', [collectionId, tokenId, blockHashAt]);
    }
    return crossAccountIdFromLower(owner.toJSON());
  }

  async isTokenApproved(collectionId: number, tokenId: number, toAccountObj: ICrossAccountId): Promise<boolean> {
    return (await this.getTokenApprovedPieces(collectionId, tokenId, toAccountObj, await this.getTokenOwner(collectionId, tokenId))) === 1n;
  }

  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<boolean> {
    return await super.transferToken(signer, collectionId, tokenId, addressObj, 1n);
  }

  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId): Promise<boolean> {
    return await super.transferTokenFrom(signer, collectionId, tokenId, fromAddressObj, toAddressObj, 1n);
  }

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

  async nestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken, label='nest token'): Promise<boolean> {
    const rootTokenAddress = {Ethereum: this.helper.util.getNestingTokenAddress(rootTokenObj.collectionId, rootTokenObj.tokenId)};
    const result = await this.transferToken(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress);
    if(!result) {
      throw Error(`Unable to nest token for ${label}`);
    }
    return result;
  }

  async unnestToken(signer: TSigner, tokenObj: IToken, rootTokenObj: IToken, toAddressObj: ICrossAccountId, label='unnest token'): Promise<boolean> {
    const rootTokenAddress = {Ethereum: this.helper.util.getNestingTokenAddress(rootTokenObj.collectionId, rootTokenObj.tokenId)};
    const result = await this.transferTokenFrom(signer, tokenObj.collectionId, tokenObj.tokenId, rootTokenAddress, toAddressObj);
    if(!result) {
      throw Error(`Unable to unnest token for ${label}`);
    }
    return result;
  }

  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, label = 'new collection'): Promise<UniqueNFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'NFT', `Unable to mint NFT collection for ${label}`) as UniqueNFTCollection;
  }

  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; properties?: IProperty[]; }, label?: string): Promise<UniqueNFTToken> {
    if(typeof label === 'undefined') label = `collection #${data.collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        nft: {
          properties: data.properties
        }
      }],
      true, `Unable to mint NFT token for ${label}`
    );
    const createdTokens = this.helper.util.extractTokensFromCreationResult(creationResult, label);
    if (createdTokens.tokens.length > 1) throw Error('Minted multiple tokens');
    if (createdTokens.tokens.length < 1) throw Error('No tokens minted');
    return this.getTokenObject(data.collectionId, createdTokens.tokens[0].tokenId);
  }

  async mintMultipleTokens(signer: TSigner, collectionId: number, tokens: {owner: ICrossAccountId, properties?: IProperty[]}[], label?: string): Promise<UniqueNFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItemsEx', [collectionId, {NFT: tokens}],
      true, `Unable to mint NFT tokens for ${label}`
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {properties?: IProperty[]}[], label?: string): Promise<UniqueNFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    let rawTokens = [];
    for (let token of tokens) {
      let raw = {NFT: {properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint NFT tokens for ${label}`
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  async burnToken(signer: IKeyringPair, collectionId: number, tokenId: number, label?: string): Promise<{ success: boolean; token: number | null; }> {
    return await super.burnToken(signer, collectionId, tokenId, label, 1n);
  }

  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, label, 1n);
  }
}


class RFTGroup extends NFTnRFT {
  getCollectionObject(collectionId: number): UniqueRFTCollection {
    return new UniqueRFTCollection(collectionId, this.helper);
  }

  getTokenObject(collectionId: number, tokenId: number): UniqueRFTToken {
    return new UniqueRFTToken(tokenId, this.getCollectionObject(collectionId));
  }

  async getTokenTop10Owners(collectionId: number, tokenId: number): Promise<ICrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, tokenId])).toJSON().map(crossAccountIdFromLower);
  }

  async getTokenBalance(collectionId: number, tokenId: number, addressObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.balance', [collectionId, addressObj, tokenId])).toBigInt();
  }

  async transferToken(signer: TSigner, collectionId: number, tokenId: number, addressObj: ICrossAccountId, amount=100n): Promise<boolean> {
    return await super.transferToken(signer, collectionId, tokenId, addressObj, amount);
  }

  async transferTokenFrom(signer: TSigner, collectionId: number, tokenId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount=100n): Promise<boolean> {
    return await super.transferTokenFrom(signer, collectionId, tokenId, fromAddressObj, toAddressObj, amount);
  }

  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, label = 'new collection'): Promise<UniqueRFTCollection> {
    return await super.mintCollection(signer, collectionOptions, 'RFT', `Unable to mint RFT collection for ${label}`) as UniqueRFTCollection;
  }

  async mintToken(signer: TSigner, data: { collectionId: number; owner: ICrossAccountId | string; pieces: bigint; properties?: IProperty[]; }, label?: string): Promise<UniqueRFTToken> {
    if(typeof label === 'undefined') label = `collection #${data.collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [data.collectionId, (typeof data.owner === 'string') ? {Substrate: data.owner} : data.owner, {
        refungible: {
          pieces: data.pieces,
          properties: data.properties
        }
      }],
      true, `Unable to mint RFT token for ${label}`
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
      true, `Unable to mint RFT tokens for ${label}`
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {pieces: bigint, properties?: IProperty[]}[], label?: string): Promise<UniqueRFTToken[]> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    let rawTokens = [];
    for (let token of tokens) {
      let raw = {ReFungible: {pieces: token.pieces, properties: token.properties}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint RFT tokens for ${label}`
    );
    const collection = this.getCollectionObject(collectionId);
    return this.helper.util.extractTokensFromCreationResult(creationResult, label).tokens.map((x: IToken) => collection.getTokenObject(x.tokenId));
  }

  async burnToken(signer: IKeyringPair, collectionId: number, tokenId: number, label?: string, amount=100n): Promise<{ success: boolean; token: number | null; }> {
    return await super.burnToken(signer, collectionId, tokenId, label, amount);
  }

  async approveToken(signer: IKeyringPair, collectionId: number, tokenId: number, toAddressObj: ICrossAccountId, label?: string, amount=100n) {
    return super.approveToken(signer, collectionId, tokenId, toAddressObj, label, amount);
  }

  async getTokenTotalPieces(collectionId: number, tokenId: number): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.totalPieces', [collectionId, tokenId])).unwrap().toBigInt();
  }

  async repartitionToken(signer: TSigner, collectionId: number, tokenId: number, amount: bigint, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const currentAmount = await this.getTokenTotalPieces(collectionId, tokenId);
    const repartitionResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.repartition', [collectionId, tokenId, amount],
      true, `Unable to repartition RFT token for ${label}`
    );
    if(currentAmount < amount) return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemCreated', label);
    return this.helper.util.findCollectionInEvents(repartitionResult.result.events, collectionId, 'common', 'ItemDestroyed', label);
  }
}


class FTGroup extends CollectionGroup {
  getCollectionObject(collectionId: number): UniqueFTCollection {
    return new UniqueFTCollection(collectionId, this.helper);
  }

  async mintCollection(signer: TSigner, collectionOptions: ICollectionCreationOptions, decimalPoints: number = 0, errorLabel = 'Unable to mint collection'): Promise<UniqueFTCollection> {
    collectionOptions = JSON.parse(JSON.stringify(collectionOptions)) as ICollectionCreationOptions; // Clone object
    if(collectionOptions.tokenPropertyPermissions) throw Error('Fungible collections has no tokenPropertyPermissions');
    collectionOptions.mode = {fungible: decimalPoints};
    for (let key of ['name', 'description', 'tokenPrefix']) {
      if (typeof collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] === 'string') collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] = this.helper.util.str2vec(collectionOptions[key as 'name' | 'description' | 'tokenPrefix'] as string);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createCollectionEx', [collectionOptions],
      true, errorLabel
    );
    return this.getCollectionObject(this.helper.util.extractCollectionIdFromCreationResult(creationResult, errorLabel));
  }

  async mintTokens(signer: TSigner, collectionId: number, owner: ICrossAccountId | string, amount: bigint, label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createItem', [collectionId, (typeof owner === 'string') ? {Substrate: owner} : owner, {
        fungible: {
          value: amount
        }
      }],
      true, `Unable to mint fungible tokens for ${label}`
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated', label);
  }

  async mintMultipleTokensWithOneOwner(signer: TSigner, collectionId: number, owner: ICrossAccountId, tokens: {value: bigint}[], label?: string): Promise<boolean> {
    if(typeof label === 'undefined') label = `collection #${collectionId}`;
    let rawTokens = [];
    for (let token of tokens) {
      let raw = {Fungible: {Value: token.value}};
      rawTokens.push(raw);
    }
    const creationResult = await this.helper.executeExtrinsic(
      signer,
      'api.tx.unique.createMultipleItems', [collectionId, owner, rawTokens],
      true, `Unable to mint RFT tokens for ${label}`
    );
    return this.helper.util.findCollectionInEvents(creationResult.result.events, collectionId, 'common', 'ItemCreated', label);
  }

  async getTop10Owners(collectionId: number): Promise<ICrossAccountId[]> {
    return (await this.helper.callRpc('api.rpc.unique.tokenOwners', [collectionId, 0])).toJSON().map(crossAccountIdFromLower);
  }

  async getBalance(collectionId: number, addressObj: ICrossAccountId): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.balance', [collectionId, addressObj, 0])).toBigInt();
  }

  async transfer(signer: TSigner, collectionId: number, toAddressObj: ICrossAccountId, amount: bigint) {
    return await super.transferToken(signer, collectionId, 0, toAddressObj, amount);
  }

  async transferFrom(signer: TSigner, collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId, amount: bigint) {
    return await super.transferTokenFrom(signer, collectionId, 0, fromAddressObj, toAddressObj, amount);
  }

  async burnTokens(signer: IKeyringPair, collectionId: number, amount=100n, label?: string): Promise<boolean> {
    return (await super.burnToken(signer, collectionId, 0, label, amount)).success;
  }

  async burnTokensFrom(signer: IKeyringPair, collectionId: number, fromAddressObj: ICrossAccountId, amount=100n, label?: string): Promise<boolean> {
    return await super.burnTokenFrom(signer, collectionId, fromAddressObj, 0, label, amount);
  }

  async getTotalPieces(collectionId: number): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.unique.totalPieces', [collectionId, 0])).unwrap().toBigInt();
  }

  async approveTokens(signer: IKeyringPair, collectionId: number, toAddressObj: ICrossAccountId, amount=100n, label?: string) {
    return super.approveToken(signer, collectionId, 0, toAddressObj, label, amount);
  }

  async getApprovedTokens(collectionId: number, fromAddressObj: ICrossAccountId, toAddressObj: ICrossAccountId) {
    return super.getTokenApprovedPieces(collectionId, 0, toAddressObj, fromAddressObj);
  }
}


class ChainGroup extends HelperGroup {
  getChainProperties(): IChainProperties {
    const properties = (this.helper.api as any).registry.getChainProperties().toJSON();
    return {
      ss58Format: properties.ss58Format.toJSON(),
      tokenDecimals: properties.tokenDecimals.toJSON(),
      tokenSymbol: properties.tokenSymbol.toJSON()
    };
  }

  async getLatestBlockNumber(): Promise<number> {
    return (await this.helper.callRpc('api.rpc.chain.getHeader')).number.toNumber();
  }

  async getBlockHashByNumber(blockNumber: number): Promise<string | null> {
    const blockHash = (await this.helper.callRpc('api.rpc.chain.getBlockHash', [blockNumber])).toJSON();
    if(blockHash === '0x0000000000000000000000000000000000000000000000000000000000000000') return null;
    return blockHash;
  }

  async getNonce(address: TSubstrateAccount): Promise<number> {
    return (await (this.helper.api as any).query.system.account(address)).nonce.toNumber();
  }
}


class BalanceGroup extends HelperGroup {
  getOneTokenNominal(): bigint {
    const chainProperties = this.helper.chain.getChainProperties();
    return 10n ** BigInt((chainProperties.tokenDecimals || [18])[0]);
  }

  async getSubstrate(address: TSubstrateAccount): Promise<bigint> {
    return (await this.helper.callRpc('api.query.system.account', [address])).data.free.toBigInt();
  }

  async getEthereum(address: TEthereumAccount): Promise<bigint> {
    return (await this.helper.callRpc('api.rpc.eth.getBalance', [address])).toBigInt();
  }

  async transferToSubstrate(signer: TSigner, address: TSubstrateAccount, amount: bigint | string): Promise<boolean> {
    const result = await this.helper.executeExtrinsic(signer, 'api.tx.balances.transfer', [address, amount], true, `Unable to transfer balance from ${this.helper.getSignerAddress(signer)} to ${address}`);

    let transfer = {from: null, to: null, amount: 0n} as any;
    result.result.events.forEach(({event: {data, method, section}}) => {
      if ((section === 'balances') && (method === 'Transfer')) {
        transfer = {
          from: this.helper.address.normalizeSubstrate(data[0]),
          to: this.helper.address.normalizeSubstrate(data[1]),
          amount: BigInt(data[2])
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
  normalizeSubstrate(address: TSubstrateAccount, ss58Format = 42): TSubstrateAccount {
    return this.helper.util.normalizeSubstrateAddress(address, ss58Format);
  }

  async normalizeSubstrateToChainFormat(address: TSubstrateAccount): Promise<TSubstrateAccount> {
    let info = this.helper.chain.getChainProperties();
    return encodeAddress(decodeAddress(address), info.ss58Format);
  }

  async ethToSubstrate(ethAddress: TEthereumAccount, toChainFormat=false): Promise<TSubstrateAccount> {
    if(!toChainFormat) return evmToAddress(ethAddress);
    let info = this.helper.chain.getChainProperties();
    return evmToAddress(ethAddress, info.ss58Format);
  }

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