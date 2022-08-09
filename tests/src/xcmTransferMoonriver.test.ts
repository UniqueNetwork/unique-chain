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

import {Keyring, WsProvider} from '@polkadot/api';
import {ApiOptions} from '@polkadot/api/types';
import {IKeyringPair} from '@polkadot/types/types';
import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import {getGenericResult} from './util/helpers';
import {MultiLocation} from '@polkadot/types/interfaces';
import {blake2AsHex} from '@polkadot/util-crypto';
import getBalance from './substrate/get-balance';
import waitNewBlocks from './substrate/wait-new-blocks';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 5000;
const MOONRIVER_CHAIN = 1000;
const UNIQUE_PORT = '9944';
const MOONRIVER_PORT = '9946';


describe('Integration test: Exchanging QTZ with Moonriver', () => {

  // Unique constants
  let uniqueAlice: IKeyringPair;
  let uniqueAssetLocation;

  // Moonriver constants
  let assetId: Uint8Array;

  const moonriverKeyring = new Keyring({type: 'ethereum'});
  const alithPrivateKey = '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133';
  const baltatharPrivateKey = '0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b';
  const dorothyPrivateKey = '0x39539ab1876910bbf3a223d84a29e28f1cb4e2e456503e7e91ed39b2e7223d68';

  const alithAccount = moonriverKeyring.addFromUri(alithPrivateKey, undefined, 'ethereum');
  const baltatharAccount = moonriverKeyring.addFromUri(baltatharPrivateKey, undefined, 'ethereum');
  const dorothyAccount = moonriverKeyring.addFromUri(dorothyPrivateKey, undefined, 'ethereum');

  const councilVotingThreshold = 2;
  const technicalCommitteeThreshold = 2;
  const votingPeriod = 3;
  const delayPeriod = 0;

  const uniqueAssetMetadata = {
    name: 'xcQuartz',
    symbol: 'xcQTZ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1,
  };

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      uniqueAlice = privateKeyWrapper('//Alice');
    });

    const moonriverApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + MOONRIVER_PORT),
    };

    await usingApi(
      async (api) => {

        const sourceLocation: MultiLocation = api.createType(
          'MultiLocation',
          {
            parents: 1,
            interior: {X1: {Parachain: UNIQUE_CHAIN}},
          },
        );

        assetId = api.registry.hash(sourceLocation.toU8a()).slice(0, 16).reverse();
        console.log('Internal asset ID is %s', assetId);
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
        const encodedProposal = batchCall?.method.toHex() || '';
        const proposalHash = blake2AsHex(encodedProposal);
        console.log('Encoded proposal for batch utility after schedule is %s', encodedProposal);
        console.log('Encoded proposal hash for batch utility after schedule is %s', proposalHash);
        console.log('Encoded length %d', encodedProposal.length);

        const tx1 = api.tx.democracy.notePreimage(encodedProposal);
        const events1 = await submitTransactionAsync(baltatharAccount, tx1);
        const result1 = getGenericResult(events1);
        expect(result1.success).to.be.true;
        // <<< Note motion preimage <<<

        // >>> Propose external motion through council >>>
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
        // <<< Propose external motion through council <<<

        // >>> Fast track proposal through technical committee >>>
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
        // <<< Fast track proposal through technical committee <<<

        // >>> Referendum voting >>>
        const tx8 = api.tx.democracy.vote(
          0,
          {Standard: {balance: 10_000_000_000_000_000_000n, vote: {aye: true, conviction: 1}}},
        );
        const events8 = await submitTransactionAsync(dorothyAccount, tx8);
        const result8 = getGenericResult(events8);
        expect(result8.success).to.be.true;
        // <<< Referendum voting <<<
      },
      moonriverApiOptions,
    );
  });

  it('Should connect and send QTZ to Moonriver', async () => {

    const uniqueApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + UNIQUE_PORT),
    };

    await usingApi(
      async (api) => {
        const [aliceBalanceBefore] = await getBalance(api, [uniqueAlice.address]);
        const currencyId = {
          NativeAssetId: 'Here',
        };
        const dest = {
          V1: {
            parents: 1,
            interior: {
              X2: [
                {Parachain: MOONRIVER_CHAIN},
                {AccountKey20: {network: 'Any', key: alithAccount.address}},
              ],
            },
          },
        };
        const amount = 1000000000000000000000000000000n;
        const destWeight = 5000000000000;

        const tx = api.tx.xTokens.transfer(currencyId, amount, dest, destWeight);
        const events = await submitTransactionAsync(uniqueAlice, tx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;

        const [aliceBalanceAfter] = await getBalance(api, [uniqueAlice.address]);
        expect(aliceBalanceAfter < aliceBalanceBefore).to.be.true;
      },
      uniqueApiOptions,
    );
  });

  it('Should connect to Moonriver and send QTZ back', async () => {

    const aliceBalanceBefore = await usingApi(async (api) => {
      const [balance] = await getBalance(api, [uniqueAlice.address]);
      return balance;
    });

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
              Fungible: 500000000000000000000000000000n,
            },
          },
        };
        const destination = {
          V1: {
            parents: 1,
            interior: {
              X2: [
                {Parachain: UNIQUE_CHAIN},
                {AccountId32: {network: 'Any', id: uniqueAlice.addressRaw}},
              ],
            },
          },
        };
        const destWeight = 5000000000000;

        const tx = api.tx.xTokens.transferMultiasset(asset, destination, destWeight);
        const events = await submitTransactionAsync(alithAccount, tx);
        const result = getGenericResult(events);
        expect(result.success).to.be.true;
      },
      {provider: new WsProvider('ws://127.0.0.1:' + MOONRIVER_PORT)},
    );

    await usingApi(async (api) => {
      await waitNewBlocks(api, 3);
      const [aliceBalanceAfter] = await getBalance(api, [uniqueAlice.address]);
      expect(aliceBalanceAfter > aliceBalanceBefore).to.be.true;
    });
  });
});
