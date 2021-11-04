//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { WsProvider, ApiPromise } from '@polkadot/api';
import { EventRecord } from '@polkadot/types/interfaces/system/types';
import { ExtrinsicStatus } from '@polkadot/types/interfaces/author/types';
import { IKeyringPair } from '@polkadot/types/types';

import config from '../config';
import promisifySubstrate from './promisify-substrate';
import { ApiOptions, SubmittableExtrinsic, ApiTypes } from '@polkadot/api/types';
import * as defs from '../interfaces/definitions';


function defaultApiOptions(): ApiOptions {
  const wsProvider = new WsProvider(config.substrateUrl);
  return {
    provider: wsProvider, signedExtensions: {
      ContractHelpers: {
        extrinsic: {},
        payload: {},
      },
    },
    rpc: {
      nft: defs.nft.rpc,
    },
  };
}

export default async function usingApi<T = void>(action: (api: ApiPromise) => Promise<T>, settings: ApiOptions | undefined = undefined): Promise<T> {
  settings = settings || defaultApiOptions();
  const api: ApiPromise = new ApiPromise(settings);
  let result: T = null as unknown as T;

  // TODO: Remove, this is temporary: Filter unneeded API output
  // (Jaco promised it will be removed in the next version)
  const consoleErr = console.error;
  const consoleLog = console.log;
  const consoleWarn = console.warn;

  const outFn = (message: any, ...rest: any[]) => {
    if (typeof message !== 'string') {
      consoleErr(message, ...rest);
      return;
    }
    if (!message.includes('StorageChangeSet:: WebSocket is not connected') &&
        !message.includes('2021-') &&
        !message.includes('StorageChangeSet:: Normal connection closure'))
      consoleErr(message, ...rest);
  };

  console.error = outFn;
  console.log = outFn;
  console.warn = outFn;

  try {
    await promisifySubstrate(api, async () => {
      if (api) {
        await api.isReadyOrError;
        result = await action(api);
      }
    })();
  } finally {
    await api.disconnect();
    console.error = consoleErr;
    console.log = consoleLog;
    console.warn = consoleWarn;
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

export function
submitTransactionAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  /* eslint no-async-promise-executor: "off" */
  return new Promise(async (resolve, reject) => {
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
        const transactionStatus = getTransactionStatus(events, status);

        if (transactionStatus === TransactionStatus.Success) {
          resolve(events);
        } else if (transactionStatus === TransactionStatus.Fail) {
          console.log(`Something went wrong with transaction. Status: ${status}`);
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
  const consoleError = console.error;
  const consoleLog = console.log;
  console.error = () => {};
  console.log = () => {};

  /* eslint no-async-promise-executor: "off" */
  return new Promise<EventRecord[]>(async function(res, rej) {
    const resolve = (rec: EventRecord[]) => {
      setTimeout(() => {
        res(rec);
        console.error = consoleError;
        console.log = consoleLog;
      });
    };
    const reject = (errror: any) => {
      setTimeout(() => {
        rej(errror);
        console.error = consoleError;
        console.log = consoleLog;
      });
    };
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
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
