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
import {usingPlaygrounds, expect, itSub, Pallets, requirePalletsOrSkip} from './util';

async function resetInvulnerables() {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey('//Alice');
    const alice = await privateKey('//Alice');
    const bob = await privateKey('//Bob');
    const invulnerables = await helper.collatorSelection.getInvulnerables();
    if (!invulnerables.includes(alice.address) || !invulnerables.includes(bob.address) || invulnerables.length != 2) {
      console.warn('Alice and Bob are not the invulnerables! Reinstating them back. ' 
        + 'Current invulnerables\' size: ' + invulnerables.length);
      
      let nonce = await helper.chain.getNonce(alice.address);
      await Promise.all([
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [alice.address], true, {nonce: nonce++}),
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [bob.address], true, {nonce: nonce++}),
      ]);

      nonce = await helper.chain.getNonce(alice.address);
      await Promise.all(invulnerables.map((invulnerable: any) => {
        if (invulnerable == alice.address || invulnerable == bob.address) return new Promise<void>(res => res());
        return helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [invulnerable], true, {nonce: nonce++});
      }));
    }
  });
}

// todo:collator Most preferable to launch this test in parallel somehow -- or change the session period (1 hr).
// + 18 tests: 5 (1+4) on session change
describe('Integration Test: Collator Selection', () => {
  let superuser: IKeyringPair;

  before(async function() {  
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.CollatorSelection]);
      superuser = await privateKey('//Alice');
    });
  });

  describe('Dynamic shuffling of collators', () => {
    // These two are the default invulnerables, and should return to be invulnerables after this suite.
    let alice: IKeyringPair;
    let bob: IKeyringPair;

    let charlie: IKeyringPair;
    let dave: IKeyringPair;
    
    before(async function() {  
      await usingPlaygrounds(async (helper, privateKey) => {
        alice = await privateKey('//Alice');
        bob = await privateKey('//Bob');
        charlie = await privateKey('//Charlie');
        dave = await privateKey('//Dave');

        expect((await helper.collatorSelection.setOwnKeys(charlie))
          .status.toLowerCase()).to.be.equal('success');
        expect((await helper.collatorSelection.setOwnKeys(dave))
          .status.toLowerCase()).to.be.equal('success');
  
        // todo:collator check necessity + add RPC for invulnerables / just improve in general
        // validators = await helper.callRpc('api.query.session.validators');
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        if (!invulnerables.includes(alice.address) || !invulnerables.includes(bob.address) || invulnerables.length != 2) {
          console.warn('Alice and Bob are not the invulnerables! Reinstating them back. ' 
            + 'Current invulnerables\' size: ' + invulnerables.length);
          
          let nonce = await helper.chain.getNonce(superuser.address);
          await Promise.all([
            helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [alice.address], true, {nonce: nonce++}),
            helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [bob.address], true, {nonce: nonce++}),
          ]);
  
          nonce = await helper.chain.getNonce(superuser.address);
          await Promise.all(invulnerables.map((invulnerable: any) => {
            if (invulnerable == alice.address || invulnerable == bob.address) return new Promise((res) => res);
            return helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [invulnerable], true, {nonce: nonce++});
          }));
        }
      });
    });
  
    itSub('Change invulnerables and make sure they start producing blocks', async ({helper}) => {
      let nonce = await helper.chain.getNonce(superuser.address);
      await expect(Promise.all([
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [charlie.address], true, {nonce: nonce++}),
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [dave.address], true, {nonce: nonce++}),
      ])).to.be.fulfilled;
  
      nonce = await helper.chain.getNonce(superuser.address);
      await expect(Promise.all([
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [alice.address], true, {nonce: nonce++}),
        helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [bob.address], true, {nonce: nonce++}),
      ])).to.be.fulfilled;
  
      const newInvulnerables = await helper.collatorSelection.getInvulnerables();
      expect(newInvulnerables).to.contain(charlie.address).and.contain(dave.address).and.be.length(2);
  
      const expectedSessionIndex = (await helper.callRpc('api.query.session.currentIndex')).toNumber() + 2;
      let currentSessionIndex = -1;
      console.log('Waiting for the session after the next.' 
        + ' This might take a while -- check SessionPeriod in pallet_session::Config for session time.');
  
      while (currentSessionIndex < expectedSessionIndex) {
        // eslint-disable-next-line no-async-promise-executor
        currentSessionIndex = await expect(helper.wait.withTimeout(new Promise(async (resolve) => {
          await helper.wait.newBlocks(1);
          const res = (await helper.callRpc('api.query.session.currentIndex')).toNumber();
          resolve(res);
        }), 24000, 'The chain has stopped producing blocks!')).to.be.fulfilled;
      }
  
      const newValidators = await helper.callRpc('api.query.session.validators');
      expect(newValidators).to.contain(charlie.address).and.contain(dave.address).and.be.length(2);
  
      const lastBlockNumber = await helper.chain.getLatestBlockNumber();
      await helper.wait.newBlocks(1);
      const lastCharlieBlock = (await helper.callRpc('api.query.collatorSelection.lastAuthoredBlock', [charlie.address])).toNumber();
      const lastDaveBlock = (await helper.callRpc('api.query.collatorSelection.lastAuthoredBlock', [dave.address])).toNumber();
      expect(lastCharlieBlock >= lastBlockNumber || lastDaveBlock >= lastBlockNumber).to.be.true;
    });
  
    // todo:collator keyless invulnerables? will hang, so, a breaking test, eh
    // register candidate without sudos and the like
  
    after(async () => {
      await usingPlaygrounds(async (helper) => {
        if (helper.fetchMissingPalletNames([Pallets.CollatorSelection]).length != 0) return;

        let nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all([
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [alice.address], true, {nonce: nonce++}),
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [bob.address], true, {nonce: nonce++}),
        ]);
  
        nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all([
          await helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [charlie.address], true, {nonce: nonce++}),
          await helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [dave.address], true, {nonce: nonce++}),
        ]);
      });
    });
  });

  // todo:collator make sure that there is enough session time for a set of tests
  // 28 non-functioning collators, teehee.

  describe.skip('Addition and removal of invulnerables', () => {
    before(async function() {
      await resetInvulnerables();
    });

    describe('Positive', () => {
      itSub('Adds an invulnerable', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([10n], superuser);
        const invulnerables = await helper.collatorSelection.getInvulnerables();

        await helper.collatorSelection.setOwnKeys(account);
        await helper.getSudo().collatorSelection.addInvulnerable(superuser, account.address);
        
        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(invulnerables.concat(account.address)).to.have.all.members(newInvulnerables);
      });

      itSub('Removes an invulnerable', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        const lastInvulnerable = invulnerables.pop();

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

      itSub('Cannot allow invulnerables to be empty', async ({helper}) => {
        const invulnerables = await helper.collatorSelection.getInvulnerables();
        const lastInvulnerable = invulnerables.pop();

        let nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(invulnerables.map((i: any) => 
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [i], true, {nonce: nonce++})));

        await expect(helper.getSudo().collatorSelection.removeInvulnerable(superuser, lastInvulnerable))
          .to.be.rejected;//todo:collator With(/collatorSelection.TooFewInvulnerables/);

        const newInvulnerables = await helper.collatorSelection.getInvulnerables();
        expect(newInvulnerables).to.be.deep.equal([lastInvulnerable]);
        
        // restore the invulnerables to the previous state
        nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(invulnerables.map((i: any) => 
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [i], true, {nonce: nonce++})));
      });

      itSub('Cannot have too many invulnerables', async ({helper}) => {
        const invulnerablesLength = (await helper.collatorSelection.getInvulnerables()).length;
        const invulnerablesUntilLimit = 30 - invulnerablesLength;
        const newInvulnerables = await helper.arrange.createAccounts(Array(invulnerablesUntilLimit).fill(10n), superuser);
        const [lastInvulnerable] = await helper.arrange.createAccounts([10n], superuser);

        await Promise.all(newInvulnerables.map((i: IKeyringPair) => 
          helper.collatorSelection.setOwnKeys(i)));
        await helper.collatorSelection.setOwnKeys(lastInvulnerable);

        let nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(newInvulnerables.map((i: IKeyringPair) => 
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.addInvulnerable', [i.address], true, {nonce: nonce++})));

        await expect(helper.getSudo().collatorSelection.addInvulnerable(superuser, lastInvulnerable.address))
          .to.be.rejected; // todo:collator With(/collatorSelection.TooManyInvulnerables/);
        
        // restore the invulnerables to the previous state
        nonce = await helper.chain.getNonce(superuser.address);
        await Promise.all(newInvulnerables.map((i: IKeyringPair) => 
          helper.getSudo().executeExtrinsic(superuser, 'api.tx.collatorSelection.removeInvulnerable', [i.address], true, {nonce: nonce++})));
      });

      itSub('Forbids a non-sudo to add an invulnerable', async ({helper}) => {
        const [account] = await helper.arrange.createAccounts([10n], superuser);
        const invulnerables = await helper.collatorSelection.getInvulnerables();

        await helper.collatorSelection.setOwnKeys(account);
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
    });
    
    // todo:collator after
  });
});