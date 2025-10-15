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
import {expect, before, describe, itSub, usingPlaygrounds, usingKaruraPlaygrounds, usingShidenPlaygrounds, usingMoonriverPlaygrounds, usingRelayPlaygrounds, usingKusamaAssetHubPlaygrounds} from '@unique/test-utils/util';
import {QUARTZ_CHAIN, SAFE_XCM_VERSION, XcmTestHelper, SENDER_BUDGET, SENDTO_AMOUNT, SENDBACK_AMOUNT, SHIDEN_DECIMALS, UNQ_DECIMALS, POLKADOT_ASSETHUB_CHAIN, USDT_ASSET_ID, USDT_DECIMALS, ASSET_HUB_PALLET_ASSETS} from './xcm.types.ts';
import {hexToString} from '@polkadot/util';

const testHelper = new XcmTestHelper;

describe.ifRunXcm('[XCM] Integration test: Exchanging tokens with AssetHub', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;
  let usdtDerivativeCollectionId: number;

  const USDT_NAME = 'USDT';
  const USDT_SYM = 'USDT';

  let setupAssetHubCall: any;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();

      const usdtLocation = {
        parents: 1,
        interior: {
          X3: [
            {
              Parachain: POLKADOT_ASSETHUB_CHAIN,
            },
            {
              PalletInstance: ASSET_HUB_PALLET_ASSETS,
            },
            {
              GeneralIndex: USDT_ASSET_ID,
            },
          ],
        },
      };

      usdtDerivativeCollectionId = await helper.foreignAssets.foreignCollectionId(usdtLocation);
      if(usdtDerivativeCollectionId == null) {
        await helper.getSudo().foreignAssets.register(alice, usdtLocation, USDT_NAME, USDT_SYM, {Fungible: USDT_DECIMALS});

        usdtDerivativeCollectionId = await helper.foreignAssets.foreignCollectionId(usdtLocation);
      } else {
        console.log('USDT collection is already registered');
      }

      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingKusamaAssetHubPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);

      const setSafeXcmVersion = helper.constructApiCall(`api.tx.${helper.xcm.palletName}.forceDefaultXcmVersion`, [SAFE_XCM_VERSION]);

      const isSufficient = true;
      const minBalance = 10000;
      const isFrozen = false;

      const createUsdtCall = helper.constructApiCall('api.tx.assets.forceCreate', [
        USDT_ASSET_ID,
        alice.address,
        isSufficient,
        minBalance,
      ]);

      const setUsdtMetadata = helper.constructApiCall('api.tx.assets.forceSetMetadata', [
        USDT_ASSET_ID,
        USDT_NAME,
        USDT_SYM,
        USDT_DECIMALS,
        isFrozen,
      ]);

      setupAssetHubCall = helper.constructApiCall('api.tx.utility.batchAll', [[
        setSafeXcmVersion,
        createUsdtCall,
        setUsdtMetadata,
      ]]);
    });

    await usingRelayPlaygrounds(async (helper) => {
      await helper.getSudo().xcm.send(
        alice,
        {
          V4: {
            parents: 0,
            interior: {
              X1: [{Parachain: POLKADOT_ASSETHUB_CHAIN}],
            },
          },
        },
        {
          V4: [
            {
              UnpaidExecution: {
                weightLimit: 'Unlimited',
              },
            },
            {
              Transact: {
                originKind: 'Superuser',
                requireWeightAtMost: {
                  refTime: 8000000000,
                  proofSize: 8000,
                },
                call: {
                  encoded: setupAssetHubCall.method.toHex(),
                },
              },
            },
          ],
        },
      );
    });

    await usingKusamaAssetHubPlaygrounds(async (helper) => {
      await helper.assets.mint(alice, USDT_ASSET_ID, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send USDT to Quartz', async () => {
    await testHelper.sendUsdtFromTo(
      'kusamaAssetHub',
      'quartz',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
      usdtDerivativeCollectionId,
    );
  });

  itSub('Should connect to Quartz and send USDT back', async () => {
    await testHelper.sendUsdtFromTo(
      'quartz',
      'kusamaAssetHub',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      usdtDerivativeCollectionId,
    );
  });
});
