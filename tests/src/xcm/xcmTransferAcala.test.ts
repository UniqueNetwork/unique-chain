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

let UNIQUE_CHAIN = 0;
let ACALA_CHAIN = 0;

// parse parachain id numbers
process.argv.forEach((val) => {

  const ai = val.indexOf('acalaId=');
  const ui = val.indexOf('uniqueId=');
  if (ai != -1)
  {
    ACALA_CHAIN = Number(val.substring('acalaId='.length));
  }
  if (ui != -1)
  {
    UNIQUE_CHAIN = Number(val.substring('uniqueId='.length));
  }
});

const ACALA_PORT = '9946';
const TRANSFER_AMOUNT = 2000000000000000000000000n;

describe('Integration test: Exchanging UNQ with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let balanceUniqueTokenBefore: bigint;
  let balanceUniqueTokenAfter: bigint;
  let balanceUniqueTokenFinal: bigint;
  let balanceAcalaTokenBefore: bigint;
  let balanceAcalaTokenAfter: bigint;
  let balanceAcalaTokenFinal: bigint;
  let balanceUniqueForeignTokenAfter: bigint;
  let balanceUniqueForeignTokenBefore: bigint;
  let balanceUniqueForeignTokenFinal: bigint;

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

        [balanceAcalaTokenBefore] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceUniqueForeignTokenBefore = BigInt(free);
        }
      },
      acalaApiOptions,
    );

    await usingApi(async (api) => {
      const tx0 = api.tx.balances.transfer(randomAccount.address, 10n * TRANSFER_AMOUNT);
      const events0 = await submitTransactionAsync(alice, tx0);
      const result0 = getGenericResult(events0);
      expect(result0.success).to.be.true;

      [balanceUniqueTokenBefore] = await getBalance(api, [randomAccount.address]);
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

      [balanceUniqueTokenAfter] = await getBalance(api, [randomAccount.address]);

      expect((balanceUniqueTokenBefore - balanceUniqueTokenAfter) > 0n).to.be.true;
    });

    await usingApi(
      async (api) => {
        // todo do something about instant sealing, where there might not be any new blocks
        await waitNewBlocks(api, 3);
        const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
        balanceUniqueForeignTokenAfter = BigInt(free);

        [balanceAcalaTokenAfter] = await getBalance(api, [randomAccount.address]);
        const acaFees = balanceAcalaTokenBefore - balanceAcalaTokenAfter;
        const unqFees = balanceUniqueForeignTokenBefore - balanceUniqueForeignTokenAfter;
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

        [balanceAcalaTokenFinal] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAsset: 0})).toJSON() as any;
          balanceUniqueForeignTokenFinal = BigInt(free);
        }

        const acaFees = balanceAcalaTokenFinal - balanceAcalaTokenAfter;
        const unqFees = balanceUniqueForeignTokenFinal - balanceUniqueForeignTokenAfter;
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

      [balanceUniqueTokenFinal] = await getBalance(api, [randomAccount.address]);
      const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenAfter;
      expect(actuallyDelivered > 0).to.be.true;

      const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
      console.log('Acala to Unique transaction fees on Unique: %s UNQ', unqFees);
      expect(unqFees > 0).to.be.true;
    });
  });
});