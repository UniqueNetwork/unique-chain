//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import { alicesPublicKey, bobsPublicKey } from "./accounts";
import privateKey from "./substrate/privateKey";
import { BigNumber } from 'bignumber.js';
import { createCollectionExpectSuccess, getGenericResult } from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

const Treasury = "5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z";
const saneMinimumFee = 0.0001;
const saneMaximumFee = 0.01;

describe('integration test: Fees must be credited to Treasury:', () => {
  it('Total issuance does not change', async () => {
    await usingApi(async (api) => {
      const totalBefore = new BigNumber((await api.query.balances.totalIssuance()).toString());

      const alicePrivateKey = privateKey('//Alice');
      const amount = new BigNumber(1);
      const transfer = api.tx.balances.transfer(bobsPublicKey, amount.toFixed());

      const result = getGenericResult(await submitTransactionAsync(alicePrivateKey, transfer));

      const totalAfter = new BigNumber((await api.query.balances.totalIssuance()).toString());

      expect(result.success).to.be.true;
      expect(totalAfter.toFixed()).to.be.equal(totalBefore.toFixed());
    });
  });

  it('Sender balance decreased by fee+sent amount, Treasury balance increased by fee', async () => {
    await usingApi(async (api) => {
      const alicePrivateKey = privateKey('//Alice');
      const treasuryBalanceBefore = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceBefore = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());

      const amount = new BigNumber(1);
      const transfer = api.tx.balances.transfer(bobsPublicKey, amount.toFixed());
      const result = getGenericResult(await submitTransactionAsync(alicePrivateKey, transfer));

      const treasuryBalanceAfter = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceAfter = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());
      const fee = aliceBalanceBefore.minus(aliceBalanceAfter).minus(amount);
      const treasuryIncrease = treasuryBalanceAfter.minus(treasuryBalanceBefore);

      expect(result.success).to.be.true;
      expect(treasuryIncrease.toFixed()).to.be.equal(fee.toFixed());
    });
  });

  it('Treasury balance increased by failed tx fee', async () => {
    await usingApi(async (api) => {
      const bobPrivateKey = privateKey('//Bob');
      const treasuryBalanceBefore = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const bobBalanceBefore = new BigNumber((await api.query.system.account(bobsPublicKey)).data.free.toString());

      const badTx = api.tx.balances.setBalance(alicesPublicKey, 0, 0);
      await expect(submitTransactionExpectFailAsync(bobPrivateKey, badTx)).to.be.rejected;

      const treasuryBalanceAfter = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const bobBalanceAfter = new BigNumber((await api.query.system.account(bobsPublicKey)).data.free.toString());
      const fee = bobBalanceBefore.minus(bobBalanceAfter);
      const treasuryIncrease = treasuryBalanceAfter.minus(treasuryBalanceBefore);

      expect(treasuryIncrease.toFixed()).to.be.equal(fee.toFixed());
    });
  });

  it('NFT Transactions also send fees to Treasury', async () => {
    await usingApi(async (api) => {
      const treasuryBalanceBefore = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceBefore = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());

      await createCollectionExpectSuccess();

      const treasuryBalanceAfter = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceAfter = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());
      const fee = aliceBalanceBefore.minus(aliceBalanceAfter);
      const treasuryIncrease = treasuryBalanceAfter.minus(treasuryBalanceBefore);

      expect(treasuryIncrease.toFixed()).to.be.equal(fee.toFixed());
    });
  });

  it('Fees are sane', async () => {
    await usingApi(async (api) => {
      const treasuryBalanceBefore = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceBefore = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());

      await createCollectionExpectSuccess();

      const treasuryBalanceAfter = new BigNumber((await api.query.system.account(Treasury)).data.free.toString());
      const aliceBalanceAfter = new BigNumber((await api.query.system.account(alicesPublicKey)).data.free.toString());
      const fee = aliceBalanceBefore.minus(aliceBalanceAfter);
      const treasuryIncrease = treasuryBalanceAfter.minus(treasuryBalanceBefore);

      expect(fee.dividedBy(1e15).toNumber()).to.be.lessThan(saneMaximumFee);
      expect(fee.dividedBy(1e15).toNumber()).to.be.greaterThan(saneMinimumFee);
    });
  });

});

