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
import config from '../config';
import {itSub, expect, describeXCM, usingPlaygrounds, usingAcalaPlaygrounds, usingMoonbeamPlaygrounds, usingAstarPlaygrounds, usingPolkadexPlaygrounds} from '../util';
import {Event} from '../util/playgrounds/unique.dev';
import {nToBigInt} from '@polkadot/util';
import {hexToString} from '@polkadot/util';
import {ASTAR_DECIMALS, NETWORKS, SAFE_XCM_VERSION, UNIQUE_CHAIN, UNQ_DECIMALS, acalaUrl, astarUrl, expectFailedToTransact, expectUntrustedReserveLocationFail, getDevPlayground, mapToChainId, mapToChainUrl, maxWaitBlocks, moonbeamUrl, polkadexUrl, uniqueAssetId, uniqueVersionedMultilocation} from './xcm.types';


const TRANSFER_AMOUNT = 2000000_000_000_000_000_000_000n;
const SENDER_BUDGET = 2n * TRANSFER_AMOUNT;
const SENDBACK_AMOUNT = TRANSFER_AMOUNT / 2n;
const STAYED_ON_TARGET_CHAIN = TRANSFER_AMOUNT - SENDBACK_AMOUNT;
const TARGET_CHAIN_TOKEN_TRANSFER_AMOUNT = 100_000_000_000n;

let balanceUniqueTokenInit: bigint;
let balanceUniqueTokenMiddle: bigint;
let balanceUniqueTokenFinal: bigint;
let unqFees: bigint;


async function genericSendUnqTo(
  networkName: keyof typeof NETWORKS,
  randomAccount: IKeyringPair,
  randomAccountOnTargetChain = randomAccount,
) {
  const networkUrl = mapToChainUrl(networkName);
  const targetPlayground = getDevPlayground(networkName);
  await usingPlaygrounds(async (helper) => {
    balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: mapToChainId(networkName),
          },
        },
      },
    };

    const beneficiary = {
      V2: {
        parents: 0,
        interior: {
          X1: (
            networkName == 'moonbeam' ?
              {
                AccountKey20: {
                  network: 'Any',
                  key: randomAccountOnTargetChain.address,
                },
              }
              :
              {
                AccountId32: {
                  network: 'Any',
                  id: randomAccountOnTargetChain.addressRaw,
                },
              }
          ),
        },
      },
    };

    const assets = {
      V2: [
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

    await helper.xcm.limitedReserveTransferAssets(randomAccount, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    const messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    unqFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> %s] transaction fees on Unique: %s UNQ', networkName, helper.util.bigIntToDecimals(unqFees));
    expect(unqFees > 0n, 'Negative fees UNQ, looks like nothing was transferred').to.be.true;

    await targetPlayground(networkUrl, async (helper) => {
      /*
        Since only the parachain part of the Polkadex
        infrastructure is launched (without their
        solochain validators), processing incoming
        assets will lead to an error.
        This error indicates that the Polkadex chain
        received a message from the Unique network,
        since the hash is being checked to ensure
        it matches what was sent.
      */
      if(networkName == 'polkadex') {
        await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash);
      } else {
        await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Success, event => event.messageHash == messageSent.messageHash);
      }
    });

  });
}

async function genericSendUnqBack(
  networkName: keyof typeof NETWORKS,
  sudoer: IKeyringPair,
  randomAccountOnUnq: IKeyringPair,
) {
  const networkUrl = mapToChainUrl(networkName);

  const targetPlayground = getDevPlayground(networkName);
  await usingPlaygrounds(async (helper) => {

    const xcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      randomAccountOnUnq.addressRaw,
      uniqueAssetId,
      SENDBACK_AMOUNT,
    );

    let xcmProgramSent: any;


    await targetPlayground(networkUrl, async (helper) => {
      if('getSudo' in helper) {
        await helper.getSudo().xcm.send(sudoer, uniqueVersionedMultilocation, xcmProgram);
        xcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      } else if('fastDemocracy' in helper) {
        const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueVersionedMultilocation, xcmProgram]);
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
        await helper.fastDemocracy.executeProposal(`sending ${networkName} -> Unique via XCM program`, batchCall);
        xcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Success, event => event.messageHash == xcmProgramSent.messageHash);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccountOnUnq.address);

    expect(balanceUniqueTokenFinal).to.be.equal(balanceUniqueTokenInit - unqFees - STAYED_ON_TARGET_CHAIN);

  });
}

