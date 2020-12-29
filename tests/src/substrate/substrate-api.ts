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

export function submitTransactionAsync(sender: IKeyringPair, transaction: SubmittableExtrinsic<ApiTypes>): Promise<EventRecord[]> {
  return new Promise(async function(resolve, reject) {
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
        if (status.isReady) {
          // nothing to do
          // console.log(`Current tx status is Ready`);
        } else if (status.isBroadcast) {
          // nothing to do
          // console.log(`Current tx status is Broadcast`);
        } else if (status.isInBlock || status.isFinalized) {
          resolve(events);
        } else {
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
  return new Promise(async function(resolve, reject) {
    try {
      await transaction.signAndSend(sender, ({ events = [], status }) => {
        if (status.isReady) {
          // nothing to do
          // console.log(`Current tx status is Ready`);
        } else if (status.isBroadcast) {
          // nothing to do
          // console.log(`Current tx status is Broadcast`);
        } else if (status.isInBlock || status.isFinalized) {
          resolve(events);
        } else {
          reject("Transaction failed");
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}