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

import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {generateKeyringPair, bigIntToDecimals} from '../deprecated-helpers/helpers';
import {blake2AsHex} from '@polkadot/util-crypto';
import {XcmV2TraitsOutcome, XcmV2TraitsError} from '../interfaces';
import {itSub, expect, describeXcm, usingPlaygrounds, usingKaruraPlaygrounds, usingRelayPlaygrounds, usingMoonriverPlaygrounds} from '../util/playgrounds';

const QUARTZ_CHAIN = 2095;
const KARURA_CHAIN = 2000;
const MOONRIVER_CHAIN = 2023;

const RELAY_PORT = 9844;
const KARURA_PORT = 9946;
const MOONRIVER_PORT = 9947;

const relayUrl = 'ws://127.0.0.1:' + RELAY_PORT;
const karuraUrl = 'ws://127.0.0.1:' + KARURA_PORT;
const moonriverUrl = 'ws://127.0.0.1:' + MOONRIVER_PORT;

const KARURA_DECIMALS = 12;

const TRANSFER_AMOUNT = 2000000000000000000000000n;

describeXcm('[XCM] Integration test: Exchanging tokens with Karura', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let balanceQuartzTokenInit: bigint;
  let balanceQuartzTokenMiddle: bigint;
  let balanceQuartzTokenFinal: bigint;
  let balanceKaruraTokenInit: bigint;
  let balanceKaruraTokenMiddle: bigint;
  let balanceKaruraTokenFinal: bigint;
  let balanceQuartzForeignTokenInit: bigint;
  let balanceQuartzForeignTokenMiddle: bigint;
  let balanceQuartzForeignTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const keyringSr25519 = new Keyring({type: 'sr25519'});

      alice = privateKey('//Alice');
      randomAccount = generateKeyringPair(keyringSr25519);
    });

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const destination = {
        V0: {
          X2: [
            'Parent',
            {
              Parachain: QUARTZ_CHAIN,
            },
          ],
        },
      };

      const metadata = {
        name: 'QTZ',
        symbol: 'QTZ',
        decimals: 18,
        minimalBalance: 1n,
      };

      await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
      balanceKaruraTokenInit = await helper.balance.getSubstrate(randomAccount.address);
      balanceQuartzForeignTokenInit = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10n * TRANSFER_AMOUNT);
      balanceQuartzTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send QTZ to Karura', async ({helper}) => {
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
    const weightLimit = 5000000000;

    await helper.xcm.limitedReserveTransferAssets(randomAccount, destination, beneficiary, assets, feeAssetItem, weightLimit);
    balanceQuartzTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    const qtzFees = balanceQuartzTokenInit - balanceQuartzTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Quartz -> Karura] transaction fees on Quartz: %s QTZ', bigIntToDecimals(qtzFees));
    expect(qtzFees > 0n).to.be.true;

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.wait.newBlocks(3);
      balanceQuartzForeignTokenMiddle = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
      balanceKaruraTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

      const karFees = balanceKaruraTokenInit - balanceKaruraTokenMiddle;
      const qtzIncomeTransfer = balanceQuartzForeignTokenMiddle - balanceQuartzForeignTokenInit;

      console.log(
        '[Quartz -> Karura] transaction fees on Karura: %s KAR',
        bigIntToDecimals(karFees, KARURA_DECIMALS),
      );
      console.log('[Quartz -> Karura] income %s QTZ', bigIntToDecimals(qtzIncomeTransfer));
      expect(karFees == 0n).to.be.true;
      expect(qtzIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Karura and send QTZ back', async ({helper}) => {
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: QUARTZ_CHAIN},
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

      const destWeight = 50000000;

      await helper.xTokens.transfer(randomAccount, id, TRANSFER_AMOUNT, destination, destWeight);
      balanceKaruraTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
      balanceQuartzForeignTokenFinal = await helper.tokens.accounts(randomAccount.address, id);

      const karFees = balanceKaruraTokenMiddle - balanceKaruraTokenFinal;
      const qtzOutcomeTransfer = balanceQuartzForeignTokenMiddle - balanceQuartzForeignTokenFinal;

      console.log(
        '[Karura -> Quartz] transaction fees on Karura: %s KAR',
        bigIntToDecimals(karFees, KARURA_DECIMALS),
      );
      console.log('[Karura -> Quartz] outcome %s QTZ', bigIntToDecimals(qtzOutcomeTransfer));

      expect(karFees > 0).to.be.true;
      expect(qtzOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceQuartzTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
    const actuallyDelivered = balanceQuartzTokenFinal - balanceQuartzTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Karura -> Quartz] actually delivered %s QTZ', bigIntToDecimals(actuallyDelivered));

    const qtzFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Karura -> Quartz] transaction fees on Quartz: %s QTZ', bigIntToDecimals(qtzFees));
    expect(qtzFees == 0n).to.be.true;
  });
});

