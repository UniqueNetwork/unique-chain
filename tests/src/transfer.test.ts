import { expect, assert } from "chai";
import { default as usingApi, submitTransactionAsync } from "./substrate/substrate-api";
import { alicesPublicKey, bobsPublicKey, ferdiesPublicKey } from "./accounts";
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

  it('Inability to pay fees error message is correct', async () => {
    await usingApi(async api => {
      const pk = privateKey('//Ferdie');

      console.log = function () {};
      console.error = function () {};
  
      const badTransfer = api.tx.balances.transfer(bobsPublicKey, 1n);
      const badTransaction = async function () { 
        const result = await submitTransactionAsync(pk, badTransfer);
      };
      await expect(badTransaction()).to.be.rejectedWith("Inability to pay some fees");

      delete console.log;
      delete console.error;
    });
  });
});
