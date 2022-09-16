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

import {WsProvider, Keyring} from '@polkadot/api';
import {ApiOptions} from '@polkadot/api/types';
import {IKeyringPair} from '@polkadot/types/types';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {getGenericResult, generateKeyringPair, waitEvent, describe_xcm, bigIntToDecimals} from '../util/helpers';
import {MultiLocation} from '@polkadot/types/interfaces';
import {blake2AsHex} from '@polkadot/util-crypto';
import waitNewBlocks from '../substrate/wait-new-blocks';
import getBalance from '../substrate/get-balance';
import {XcmV2TraitsError, XcmV2TraitsOutcome} from '../interfaces';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 2037;
const ACALA_CHAIN = 2000;
const MOONBEAM_CHAIN = 2004;

const RELAY_PORT = 9844;
const ACALA_PORT = 9946;
const MOONBEAM_PORT = 9947;

const ACALA_DECIMALS = 12;

const TRANSFER_AMOUNT = 2000000000000000000000000n;

function parachainApiOptions(port: number): ApiOptions {
  return {
    provider: new WsProvider('ws://127.0.0.1:' + port.toString()),
  };
}

function acalaOptions(): ApiOptions {
  return parachainApiOptions(ACALA_PORT);
}

function moonbeamOptions(): ApiOptions {
  return parachainApiOptions(MOONBEAM_PORT);
}

function relayOptions(): ApiOptions {
  return parachainApiOptions(RELAY_PORT);
}

describe_xcm('[XCM] Integration test: Exchanging tokens with Acala', () => {
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
    await usingApi(async (api, privateKeyWrapper) => {
      const keyringSr25519 = new Keyring({type: 'sr25519'});

      alice = privateKeyWrapper('//Alice');
      randomAccount = generateKeyringPair(keyringSr25519);
    });

    // Acala side
    await usingApi(
      async (api) => {
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
          minimalBalance: 1,
        };

        const tx = api.tx.assetRegistry.registerForeignAsset(destination, metadata);
        const sudoTx = api.tx.sudo.sudo(tx as any);
        const events = await submitTransactionAsync(alice, sudoTx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        const tx1 = api.tx.balances.transfer(randomAccount.address, 10000000000000n);
        const events1 = await submitTransactionAsync(alice, tx1);
        const result1 = getGenericResult(events1);
        expect(result1.success).to.be.true;

        [balanceAcalaTokenInit] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAssetId: 0})).toJSON() as any;
          balanceUniqueForeignTokenInit = BigInt(free);
        }
      },
      acalaOptions(),
    );

    // Unique side
    await usingApi(async (api) => {
      const tx0 = api.tx.balances.transfer(randomAccount.address, 10n * TRANSFER_AMOUNT);
      const events0 = await submitTransactionAsync(alice, tx0);
      const result0 = getGenericResult(events0);
      expect(result0.success).to.be.true;

      [balanceUniqueTokenInit] = await getBalance(api, [randomAccount.address]);
    });
  });

  it('Should connect and send UNQ to Acala', async () => {

    // Unique side
    await usingApi(async (api) => {

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

      const weightLimit = {
        Limited: 5000000000,
      };

      const tx = api.tx.polkadotXcm.limitedReserveTransferAssets(destination, beneficiary, assets, feeAssetItem, weightLimit);
      const events = await submitTransactionAsync(randomAccount, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      [balanceUniqueTokenMiddle] = await getBalance(api, [randomAccount.address]);

      const unqFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
      console.log('[Unique -> Acala] transaction fees on Unique: %s UNQ', bigIntToDecimals(unqFees));
      expect(unqFees > 0n).to.be.true;
    });

    // Acala side
    await usingApi(
      async (api) => {
        await waitNewBlocks(api, 3);
        const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAssetId: 0})).toJSON() as any;
        balanceUniqueForeignTokenMiddle = BigInt(free);

        [balanceAcalaTokenMiddle] = await getBalance(api, [randomAccount.address]);

        const acaFees = balanceAcalaTokenInit - balanceAcalaTokenMiddle;
        const unqIncomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenInit;

        console.log(
          '[Unique -> Acala] transaction fees on Acala: %s ACA',
          bigIntToDecimals(acaFees, ACALA_DECIMALS),
        );
        console.log('[Unique -> Acala] income %s UNQ', bigIntToDecimals(unqIncomeTransfer));
        expect(acaFees == 0n).to.be.true;
        expect(unqIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
      },
      acalaOptions(),
    );
  });

  it('Should connect to Acala and send UNQ back', async () => {

    // Acala side
    await usingApi(
      async (api) => {
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
          ForeignAssetId: 0,
        };

        const destWeight = 50000000;

        const tx = api.tx.xTokens.transfer(id as any, TRANSFER_AMOUNT, destination, destWeight);
        const events = await submitTransactionAsync(randomAccount, tx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        [balanceAcalaTokenFinal] = await getBalance(api, [randomAccount.address]);
        {
          const {free} = (await api.query.tokens.accounts(randomAccount.addressRaw, {ForeignAssetId: 0})).toJSON() as any;
          balanceUniqueForeignTokenFinal = BigInt(free);
        }

        const acaFees = balanceAcalaTokenMiddle - balanceAcalaTokenFinal;
        const unqOutcomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenFinal;

        console.log(
          '[Acala -> Unique] transaction fees on Acala: %s ACA',
          bigIntToDecimals(acaFees, ACALA_DECIMALS),
        );
        console.log('[Acala -> Unique] outcome %s UNQ', bigIntToDecimals(unqOutcomeTransfer));

        expect(acaFees > 0).to.be.true;
        expect(unqOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
      },
      acalaOptions(),
    );

    // Unique side
    await usingApi(async (api) => {
      await waitNewBlocks(api, 3);

      [balanceUniqueTokenFinal] = await getBalance(api, [randomAccount.address]);
      const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
      expect(actuallyDelivered > 0).to.be.true;

      console.log('[Acala -> Unique] actually delivered %s UNQ', bigIntToDecimals(actuallyDelivered));

      const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
      console.log('[Acala -> Unique] transaction fees on Unique: %s UNQ', bigIntToDecimals(unqFees));
      expect(unqFees == 0n).to.be.true;
    });
  });
});