// These tests are relevant only when the foreign asset pallet is disabled
describeXcm('[XCM] Integration test: Quartz rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      alice = privateKey('//Alice');
    });
  });

  itSub('Quartz rejects tokens from the Relay', async ({helper}) => {
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 0,
          interior: {X1: {
            Parachain: QUARTZ_CHAIN,
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
      const weightLimit = 5_000_000_000;

      await helper.xcm.limitedReserveTransferAssets(alice, destination, beneficiary, assets, feeAssetItem, weightLimit);
    });

    const maxWaitBlocks = 3;

    const dmpQueueExecutedDownward = await helper.wait.event(maxWaitBlocks, 'dmpQueue', 'ExecutedDownward');

    expect(
      dmpQueueExecutedDownward != null,
      '[Relay] dmpQueue.ExecutedDownward event is expected',
    ).to.be.true;

    const event = dmpQueueExecutedDownward!.event;
    const outcome = event.data[1] as XcmV2TraitsOutcome;

    expect(
      outcome.isIncomplete,
      '[Relay] The outcome of the XCM should be `Incomplete`',
    ).to.be.true;

    const incomplete = outcome.asIncomplete;
    expect(
      incomplete[1].toString() == 'AssetNotFound',
      '[Relay] The XCM error should be `AssetNotFound`',
    ).to.be.true;
  });

  itSub('Quartz rejects KAR tokens from Karura', async ({helper}) => {
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: QUARTZ_CHAIN},
              {
                AccountId32: {
                  network: 'Any',
                  id: alice.addressRaw,
                },
              },
            ],
          },
        },
      };

      const id = {
        Token: 'KAR',
      };

      const destWeight = 50000000;

      await helper.xTokens.transfer(alice, id, 100_000_000_000n, destination, destWeight);
    });

    const maxWaitBlocks = 3;

    const xcmpQueueFailEvent = await helper.wait.event(maxWaitBlocks, 'xcmpQueue', 'Fail');

    expect(
      xcmpQueueFailEvent != null,
      '[Karura] xcmpQueue.FailEvent event is expected',
    ).to.be.true;

    const event = xcmpQueueFailEvent!.event;
    const outcome = event.data[1] as XcmV2TraitsError;

    expect(
      outcome.isUntrustedReserveLocation,
      '[Karura] The XCM error should be `UntrustedReserveLocation`',
    ).to.be.true;
  });
});

