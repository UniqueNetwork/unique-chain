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
import {itSub, describeXCM, usingPlaygrounds, usingKaruraPlaygrounds, usingShidenPlaygrounds, usingMoonriverPlaygrounds} from '@unique/test-utils/util.js';
import {QUARTZ_CHAIN, SAFE_XCM_VERSION, XcmTestHelper, SENDER_BUDGET, SENDTO_AMOUNT, SENDBACK_AMOUNT, SHIDEN_DECIMALS, UNQ_DECIMALS} from './xcm.types.js';
import {hexToString} from '@polkadot/util';

const testHelper = new XcmTestHelper;

describeXCM('[XCM] Integration test: Exchanging tokens with Karura', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingKaruraPlaygrounds(async (helper) => {
      const location = {
        V4: {
          parents: 1,
          interior: {
            X1: [{Parachain: QUARTZ_CHAIN}],
          },
        },
      };

      const metadata = {
        name: 'Quartz',
        symbol: 'QTZ',
        decimals: Number(UNQ_DECIMALS),
        minimalBalance: 1000000000000000000n,
      };

      const assets = (await (helper.callRpc('api.query.assetRegistry.assetMetadatas.entries'))).map(([_k, v]: [any, any]) =>
        hexToString(v.toJSON()['symbol'])) as string[];

      if(!assets.includes('QTZ')) {
        await helper.getSudo().assetRegistry.registerForeignAsset(alice, location, metadata);
      } else {
        console.log('QTZ token already registered on Karura assetRegistry pallet');
      }
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send QTZ to Karura', async () => {
    await testHelper.sendUnqFromTo(
      'quartz',
      'karura',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
    );
  });

  itSub('Should connect to Karura and send QTZ back', async () => {
    await testHelper.sendUnqFromTo(
      'karura',
      'quartz',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
    );
  });

  itSub('Karura can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'karura',
      'quartz',
    );
  });

  itSub('Should not accept reserve transfer of QTZ from Karura', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'karura',
      'quartz',
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging QTZ with Moonriver', () => {
  let alice: IKeyringPair;

  let randomAccountQuartz: IKeyringPair;
  let randomAccountMoonriver: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccountQuartz] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);

      await helper.balance.transferToSubstrate(alice, randomAccountQuartz.address, SENDER_BUDGET);
    });

    await usingMoonriverPlaygrounds(async (helper) => {
      const alithAccount = helper.account.alithAccount();

      randomAccountMoonriver = helper.account.create();

      await helper.balance.transferToEthereum(alithAccount, randomAccountMoonriver.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send QTZ to Moonriver', async () => {
    await testHelper.sendUnqFromTo(
      'quartz',
      'moonriver',
      randomAccountQuartz,
      randomAccountMoonriver,
      SENDTO_AMOUNT,
    );
  });

  // TODO Moonbeam uses OpenGov now, we need another way of producing Root Origin in tests.
  // So we can't register our asset on Moonbeam.
  // We just test if the message got to the destination in the previous test.
  itSub.skip('Should connect to Moonriver and send QTZ back', async () => {
    await testHelper.sendUnqFromTo(
      'quartz',
      'moonriver',
      randomAccountMoonriver,
      randomAccountQuartz,
      SENDBACK_AMOUNT,
    );
  });

  itSub.skip('Moonriver can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'moonriver',
      'quartz',
    );
  });

  itSub.skip('Should not accept reserve transfer of QTZ from Moonriver', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'moonriver',
      'quartz', 
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Shiden', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const QTZ_ASSET_ID_ON_SHIDEN = 18_446_744_073_709_551_633n; // The value is taken from the live Shiden
  const QTZ_MINIMAL_BALANCE_ON_SHIDEN = 1n; // The value is taken from the live Shiden

  // Quartz -> Shiden
  const shidenInitialBalance = 1n * (10n ** SHIDEN_DECIMALS); // 1 SHD, existential deposit required to actually create the account on Shiden
  const unitsPerSecond = 500_451_000_000_000_000_000n; // The value is taken from the live Shiden

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
      console.log('sender: ', randomAccount.address);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingShidenPlaygrounds(async (helper) => {
      if(!(await helper.callRpc('api.query.assets.asset', [QTZ_ASSET_ID_ON_SHIDEN])).toJSON()) {
        console.log('1. Create foreign asset and metadata');
        await helper.getSudo().assets.forceCreate(
          alice,
          QTZ_ASSET_ID_ON_SHIDEN,
          alice.address,
          QTZ_MINIMAL_BALANCE_ON_SHIDEN,
        );

        await helper.assets.setMetadata(
          alice,
          QTZ_ASSET_ID_ON_SHIDEN,
          'Quartz',
          'QTZ',
          Number(UNQ_DECIMALS),
        );

        console.log('2. Register asset location on Shiden');
        const assetLocation = {
          V4: {
            parents: 1,
            interior: {
              X1: [{Parachain: QUARTZ_CHAIN}],
            },
          },
        };

        await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.registerAssetLocation', [assetLocation, QTZ_ASSET_ID_ON_SHIDEN]);

        console.log('3. Set QTZ payment for XCM execution on Shiden');
        await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.setAssetUnitsPerSecond', [assetLocation, unitsPerSecond]);
      } else {
        console.log('QTZ is already registered on Shiden');
      }
      console.log('4. Transfer 1 SDN to recipient to create the account (needed due to existential balance)');
      await helper.balance.transferToSubstrate(alice, randomAccount.address, shidenInitialBalance);
    });
  });

  itSub('Should connect and send QTZ to Shiden', async () => {
    await testHelper.sendUnqFromTo(
      'quartz',
      'shiden',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT, 
    );
  });

  itSub('Should connect to Shiden and send QTZ back', async () => {
    await testHelper.sendUnqFromTo(
      'shiden',
      'quartz',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
    );
  });

  itSub('Shiden can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'shiden',
      'quartz', 
    );
  });

  itSub('Should not accept reserve transfer of QTZ from Shiden', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'shiden',
      'quartz',
    );
  });
});

// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCM] Integration test: Quartz rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });
  });

  itSub('Quartz rejects KAR tokens from Karura', async () => {
    await testHelper.rejectNativeTokensFrom(alice, 'karura', 'quartz');
  });

  // TODO Moonbeam uses OpenGov now, we need another way of producing Root Origin in tests.
  itSub.skip('Quartz rejects MOVR tokens from Moonriver', async () => {
    await testHelper.rejectNativeTokensFrom(alice, 'moonriver', 'quartz');
  });

  itSub('Quartz rejects SDN tokens from Shiden', async () => {
    await testHelper.rejectNativeTokensFrom(alice, 'shiden', 'quartz');
  });
});
