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
import {blake2AsHex} from '@polkadot/util-crypto';
import config from '../config';
import {XcmV2TraitsError, XcmV2TraitsOutcome} from '../interfaces';
import {itSub, expect, describeXCM, usingPlaygrounds, usingAcalaPlaygrounds, usingRelayPlaygrounds, usingMoonbeamPlaygrounds} from '../util';

const UNIQUE_CHAIN = 2037;
const ACALA_CHAIN = 2000;
const MOONBEAM_CHAIN = 2004;

const relayUrl = config.relayUrl;
const acalaUrl = config.acalaUrl;
const moonbeamUrl = config.moonbeamUrl;

const ACALA_DECIMALS = 12;

const TRANSFER_AMOUNT = 2000000000000000000000000n;

describeXCM('[XCM] Integration test: Exchanging tokens with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let balanceUniqueTokenInit: bigint;
  let balanceUniqueTokenMiddle: bigint;
  let balanceUniqueTokenFinal: bigint;
  let balanceAcalaTokenInit: bigint;
  let balanceAcalaTokenMiddle: bigint;
  let balanceAcalaTokenFinal: bigint;
  let balanceUniqueForeignTokenInit: bigint;
  let balanceUniqueForeignTokenMiddle: bigint;
  let balanceUniqueForeignTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);
    });

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
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

      const metadata = {
        name: 'UNQ',
        symbol: 'UNQ',
        decimals: 18,
        minimalBalance: 1n,
      };

      await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
      balanceAcalaTokenInit = await helper.balance.getSubstrate(randomAccount.address);
      balanceUniqueForeignTokenInit = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10n * TRANSFER_AMOUNT);
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send UNQ to Acala', async ({helper}) => {

    const destination = {
      V0: {
        X2: [
          'Parent',
          {
            Parachain: ACALA_CHAIN,
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

    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    const unqFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> Acala] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees > 0n).to.be.true;

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceUniqueForeignTokenMiddle = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
      balanceAcalaTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

      const acaFees = balanceAcalaTokenInit - balanceAcalaTokenMiddle;
      const unqIncomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenInit;

      console.log(
        '[Unique -> Acala] transaction fees on Acala: %s ACA',
        helper.util.bigIntToDecimals(acaFees, ACALA_DECIMALS),
      );
      console.log('[Unique -> Acala] income %s UNQ', helper.util.bigIntToDecimals(unqIncomeTransfer));
      expect(acaFees == 0n).to.be.true;
      expect(unqIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Acala and send UNQ back', async ({helper}) => {
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: UNIQUE_CHAIN},
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

      balanceAcalaTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
      balanceUniqueForeignTokenFinal = await helper.tokens.accounts(randomAccount.address, id);

      const acaFees = balanceAcalaTokenMiddle - balanceAcalaTokenFinal;
      const unqOutcomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenFinal;

      console.log(
        '[Acala -> Unique] transaction fees on Acala: %s ACA',
        helper.util.bigIntToDecimals(acaFees, ACALA_DECIMALS),
      );
      console.log('[Acala -> Unique] outcome %s UNQ', helper.util.bigIntToDecimals(unqOutcomeTransfer));

      expect(acaFees > 0).to.be.true;
      expect(unqOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
    const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Acala -> Unique] actually delivered %s UNQ', helper.util.bigIntToDecimals(actuallyDelivered));

    const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Acala -> Unique] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees == 0n).to.be.true;
  });
});

// These tests are relevant only when the foreign asset pallet is disabled
describeXCM('[XCM] Integration test: Unique rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      alice = await privateKey('//Alice');
    });
  });

  itSub('Unique rejects tokens from the Relay', async ({helper}) => {
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
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

  itSub('Unique rejects ACA tokens from Acala', async ({helper}) => {
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: UNIQUE_CHAIN},
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
        Token: 'ACA',
      };

      const destWeight = 50000000;

      await helper.xTokens.transfer(alice, id, 100_000_000_000n, destination, destWeight);
    });

    const maxWaitBlocks = 3;

    const xcmpQueueFailEvent = await helper.wait.event(maxWaitBlocks, 'xcmpQueue', 'Fail');

    expect(
      xcmpQueueFailEvent != null,
      '[Acala] xcmpQueue.FailEvent event is expected',
    ).to.be.true;

    const event = xcmpQueueFailEvent!.event;
    const outcome = event.data[1] as XcmV2TraitsError;

    expect(
      outcome.isUntrustedReserveLocation,
      '[Acala] The XCM error should be `UntrustedReserveLocation`',
    ).to.be.true;
  });
});

