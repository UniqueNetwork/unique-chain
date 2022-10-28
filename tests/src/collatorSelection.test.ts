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

// todo Most preferable to launch this test in parallel somehow -- or change the session period (1 hr).
describe('Integration Test: Dynamic shuffling of collators', () => {
  let superuser: IKeyringPair;

  // These are the default invulnerables, and should return to be invulnerables after this suite.
  let aliceAddress: string;
  let bobAddress: string;

  let charlie: IKeyringPair;
  let dave: IKeyringPair;
  //let eve: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.CollatorSelection]);

      //const donor = await privateKey({filename: __filename});
      //[charlie, dave] = await helper.arrange.createAccounts([100n, 100n], donor);
      charlie = await privateKey('//Charlie');
      dave = await privateKey('//Dave');

      superuser = await privateKey('//Alice');
      aliceAddress = (await privateKey('//Alice')).address;
      bobAddress = (await privateKey('//Bob')).address;

      expect((await helper.executeExtrinsic(charlie, 'api.tx.session.setKeys', [
        '0x' + Buffer.from(charlie.addressRaw).toString('hex'),
        '0x0',
      ])).status.toLowerCase()).to.be.equal('success');

      expect((await helper.executeExtrinsic(dave, 'api.tx.session.setKeys', [
        '0x' + Buffer.from(dave.addressRaw).toString('hex'),
        '0x0',
      ])).status.toLowerCase()).to.be.equal('success');

      const validators = await helper.callRpc('api.query.session.validators');
      expect(validators).to.not.contain(charlie.address).and.not.contain(dave.address);
    });
  });

  itSub('Change invulnerables and make sure they start producing blocks', async ({helper}) => {

    const tx = helper.constructApiCall('api.tx.collatorSelection.setInvulnerables', [[
      charlie.address,
      dave.address,
    ]]);
    await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [tx])).to.be.fulfilled;

    const newInvulnerables = await helper.callRpc('api.query.collatorSelection.invulnerables');
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

  after(async () => {
    await usingPlaygrounds(async (helper) => {
      if (helper.fetchMissingPalletNames([Pallets.AppPromotion]).length != 0) return;

      const tx = helper.constructApiCall('api.tx.collatorSelection.setInvulnerables', [[
        aliceAddress,
        bobAddress,
      ]]);
      await expect(helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [tx])).to.be.fulfilled;
    });
  });
});
