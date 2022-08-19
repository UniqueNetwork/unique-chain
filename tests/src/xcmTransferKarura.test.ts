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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {WsProvider} from '@polkadot/api';
import {ApiOptions} from '@polkadot/api/types';
import {IKeyringPair} from '@polkadot/types/types';
import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import {getGenericResult, generateKeyringPair} from './util/helpers';
import waitNewBlocks from './substrate/wait-new-blocks';
import getBalance from './substrate/get-balance';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 5000;
const KARURA_CHAIN = 2000;
const KARURA_PORT = '9946';
const TRANSFER_AMOUNT = 2000000000000000000000000n;

describe('Integration test: Exchanging QTZ with Karura', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let actuallySent1: bigint;
  let actuallySent2: bigint;

  let balanceQuartz1: bigint;
  let balanceQuartz2: bigint;
  let balanceQuartz3: bigint;

  let balanceKaruraQtz1: bigint;
  let balanceKaruraQtz2: bigint;
  let balanceKaruraQtz3: bigint;

  let balanceKaruraKar1: bigint;
  let balanceKaruraKar2: bigint;
  let balanceKaruraKar3: bigint;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      randomAccount = generateKeyringPair();
    });

    const karuraApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT),
    };

    await usingApi(
      async (api) => {
        const destination = {
          V0: {
            X2: [
              'Parent',
              {
                Parachain: UNIQUE_CHAIN,
              },
            ],
          },
        };

        const metadata = {
          name: 'QTZ',
          symbol: 'QTZ',
          decimals: 18,
          minimalBalance: 1,
        };

        const tx = api.tx.assetRegistry.registerForeignAsset(destination, metadata);
        const sudoTx = api.tx.sudo.sudo(tx as any);
        const events = await submitTransactionAsync(alice, sudoTx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        const tx1 = api.tx.balances.transfer(randomAccount.address, 10000000000000n);
        const events1 = await submitTransactionAsync(alice, tx1);
        const result1 = getGenericResult(events1);
        expect(result1.success).to.be.true;

        [balanceKaruraKar1] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceKaruraQtz1 = BigInt(free);
        }
      },
      karuraApiOptions,
    );

    await usingApi(async (api) => {
      const tx0 = api.tx.balances.transfer(randomAccount.address, 10n * TRANSFER_AMOUNT);
      const events0 = await submitTransactionAsync(alice, tx0);
      const result0 = getGenericResult(events0);
      expect(result0.success).to.be.true;

      [balanceQuartz1] = await getBalance(api, [randomAccount.address]);
    });
  });

  it('Should connect and send QTZ to Karura', async () => {

    await usingApi(async (api) => {

      const destination = {
        V0: {
          X2: [
            'Parent',
            {
              Parachain: KARURA_CHAIN,
            },
          ],
        },
      };

      const beneficiary = {
        V0: {
          X1: {
            AccountId32: {
              network: 'Any',
              id: randomAccount.addressRaw,
            },
          },
        },
      };

      const assets = {
        V1: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: 'Here',
              },
            },
            fun: {
              Fungible: TRANSFER_AMOUNT,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      const weightLimit = {
        Limited: 5000000000,
      };

      const tx = api.tx.polkadotXcm.limitedReserveTransferAssets(destination, beneficiary, assets, feeAssetItem, weightLimit);
      const events = await submitTransactionAsync(randomAccount, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      [balanceQuartz2] = await getBalance(api, [randomAccount.address]);

      const transactionFees = balanceQuartz1 - balanceQuartz2 - TRANSFER_AMOUNT;
      actuallySent1 = TRANSFER_AMOUNT;  // Why not TRANSFER_AMOUNT - transactionFees ???
      console.log('Quartz to Karura transaction fees on Quartz: %s QTZ', transactionFees);
      expect(transactionFees > 0).to.be.true;
    });

    await usingApi(
      async (api) => {
        // todo do something about instant sealing, where there might not be any new blocks
        await waitNewBlocks(api, 3);
        const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
        balanceKaruraQtz2 = BigInt(free);
        expect(balanceKaruraQtz2 > balanceKaruraQtz1).to.be.true;

        [balanceKaruraKar2] = await getBalance(api, [randomAccount.address]);

        const karFees = balanceKaruraKar1 - balanceKaruraKar2;
        const qtzFees = actuallySent1 - balanceKaruraQtz2 + balanceKaruraQtz1;
        console.log('Quartz to Karura transaction fees on Karura: %s KAR', karFees);
        console.log('Quartz to Karura transaction fees on Karura: %s QTZ', qtzFees);
        expect(karFees == 0n).to.be.true;
        expect(qtzFees == 0n).to.be.true;
      },
      {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)},
    );
  });

  it('Should connect to Karura and send QTZ back', async () => {

    await usingApi(
      async (api) => {
        const destination = {
          V1: {
            parents: 1,
            interior: {
              X2: [
                {Parachain: UNIQUE_CHAIN},
                {
                  AccountId32: {
                    network: 'Any',
                    id: randomAccount.addressRaw,
                  },
                },
              ],
            },
          },
        };

        const id = {
          ForeignAsset: 0,
        };

        const amount = TRANSFER_AMOUNT;
        const destWeight = 50000000;

        const tx = api.tx.xTokens.transfer(id, amount, destination, destWeight);
        const events = await submitTransactionAsync(randomAccount, tx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        [balanceKaruraKar3] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceKaruraQtz3 = BigInt(free);
        }

        const karFees = balanceKaruraKar2 - balanceKaruraKar3;
        const qtzFees = balanceKaruraQtz2 - balanceKaruraQtz3 - amount;
        actuallySent2 = amount;  // Why not amount - qtzFees ???
        console.log('Karura to Quartz transaction fees on Karura: %s KAR', karFees);
        console.log('Karura to Quartz transaction fees on Karura: %s QTZ', qtzFees);
        expect(karFees > 0).to.be.true;
        expect(qtzFees == 0n).to.be.true;
      },
      {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)},
    );

    await usingApi(async (api) => {
      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 3);

      [balanceQuartz3] = await getBalance(api, [randomAccount.address]);
      const actuallyDelivered = balanceQuartz3 - balanceQuartz2;
      expect(actuallyDelivered > 0).to.be.true;

      const qtzFees = actuallySent2 - actuallyDelivered;
      console.log('Karura to Quartz transaction fees on Quartz: %s QTZ', qtzFees);
      expect(qtzFees > 0).to.be.true;
    });
  });
});