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

import type {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import {usingPlaygrounds, expect, itSub} from '@unique/test-utils/util.js';
import type {u32} from '@polkadot/types-codec';
import {itEth} from '@unique/test-utils/eth/util.js';
import {ITransactionResult} from '@unique-nft/playgrounds/types';

const TREASURY = '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z';
const saneMinimumFee = 0.05;
const saneMaximumFee = 0.5;
const createCollectionDeposit = 100;

// Skip the inflation block pauses if the block is close to inflation block
// until the inflation happens
/*eslint no-async-promise-executor: "off"*/
function skipInflationBlock(api: ApiPromise): Promise<void> {
  const promise = new Promise<void>(async (resolve) => {
    const inflationBlockInterval = api.consts.inflation.inflationBlockInterval as u32;
    const blockInterval = inflationBlockInterval.toNumber();
    const unsubscribe = await api.rpc.chain.subscribeNewHeads(head => {
      const currentBlock = head.number.toNumber();
      if(currentBlock % blockInterval < blockInterval - (blockInterval / 5)) {
        unsubscribe();
        resolve();
      } else {
        console.log(`Skipping inflation block, current block: ${currentBlock}`);
      }
    });
  });

  return promise;
}

describe('integration test: Fees must be credited to Treasury:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Total issuance does not change', async ({helper}) => {
    const api = helper.getApi();
    await skipInflationBlock(api);
    await helper.wait.newBlocks(1);

    const totalBefore = (await helper.callRpc('api.query.balances.totalIssuance', [])).toBigInt();

    await helper.balance.transferToSubstrate(alice, bob.address, 1n);

    const totalAfter = (await helper.callRpc('api.query.balances.totalIssuance', [])).toBigInt();

    expect(totalAfter).to.be.equal(totalBefore);
  });

  itSub('Sender balance decreased by fee+sent amount, Treasury balance increased by fee', async ({helper}) => {
    await skipInflationBlock(helper.getApi());
    await helper.wait.newBlocks(1);

    const treasuryBalanceBefore = await helper.balance.getSubstrate(TREASURY);
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    const amount = 1n;
    await helper.balance.transferToSubstrate(alice, bob.address, amount);

    const treasuryBalanceAfter = await helper.balance.getSubstrate(TREASURY);
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    const fee = aliceBalanceBefore - aliceBalanceAfter - amount;
    const treasuryIncrease = treasuryBalanceAfter - treasuryBalanceBefore;

    expect(treasuryIncrease).to.be.equal(fee);
  });

  itSub('Treasury balance increased by failed tx fee', async ({helper}) => {
    const api = helper.getApi();
    await helper.wait.newBlocks(1);

    const treasuryBalanceBefore = await helper.balance.getSubstrate(TREASURY);
    const bobBalanceBefore = await helper.balance.getSubstrate(bob.address);

    await expect(helper.signTransaction(bob, api.tx.balances.forceSetBalance(alice.address, 0))).to.be.rejected;

    const treasuryBalanceAfter = await helper.balance.getSubstrate(TREASURY);
    const bobBalanceAfter = await helper.balance.getSubstrate(bob.address);

    const fee = bobBalanceBefore - bobBalanceAfter;
    const treasuryIncrease = treasuryBalanceAfter - treasuryBalanceBefore;

    expect(treasuryIncrease).to.be.equal(fee);
  });

  itSub('NFT Transactions also send fees to Treasury', async ({helper}) => {
    await skipInflationBlock(helper.getApi());
    await helper.wait.newBlocks(1);

    const treasuryBalanceBefore = await helper.balance.getSubstrate(TREASURY);
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const treasuryBalanceAfter = await helper.balance.getSubstrate(TREASURY);
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);
    const fee = aliceBalanceBefore - aliceBalanceAfter;
    const treasuryIncrease = treasuryBalanceAfter - treasuryBalanceBefore;

    expect(treasuryIncrease).to.be.equal(fee);
  });

  itSub('Fees are sane', async ({helper}) => {
    const unique = helper.balance.getOneTokenNominal();
    await skipInflationBlock(helper.getApi());
    await helper.wait.newBlocks(1);

    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);

    await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});

    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);
    const fee = aliceBalanceBefore - aliceBalanceAfter;

    expect(fee / unique < BigInt(Math.ceil(saneMaximumFee + createCollectionDeposit))).to.be.true;
    expect(fee / unique < BigInt(Math.ceil(saneMinimumFee  + createCollectionDeposit))).to.be.true;
  });

  itSub('NFT Transfer fee is close to 0.1 Unique', async ({helper}) => {
    await skipInflationBlock(helper.getApi());
    await helper.wait.newBlocks(1);

    const collection = await helper.nft.mintCollection(alice, {
      name: 'test',
      description: 'test',
      tokenPrefix: 'test',
    });
    // const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    const token = await collection.mintToken(alice, {Substrate: alice.address});

    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    const fee = Number(aliceBalanceBefore - aliceBalanceAfter) / Number(helper.balance.getOneTokenNominal());
    const expectedTransferFee = 0.1;
    // fee drifts because of NextFeeMultiplier
    const tolerance = 0.001;

    expect(Math.abs(fee - expectedTransferFee)).to.be.lessThan(tolerance);
  });

  itEth('Evm Transactions send fees to Treasury', async ({helper}) => {
    const value = helper.balance.getOneTokenNominal();
    const gasPrice = await helper.getGasPrice();
    let result = null;

    const lambda = async () => {
      result = await helper.executeExtrinsic(alice, 'api.tx.evm.call', [
        helper.address.substrateToEth(alice.address),
        helper.address.substrateToEth(bob.address),
        '0x',
        value,
        25_000,
        gasPrice,
        null,
        null,
        [],
      ]);
    };

    const totalPaid = await helper.arrange.calculcateFee({Substrate: alice.address}, lambda);
    const evmFees = totalPaid - value;

    const treasuryDepoosited = (result as unknown as ITransactionResult).result.events
      .filter(({event: {method, section}}) => section == 'treasury' && method == 'Deposit')
      .map(({event: {data}}) => data[0].toJSON());

    const deposit = BigInt(treasuryDepoosited[0]);

    expect(deposit).to.be.equal(evmFees);
  });

});
