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

import {IKeyringPair} from '@polkadot/types/types';
import {itSub, describeXCM, usingPlaygrounds, usingKaruraPlaygrounds,  usingMoonriverPlaygrounds, usingShidenPlaygrounds, usingRelayPlaygrounds} from '../util';
import {QUARTZ_CHAIN,  QTZ_DECIMALS,  SHIDEN_DECIMALS, karuraUrl, moonriverUrl,  shidenUrl,  SAFE_XCM_VERSION, XcmTestHelper, TRANSFER_AMOUNT, SENDER_BUDGET, relayUrl} from './xcm.types';
// import {hexToString} from '@polkadot/util';

const testHelper = new XcmTestHelper('quartz');

describeXCM('[XCMLL] Integration test: Exchanging tokens with Karura', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      // const destination = {
      //   V2: {
      //     parents: 1,
      //     interior: {
      //       X1: {
      //         Parachain: QUARTZ_CHAIN,
      //       },
      //     },
      //   },
      // };

      // const metadata = {
      //   name: 'Quartz',
      //   symbol: 'QTZ',
      //   decimals: 18,
      //   minimalBalance: 1000000000000000000n,
      // };

      // const assets = (await (helper.callRpc('api.query.assetRegistry.assetMetadatas.entries'))).map(([_k, v]: [any, any]) =>
      //   hexToString(v.toJSON()['symbol'])) as string[];

      // if(!assets.includes('QTZ')) {
      //   await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      // } else {
      //   console.log('QTZ token already registered on Karura assetRegistry pallet');
      // }
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
    });
  });

  itSub('Should connect and send QTZ to Karura', async () => {
    await testHelper.sendUnqTo('karura', randomAccount);
  });

  itSub('Should connect to Karura and send QTZ back', async () => {
    await testHelper.sendUnqBack('karura', alice, randomAccount);
  });

  itSub('Karura can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('karura', alice);
  });
});
// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCMLL] Integration test: Quartz rejects non-native tokens', () => {
  let alice: IKeyringPair;


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');



      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });
  });

  itSub('Quartz rejects KAR tokens from Karura', async () => {
    await testHelper.rejectNativeTokensFrom('karura', alice);
  });

  itSub('Quartz rejects MOVR tokens from Moonriver', async () => {
    await testHelper.rejectNativeTokensFrom('moonriver', alice);
  });

  itSub('Quartz rejects SDN tokens from Shiden', async () => {
    await testHelper.rejectNativeTokensFrom('shiden', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging QTZ with Moonriver', () => {
  // Quartz constants
  let alice: IKeyringPair;
  // let quartzAssetLocation;

  let randomAccountQuartz: IKeyringPair;
  let randomAccountMoonriver: IKeyringPair;

  // Moonriver constants
  let assetId: string;

  // const quartzAssetMetadata = {
  //   name: 'xcQuartz',
  //   symbol: 'xcQTZ',
  //   decimals: 18,
  //   isFrozen: false,
  //   minimalBalance: 1n,
  // };


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccountQuartz] = await helper.arrange.createAccounts([0n], alice);


      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const alithAccount = helper.account.alithAccount();
      const baltatharAccount = helper.account.baltatharAccount();
      const dorothyAccount = helper.account.dorothyAccount();

      randomAccountMoonriver = helper.account.create();

      // >>> Sponsoring Dorothy >>>
      console.log('Sponsoring Dorothy.......');
      await helper.balance.transferToEthereum(alithAccount, dorothyAccount.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring Dorothy.......DONE');
      // <<< Sponsoring Dorothy <<<

      // quartzAssetLocation = {
      //   XCM: {
      //     parents: 1,
      //     interior: {X1: {Parachain: QUARTZ_CHAIN}},
      //   },
      // };
      // const existentialDeposit = 1n;
      // const isSufficient = true;
      // const unitsPerSecond = 1n;
      // const numAssetsWeightHint = 0;
      // if((await helper.assetManager.assetTypeId(quartzAssetLocation)).toJSON()) {
      //   console.log('Quartz asset already registered on Moonriver');
      // } else {
      //   const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
      //     location: quartzAssetLocation,
      //     metadata: quartzAssetMetadata,
      //     existentialDeposit,
      //     isSufficient,
      //     unitsPerSecond,
      //     numAssetsWeightHint,
      //   });

      //   console.log('Encoded proposal for registerForeignAsset & setAssetUnitsPerSecond is %s', encodedProposal);

      //   await helper.fastDemocracy.executeProposal('register QTZ foreign asset', encodedProposal);
      // }
      // >>> Acquire Quartz AssetId Info on Moonriver >>>
      console.log('Acquire Quartz AssetId Info on Moonriver.......');

      // assetId = (await helper.assetManager.assetTypeId(quartzAssetLocation)).toString();

      console.log('QTZ asset ID is %s', assetId);
      console.log('Acquire Quartz AssetId Info on Moonriver.......DONE');
      // >>> Acquire Quartz AssetId Info on Moonriver >>>

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonriver.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccountQuartz.address, 10n * TRANSFER_AMOUNT);
    });
  });

  itSub('Should connect and send QTZ to Moonriver', async () => {
    await testHelper.sendUnqTo('moonriver', randomAccountQuartz, randomAccountMoonriver);
  });

  itSub('Should connect to Moonriver and send QTZ back', async () => {
    await testHelper.sendUnqBack('moonriver', alice, randomAccountQuartz);
  });

  itSub('Moonriver can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('moonriver', alice);
  });

  itSub('Should not accept reserve transfer of QTZ from Moonriver', async () => {
    await testHelper.rejectReserveTransferUNQfrom('moonriver', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging tokens with Shiden', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const QTZ_ASSET_ID_ON_SHIDEN = 18_446_744_073_709_551_633n; // The value is taken from the live Shiden
  const QTZ_MINIMAL_BALANCE_ON_SHIDEN = 1n; // The value is taken from the live Shiden

  // Quartz -> Shiden
  const shidenInitialBalance = 1n * (10n ** SHIDEN_DECIMALS); // 1 SHD, existential deposit required to actually create the account on Shiden
  // const unitsPerSecond = 500_451_000_000_000_000_000n; // The value is taken from the live Shiden

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      randomAccount = helper.arrange.createEmptyAccount();
      await helper.balance.transferToSubstrate(alice, randomAccount.address, SENDER_BUDGET);
      console.log('sender: ', randomAccount.address);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      // if(!(await helper.callRpc('api.query.assets.asset', [QTZ_ASSET_ID_ON_SHIDEN])).toJSON()) {
      //   console.log('1. Create foreign asset and metadata');
      //   await helper.assets.create(
      //     alice,
      //     QTZ_ASSET_ID_ON_SHIDEN,
      //     alice.address,
      //     QTZ_MINIMAL_BALANCE_ON_SHIDEN,
      //   );

      //   await helper.assets.setMetadata(
      //     alice,
      //     QTZ_ASSET_ID_ON_SHIDEN,
      //     'Quartz',
      //     'QTZ',
      //     Number(QTZ_DECIMALS),
      //   );

      //   console.log('2. Register asset location on Shiden');
      //   const assetLocation = {
      //     V2: {
      //       parents: 1,
      //       interior: {
      //         X1: {
      //           Parachain: QUARTZ_CHAIN,
      //         },
      //       },
      //     },
      //   };

      //   await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.registerAssetLocation', [assetLocation, QTZ_ASSET_ID_ON_SHIDEN]);

      //   console.log('3. Set QTZ payment for XCM execution on Shiden');
      //   await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.setAssetUnitsPerSecond', [assetLocation, unitsPerSecond]);
      // } else {
      //   console.log('QTZ is already registered on Shiden');
      // }
      console.log('4. Transfer 1 SDN to recipient to create the account (needed due to existential balance)');
      await helper.balance.transferToSubstrate(alice, randomAccount.address, shidenInitialBalance);
    });
  });

  itSub('Should connect and send QTZ to Shiden', async () => {
    await testHelper.sendUnqTo('shiden', randomAccount);
  });

  itSub('Should connect to Shiden and send QTZ back', async () => {
    await testHelper.sendUnqBack('shiden', alice, randomAccount);
  });

  itSub('Shiden can send only up to its balance', async () => {
    await testHelper.sendOnlyOwnedBalance('shiden', alice);
  });

  itSub('Should not accept reserve transfer of QTZ from Shiden', async () => {
    await testHelper.rejectReserveTransferUNQfrom('shiden', alice);
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

  itSub('The relay can set storage', async () => {
    await testHelper.relayIsPermittedToSetStorage(sudoer, 'plain');
  });

  itSub('The relay can batch set storage', async () => {
    await testHelper.relayIsPermittedToSetStorage(sudoer, 'batch');
  });

  itSub('The relay can batchAll set storage', async () => {
    await testHelper.relayIsPermittedToSetStorage(sudoer, 'batchAll');
  });

  itSub('The relay can forceBatch set storage', async () => {
    await testHelper.relayIsPermittedToSetStorage(sudoer, 'forceBatch');
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
