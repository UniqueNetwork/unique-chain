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
import {usingPlaygrounds, expect, itSub, Pallets, requirePalletsOrSkip} from '@unique/test-utils/util.js';

async function nodeAddress(name: string) {
  // eslint-disable-next-line require-await
  return await usingPlaygrounds(async (helper) => {
    const envNodeStash = `RELAY_UNIQUE_NODE_${name.toUpperCase()}_STASH`;

    const nodeStash = process.env[envNodeStash];
    if(nodeStash) {
      return helper.address.normalizeSubstrateToChainFormat(nodeStash);
    } else {
      throw Error(`"${envNodeStash}" env var is not set`);
    }
  });
}

async function getInitialInvulnerables() {
  return await Promise.all([
    nodeAddress('alpha'),
    nodeAddress('beta'),
    nodeAddress('gamma'),
    nodeAddress('delta'),
  ]);
}

async function resetInvulnerables() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const initialInvulnerables = await getInitialInvulnerables();

    const invulnerables = await helper.collatorSelection.getInvulnerables();

    // Remove all invulnerables but the first one
    const firstInvulnerable = invulnerables[0];

    let nonce = await helper.chain.getNonce(superuser.address);
    await Promise.all(invulnerables.slice(1).map(invulnerable => helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [invulnerable], true, {nonce: nonce++})));

    // Add the initial invulnerables
    await Promise.all(initialInvulnerables.map(invulnerable => helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [invulnerable], true, {nonce: nonce++})));

    // Remove the first invulnerable if it's not an initial one
    if(!initialInvulnerables.includes(firstInvulnerable)) {
      await helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [firstInvulnerable]);
    }
  });
}