describeXCM('[XCM] Integration test: Exchanging UNQ with Moonbeam', () => {
  // Unique constants
  let uniqueDonor: IKeyringPair;
  let uniqueAssetLocation;

  let randomAccountUnique: IKeyringPair;
  let randomAccountMoonbeam: IKeyringPair;

  // Moonbeam constants
  let assetId: string;

  const councilVotingThreshold = 2;
  const technicalCommitteeThreshold = 2;
  const votingPeriod = 3;
  const delayPeriod = 0;

  const uniqueAssetMetadata = {
    name: 'xcUnique',
    symbol: 'xcUNQ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1n,
  };

  let balanceUniqueTokenInit: bigint;
  let balanceUniqueTokenMiddle: bigint;
  let balanceUniqueTokenFinal: bigint;
  let balanceForeignUnqTokenInit: bigint;
  let balanceForeignUnqTokenMiddle: bigint;
  let balanceForeignUnqTokenFinal: bigint;
  let balanceGlmrTokenInit: bigint;
  let balanceGlmrTokenMiddle: bigint;
  let balanceGlmrTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      uniqueDonor = await privateKey('//Alice');
      [randomAccountUnique] = await helper.arrange.createAccounts([0n], uniqueDonor);

      balanceForeignUnqTokenInit = 0n;
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

      const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
        location: uniqueAssetLocation,
        metadata: uniqueAssetMetadata,
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

      // >>> Acquire Unique AssetId Info on Moonbeam >>>
      console.log('Acquire Unique AssetId Info on Moonbeam.......');

      // Wait for the democracy execute
      await helper.wait.newBlocks(5);

      assetId = (await helper.assetManager.assetTypeId(uniqueAssetLocation)).toString();

      console.log('UNQ asset ID is %s', assetId);
      console.log('Acquire Unique AssetId Info on Moonbeam.......DONE');
      // >>> Acquire Unique AssetId Info on Moonbeam >>>

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonbeam.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<

      balanceGlmrTokenInit = await helper.balance.getEthereum(randomAccountMoonbeam.address);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(uniqueDonor, randomAccountUnique.address, 10n * TRANSFER_AMOUNT);
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccountUnique.address);
    });
  });

  itSub('Should connect and send UNQ to Moonbeam', async ({helper}) => {
    const currencyId = {
      NativeAssetId: 'Here',
    };
    const dest = {
      V1: {
        parents: 1,
        interior: {
          X2: [
            {Parachain: MOONBEAM_CHAIN},
            {AccountKey20: {network: 'Any', key: randomAccountMoonbeam.address}},
          ],
        },
      },
    };
    const amount = TRANSFER_AMOUNT;
    const destWeight = 850000000;

    await helper.xTokens.transfer(randomAccountUnique, currencyId, amount, dest, destWeight);

    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccountUnique.address);
    expect(balanceUniqueTokenMiddle < balanceUniqueTokenInit).to.be.true;

    const transactionFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> Moonbeam] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(transactionFees));
    expect(transactionFees > 0).to.be.true;

    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceGlmrTokenMiddle = await helper.balance.getEthereum(randomAccountMoonbeam.address);

      const glmrFees = balanceGlmrTokenInit - balanceGlmrTokenMiddle;
      console.log('[Unique -> Moonbeam] transaction fees on Moonbeam: %s GLMR', helper.util.bigIntToDecimals(glmrFees));
      expect(glmrFees == 0n).to.be.true;

      balanceForeignUnqTokenMiddle = (await helper.assets.account(assetId, randomAccountMoonbeam.address))!;

      const unqIncomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenInit;
      console.log('[Unique -> Moonbeam] income %s UNQ', helper.util.bigIntToDecimals(unqIncomeTransfer));
      expect(unqIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Moonbeam and send UNQ back', async ({helper}) => {
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const asset = {
        V1: {
          id: {
            Concrete: {
              parents: 1,
              interior: {
                X1: {Parachain: UNIQUE_CHAIN},
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
              {Parachain: UNIQUE_CHAIN},
              {AccountId32: {network: 'Any', id: randomAccountUnique.addressRaw}},
            ],
          },
        },
      };
      const destWeight = 50000000;

      await helper.xTokens.transferMultiasset(randomAccountMoonbeam, asset, destination, destWeight);

      balanceGlmrTokenFinal = await helper.balance.getEthereum(randomAccountMoonbeam.address);

      const glmrFees = balanceGlmrTokenMiddle - balanceGlmrTokenFinal;
      console.log('[Moonbeam -> Unique] transaction fees on Moonbeam: %s GLMR', helper.util.bigIntToDecimals(glmrFees));
      expect(glmrFees > 0).to.be.true;

      const unqRandomAccountAsset = await helper.assets.account(assetId, randomAccountMoonbeam.address);

      expect(unqRandomAccountAsset).to.be.null;
      
      balanceForeignUnqTokenFinal = 0n;

      const unqOutcomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenFinal;
      console.log('[Unique -> Moonbeam] outcome %s UNQ', helper.util.bigIntToDecimals(unqOutcomeTransfer));
      expect(unqOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccountUnique.address);
    const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Moonbeam -> Unique] actually delivered %s UNQ', helper.util.bigIntToDecimals(actuallyDelivered));

    const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Moonbeam -> Unique] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees == 0n).to.be.true;
  });
});
