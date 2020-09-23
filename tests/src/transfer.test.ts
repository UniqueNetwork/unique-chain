import createSubstrateApi from "./substrate/substrate-api";
import { Keyring, ApiPromise } from "@polkadot/api";
import {AccountInfo} from "@polkadot/types/interfaces/system";
import { expect } from "chai";
import usingApi from "./substrate/substrate-api";
import promisifySubstrate from "./substrate/promisify-substrate";
import waitNewBlocks from "./substrate/wait-new-blocks";
import { alicesPublicKey, bobsPublicKey } from "./accounts";
import privateKey from "./substrate/privateKey";

async function getBalance(api: ApiPromise, accounts: string[]): Promise<bigint[]> {
  const balance = promisifySubstrate(api, (accounts: string[]) => api.query.system.account.multi(accounts));
  const responce = await balance(accounts) as unknown as AccountInfo[];
  return responce.map(r => r.data.free.toBigInt().valueOf());
}

describe('Transfer', () => {
  it('Balance transfers', async () => {
    await usingApi(async api => {
      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      const alicePrivateKey = privateKey('//Alice');
      
      const transfer = api.tx.balances.transfer(bobsPublicKey, 1n);
      
      await promisifySubstrate(api, () => transfer.signAndSend(alicePrivateKey))();

      await waitNewBlocks(api);
  
      const [alicesBalanceAfter, bobsBalanceAfter]  = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
      expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
    });
  });
});