// These tests are relevant only when the foreign asset pallet is disabled
describe_xcm('[XCM] Integration test: Unique rejects non-native tokens', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it('Unique rejects tokens from the Relay', async () => {
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
    }, relayOptions());

    await usingApi(async api => {
      const maxWaitBlocks = 3;
      const dmpQueueExecutedDownward = await waitEvent(
        api,
        maxWaitBlocks,
        'dmpQueue',
        'ExecutedDownward',
      );

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
  });

  it('Unique rejects ACA tokens from Acala', async () => {
    await usingApi(async (api) => {
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

      const tx = api.tx.xTokens.transfer(id as any, 100_000_000_000, destination, destWeight);
      const events = await submitTransactionAsync(alice, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    }, acalaOptions());

    await usingApi(async api => {
      const maxWaitBlocks = 3;
      const xcmpQueueFailEvent = await waitEvent(api, maxWaitBlocks, 'xcmpQueue', 'Fail');

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
});

describe_xcm('[XCM] Integration test: Exchanging UNQ with Moonbeam', () => {

  // Unique constants
  let uniqueAlice: IKeyringPair;
  let uniqueAssetLocation;

  let randomAccountUnique: IKeyringPair;
  let randomAccountMoonbeam: IKeyringPair;

  // Moonbeam constants
  let assetId: string;

  const moonbeamKeyring = new Keyring({type: 'ethereum'});
  const alithPrivateKey = '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133';
  const baltatharPrivateKey = '0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b';
  const dorothyPrivateKey = '0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68';

  const alithAccount = moonbeamKeyring.addFromUri(alithPrivateKey, undefined, 'ethereum');
  const baltatharAccount = moonbeamKeyring.addFromUri(baltatharPrivateKey, undefined, 'ethereum');
  const dorothyAccount = moonbeamKeyring.addFromUri(dorothyPrivateKey, undefined, 'ethereum');

  const councilVotingThreshold = 2;
  const technicalCommitteeThreshold = 2;
  const votingPeriod = 3;
  const delayPeriod = 0;

  const uniqueAssetMetadata = {
    name: 'xcUnique',
    symbol: 'xcUNQ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1,
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
    await usingApi(async (api, privateKeyWrapper) => {
      const keyringEth = new Keyring({type: 'ethereum'});
      const keyringSr25519 = new Keyring({type: 'sr25519'});

      uniqueAlice = privateKeyWrapper('//Alice');
      randomAccountUnique = generateKeyringPair(keyringSr25519);
      randomAccountMoonbeam = generateKeyringPair(keyringEth);

      balanceForeignUnqTokenInit = 0n;
    });

    await usingApi(
      async (api) => {

        // >>> Sponsoring Dorothy >>>
        console.log('Sponsoring Dorothy.......');
        const tx0 = api.tx.balances.transfer(dorothyAccount.address, 11_000_000_000_000_000_000n);
        const events0 = await submitTransactionAsync(alithAccount, tx0);
        const result0 = getGenericResult(events0);
        expect(result0.success).to.be.true;
        console.log('Sponsoring Dorothy.......DONE');
        // <<< Sponsoring Dorothy <<<

        const sourceLocation: MultiLocation = api.createType(
          'MultiLocation',
          {
            parents: 1,
            interior: {X1: {Parachain: UNIQUE_CHAIN}},
          },
        );

        uniqueAssetLocation = {XCM: sourceLocation};
        const existentialDeposit = 1;
        const isSufficient = true;
        const unitsPerSecond = '1';
        const numAssetsWeightHint = 0;

        const registerTx = api.tx.assetManager.registerForeignAsset(
          uniqueAssetLocation,
          uniqueAssetMetadata,
          existentialDeposit,
          isSufficient,
        );
        console.log('Encoded proposal for registerAsset is %s', registerTx.method.toHex() || '');

        const setUnitsTx = api.tx.assetManager.setAssetUnitsPerSecond(
          uniqueAssetLocation,
          unitsPerSecond,
          numAssetsWeightHint,
        );
        console.log('Encoded proposal for setAssetUnitsPerSecond is %s', setUnitsTx.method.toHex() || '');

        const batchCall = api.tx.utility.batchAll([registerTx, setUnitsTx]);
        console.log('Encoded proposal for batchCall is %s', batchCall.method.toHex() || '');

        // >>> Note motion preimage >>>
        console.log('Note motion preimage.......');
        const encodedProposal = batchCall?.method.toHex() || '';
        const proposalHash = blake2AsHex(encodedProposal);
        console.log('Encoded proposal for batch utility after schedule is %s', encodedProposal);
        console.log('Encoded proposal hash for batch utility after schedule is %s', proposalHash);
        console.log('Encoded length %d', encodedProposal.length);

        const tx1 = api.tx.democracy.notePreimage(encodedProposal);
        const events1 = await submitTransactionAsync(baltatharAccount, tx1);
        const result1 = getGenericResult(events1);
        expect(result1.success).to.be.true;
        console.log('Note motion preimage.......DONE');
        // <<< Note motion preimage <<<

        // >>> Propose external motion through council >>>
        console.log('Propose external motion through council.......');
        const externalMotion = api.tx.democracy.externalProposeMajority(proposalHash);
        const tx2 = api.tx.councilCollective.propose(
          councilVotingThreshold,
          externalMotion,
          externalMotion.encodedLength,
        );
        const events2 = await submitTransactionAsync(baltatharAccount, tx2);
        const result2 = getGenericResult(events2);
        expect(result2.success).to.be.true;

        const encodedMotion = externalMotion?.method.toHex() || '';
        const motionHash = blake2AsHex(encodedMotion);
        console.log('Motion hash is %s', motionHash);

        const tx3 = api.tx.councilCollective.vote(motionHash, 0, true);
        {
          const events3 = await submitTransactionAsync(dorothyAccount, tx3);
          const result3 = getGenericResult(events3);
          expect(result3.success).to.be.true;
        }
        {
          const events3 = await submitTransactionAsync(baltatharAccount, tx3);
          const result3 = getGenericResult(events3);
          expect(result3.success).to.be.true;
        }

        const tx4 = api.tx.councilCollective.close(motionHash, 0, 1_000_000_000, externalMotion.encodedLength);
        const events4 = await submitTransactionAsync(dorothyAccount, tx4);
        const result4 = getGenericResult(events4);
        expect(result4.success).to.be.true;
        console.log('Propose external motion through council.......DONE');
        // <<< Propose external motion through council <<<

        // >>> Fast track proposal through technical committee >>>
        console.log('Fast track proposal through technical committee.......');
        const fastTrack = api.tx.democracy.fastTrack(proposalHash, votingPeriod, delayPeriod);
        const tx5 = api.tx.techCommitteeCollective.propose(
          technicalCommitteeThreshold,
          fastTrack,
          fastTrack.encodedLength,
        );
        const events5 = await submitTransactionAsync(alithAccount, tx5);
        const result5 = getGenericResult(events5);
        expect(result5.success).to.be.true;

        const encodedFastTrack = fastTrack?.method.toHex() || '';
        const fastTrackHash = blake2AsHex(encodedFastTrack);
        console.log('FastTrack hash is %s', fastTrackHash);

        const proposalIdx = Number(await api.query.techCommitteeCollective.proposalCount()) - 1;
        const tx6 = api.tx.techCommitteeCollective.vote(fastTrackHash, proposalIdx, true);
        {
          const events6 = await submitTransactionAsync(baltatharAccount, tx6);
          const result6 = getGenericResult(events6);
          expect(result6.success).to.be.true;
        }
        {
          const events6 = await submitTransactionAsync(alithAccount, tx6);
          const result6 = getGenericResult(events6);
          expect(result6.success).to.be.true;
        }

        const tx7 = api.tx.techCommitteeCollective
          .close(fastTrackHash, proposalIdx, 1_000_000_000, fastTrack.encodedLength);
        const events7 = await submitTransactionAsync(baltatharAccount, tx7);
        const result7 = getGenericResult(events7);
        expect(result7.success).to.be.true;
        console.log('Fast track proposal through technical committee.......DONE');
        // <<< Fast track proposal through technical committee <<<

        // >>> Referendum voting >>>
        console.log('Referendum voting.......');
        const tx8 = api.tx.democracy.vote(
          0,
          {Standard: {balance: 10_000_000_000_000_000_000n, vote: {aye: true, conviction: 1}}},
        );
        const events8 = await submitTransactionAsync(dorothyAccount, tx8);
        const result8 = getGenericResult(events8);
        expect(result8.success).to.be.true;
        console.log('Referendum voting.......DONE');
        // <<< Referendum voting <<<

        // >>> Acquire Unique AssetId Info on Moonbeam >>>
        console.log('Acquire Unique AssetId Info on Moonbeam.......');

        // Wait for the democracy execute
        await waitNewBlocks(api, 5);

        assetId = (await api.query.assetManager.assetTypeId({
          XCM: sourceLocation,
        })).toString();

        console.log('UNQ asset ID is %s', assetId);
        console.log('Acquire Unique AssetId Info on Moonbeam.......DONE');
        // >>> Acquire Unique AssetId Info on Moonbeam >>>

        // >>> Sponsoring random Account >>>
        console.log('Sponsoring random Account.......');
        const tx10 = api.tx.balances.transfer(randomAccountMoonbeam.address, 11_000_000_000_000_000_000n);
        const events10 = await submitTransactionAsync(baltatharAccount, tx10);
        const result10 = getGenericResult(events10);
        expect(result10.success).to.be.true;
        console.log('Sponsoring random Account.......DONE');
        // <<< Sponsoring random Account <<<

        [balanceGlmrTokenInit] = await getBalance(api, [randomAccountMoonbeam.address]);
      },
      moonbeamOptions(),
    );

    await usingApi(async (api) => {
      const tx0 = api.tx.balances.transfer(randomAccountUnique.address, 10n * TRANSFER_AMOUNT);
      const events0 = await submitTransactionAsync(uniqueAlice, tx0);
      const result0 = getGenericResult(events0);
      expect(result0.success).to.be.true;

      [balanceUniqueTokenInit] = await getBalance(api, [randomAccountUnique.address]);
    });
  });

  it('Should connect and send UNQ to Moonbeam', async () => {
    await usingApi(async (api) => {
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

      const tx = api.tx.xTokens.transfer(currencyId, amount, dest, destWeight);
      const events = await submitTransactionAsync(randomAccountUnique, tx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      [balanceUniqueTokenMiddle] = await getBalance(api, [randomAccountUnique.address]);
      expect(balanceUniqueTokenMiddle < balanceUniqueTokenInit).to.be.true;

      const transactionFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
      console.log('[Unique -> Moonbeam] transaction fees on Unique: %s UNQ', bigIntToDecimals(transactionFees));
      expect(transactionFees > 0).to.be.true;
    });

    await usingApi(
      async (api) => {
        await waitNewBlocks(api, 3);

        [balanceGlmrTokenMiddle] = await getBalance(api, [randomAccountMoonbeam.address]);

        const glmrFees = balanceGlmrTokenInit - balanceGlmrTokenMiddle;
        console.log('[Unique -> Moonbeam] transaction fees on Moonbeam: %s GLMR', bigIntToDecimals(glmrFees));
        expect(glmrFees == 0n).to.be.true;

        const unqRandomAccountAsset = (
          await api.query.assets.account(assetId, randomAccountMoonbeam.address)
        ).toJSON()! as any;

        balanceForeignUnqTokenMiddle = BigInt(unqRandomAccountAsset['balance']);
        const unqIncomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenInit;
        console.log('[Unique -> Moonbeam] income %s UNQ', bigIntToDecimals(unqIncomeTransfer));
        expect(unqIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
      },
      moonbeamOptions(),
    );
  });

  it('Should connect to Moonbeam and send UNQ back', async () => {
    await usingApi(
      async (api) => {
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

        const tx = api.tx.xTokens.transferMultiasset(asset, destination, destWeight);
        const events = await submitTransactionAsync(randomAccountMoonbeam, tx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        [balanceGlmrTokenFinal] = await getBalance(api, [randomAccountMoonbeam.address]);

        const glmrFees = balanceGlmrTokenMiddle - balanceGlmrTokenFinal;
        console.log('[Moonbeam -> Unique] transaction fees on Moonbeam: %s GLMR', bigIntToDecimals(glmrFees));
        expect(glmrFees > 0).to.be.true;

        const unqRandomAccountAsset = (
          await api.query.assets.account(assetId, randomAccountMoonbeam.address)
        ).toJSON()! as any;

        expect(unqRandomAccountAsset).to.be.null;

        balanceForeignUnqTokenFinal = 0n;

        const unqOutcomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenFinal;
        console.log('[Unique -> Moonbeam] outcome %s UNQ', bigIntToDecimals(unqOutcomeTransfer));
        expect(unqOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
      },
      moonbeamOptions(),
    );

    await usingApi(async (api) => {
      await waitNewBlocks(api, 3);

      [balanceUniqueTokenFinal] = await getBalance(api, [randomAccountUnique.address]);
      const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
      expect(actuallyDelivered > 0).to.be.true;

      console.log('[Moonbeam -> Unique] actually delivered %s UNQ', bigIntToDecimals(actuallyDelivered));

      const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
      console.log('[Moonbeam -> Unique] transaction fees on Unique: %s UNQ', bigIntToDecimals(unqFees));
      expect(unqFees == 0n).to.be.true;
    });
  });
});
