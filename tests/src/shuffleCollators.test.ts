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
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionAsync} from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import {expect} from 'chai';
import {getBlockNumber, getGenericResult} from './util/helpers';

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;
let dave: IKeyringPair;
//let eve: IKeyringPair;

describe('Integration Test: Dynamic shuffling of collators', () => {
  before(async () => {    
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
      dave = privateKey('//Dave');
      //eve = privateKey('//Eve');
    });
  });

  it('Change invulnerables and make sure they start producing blocks', async () => {
    await usingApi(async (api) => {
      const txC = api.tx.session.setKeys(
        '0x' + Buffer.from(charlie.addressRaw).toString('hex'),
        '0x0',
      );
      const eventsC = await submitTransactionAsync(charlie, txC);
      const resultC = getGenericResult(eventsC);
      expect(resultC.success).to.be.true;

      const txD = api.tx.session.setKeys(
        '0x' + Buffer.from(dave.addressRaw).toString('hex'),
        '0x0',
      );
      const eventsD = await submitTransactionAsync(dave, txD);
      const resultD = getGenericResult(eventsD);
      expect(resultD.success).to.be.true;

      const tx = api.tx.collatorSelection.setInvulnerables([
        charlie.address,
        dave.address,
      ]);
      const sudoTx = api.tx.sudo.sudo(tx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;

      const newInvulnerables = (await api.query.collatorSelection.invulnerables()).toJSON();
      expect(newInvulnerables).to.contain(charlie.address).and.contain(dave.address);
      expect(newInvulnerables).to.be.length(2);

      const expectedSessionIndex = (await api.query.session.currentIndex() as any).toNumber() + 2;
      let currentSessionIndex = -1;
      while (currentSessionIndex < expectedSessionIndex) {
        await waitNewBlocks(api, 1);
        currentSessionIndex = (await api.query.session.currentIndex() as any).toNumber();
        // todo implement a timeout in case new blocks are not being produced? session length needed
      }

      const newValidators = (await api.query.session.validators()).toJSON();
      expect(newValidators).to.contain(charlie.address).and.contain(dave.address);
      expect(newValidators).to.be.length(2);

      const lastBlockNumber = await getBlockNumber(api);
      await waitNewBlocks(api, 1);
      const lastCharlieBlock = (await api.query.collatorSelection.lastAuthoredBlock(charlie.address) as any).toNumber();
      const lastDaveBlock = (await api.query.collatorSelection.lastAuthoredBlock(dave.address) as any).toNumber();
      expect(lastCharlieBlock >= lastBlockNumber || lastDaveBlock >= lastBlockNumber).to.be.true;
    });
  });

  after(async () => {
    await usingApi(async (api) => {
      const tx = api.tx.collatorSelection.setInvulnerables([
        alice.address,
        bob.address,
      ]);
      const sudoTx = api.tx.sudo.sudo(tx as any);
      const events = await submitTransactionAsync(alice, sudoTx);
      const result = getGenericResult(events);
      expect(result.success).to.be.true;
    });
  });
});
