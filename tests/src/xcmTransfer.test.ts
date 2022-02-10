//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {WsProvider} from '@polkadot/api';
import {ApiOptions} from '@polkadot/api/types';
import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import {getGenericResult} from './util/helpers';
import waitNewBlocks from './substrate/wait-new-blocks';
import getBalance from './substrate/get-balance';
import {alicesPublicKey} from './accounts';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 1000;
const KARURA_CHAIN = 2000;
const KARURA_PORT = '9946';

describe('Integration test: Exchanging QTZ/OPL with Karura', () => {
  let alice: IKeyringPair;
  
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
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
        name: 'OPL',
        symbol: 'OPL',
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

  it('Should connect and send OPL to Karura', async () => {
    let balanceOnKaruraBefore: bigint;
    
    await usingApi(async (api) => {
      const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAsset: 0})).toJSON() as any;
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
              Fungible: 5000000000,
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
      await waitNewBlocks(api, 1);
      const {free} = (await api.query.tokens.accounts(alice.addressRaw, {ForeignAsset: 0})).toJSON() as any;
      expect(free > balanceOnKaruraBefore).to.be.true;
    }, {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)});
  });

  it('Should connect to Karura and send OPL back', async () => {
    let balanceBefore: bigint;
    
    await usingApi(async (api) => {
      [balanceBefore] = await getBalance(api, [alicesPublicKey]);
    });

    await usingApi(async (api) => {
      const destination = {
        V0: {
          X3: [
            'Parent',
            {
              Parachain: UNIQUE_CHAIN,
            },
            {
              AccountId32: {
                network: 'Any',
                id: alice.addressRaw,
              },
            },
          ],
        },
      };

      const id = {
        ForeignAsset: 0,
      };

      const amount = 5000000000;
      const destWeight = 50000000;

      const tx = api.tx.xTokens.transfer(id, amount, destination, destWeight);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }, {provider: new WsProvider('ws://127.0.0.1:' + KARURA_PORT)});

    await usingApi(async (api) => {
      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 1);
      const [balanceAfter] = await getBalance(api, [alicesPublicKey]);
      expect(balanceAfter > balanceBefore).to.be.true;
    });
  });
});