async function genericSendOnlyOwnedBalance(
  networkName: keyof typeof NETWORKS,
  sudoer: IKeyringPair,
) {
  const networkUrl = mapToChainUrl(networkName);
  const targetPlayground = getDevPlayground(networkName);

  const targetChainBalance = 10000n * (10n ** UNQ_DECIMALS);

  await usingPlaygrounds(async (helper) => {
    const targetChainSovereignAccount = helper.address.paraSiblingSovereignAccount(mapToChainId(networkName));
    await helper.getSudo().balance.setBalanceSubstrate(sudoer, targetChainSovereignAccount, targetChainBalance);
    const moreThanTargetChainHas = 2n * targetChainBalance;

    const targetAccount = helper.arrange.createEmptyAccount();

    const maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      moreThanTargetChainHas,
    );

    let maliciousXcmProgramSent: any;


    await targetPlayground(networkUrl, async (helper) => {
      if('getSudo' in helper) {
        await helper.getSudo().xcm.send(sudoer, uniqueVersionedMultilocation, maliciousXcmProgram);
        maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      } else if('fastDemocracy' in helper) {
        const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueVersionedMultilocation, maliciousXcmProgram]);
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
        await helper.fastDemocracy.executeProposal(`sending ${networkName} -> Unique via XCM program`, batchCall);
        maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
    });

    await expectFailedToTransact(helper, maliciousXcmProgramSent);

    const targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);
  });
}

async function genericReserveTransferUNQfrom(netwokrName: keyof typeof NETWORKS, sudoer: IKeyringPair) {
  const networkUrl = mapToChainUrl(netwokrName);
  const targetPlayground = getDevPlayground(netwokrName);

  await usingPlaygrounds(async (helper) => {
    const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
    const targetAccount = helper.arrange.createEmptyAccount();

    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      uniqueAssetId,
      testAmount,
    );

    const maliciousXcmProgramHereId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      testAmount,
    );

    let maliciousXcmProgramFullIdSent: any;
    let maliciousXcmProgramHereIdSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Unique using full UNQ identification
    await targetPlayground(networkUrl, async (helper) => {
      if('getSudo' in helper) {
        await helper.getSudo().xcm.send(sudoer, uniqueVersionedMultilocation, maliciousXcmProgramFullId);
        maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
      // Moonbeam case
      else if('fastDemocracy' in helper) {
        const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueVersionedMultilocation, maliciousXcmProgramFullId]);
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
        await helper.fastDemocracy.executeProposal(`${netwokrName} try to act like a reserve location for UNQ using path asset identification`,batchCall);

        maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
    });


    await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramFullIdSent);

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Unique using shortened UNQ identification
    await targetPlayground(networkUrl, async (helper) => {
      if('getSudo' in helper) {
        await helper.getSudo().xcm.send(sudoer, uniqueVersionedMultilocation, maliciousXcmProgramHereId);
        maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
      else if('fastDemocracy' in helper) {
        const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueVersionedMultilocation, maliciousXcmProgramHereId]);
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
        await helper.fastDemocracy.executeProposal(`${netwokrName} try to act like a reserve location for UNQ using "here" asset identification`, batchCall);

        maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
    });

    await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramHereIdSent);

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
}

