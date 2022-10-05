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
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {getGenericResult} from '../util/helpers';
import waitNewBlocks from '../substrate/wait-new-blocks';
import getBalance from '../substrate/get-balance';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 1000;
const KARURA_CHAIN = 2000;
const KARURA_PORT = '9946';
const TRANSFER_AMOUNT = 2000000000000000000000000n;

// todo:playgrounds refit when XCM drops
describe.skip('Integration test: Exchanging QTZ with Karura', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });

    const karuraApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT),
    };

    await usingApi(async (api) => {
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

      const metadata =
      {
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
    }, karuraApiOptions);
  });

  it('Should connect and send QTZ to Karura', async () => {
    let balanceOnKaruraBefore: bigint;

    await usingApi(async (api) => {
      const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAssetId: 0})).toJSON() as any;
      balanceOnKaruraBefore = free;
    }, {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)});

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
              id: alice.addressRaw,
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
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });

    await usingApi(async (api) => {
      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 3);
      const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAssetId: 0})).toJSON() as any;
      expect(free > balanceOnKaruraBefore).to.be.true;
    }, {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)});
  });

  it('Should connect to Karura and send QTZ back', async () => {
    let balanceBefore: bigint;

    await usingApi(async (api) => {
      [balanceBefore] = await getBalance(api, [alice.address]);
    });

    await usingApi(async (api) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: UNIQUE_CHAIN},
              {AccountId32: {
                network: 'Any',
                id: alice.addressRaw,
              }},
            ],
          },
        },
      };

      const id = {
        ForeignAssetId: 0,
      };

      const amount = TRANSFER_AMOUNT;
      const destWeight = 50000000;

      const tx = api.tx.xTokens.transfer(id, amount, destination, destWeight);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }, {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)});

    await usingApi(async (api) => {
      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 3);
      const [balanceAfter] = await getBalance(api, [alice.address]);
      expect(balanceAfter > balanceBefore).to.be.true;
    });
  });
});
