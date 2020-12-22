//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from "@polkadot/api";
import promisifySubstrate from "./promisify-substrate";
import {AccountInfo} from "@polkadot/types/interfaces/system";

export default async function getBalance(api: ApiPromise, accounts: string[]): Promise<bigint[]> {
  const balance = promisifySubstrate(api, (accounts: string[]) => api.query.system.account.multi(accounts));
  const responce = await balance(accounts) as unknown as AccountInfo[];
  return responce.map(r => r.data.free.toBigInt().valueOf());
}