async function genericRejectNativeTokensFrom(networkName: keyof typeof NETWORKS, sudoerOnTargetChain: IKeyringPair) {
  const networkUrl = mapToChainUrl(networkName);
  const targetPlayground = getDevPlayground(networkName);
  let messageSent: any;

  await usingPlaygrounds(async (helper) => {
    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      helper.arrange.createEmptyAccount().addressRaw,
      {
        Concrete: {
          parents: 1,
          interior: {
            X1: {
              Parachain: mapToChainId(networkName),
            },
          },
        },
      },
      TARGET_CHAIN_TOKEN_TRANSFER_AMOUNT,
    );
    await targetPlayground(networkUrl, async (helper) => {
      if('getSudo' in helper) {
        await helper.getSudo().xcm.send(sudoerOnTargetChain, uniqueVersionedMultilocation, maliciousXcmProgramFullId);
        messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      } else if('fastDemocracy' in helper) {
        const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueVersionedMultilocation, maliciousXcmProgramFullId]);
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
        await helper.fastDemocracy.executeProposal(`${networkName} sending native tokens to the Unique via fast democracy`, batchCall);

        messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
      }
    });
    await expectFailedToTransact(helper, messageSent);
  });
}


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
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send UNQ to Acala', async () => {
    await genericSendUnqTo('acala', randomAccount);
  });

  itSub('Should connect to Acala and send UNQ back', async () => {
    await genericSendUnqBack('acala', alice, randomAccount);
  });

  itSub('Acala can send only up to its balance', async () => {
    await genericSendOnlyOwnedBalance('acala', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Acala', async () => {
    await genericReserveTransferUNQfrom('acala', alice);
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
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send UNQ to Polkadex', async () => {
    await genericSendUnqTo('polkadex', randomAccount);
  });


  itSub('Should connect to Polkadex and send UNQ back', async () => {
    await genericSendUnqBack('polkadex', alice, randomAccount);
  });

  itSub('Polkadex can send only up to its balance', async () => {
    await genericSendOnlyOwnedBalance('polkadex', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Polkadex', async () => {
    await genericReserveTransferUNQfrom('polkadex', alice);
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
    await genericRejectNativeTokensFrom('acala', alice);
  });

  itSub('Unique rejects GLMR tokens from Moonbeam', async () => {
    await genericRejectNativeTokensFrom('moonbeam', alice);
  });

  itSub('Unique rejects ASTR tokens from Astar', async () => {
    await genericRejectNativeTokensFrom('astar', alice);
  });

  itSub('Unique rejects PDX tokens from Polkadex', async () => {
    await genericRejectNativeTokensFrom('polkadex', alice);
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
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccountUnique.address);
    });
  });

  itSub('Should connect and send UNQ to Moonbeam', async () => {
    await genericSendUnqTo('moonbeam', randomAccountUnique, randomAccountMoonbeam);
  });

  itSub('Should connect to Moonbeam and send UNQ back', async () => {
    await genericSendUnqBack('moonbeam', alice, randomAccountUnique);
  });

  itSub('Moonbeam can send only up to its balance', async () => {
    await genericSendOnlyOwnedBalance('moonbeam', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Moonbeam', async () => {
    await genericReserveTransferUNQfrom('moonbeam', alice);
  });
});

describeXCM('[XCMLL] Integration test: Exchanging tokens with Astar', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const UNQ_ASSET_ID_ON_ASTAR = 1;
  const UNQ_MINIMAL_BALANCE_ON_ASTAR = 1n;

  // Unique -> Astar
  const astarInitialBalance = 1n * (10n ** ASTAR_DECIMALS); // 1 ASTR, existential deposit required to actually create the account on Astar.
  const unitsPerSecond = 228_000_000_000n; // This is Phala's value. What will be ours?

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
        // TODO update metadata with values from production
        await helper.assets.create(
          alice,
          UNQ_ASSET_ID_ON_ASTAR,
          alice.address,
          UNQ_MINIMAL_BALANCE_ON_ASTAR,
        );

        await helper.assets.setMetadata(
          alice,
          UNQ_ASSET_ID_ON_ASTAR,
          'Cross chain UNQ',
          'xcUNQ',
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
    await genericSendUnqTo('astar', randomAccount);
  });

  itSub('Should connect to Astar and send UNQ back', async () => {
    await genericSendUnqBack('astar', alice, randomAccount);
  });

  itSub('Astar can send only up to its balance', async () => {
    await genericSendOnlyOwnedBalance('astar', alice);
  });

  itSub('Should not accept reserve transfer of UNQ from Astar', async () => {
    await genericReserveTransferUNQfrom('astar', alice);
  });
});
