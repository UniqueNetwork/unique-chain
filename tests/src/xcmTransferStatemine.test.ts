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
import {getGenericResult} from './util/helpers';
import waitNewBlocks from './substrate/wait-new-blocks';
import {normalizeAccountId} from './util/helpers';


chai.use(chaiAsPromised);
const expect = chai.expect;

const RELAY_PORT = '9844';
const UNIQUE_CHAIN = 5000;
const UNIQUE_PORT = '9944';
const STATEMINE_CHAIN = 1000;
const STATEMINE_PORT = '9946';
const STATEMINE_PALLET_INSTANCE = 50;
const ASSET_ID = 100;
const ASSET_METADATA_DECIMALS = 18;
const ASSET_METADATA_NAME = 'USDT';
const ASSET_METADATA_DESCRIPTION = 'USDT';
const ASSET_METADATA_MINIMAL_BALANCE = 1;

describe('Integration test: Exchanging USDT with Statemine', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob'); // funds donor
    });

    const statemineApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + STATEMINE_PORT),
    };

    const uniqueApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + UNIQUE_PORT),
    };

    const relayApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + RELAY_PORT),
    };

    await usingApi(async (api) => {

      // 10,000.00 (ten thousands) USDT
      const assetAmount = 1_000_000_000_000_000_000_000n; 
      // 350.00 (three hundred fifty) DOT
      const fundingAmount = 3_500_000_000_000; 

      const tx = api.tx.assets.create(ASSET_ID, alice.addressRaw, ASSET_METADATA_MINIMAL_BALANCE);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      // set metadata
      const tx2 = api.tx.assets.setMetadata(ASSET_ID, ASSET_METADATA_NAME, ASSET_METADATA_DESCRIPTION, ASSET_METADATA_DECIMALS);
      const events2 = await submitTransactionAsync(alice, tx2);
      const result2 = getGenericResult(events2);
      expect(result2.success).to.be.true;

      // mint some amount of asset
      const tx3 = api.tx.assets.mint(ASSET_ID, alice.addressRaw, assetAmount);
      const events3 = await submitTransactionAsync(alice, tx3);
      const result3 = getGenericResult(events3);
      expect(result3.success).to.be.true;

      // funding parachain sovereing account (Parachain: 5000)
      const parachainSovereingAccount = '0x7369626c88130000000000000000000000000000000000000000000000000000';
      const tx4 = api.tx.balances.transfer(parachainSovereingAccount, fundingAmount);
      const events4 = await submitTransactionAsync(bob, tx4);
      const result4 = getGenericResult(events4);
      expect(result4.success).to.be.true;

    }, statemineApiOptions);


    await usingApi(async (api) => {

      const location = {
        V1: {
          parents: 1,
          interior: {X3: [
            {
              Parachain: STATEMINE_CHAIN,
            },
            {
              PalletInstance: STATEMINE_PALLET_INSTANCE,
            },
            {
              GeneralIndex: ASSET_ID,
            },
          ]},
        },
      };

      const metadata =
      {
        name: ASSET_ID,
        symbol: ASSET_METADATA_NAME,
        decimals: ASSET_METADATA_DECIMALS,
        minimalBalance: ASSET_METADATA_MINIMAL_BALANCE,
      };
      //registerForeignAsset(owner, location, metadata)
      const tx = api.tx.foreingAssets.registerForeignAsset(alice.addressRaw, location, metadata);
      const sudoTx = api.tx.sudo.sudo(tx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

    }, uniqueApiOptions);


    // Providing the relay currency to the unique sender account
    await usingApi(async (api) => {
      const destination = {
        V1: {
          parents: 0,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V1: {
          parents: 0,
          interior: {X1: {
            AccountId32: {
              network: 'Any',
              id: alice.addressRaw,
            },
          }},
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
              Fungible: 50_000_000_000_000_000n,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      const weightLimit = {
        Limited: 5_000_000_000,
      };

      const tx = api.tx.xcmPallet.limitedReserveTransferAssets(destination, beneficiary, assets, feeAssetItem, weightLimit);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }, relayApiOptions);
  
  });

  it('Should connect and send USDT from Statemine to Unique', async () => {
    
    const statemineApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + STATEMINE_PORT),
    };

    const uniqueApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + UNIQUE_PORT),
    };

    await usingApi(async (api) => {

      const dest = {
        V1: {
          parents: 1,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V1: {
          parents: 0,
          interior: {X1: {
            AccountId32: {
              network: 'Any',
              id: alice.addressRaw,
            },
          }},
        },
      };

      const assets = {
        V1: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: {
                  X2: [
                    {
                      PalletInstance: STATEMINE_PALLET_INSTANCE,
                    },
                    {
                      GeneralIndex: ASSET_ID,
                    }, 
                  ]},
              },
            },
            fun: {
              Fungible: 1_000_000_000_000_000_000n,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      const weightLimit = {
        Limited: 5000000000,
      };

      const tx = api.tx.polkadotXcm.limitedReserveTransferAssets(dest, beneficiary, assets, feeAssetItem, weightLimit);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }, statemineApiOptions);


    // ensure that asset has been delivered
    await usingApi(async (api) => {
      await waitNewBlocks(api, 3);
      // expext collection id will be with id 1
      const free = (await api.query.fungible.balance(1, normalizeAccountId(alice.address))).toBigInt();
      expect(free > 0).to.be.true;
    }, uniqueApiOptions);
  });

  it('Should connect and send USDT from Unique to Statemine back', async () => {
    let balanceBefore: bigint;
    const uniqueApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + UNIQUE_PORT),
    };

    await usingApi(async (api) => {
      balanceBefore = (await api.query.fungible.balance(1, normalizeAccountId(alice.address))).toBigInt();

      const destination = {
        V1: {
          parents: 1,
          interior: {X2: [
            {
              Parachain: STATEMINE_CHAIN,
            },
            {
              AccountId32: {
                network: 'Any',
                id: alice.addressRaw,
              },
            },
          ]},
        },
      };

      const currencies = [[
        {
          ForeignAssetId: 0,
        },
        10_000_000_000_000_000n,
      ], 
      [
        {
          NativeAssetId: 'Parent',
        },
        400_000_000_000_000n,
      ]];

      const feeItem = 1;
      const destWeight = 500000000000;

      const tx = api.tx.xTokens.transferMulticurrencies(currencies, feeItem, destination, destWeight);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      // todo do something about instant sealing, where there might not be any new blocks
      await waitNewBlocks(api, 3);
      const balanceAfter = (await api.query.fungible.balance(1, normalizeAccountId(alice.address))).toBigInt();
      expect(balanceAfter < balanceBefore).to.be.true;
    }, uniqueApiOptions);
  });
});