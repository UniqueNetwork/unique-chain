import {ApiPromise} from '@polkadot/api';
import {
  RmrkTraitsNftAccountIdOrCollectionNftTuple as NftOwner,
  RmrkTraitsPropertyPropertyInfo as Property,
  RmrkTraitsResourceResourceInfo as ResourceInfo,
} from '@polkadot/types/lookup';
import type {EventRecord} from '@polkadot/types/interfaces';
import type {GenericEventData} from '@polkadot/types';
import privateKey from '../../substrate/privateKey';
import {NftIdTuple, getChildren, getOwnedNfts, getCollectionProperties, getNftProperties, getResources} from './fetch';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import {getApiConnection} from '../../substrate/substrate-api';
import {Context} from 'mocha';

chai.use(chaiAsPromised);
const expect = chai.expect;

interface TxResult<T> {
    success: boolean;
    successData: T | null;
}

export enum Pallets {
  Inflation = 'inflation',
  RmrkCore = 'rmrkcore',
  RmrkEquip = 'rmrkequip',
  ReFungible = 'refungible',
  Fungible = 'fungible',
  NFT = 'nonfungible',
  Scheduler = 'scheduler',
  AppPromotion = 'apppromotion',
}

let modulesNames: any;
export function getModuleNames(api: ApiPromise): string[] {
  if (typeof modulesNames === 'undefined')
    modulesNames = api.runtimeMetadata.asLatest.pallets.map(m => m.name.toString().toLowerCase());
  return modulesNames;
}

export async function missingRequiredPallets(requiredPallets: string[]): Promise<string[]> {
  const api = await getApiConnection();
  const pallets = getModuleNames(api);
  await api.disconnect();

  return requiredPallets.filter(p => !pallets.includes(p));
}

export async function requirePallets(mocha: Context, requiredPallets: string[]) {
  const missingPallets = await missingRequiredPallets(requiredPallets);

  if (missingPallets.length > 0) {
    const skippingTestMsg = `\tSkipping test "${mocha.test?.title}".`;
    const missingPalletsMsg = `\tThe following pallets are missing:\n\t- ${missingPallets.join('\n\t- ')}`;
    const skipMsg = `${skippingTestMsg}\n${missingPalletsMsg}`;

    console.error('\x1b[38:5:208m%s\x1b[0m', skipMsg);

    mocha.skip();
  }
}

export function makeNftOwner(api: ApiPromise, owner: string | NftIdTuple): NftOwner {
  const isNftSending = (typeof owner !== 'string');

  if (isNftSending) {
    return api.createType('RmrkTraitsNftAccountIdOrCollectionNftTuple', {
      'CollectionAndNftTuple': owner,
    });
  } else {
    const ss58Format = api.registry.getChainProperties()!.toJSON().ss58Format;
    return api.createType('RmrkTraitsNftAccountIdOrCollectionNftTuple', {
      AccountId: privateKey(owner, Number(ss58Format)).address,
    });
  }
}

export async function isNftOwnedBy(
  api: ApiPromise,
  owner: string | NftIdTuple,
  collectionId: number,
  nftId: number,
): Promise<boolean> {
  if (typeof owner === 'string') {
    return (await getOwnedNfts(api, owner, collectionId))
      .find(ownedNftId => {
        return ownedNftId === nftId;
      }) !== undefined;
  } else {
    return (await getChildren(api, owner[0], owner[1]))
      .find(child => {
        return collectionId === child.collectionId.toNumber()
                    && nftId === child.nftId.toNumber();
      }) !== undefined;
  }
}

export function isPropertyExists(
  key: string,
  value: string,
  props: Property[],
): boolean {
  let isPropFound = false;
  for (let i = 0; i < props.length && !isPropFound; i++) {
    const fetchedProp = props[i];

    isPropFound = fetchedProp.key.eq(key)
                    && fetchedProp.value.eq(value);
  }

  return isPropFound;
}

export async function isCollectionPropertyExists(
  api: ApiPromise,
  collectionId: number,
  key: string,
  value: string,
): Promise<boolean> {
  const fetchedProps = await getCollectionProperties(api, collectionId);
  return isPropertyExists(key, value, fetchedProps);
}

export async function isNftPropertyExists(
  api: ApiPromise,
  collectionId: number,
  nftId: number,
  key: string,
  value: string,
): Promise<boolean> {
  const fetchedProps = await getNftProperties(api, collectionId, nftId);
  return isPropertyExists(key, value, fetchedProps);
}

export async function isNftChildOfAnother(
  api: ApiPromise,
  collectionId: number,
  nftId: number,
  parentNft: NftIdTuple,
): Promise<boolean> {
  return (await getChildren(api, parentNft[0], parentNft[1]))
    .find((childNft) => {
      return childNft.collectionId.toNumber() === collectionId
                && childNft.nftId.toNumber() === nftId;
    }) !== undefined;
}

export function isTxResultSuccess(events: EventRecord[]): boolean {
  let success = false;

  events.forEach(({event: {data, method, section}}) => {
    if (method == 'ExtrinsicSuccess') {
      success = true;
    }
  });

  return success;
}

export async function expectTxFailure(expectedError: RegExp, promise: Promise<any>) {
  await expect(promise).to.be.rejectedWith(expectedError);
}

export function extractTxResult<T>(
  events: EventRecord[],
  expectSection: string,
  expectMethod: string,
  extractAction: (data: any) => T,
): TxResult<T> {
  let success = false;
  let successData = null;
  events.forEach(({event: {data, method, section}}) => {
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((expectSection == section) && (expectMethod == method)) {
      successData = extractAction(data);
    }
  });
  const result: TxResult<T> = {
    success,
    successData,
  };
  return result;
}

export function extractRmrkCoreTxResult<T>(
  events: EventRecord[],
  expectMethod: string,
  extractAction: (data: GenericEventData) => T,
): TxResult<T> {
  return extractTxResult(events, 'rmrkCore', expectMethod, extractAction);
}

export function extractRmrkEquipTxResult<T>(
  events: EventRecord[],
  expectMethod: string,
  extractAction: (data: GenericEventData) => T,
): TxResult<T> {
  return extractTxResult(events, 'rmrkEquip', expectMethod, extractAction);
}

export async function findResourceById(
  api: ApiPromise,
  collectionId: number,
  nftId: number,
  resourceId: number,
): Promise<ResourceInfo> {
  const resources = await getResources(api, collectionId, nftId);

  let resource = null;

  for (let i = 0; i < resources.length; i++) {
    const res = resources[i];

    if (res.id.eq(resourceId)) {
      resource = res;
      break;
    }
  }

  return resource!;
}

export async function getResourceById(
  api: ApiPromise,
  collectionId: number,
  nftId: number,
  resourceId: number,
): Promise<ResourceInfo> {
  const resource = await findResourceById(
    api,
    collectionId,
    nftId,
    resourceId,
  );

  expect(resource !== null, 'Error: resource was not found').to.be.true;

  return resource!;
}

export function checkResourceStatus(
  resource: ResourceInfo,
  expectedStatus: 'pending' | 'added',
) {
  expect(resource.pending.isTrue, `Error: added resource should be ${expectedStatus}`)
    .to.be.equal(expectedStatus === 'pending');
}
