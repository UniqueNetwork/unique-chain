// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise, WsProvider} from '@polkadot/api';
import {ApiOptions, ApiTypes, SubmittableExtrinsic} from '@polkadot/api/types';
import {ExtrinsicStatus} from '@polkadot/types/interfaces/author/types';
import {EventRecord} from '@polkadot/types/interfaces/system/types';
import {IKeyringPair} from '@polkadot/types/types';
import config from '../config';
import '../interfaces/augment-api-events';
import * as defs from '../interfaces/definitions';
import privateKey from './privateKey';
import promisifySubstrate from './promisify-substrate';

import {SilentConsole} from '../util/playgrounds/unique.dev';



function defaultApiOptions(): ApiOptions {
  const wsProvider = new WsProvider(config.substrateUrl);
  return {
    provider: wsProvider, signedExtensions: {
      ContractHelpers: {
        extrinsic: {},
        payload: {},
      },
      FakeTransactionFinalizer: {
        extrinsic: {},
        payload: {},
      },
    },
    rpc: {
      unique: defs.unique.rpc,
      rmrk: defs.rmrk.rpc,
      eth: {
        feeHistory: {
          description: 'Dummy',
          params: [],
          type: 'u8',
        },
        maxPriorityFeePerGas: {
          description: 'Dummy',
          params: [],
          type: 'u8',
        },
      },
    },
  };
}

export async function getApiConnection(settings: ApiOptions | undefined = undefined): Promise<ApiPromise> {
  settings = settings || defaultApiOptions();
  const api = new ApiPromise(settings);

  if (api) {
    await api.isReadyOrError;
  }

  return api;
}

export default async function usingApi<T = void>(action: (api: ApiPromise, privateKeyWrapper: (account: string) => IKeyringPair) => Promise<T>, settings: ApiOptions | undefined = undefined): Promise<T> {
  settings = settings || defaultApiOptions();
  const api: ApiPromise = new ApiPromise(settings);
  let result: T = null as unknown as T;

  const silentConsole = new SilentConsole();
  silentConsole.enable();

  try {
    await promisifySubstrate(api, async () => {
      if (api) {
        await api.isReadyOrError;
        const ss58Format = (api.registry.getChainProperties())!.toJSON().ss58Format;
        const privateKeyWrapper = (account: string) => privateKey(account, Number(ss58Format));
        result = await action(api, privateKeyWrapper);
      }
    })();
  } finally {
    await api.disconnect();
    silentConsole.disable();
  }
  return result as T;
}

enum TransactionStatus {
  Success,
  Fail,
  NotReady
}

function getTransactionStatus(events: EventRecord[], status: ExtrinsicStatus): TransactionStatus {
  if (status.isReady) {
    return TransactionStatus.NotReady;
  }
  if (status.isBroadcast) {
    return TransactionStatus.NotReady;
  }
  if (status.isRetracted) {
    return TransactionStatus.NotReady;
  }
  if (status.isInBlock || status.isFinalized) {
    if(events.filter(e => e.event.data.method === 'ExtrinsicFailed').length > 0) {
      return TransactionStatus.Fail;
    }
    if(events.filter(e => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
      return TransactionStatus.Success;
    }
  }

  return TransactionStatus.Fail;
}

export function executeTransaction(api: ApiPromise, sender: IKeyringPair, transaction: SubmittableExtrinsic<'promise'>): Promise<EventRecord[]> {
  return new Promise(async (res, rej) => {
    try {
      await transaction.signAndSend(sender, ({events, status}) => {
        if (!status.isInBlock && !status.isFinalized) return;
        for (const {event} of events) {
          if (api.events.system.ExtrinsicSuccess.is(event)) {
            res(events);
          } else if (api.events.system.ExtrinsicFailed.is(event)) {
            const {data: [error]} = event;
            if (error.isModule) {
              const decoded = api.registry.findMetaError(error.asModule);
              const {method, section} = decoded;
              rej(new Error(`${section}.${method}`));
            } else {
              rej(new Error(error.toString()));
            }
          }
        }
      });
    } catch (e) {
      rej(e);
    }
  });
}

/**
 * @deprecated use `executeTransaction` instead
 */
export function
submitTransactionAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  /* eslint no-async-promise-executor: "off" */
  return new Promise(async (resolve, reject) => {
    try {
      await transaction.signAndSend(sender, ({events = [], status, dispatchError}) => {
        const transactionStatus = getTransactionStatus(events, status);

        if (transactionStatus === TransactionStatus.Success) {
          resolve(events);
        } else if (transactionStatus === TransactionStatus.Fail) {
          let moduleError = null;

          if (dispatchError) {
            if (dispatchError.isModule) {
              const modErr = dispatchError.asModule;
              const errorMeta = dispatchError.registry.findMetaError(modErr);

              moduleError = JSON.stringify(errorMeta, null, 4);
            }
          }

          console.log(`Something went wrong with transaction. Status: ${status}\nModule error: ${moduleError}`);
          reject(events);
        }
      });
    } catch (e) {
      console.log('Error: ', e);
      reject(e);
    }
  });
}

export function submitTransactionExpectFailAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  console.error = () => {};
  console.log = () => {};

  /* eslint no-async-promise-executor: "off" */
  return new Promise<EventRecord[]>(async function(res, rej) {
    const resolve = (rec: EventRecord[]) => {
      setTimeout(() => {
        res(rec);
      });
    };
    const reject = (errror: any) => {
      setTimeout(() => {
        rej(errror);
      });
    };
    try {
      await transaction.signAndSend(sender, ({events = [], status}) => {
        const transactionStatus = getTransactionStatus(events, status);

        // console.log('transactionStatus', transactionStatus, 'events', events);

        if (transactionStatus === TransactionStatus.Success) {
          resolve(events);
        } else if (transactionStatus === TransactionStatus.Fail) {
          reject(events);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
