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
const ACALA_CHAIN = 2000;
const ACALA_PORT = '9946';
const TRANSFER_AMOUNT = 2000000000000000000000000n;

describe('Integration test: Exchanging UNQ with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let actuallySent1: bigint;
  let actuallySent2: bigint;

  let balanceUnique1: bigint;
  let balanceUnique2: bigint;
  let balanceUnique3: bigint;
  
  let balanceAcalaUnq1: bigint;
  let balanceAcalaUnq2: bigint;
  let balanceAcalaUnq3: bigint;

  let balanceAcalaAca1: bigint;
  let balanceAcalaAca2: bigint;
  let balanceAcalaAca3: bigint;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      randomAccount = generateKeyringPair();
    });

    const acalaApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + ACALA_PORT),
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
          name: 'UNQ',
          symbol: 'UNQ',
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

        [balanceAcalaAca1] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceAcalaUnq1 = BigInt(free);
        }
      },
      acalaApiOptions,
    );

    await usingApi(async (api) => {
      const tx0 = api.tx.balances.transfer(randomAccount.address, 10n * TRANSFER_AMOUNT);
      const events0 = await submitTransactionAsync(alice, tx0);
      const result0 = getGenericResult(events0);
      expect(result0.success).to.be.true;

      [balanceUnique1] = await getBalance(api, [randomAccount.address]);
    });
  });

  it('Should connect and send UNQ to Acala', async () => {

    await usingApi(async (api) => {

      const destination = {
        V0: {
          X2: [
            'Parent',
            {
              Parachain: ACALA_CHAIN,
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

      [balanceUnique2] = await getBalance(api, [randomAccount.address]);

      const transactionFees = balanceUnique1 - balanceUnique2 - TRANSFER_AMOUNT;
      actuallySent1 = TRANSFER_AMOUNT;  // Why not TRANSFER_AMOUNT - transactionFees ???
      console.log('Unique to Acala transaction fees on Unique: %s UNQ', transactionFees);
      expect(transactionFees > 0).to.be.true;
    });

    await usingApi(
      async (api) => {
        // todo do something about instant sealing, where there might not be any new blocks
        await waitNewBlocks(api, 3);
        const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
        balanceAcalaUnq2 = BigInt(free);
        expect(balanceAcalaUnq2 > balanceAcalaUnq1).to.be.true;

        [balanceAcalaAca2] = await getBalance(api, [randomAccount.address]);

        const acaFees = balanceAcalaAca1 - balanceAcalaAca2;
        const unqFees = actuallySent1 - balanceAcalaUnq2 + balanceAcalaUnq1;
        console.log('Unique to Acala transaction fees on Acala: %s ACA', acaFees);
        console.log('Unique to Acala transaction fees on Acala: %s UNQ', unqFees);
        expect(acaFees == 0n).to.be.true;
        expect(unqFees == 0n).to.be.true;
      },
      {provider: new WsProvider('ws://127.0.0.1:' + ACALA_PORT)},
    );
  });

  it('Should connect to Acala and send UNQ back', async () => {

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

        [balanceAcalaAca3] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceAcalaUnq3 = BigInt(free);
        }

        const acaFees = balanceAcalaAca2 - balanceAcalaAca3;
        const unqFees = balanceAcalaUnq2 - balanceAcalaUnq3 - amount;
        actuallySent2 = amount;  // Why not amount - UNQFees ???
        console.log('Acala to Unique transaction fees on Acala: %s ACA', acaFees);
        console.log('Acala to Unique transaction fees on Acala: %s UNQ', unqFees);
        expect(acaFees > 0).to.be.true;
        expect(unqFees == 0n).to.be.true;
      },
      {provider: new WsProvider('ws://127.0.0.1:' + ACALA_PORT)},
    );

    await usingApi(async (api) => {
      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 3);

      [balanceUnique3] = await getBalance(api, [randomAccount.address]);
      const actuallyDelivered = balanceUnique3 - balanceUnique2;
      expect(actuallyDelivered > 0).to.be.true;

      const unqFees = actuallySent2 - actuallyDelivered;
      console.log('Acala to Unique transaction fees on Unique: %s UNQ', unqFees);
      expect(unqFees > 0).to.be.true;
    });
  });
});