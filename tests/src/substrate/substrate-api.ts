//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { WsProvider, ApiPromise } from "@polkadot/api";
import type { AccountId, Address, ApplyExtrinsicResult, DispatchError, DispatchInfo, EventRecord, Extrinsic, ExtrinsicStatus, Hash, RuntimeDispatchInfo } from '@polkadot/types/interfaces';
import { IKeyringPair } from "@polkadot/types/types";

import config from "../config";
import promisifySubstrate from "./promisify-substrate";
import { ApiOptions, SubmittableExtrinsic, ApiTypes } from "@polkadot/api/types";
import rtt from "../../../runtime_types.json";

function defaultApiOptions(): ApiOptions {
  const wsProvider = new WsProvider(config.substrateUrl);
  return { provider: wsProvider, types: rtt };
}

export default async function usingApi(action: (api: ApiPromise) => Promise<void>, settings: ApiOptions | undefined = undefined): Promise<void> {
  settings = settings || defaultApiOptions();
  let api: ApiPromise = new ApiPromise(settings);

  try {
    await promisifySubstrate(api, async () => {
      if(api) {
        await api.isReadyOrError;
        await action(api);
      }
    })();
  } finally {
    await api.disconnect();
  }
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

export function submitTransactionAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  return new Promise(async function(resolve, reject) {
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
        const transactionStatus = getTransactionStatus(events, status);

        if (transactionStatus == TransactionStatus.Success) {
          resolve(events);
        } else if (transactionStatus == TransactionStatus.Fail) {
          console.log(`Something went wrong with transaction. Status: ${status}`);
          reject("Transaction failed");
        }
      });
    } catch (e) {
      console.log("Error: ", e);
      reject(e);
    }
  });
}

export function submitTransactionExpectFailAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  const consoleError = console.error;
  const consoleLog = console.log;
  console.error = () => {};
  console.log = () => {};

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

        if (transactionStatus == TransactionStatus.Success) {
          resolve(events);
        } else if (transactionStatus == TransactionStatus.Fail) {
          reject("Transaction failed");
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}