// todo:collator Most preferable to launch this test in parallel somehow -- or change the session period (1 hr).
describe('Integration Test: Collator Selection', () => {
  let superuser: IKeyringPair;
  let previousLicenseBond = 0n;
  let licenseBond = 0n;

  before(async function() {
    if(!process.env.RUN_COLLATOR_TESTS) this.skip();

    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.CollatorSelection]);
      superuser = await privateKey('//Alice');

      previousLicenseBond = await helper.collatorSelection.getLicenseBond();
      licenseBond = 10n * helper.balance.getOneTokenNominal();
      await helper.getSudo().collatorSelection.setLicenseBond(superuser, licenseBond);
    });
  });

  describe('Dynamic shuffling of collators', () => {
    // These two are the default invulnerables, and should return to be invulnerables after this suite.
    let alphaNode: string;
    let betaNode: string;

    let gammaNode: string;
    let deltaNode: string;

    before(async function() {
      await usingPlaygrounds(async (helper) => {
        // todo:collator see again if blocks start to be finalized in dev mode
        // Skip the collator block production in dev mode, since the blocks are sealed automatically.
        if(await helper.arrange.isDevNode()) this.skip();

        [alphaNode, betaNode, gammaNode, deltaNode] = await getInitialInvulnerables();

        const invulnerables = await helper.collatorSelection.getInvulnerables();
        expect(invulnerables.length, 'Invalid initial invulnerables number').to.be.equal(4);
        expect(invulnerables, 'Invalid initial invulnerables').containSubset([alphaNode, betaNode, gammaNode, deltaNode]);
      });
    });

    itSub('Change invulnerables and make sure they start producing blocks', async ({helper}) => {
      let nonce = await helper.chain.getNonce(superuser.address);

      nonce = await helper.chain.getNonce(superuser.address);
      await expect(Promise.all([
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [alphaNode], true, {nonce: nonce++}),
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [betaNode], true, {nonce: nonce++}),
      ])).to.be.fulfilled;

      const newInvulnerables = await helper.collatorSelection.getInvulnerables();
      expect(newInvulnerables).to.contain(gammaNode).and.contain(deltaNode).and.be.length(2);

      await helper.wait.newSessions(2);

      const newValidators = await helper.callRpc('api.query.session.validators');
      expect(newValidators).to.contain(gammaNode).and.contain(deltaNode).and.be.length(2);

      const lastBlockNumber = await helper.chain.getLatestBlockNumber();
      await helper.wait.newBlocks(1);
      const lastGammaBlock = (await helper.callRpc('api.query.collatorSelection.lastAuthoredBlock', [gammaNode])).toNumber();
      const lastDeltaBlock = (await helper.callRpc('api.query.collatorSelection.lastAuthoredBlock', [deltaNode])).toNumber();
      expect(lastGammaBlock >= lastBlockNumber || lastDeltaBlock >= lastBlockNumber).to.be.true;
    });

    after(async () => {
      await resetInvulnerables();
    });
  });

  describe('Getting and releasing licenses to collate', () => {
    let crowd: IKeyringPair[];

    before(async function() {
      await usingPlaygrounds(async (helper) => {
        crowd = await helper.arrange.createCrowd(20, 100n, superuser);

        for (const acc of crowd) {
          await helper.session.setOwnKeysFromAddress(acc);
        }
      });
    });

    describe('Positive', () => {
      itSub('Can lease and release a license', async ({helper}) => {
        const account = crowd.pop()!;

        // make sure it does not have any reserved funds
        expect((await helper.balance.getSubstrateFull(account.address)).reserved).to.be.equal(0n);

        // getting a license reserves a license bond cost
        await helper.collatorSelection.obtainLicense(account);
        expect(await helper.collatorSelection.hasLicense(account.address)).to.be.equal(licenseBond);
        expect((await helper.balance.getSubstrateFull(account.address)).reserved).to.be.equal(licenseBond);

        // releasing a license un-reserves the license bond cost
        await helper.collatorSelection.releaseLicense(account);
        expect(await helper.collatorSelection.hasLicense(account.address)).to.be.equal(0n);

        const balance = await helper.balance.getSubstrateFull(account.address);
        expect(balance.reserved).to.be.equal(0n);
        expect(balance.free > 100n - licenseBond);
      });

      itSub('Can force revoke a license', async ({helper}) => {
        const account = crowd.pop()!;

        // getting a license reserves a license bond cost
        const previousBalance = await helper.balance.getSubstrateFull(account.address);
        await helper.collatorSelection.obtainLicense(account);
        expect(await helper.collatorSelection.hasLicense(account.address)).to.be.equal(licenseBond);

        // force-releasing a license un-reserves the license bond cost as well
        await helper.getSudo().collatorSelection.forceReleaseLicense(superuser, account.address);
        expect(await helper.collatorSelection.hasLicense(account.address)).to.be.equal(previousBalance.reserved);

        const balance = await helper.balance.getSubstrateFull(account.address);
        expect(balance.reserved).to.be.equal(previousBalance.reserved);
        expect(balance.free > previousBalance.free - licenseBond);
      });
    });

    describe('Negative', () => {
      itSub('Cannot get a license without session keys set', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([100n], superuser);
        await expect(helper.collatorSelection.obtainLicense(account))
          .to.be.rejectedWith(/collatorSelection.ValidatorNotRegistered/);
      });

      itSub('Cannot register a license twice', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await expect(helper.collatorSelection.obtainLicense(account))
          .to.be.rejectedWith(/collatorSelection.AlreadyHoldingLicense/);
      });

      itSub('Cannot release a license twice', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await helper.collatorSelection.releaseLicense(account);
        await expect(helper.collatorSelection.releaseLicense(account))
          .to.be.rejectedWith(/collatorSelection.NoLicense/);
      });

      itSub('Cannot force revoke a license as non-sudo', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await expect(helper.collatorSelection.forceReleaseLicense(superuser, account.address))
          .to.be.rejectedWith(/BadOrigin/);
      });
    });
  });

  describe('Onboarding, collating, and offboarding as collator candidates', () => {
    let crowd: IKeyringPair[];

    before(async function() {
      await usingPlaygrounds(async (helper) => {
        crowd = await helper.arrange.createCrowd(20, 100n, superuser);

        for (const acc of crowd) {
          await helper.session.setOwnKeysFromAddress(acc);
        }
      });
    });

    describe('Positive', () => {
      itSub('Can onboard and offboard repeatedly', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await helper.collatorSelection.onboard(account);
        expect(await helper.collatorSelection.getCandidates()).to.be.deep.equal([account.address]);

        await helper.collatorSelection.offboard(account);
        expect(await helper.collatorSelection.getCandidates()).to.be.deep.equal([]);

        await helper.collatorSelection.onboard(account);
        expect(await helper.collatorSelection.getCandidates()).to.be.deep.equal([account.address]);

        await helper.collatorSelection.offboard(account);
        expect(await helper.collatorSelection.getCandidates()).to.be.deep.equal([]);
      });

      itSub('Penalizes and forfeits license from faulty collators', async ({helper}) => {
        // This one shouldn't even be able to produce blocks.
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await helper.collatorSelection.onboard(account);
        expect(await helper.collatorSelection.getCandidates()).to.contain(account.address);

        // Wait for 3 new sessions before checking that the collator will be kicked:
        // one to get collator onboarded, and another two for the collator to fail
        await helper.wait.newSessions(3);

        expect(await helper.collatorSelection.getCandidates()).to.not.contain(account.address);
        expect(await helper.collatorSelection.hasLicense(account.address)).to.be.equal(0n);

        // The account's reserved funds get slashed as a penalty
        const balance = await helper.balance.getSubstrateFull(account.address);
        expect(balance.reserved).to.be.equal(0n);
        expect(balance.free < 100n - licenseBond);
      });
    });

    describe('Negative', () => {
      itSub('Cannot onboard without a license', async ({helper}) => {
        const account = crowd.pop()!;
        await expect(helper.collatorSelection.onboard(account))
          .to.be.rejectedWith(/collatorSelection.NoLicense/);
      });

      itSub('Cannot offboard without a license', async ({helper}) => {
        const account = crowd.pop()!;
        await expect(helper.collatorSelection.offboard(account))
          .to.be.rejectedWith(/collatorSelection.NotCandidate/);
      });

      itSub('Cannot offboard while not onboarded', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await expect(helper.collatorSelection.offboard(account))
          .to.be.rejectedWith(/collatorSelection.NotCandidate/);
      });

      itSub('Cannot onboard while already onboarded', async ({helper}) => {
        const account = crowd.pop()!;
        await helper.collatorSelection.obtainLicense(account);
        await helper.collatorSelection.onboard(account);
        await expect(helper.collatorSelection.onboard(account))
          .to.be.rejectedWith(/collatorSelection.AlreadyCandidate/);
      });
    });
  });

  describe('Addition and removal of invulnerables', () => {
    describe('Positive', () => {
      itSub('Adds an invulnerable', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([10n], superuser);
        const invulnerables = await helper.collatorSelection.getInvulnerables();

        await helper.session.setOwnKeysFromAddress(account);
        await helper.getSudo().collatorSelection.addInvulnerable(superuser, account.address);

        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(invulnerables.concat(account.address)).to.have.all.members(newInvulnerables);
      });

      itSub('Removes an invulnerable', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        const lastInvulnerable = invulnerables.pop()!;

        await helper.getSudo().collatorSelection.removeInvulnerable(superuser, lastInvulnerable);
        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        // invulnerables had its last element removed, so they should be equal
        expect(newInvulnerables).to.have.all.members(invulnerables);
      });
    });

    describe('Negative', () => {
      itSub('Does not duplicate an invulnerable', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        // adding an already invulnerable should not fail, but should not duplicate it either
        await expect(helper.getSudo().collatorSelection.addInvulnerable(superuser, invulnerables[0]))
          .to.be.fulfilled;
        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(newInvulnerables).to.have.all.members(invulnerables);
      });

      itSub('Cannot remove a non-existent invulnerable', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([0n], superuser);
        await expect(helper.getSudo().collatorSelection.removeInvulnerable(superuser, account.address))
          .to.be.rejectedWith(/collatorSelection.NotInvulnerable/);
      });

      itSub('Cannot allow invulnerables to be empty', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        const lastInvulnerable = invulnerables.pop()!;

        let nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(invulnerables.map((i: any) =>
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [i], true, {nonce: nonce++})));

        await expect(helper.getSudo().collatorSelection.removeInvulnerable(superuser, lastInvulnerable))
          .to.be.rejectedWith(/collatorSelection.TooFewInvulnerables/);

        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(newInvulnerables).to.be.deep.equal([lastInvulnerable]);

        // restore the invulnerables to the previous state
        nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(invulnerables.map((i: any) =>
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [i], true, {nonce: nonce++})));
      });

      itSub('Cannot have too many invulnerables', async ({helper}) => {
        // todo:collator make sure that there is enough session time for a set of tests
        // 28 non-functioning collators, teehee.

        const invulnerablesLength = (await helper.collatorSelection.getInvulnerables()).length;
        const invulnerablesUntilLimit = (await helper.collatorSelection.getDesiredCollators()) - invulnerablesLength;
        const newInvulnerables = await helper.arrange.createAccounts(Array(invulnerablesUntilLimit).fill(10n), superuser);
        const [lastInvulnerable] = await helper.arrange.createAccounts([10n], superuser);

        for (const i of newInvulnerables) {
          await helper.session.setOwnKeysFromAddress(i);
        }

        await helper.session.setOwnKeysFromAddress(lastInvulnerable);

        let nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(newInvulnerables.map((i: IKeyringPair) =>
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [i.address], true, {nonce: nonce++})));

        await expect(helper.getSudo().collatorSelection.addInvulnerable(superuser, lastInvulnerable.address))
          .to.be.rejectedWith(/collatorSelection.TooManyInvulnerables/);

        // restore the invulnerables to the previous state
        nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(newInvulnerables.map((i: IKeyringPair) =>
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [i.address], true, {nonce: nonce++})));
      });

      itSub('Forbids a non-sudo to add an invulnerable', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([10n], superuser);
        const invulnerables = await helper.collatorSelection.getInvulnerables();

        await helper.session.setOwnKeysFromAddress(account);
        await expect(helper.collatorSelection.addInvulnerable(superuser, account.address))
          .to.be.rejectedWith(/BadOrigin/);

        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(newInvulnerables).to.be.members(invulnerables);
      });

      itSub('Forbids a non-sudo to remove an invulnerable', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        await expect(helper.collatorSelection.removeInvulnerable(superuser, invulnerables[0]))
          .to.be.rejectedWith(/BadOrigin/);
        expect(await helper.collatorSelection.getInvulnerables()).to.have.all.members(invulnerables);
      });

      after(async function() {
        await resetInvulnerables();
      });
    });
  });

  after(async function() {
    if(!process.env.RUN_COLLATOR_TESTS) return;

    await usingPlaygrounds(async (helper) => {
      if(helper.fetchMissingPalletNames([Pallets.CollatorSelection]).length != 0) return;

      await helper.getSudo().collatorSelection.setLicenseBond(superuser, previousLicenseBond);

      const candidates = await helper.collatorSelection.getCandidates();
      let nonce = await helper.chain.getNonce(superuser.address);
      await Promise.all(candidates.map(candidate =>
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.forceReleaseLicense', [candidate], true, {nonce: nonce++})));
    });
  });
});
