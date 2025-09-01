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
import config from '../config.js';
import {expect, itSub, describeXCM, usingPlaygrounds, usingAcalaPlaygrounds, usingMoonbeamPlaygrounds, usingAstarPlaygrounds, usingHydraDxPlaygrounds, usingRelayPlaygrounds, usingPolkadotAssetHubPlaygrounds} from '@unique/test-utils/util.js';
import {hexToString} from '@polkadot/util';
import {ASSET_HUB_PALLET_ASSETS, ASTAR_DECIMALS, POLKADOT_ASSETHUB_CHAIN, SAFE_XCM_VERSION, SENDBACK_AMOUNT, SENDER_BUDGET, SENDTO_AMOUNT, UNIQUE_CHAIN, UNQ_DECIMALS, USDT_ASSET_ID, USDT_DECIMALS, XcmTestHelper} from './xcm.types.js';

const testHelper = new XcmTestHelper;

describeXCM('[XCM] Integration test: Exchanging tokens with Relay', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingRelayPlaygrounds(async (helper) => {
      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });
  });

  itSub('Should not accept reserve transfer of UNQ from Relay', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'relay',
      'unique',
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging DOT with its reserve', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;
  let dotDerivativeCollectionId: number;

  const relayLocation = {
    parents: 1,
    interior: 'Here',
  };

  const assetHubLocation = {
    parents: 1,
    interior: {
      X1: [{ Parachain: 1000 }],
    }
  };

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();

      dotDerivativeCollectionId = await helper.foreignAssets.foreignCollectionId(relayLocation);
      if(dotDerivativeCollectionId == null) {
        const name = 'DOT';
        const tokenPrefix = 'DOT';
        const decimals = 10;
        await helper.getSudo().foreignAssets.register(alice, relayLocation, name, tokenPrefix, {Fungible: decimals});

        dotDerivativeCollectionId = await helper.foreignAssets.foreignCollectionId(relayLocation);
      } else {
        console.log('Relay foreign collection is already registered');
      }

      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingRelayPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingPolkadotAssetHubPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and exchange DOT with Relay (default reserve)', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.getSudo().foreignAssets.forceSetForeignAssetReserveOverride(alice, relayLocation, null);
    });

    // Relay sends DOT as its reserve chain
    await testHelper.palletXcmSendDotFromTo(
      'relay',
      'unique',
      'LocalReserve',
      randomAccount,
      randomAccount,
      2n * SENDTO_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );

    // Unique sends some DOT back using pallet-xcm `transfer_assets_using_type_and_then`
    await testHelper.palletXcmSendDotFromTo(
      'unique',
      'relay',
      'DestinationReserve',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );

    // XTokens should send the message to the correct destination (Relay, in this case)
    await usingPlaygrounds(async (helper) => {
      const api = helper.getApi();

      const xtokensTransferCall = await helper.constructApiCall('api.tx.xTokens.transfer', [
        dotDerivativeCollectionId,
        SENDBACK_AMOUNT,
        {V4: { parents: 1, interior: {X1: [{AccountId32: { id:randomAccount.addressRaw }}]} }},
        'Unlimited',
      ]);

      const xcmVersion = 4;
      const dryRunResult = await api.call.dryRunApi.dryRunCall(
        {system: {Signed: randomAccount.address}},
        xtokensTransferCall.method.toHex(),
        xcmVersion,
      ).then(r => r.toJSON() as any);

      const forwardedXcm = dryRunResult!.ok.forwardedXcms[0];
      const forwardedDest = forwardedXcm[0].v4;

      expect(forwardedDest.parents).to.be.equal(1);
      expect(forwardedDest.interior.here).to.be.null;
    });

    // Send DOT from AH as it were the DOT reserve
    // AH is not DOT reserve in this scenario, so Unique should reject this
    await testHelper.palletXcmSendDotFromTo(
      'polkadotAssetHub',
      'unique',
      'LocalReserve',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectFailure'
    );
  });

  itSub('Should connect and exchange DOT with AH (reserve override)', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.getSudo().foreignAssets.forceSetForeignAssetReserveOverride(alice, relayLocation, assetHubLocation);
    });

    // AH sends DOT as its reserve chain
    await testHelper.palletXcmSendDotFromTo(
      'polkadotAssetHub',
      'unique',
      'LocalReserve',
      randomAccount,
      randomAccount,
      2n * SENDTO_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );

    // Unique sends some DOT back using pallet-xcm `transfer_assets_using_type_and_then`
    await testHelper.palletXcmSendDotFromTo(
      'unique',
      'polkadotAssetHub',
      'DestinationReserve',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );

    // XTokens should send the message to the correct destination (AH, in this case)
    await usingPlaygrounds(async (helper) => {
      const api = helper.getApi();

      const xtokensTransferCall = await helper.constructApiCall('api.tx.xTokens.transfer', [
        dotDerivativeCollectionId,
        SENDBACK_AMOUNT,
        {V4: { parents: 1, interior: {X1: [{AccountId32: { id:randomAccount.addressRaw }}]} }},
        'Unlimited',
      ]);

      const xcmVersion = 4;
      const dryRunResult = await api.call.dryRunApi.dryRunCall(
        {system: {Signed: randomAccount.address}},
        xtokensTransferCall.method.toHex(),
        xcmVersion,
      ).then(r => r.toJSON() as any);

      const forwardedXcm = dryRunResult!.ok.forwardedXcms[0];
      const forwardedDest = forwardedXcm[0].v4;

      expect(forwardedDest.parents).to.be.equal(1);
      expect(forwardedDest.interior.x1[0].parachain).to.be.equal(1000);
    });

    // Send DOT from the Relay as it were the DOT reserve
    // Relay is not DOT reserve in this scenario, so Unique should reject this
    await testHelper.palletXcmSendDotFromTo(
      'relay',
      'unique',
      'LocalReserve',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT / 2n,
      dotDerivativeCollectionId,
      'ExpectFailure'
    );
  });

  itSub('DOT transfer from Unique suspended', async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.getSudo().foreignAssets.forceSetForeignAssetReserveOverride(alice, relayLocation, null);

      // Enable suspension
      await helper.getSudo().foreignAssets.forceSetForeignAssetSuspension(alice, relayLocation, true);
    });

    // Relay sends DOT as its reserve chain
    testHelper.palletXcmSendDotFromTo(
      'relay',
      'unique',
      'LocalReserve',
      randomAccount,
      randomAccount,
      2n * SENDTO_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );

    // Unique sends some DOT back using pallet-xcm `transfer_assets_using_type_and_then`
    await expect(testHelper.palletXcmSendDotFromTo(
      'unique',
      'relay',
      'DestinationReserve',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    )).to.be.rejectedWith(/polkadotXcm\.LocalExecutionIncomplete/);

    await usingPlaygrounds(async (helper) => {
      expect(helper.xTokens.transfer(
        randomAccount,
        dotDerivativeCollectionId,
        SENDBACK_AMOUNT,
        {V4: {parents: 1, interior: {X1: [{ AccountId32: { id: randomAccount.addressRaw } }]}}},
        'Unlimited'
      )).to.be.rejectedWith(/polkadotXcm\.LocalExecutionIncomplete/);

      // Disable suspension
      await helper.getSudo().foreignAssets.forceSetForeignAssetSuspension(alice, relayLocation, false);

      expect(helper.xTokens.transfer(
        randomAccount,
        dotDerivativeCollectionId,
        SENDBACK_AMOUNT,
        {V4: {parents: 1, interior: {X1: [{ AccountId32: { id: randomAccount.addressRaw } }]}}},
        'Unlimited'
      )).to.be.fulfilled;
    });

    // Unique sends some DOT back using pallet-xcm `transfer_assets_using_type_and_then`
    await testHelper.palletXcmSendDotFromTo(
      'unique',
      'relay',
      'DestinationReserve',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      dotDerivativeCollectionId,
      'ExpectSuccess'
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with AssetHub', () => {
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

    await usingPolkadotAssetHubPlaygrounds(async (helper) => {
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

    await usingPolkadotAssetHubPlaygrounds(async (helper) => {
      await helper.assets.mint(alice, USDT_ASSET_ID, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send USDT to Unique', async () => {
    await testHelper.sendUsdtFromTo(
      'polkadotAssetHub',
      'unique',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
      usdtDerivativeCollectionId,
    );
  });

  itSub('Should connect to Unique and send USDT back', async () => {
    await testHelper.sendUsdtFromTo(
      'unique',
      'polkadotAssetHub',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
      usdtDerivativeCollectionId,
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      console.log(config.acalaUrl);
      randomAccount = helper.arrange.createEmptyAccount();

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);

      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });

    await usingAcalaPlaygrounds(async (helper) => {
      const destination = {
        V4: {
          parents: 1,
          interior: {
            X1: [{Parachain: UNIQUE_CHAIN}],
          },
        },
      };

      const metadata = {
        name: 'Unique Network',
        symbol: 'UNQ',
        decimals: UNQ_DECIMALS,
        minimalBalance: 1250_000_000_000_000_000n,
      };
      const assets = (await (helper.callRpc('api.query.assetRegistry.assetMetadatas.entries'))).map(([_k, v] : [any, any]) =>
        hexToString(v.toJSON()['symbol'])) as string[];

      if(!assets.includes('UNQ')) {
        await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      } else {
        console.log('UNQ token already registered on Acala assetRegistry pallet');
      }

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);

      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send UNQ to Acala', async () => {
    await testHelper.sendUnqFromTo(
      'unique',
      'acala',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
    );
  });

  itSub('Should connect to Acala and send UNQ back', async () => {
    await testHelper.sendUnqFromTo(
      'acala',
      'unique',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
    );
  });

  itSub('Acala can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'acala',
      'unique',
    );
  });

  itSub('Should not accept reserve transfer of UNQ from Acala', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'acala',
      'unique',
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging UNQ with Moonbeam', () => {
  let alice: IKeyringPair;

  let randomAccountUnique: IKeyringPair;
  let randomAccountMoonbeam: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccountUnique = helper.arrange.createEmptyAccount();

      await helper.balance.transferToSubstrate(alice, randomAccountUnique.address, SENDER_BUDGET);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingMoonbeamPlaygrounds(async (helper) => {
      const alithAccount = helper.account.alithAccount();

      randomAccountMoonbeam = helper.account.create();

      await helper.balance.transferToEthereum(alithAccount, randomAccountMoonbeam.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send UNQ to Moonbeam', async () => {
    await testHelper.sendUnqFromTo(
      'unique',
      'moonbeam',
      randomAccountUnique,
      randomAccountMoonbeam,
      SENDTO_AMOUNT,
    );
  });

  // TODO Moonbeam uses OpenGov now, we need another way of producing Root Origin in tests.
  // So we can't register our asset on Moonbeam.
  // We just test if the message got to the destination in the previous test.
  itSub.skip('Should connect to Moonbeam and send UNQ back', async () => {
    await testHelper.sendUnqFromTo(
      'moonbeam',
      'unique',
      randomAccountUnique,
      randomAccountMoonbeam,
      SENDBACK_AMOUNT,
    );
  });

  itSub.skip('Moonbeam can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'moonbeam',
      'unique',
    );
  });

  itSub.skip('Should not accept reserve transfer of UNQ from Moonbeam', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'moonbeam',
      'unique',
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Astar', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const UNQ_ASSET_ID_ON_ASTAR = 18_446_744_073_709_551_631n; // The value is taken from the live Astar
  const UNQ_MINIMAL_BALANCE_ON_ASTAR = 1n; // The value is taken from the live Astar

  // Unique -> Astar
  const astarInitialBalance = 1n * 10n ** BigInt(ASTAR_DECIMALS); // 1 ASTR, existential deposit required to actually create the account on Astar.
  const unitsPerSecond = 9_451_000_000_000_000_000n; // The value is taken from the live Astar

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
      console.log('randomAccount', randomAccount.address);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingAstarPlaygrounds(async (helper) => {
      if(!(await helper.callRpc('api.query.assets.asset', [UNQ_ASSET_ID_ON_ASTAR])).toJSON()) {
        console.log('1. Create foreign asset and metadata');
        await helper.getSudo().assets.forceCreate(
          alice,
          UNQ_ASSET_ID_ON_ASTAR,
          alice.address,
          UNQ_MINIMAL_BALANCE_ON_ASTAR,
        );

        await helper.assets.setMetadata(
          alice,
          UNQ_ASSET_ID_ON_ASTAR,
          'Unique Network',
          'UNQ',
          UNQ_DECIMALS,
        );

        console.log('2. Register asset location on Astar');
        const assetLocation = {
          V4: {
            parents: 1,
            interior: {
              X1: [{
                Parachain: UNIQUE_CHAIN,
              }],
            },
          },
        };

        await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.registerAssetLocation', [assetLocation, UNQ_ASSET_ID_ON_ASTAR]);

        console.log('3. Set UNQ payment for XCM execution on Astar');
        await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.setAssetUnitsPerSecond', [assetLocation, unitsPerSecond]);
      } else {
        console.log('UNQ is already registered on Astar');
      }
      console.log('4. Transfer 1 ASTR to recipient to create the account (needed due to existential balance)');
      await helper.balance.transferToSubstrate(alice, randomAccount.address, astarInitialBalance);
    });
  });

  itSub('Should connect and send UNQ to Astar', async () => {
    await testHelper.sendUnqFromTo(
      'unique',
      'astar',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
    );
  });

  itSub('Should connect to Astar and send UNQ back', async () => {
    await testHelper.sendUnqFromTo(
      'astar',
      'unique',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
    );
  });

  itSub('Astar can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'astar',
      'unique',
    );
  });

  itSub('Should not accept reserve transfer of UNQ from Astar', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'astar',
      'unique',
    );
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with HydraDx', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      console.log(config.acalaUrl);
      randomAccount = helper.arrange.createEmptyAccount();

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });

    await usingHydraDxPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
    });
  });

  itSub('Should connect and send UNQ to HydraDx', async () => {
    await testHelper.sendUnqFromTo(
      'unique',
      'hydraDx',
      randomAccount,
      randomAccount,
      SENDTO_AMOUNT,
    );
  });

  // TODO
  itSub.skip('Should connect to HydraDx and send UNQ back', async () => {
    await testHelper.sendUnqFromTo(
      'hydraDx',
      'unique',
      randomAccount,
      randomAccount,
      SENDBACK_AMOUNT,
    );
  });

  itSub('HydraDx can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance(
      alice,
      'hydraDx',
      'unique',
    );
  });

  itSub('Should not accept reserve transfer of UNQ from HydraDx', async () => {
    await testHelper.rejectReserveTransferUNQfrom(
      alice,
      'hydraDx',
      'unique',
    );
  });
});

// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCM] Integration test: Unique rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });
  });

  itSub('Unique rejects ACA tokens from Acala', async () => {
    await testHelper.rejectNativeTokensFrom(
      alice,
      'acala',
      'unique',
    );
  });

  // TODO Moonbeam uses OpenGov now, we need another way of producing Root Origin in tests.
  itSub.skip('Unique rejects GLMR tokens from Moonbeam', async () => {
    await testHelper.rejectNativeTokensFrom(
      alice,
      'moonbeam',
      'unique',
    );
  });

  itSub('Unique rejects ASTR tokens from Astar', async () => {
    await testHelper.rejectNativeTokensFrom(
      alice,
      'astar',
      'unique',
    );
  });
});