describeXcm('[XCM] Integration test: Exchanging QTZ with Moonriver', () => {

  // Quartz constants
  let quartzAlice: IKeyringPair;
  let quartzAssetLocation;

  let randomAccountQuartz: IKeyringPair;
  let randomAccountMoonriver: IKeyringPair;

  // Moonriver constants
  let assetId: string;

  const councilVotingThreshold = 2;
  const technicalCommitteeThreshold = 2;
  const votingPeriod = 3;
  const delayPeriod = 0;

  const quartzAssetMetadata = {
    name: 'xcQuartz',
    symbol: 'xcQTZ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1n,
  };

  let balanceQuartzTokenInit: bigint;
  let balanceQuartzTokenMiddle: bigint;
  let balanceQuartzTokenFinal: bigint;
  let balanceForeignQtzTokenInit: bigint;
  let balanceForeignQtzTokenMiddle: bigint;
  let balanceForeignQtzTokenFinal: bigint;
  let balanceMovrTokenInit: bigint;
  let balanceMovrTokenMiddle: bigint;
  let balanceMovrTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      const keyringEth = new Keyring({type: 'ethereum'});
      const keyringSr25519 = new Keyring({type: 'sr25519'});

      quartzAlice = privateKey('//Alice');
      randomAccountQuartz = generateKeyringPair(keyringSr25519);
      randomAccountMoonriver = generateKeyringPair(keyringEth);

      balanceForeignQtzTokenInit = 0n;
    });

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const alithAccount = helper.account.alithAccount();
      const baltatharAccount = helper.account.baltatharAccount();
      const dorothyAccount = helper.account.dorothyAccount();

      // >>> Sponsoring Dorothy >>>
      console.log('Sponsoring Dorothy.......');
      await helper.balance.transferToEthereum(alithAccount, dorothyAccount.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring Dorothy.......DONE');
      // <<< Sponsoring Dorothy <<<

      quartzAssetLocation = {
        XCM: {
          parents: 1,
          interior: {X1: {Parachain: QUARTZ_CHAIN}},
        },
      };
      const existentialDeposit = 1n;
      const isSufficient = true;
      const unitsPerSecond = 1n;
      const numAssetsWeightHint = 0;

      const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
        location: quartzAssetLocation,
        metadata: quartzAssetMetadata,
        existentialDeposit,
        isSufficient,
        unitsPerSecond,
        numAssetsWeightHint,
      });
      const proposalHash = blake2AsHex(encodedProposal);

      console.log('Encoded proposal for registerForeignAsset & setAssetUnitsPerSecond is %s', encodedProposal);
      console.log('Encoded length %d', encodedProposal.length);
      console.log('Encoded proposal hash for batch utility after schedule is %s', proposalHash);

      // >>> Note motion preimage >>>
      console.log('Note motion preimage.......');
      await helper.democracy.notePreimage(baltatharAccount, encodedProposal);
      console.log('Note motion preimage.......DONE');
      // <<< Note motion preimage <<<

      // >>> Propose external motion through council >>>
      console.log('Propose external motion through council.......');
      const externalMotion = helper.democracy.externalProposeMajority(proposalHash);
      const encodedMotion = externalMotion?.method.toHex() || '';
      const motionHash = blake2AsHex(encodedMotion);
      console.log('Motion hash is %s', motionHash);

      await helper.collective.council.propose(baltatharAccount, councilVotingThreshold, externalMotion, externalMotion.encodedLength);

      const councilProposalIdx = await helper.collective.council.proposalCount() - 1;
      await helper.collective.council.vote(dorothyAccount, motionHash, councilProposalIdx, true);
      await helper.collective.council.vote(baltatharAccount, motionHash, councilProposalIdx, true);

      await helper.collective.council.close(dorothyAccount, motionHash, councilProposalIdx, 1_000_000_000, externalMotion.encodedLength);
      console.log('Propose external motion through council.......DONE');
      // <<< Propose external motion through council <<<

      // >>> Fast track proposal through technical committee >>>
      console.log('Fast track proposal through technical committee.......');
      const fastTrack = helper.democracy.fastTrack(proposalHash, votingPeriod, delayPeriod);
      const encodedFastTrack = fastTrack?.method.toHex() || '';
      const fastTrackHash = blake2AsHex(encodedFastTrack);
      console.log('FastTrack hash is %s', fastTrackHash);

      await helper.collective.techCommittee.propose(alithAccount, technicalCommitteeThreshold, fastTrack, fastTrack.encodedLength);

      const techProposalIdx = await helper.collective.techCommittee.proposalCount() - 1;
      await helper.collective.techCommittee.vote(baltatharAccount, fastTrackHash, techProposalIdx, true);
      await helper.collective.techCommittee.vote(alithAccount, fastTrackHash, techProposalIdx, true);

      await helper.collective.techCommittee.close(baltatharAccount, fastTrackHash, techProposalIdx, 1_000_000_000, fastTrack.encodedLength);
      console.log('Fast track proposal through technical committee.......DONE');
      // <<< Fast track proposal through technical committee <<<

      // >>> Referendum voting >>>
      console.log('Referendum voting.......');
      await helper.democracy.referendumVote(dorothyAccount, 0, {
        balance: 10_000_000_000_000_000_000n,
        vote: {aye: true, conviction: 1},
      });
      console.log('Referendum voting.......DONE');
      // <<< Referendum voting <<<

      // >>> Acquire Quartz AssetId Info on Moonriver >>>
      console.log('Acquire Quartz AssetId Info on Moonriver.......');

      // Wait for the democracy execute
      await helper.wait.newBlocks(5);

      assetId = (await helper.assetManager.assetTypeId(quartzAssetLocation)).toString();

      console.log('QTZ asset ID is %s', assetId);
      console.log('Acquire Quartz AssetId Info on Moonriver.......DONE');
      // >>> Acquire Quartz AssetId Info on Moonriver >>>

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonriver.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<

      balanceMovrTokenInit = await helper.balance.getEthereum(randomAccountMoonriver.address);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(quartzAlice, randomAccountQuartz.address, 10n * TRANSFER_AMOUNT);
      balanceQuartzTokenInit = await helper.balance.getSubstrate(randomAccountQuartz.address);
    });
  });

  itSub('Should connect and send QTZ to Moonriver', async ({helper}) => {
    const currencyId = {
      NativeAssetId: 'Here',
    };
    const dest = {
      V1: {
        parents: 1,
        interior: {
          X2: [
            {Parachain: MOONRIVER_CHAIN},
            {AccountKey20: {network: 'Any', key: randomAccountMoonriver.address}},
          ],
        },
      },
    };
    const amount = TRANSFER_AMOUNT;
    const destWeight = 850000000;

    await helper.xTokens.transfer(randomAccountQuartz, currencyId, amount, dest, destWeight);

    balanceQuartzTokenMiddle = await helper.balance.getSubstrate(randomAccountQuartz.address);
    expect(balanceQuartzTokenMiddle < balanceQuartzTokenInit).to.be.true;

    const transactionFees = balanceQuartzTokenInit - balanceQuartzTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Quartz -> Moonriver] transaction fees on Quartz: %s QTZ', bigIntToDecimals(transactionFees));
    expect(transactionFees > 0).to.be.true;

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceMovrTokenMiddle = await helper.balance.getEthereum(randomAccountMoonriver.address);

      const movrFees = balanceMovrTokenInit - balanceMovrTokenMiddle;
      console.log('[Quartz -> Moonriver] transaction fees on Moonriver: %s MOVR',bigIntToDecimals(movrFees));
      expect(movrFees == 0n).to.be.true;

      balanceForeignQtzTokenMiddle = (await helper.assets.account(assetId, randomAccountMoonriver.address))!; // BigInt(qtzRandomAccountAsset['balance']);
      const qtzIncomeTransfer = balanceForeignQtzTokenMiddle - balanceForeignQtzTokenInit;
      console.log('[Quartz -> Moonriver] income %s QTZ', bigIntToDecimals(qtzIncomeTransfer));
      expect(qtzIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Moonriver and send QTZ back', async ({helper}) => {
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const asset = {
        V1: {
          id: {
            Concrete: {
              parents: 1,
              interior: {
                X1: {Parachain: QUARTZ_CHAIN},
              },
            },
          },
          fun: {
            Fungible: TRANSFER_AMOUNT,
          },
        },
      };
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: QUARTZ_CHAIN},
              {AccountId32: {network: 'Any', id: randomAccountQuartz.addressRaw}},
            ],
          },
        },
      };
      const destWeight = 50000000;

      await helper.xTokens.transferMultiasset(randomAccountMoonriver, asset, destination, destWeight);

      balanceMovrTokenFinal = await helper.balance.getEthereum(randomAccountMoonriver.address);

      const movrFees = balanceMovrTokenMiddle - balanceMovrTokenFinal;
      console.log('[Moonriver -> Quartz] transaction fees on Moonriver: %s MOVR', bigIntToDecimals(movrFees));
      expect(movrFees > 0).to.be.true;

      const qtzRandomAccountAsset = await helper.assets.account(assetId, randomAccountMoonriver.address);

      expect(qtzRandomAccountAsset).to.be.null;

      balanceForeignQtzTokenFinal = 0n;

      const qtzOutcomeTransfer = balanceForeignQtzTokenMiddle - balanceForeignQtzTokenFinal;
      console.log('[Quartz -> Moonriver] outcome %s QTZ', bigIntToDecimals(qtzOutcomeTransfer));
      expect(qtzOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceQuartzTokenFinal = await helper.balance.getSubstrate(randomAccountQuartz.address);
    const actuallyDelivered = balanceQuartzTokenFinal - balanceQuartzTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Moonriver -> Quartz] actually delivered %s QTZ', bigIntToDecimals(actuallyDelivered));

    const qtzFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Moonriver -> Quartz] transaction fees on Quartz: %s QTZ', bigIntToDecimals(qtzFees));
    expect(qtzFees == 0n).to.be.true;
  });
});
