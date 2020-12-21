import { expect } from "chai";
import { default as usingApi, submitTransactionAsync } from "./substrate/substrate-api";
import { alicesPublicKey, bobsPublicKey } from "./accounts";
import privateKey from "./substrate/privateKey";
import getBalance from "./substrate/get-balance";

describe('Transfer', () => {
  it('Balance transfers', async () => {
    await usingApi(async api => {
      const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      const alicePrivateKey = privateKey('//Alice');
      
      const transfer = api.tx.balances.transfer(bobsPublicKey, 1n);
      const result = await submitTransactionAsync(alicePrivateKey, transfer);

      const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
      expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
    });
  });
});
