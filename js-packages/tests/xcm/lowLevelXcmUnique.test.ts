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
import {itSub, describeXCM, usingPlaygrounds, usingAcalaPlaygrounds, usingMoonbeamPlaygrounds, usingAstarPlaygrounds, usingPolkadexPlaygrounds, usingRelayPlaygrounds} from '../util/index.js';
import {nToBigInt} from '@polkadot/util';
import {hexToString} from '@polkadot/util';
import {ASTAR_DECIMALS, SAFE_XCM_VERSION, SENDER_BUDGET, UNIQUE_CHAIN, UNQ_DECIMALS, XcmTestHelper, acalaUrl, astarUrl,  moonbeamUrl, polkadexUrl, relayUrl, uniqueAssetId} from './xcm.types.js';

const testHelper = new XcmTestHelper('unique');




describeXCM('[XCMLL] Integration test: Exchanging tokens with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      console.log(config.acalaUrl);
      randomAccount = helper.arrange.createEmptyAccount();

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X1: {
              Parachain: UNIQUE_CHAIN,
            },
          },
        },
      };

      const metadata = {
        name: 'Unique Network',
        symbol: 'UNQ',
        decimals: 18,
        minimalBalance: 1250_000_000_000_000_000n,
      };
      const assets = (await (helper.callRpc('api.query.assetRegistry.assetMetadatas.entries'))).map(([_k, v] : [any, any]) =>
        hexToString(v.toJSON()['symbol'])) as string[];

      if(!assets.includes('UNQ')) {
        await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      } else {
        console.log('UNQ token already registered on Acala assetRegistry pallet');
      }
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send UNQ to Acala', async () => {
    await testHelper.sendUnqTo('acala', randomAccount);
  });

  itSub('Should connect to Acala and send UNQ back', async () => {
    await testHelper.sendUnqBack('acala', alice, randomAccount);
  });

  itSub('Acala can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('acala', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Acala', async () => {
    await testHelper.rejectReserveTransferUNQfrom('acala', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging tokens with Polkadex', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      const isWhitelisted = ((await helper.callRpc('api.query.xcmHelper.whitelistedTokens', []))
        .toJSON() as [])
        .map(nToBigInt).length != 0;
      /*
      Check whether the Unique token has been added
      to the whitelist, since an error will occur
      if it is added again. Needed for debugging
      when this test is run multiple times.
      */
      if(isWhitelisted) {
        console.log('UNQ token is already whitelisted on Polkadex');
      } else {
        await helper.getSudo().xcmHelper.whitelistToken(alice, uniqueAssetId);
      }

      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send UNQ to Polkadex', async () => {
    await testHelper.sendUnqTo('polkadex', randomAccount);
  });


  itSub('Should connect to Polkadex and send UNQ back', async () => {
    await testHelper.sendUnqBack('polkadex', alice, randomAccount);
  });

  itSub('Polkadex can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('polkadex', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Polkadex', async () => {
    await testHelper.rejectReserveTransferUNQfrom('polkadex', alice);
  });
});

// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCMLL] Integration test: Unique rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });
  });

  itSub('Unique rejects ACA tokens from Acala', async () => {
    await testHelper.rejectNativeTokensFrom('acala', alice);
  });

  itSub('Unique rejects GLMR tokens from Moonbeam', async () => {
    await testHelper.rejectNativeTokensFrom('moonbeam', alice);
  });

  itSub('Unique rejects ASTR tokens from Astar', async () => {
    await testHelper.rejectNativeTokensFrom('astar', alice);
  });

  itSub('Unique rejects PDX tokens from Polkadex', async () => {
    await testHelper.rejectNativeTokensFrom('polkadex', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging UNQ with Moonbeam', () => {
  // Unique constants
  let alice: IKeyringPair;
  let uniqueAssetLocation;

  let randomAccountUnique: IKeyringPair;
  let randomAccountMoonbeam: IKeyringPair;

  // Moonbeam constants
  let assetId: string;

  const uniqueAssetMetadata = {
    name: 'xcUnique',
    symbol: 'xcUNQ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1n,
  };


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccountUnique] = await helper.arrange.createAccounts([0n], alice);


      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const alithAccount = helper.account.alithAccount();
      const baltatharAccount = helper.account.baltatharAccount();
      const dorothyAccount = helper.account.dorothyAccount();

      randomAccountMoonbeam = helper.account.create();

      // >>> Sponsoring Dorothy >>>
      console.log('Sponsoring Dorothy.......');
      await helper.balance.transferToEthereum(alithAccount, dorothyAccount.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring Dorothy.......DONE');
      // <<< Sponsoring Dorothy <<<
      uniqueAssetLocation = {
        XCM: {
          parents: 1,
          interior: {X1: {Parachain: UNIQUE_CHAIN}},
        },
      };
      const existentialDeposit = 1n;
      const isSufficient = true;
      const unitsPerSecond = 1n;
      const numAssetsWeightHint = 0;

      if((await helper.assetManager.assetTypeId(uniqueAssetLocation)).toJSON()) {
        console.log('Unique asset already registered on Moonbeam');
      } else {
        const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
          location: uniqueAssetLocation,
          metadata: uniqueAssetMetadata,
          existentialDeposit,
          isSufficient,
          unitsPerSecond,
          numAssetsWeightHint,
        });

        console.log('Encoded proposal for registerForeignAsset & setAssetUnitsPerSecond is %s', encodedProposal);

        await helper.fastDemocracy.executeProposal('register UNQ foreign asset', encodedProposal);
      }

      // >>> Acquire Unique AssetId Info on Moonbeam >>>
      console.log('Acquire Unique AssetId Info on Moonbeam.......');

      assetId = (await helper.assetManager.assetTypeId(uniqueAssetLocation)).toString();

      console.log('UNQ asset ID is %s', assetId);
      console.log('Acquire Unique AssetId Info on Moonbeam.......DONE');

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonbeam.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccountUnique.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send UNQ to Moonbeam', async () => {
    await testHelper.sendUnqTo('moonbeam', randomAccountUnique, randomAccountMoonbeam);
  });

  itSub('Should connect to Moonbeam and send UNQ back', async () => {
    await testHelper.sendUnqBack('moonbeam', alice, randomAccountUnique);
  });

  itSub('Moonbeam can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('moonbeam', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Moonbeam', async () => {
    await testHelper.rejectReserveTransferUNQfrom('moonbeam', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging tokens with Astar', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const UNQ_ASSET_ID_ON_ASTAR = 18_446_744_073_709_551_631n; // The value is taken from the live Astar
  const UNQ_MINIMAL_BALANCE_ON_ASTAR = 1n; // The value is taken from the live Astar

  // Unique -> Astar
  const astarInitialBalance = 1n * (10n ** ASTAR_DECIMALS); // 1 ASTR, existential deposit required to actually create the account on Astar.
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

    await usingAstarPlaygrounds(astarUrl, async (helper) => {
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
          Number(UNQ_DECIMALS),
        );

        console.log('2. Register asset location on Astar');
        const assetLocation = {
          V2: {
            parents: 1,
            interior: {
              X1: {
                Parachain: UNIQUE_CHAIN,
              },
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
    await testHelper.sendUnqTo('astar', randomAccount);
  });

  itSub('Should connect to Astar and send UNQ back', async () => {
    await testHelper.sendUnqBack('astar', alice, randomAccount);
  });

  itSub('Astar can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('astar', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Astar', async () => {
    await testHelper.rejectReserveTransferUNQfrom('astar', alice);
  });
});

describeXCM('[XCMLL] Integration test: The relay can do some root ops', () => {
  let sudoer: IKeyringPair;

  before(async function () {
    await usingRelayPlaygrounds(relayUrl, async (_, privateKey) => {
      sudoer = await privateKey('//Alice');
    });
  });

  // At the moment there is no reliable way
  // to establish the correspondence between the `ExecutedDownward` event
  // and the relay's sent message due to `SetTopic` instruction
  // containing an unpredictable topic silently added by the relay's messages on the router level.
  // This changes the message hash on arrival to our chain.
  //
  // See:
  // * The relay's router: https://github.com/paritytech/polkadot-sdk/blob/f60318f68687e601c47de5ad5ca88e2c3f8139a7/polkadot/runtime/westend/src/xcm_config.rs#L83
  // * The `WithUniqueTopic` helper: https://github.com/paritytech/polkadot-sdk/blob/945ebbbcf66646be13d5b1d1bc26c8b0d3296d9e/polkadot/xcm/xcm-builder/src/routing.rs#L36
  //
  // Because of this, we insert time gaps between tests so
  // different `ExecutedDownward` events won't interfere with each other.
  afterEach(async () => {
    await usingPlaygrounds(async (helper) => {
      await helper.wait.newBlocks(3);
    });
  });

  itSub('The relay can set sudo key', async ({helper}) => {
    await testHelper.relayCanSetSudoKey(sudoer, helper);
  });

  itSub('[negative] The relay cannot set balance', async () => {
    await testHelper.relayIsNotPermittedToSetBalance(sudoer, 'plain');
  });

  itSub('[negative] The relay cannot set balance via batch', async () => {
    await testHelper.relayIsNotPermittedToSetBalance(sudoer, 'batch');
  });

  itSub('[negative] The relay cannot set balance via batchAll', async () => {
    await testHelper.relayIsNotPermittedToSetBalance(sudoer, 'batchAll');
  });

  itSub('[negative] The relay cannot set balance via forceBatch', async () => {
    await testHelper.relayIsNotPermittedToSetBalance(sudoer, 'forceBatch');
  });

  itSub('[negative] The relay cannot set balance via dispatchAs', async () => {
    await testHelper.relayIsNotPermittedToSetBalance(sudoer, 'dispatchAs');
  });
});
