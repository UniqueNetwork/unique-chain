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
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  deployFlipper,
} from './util/contracthelpers';
import {
  getGenericResult,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

// todo:playgrounds skipped ~ postponed
describe.skip('Integration Test addToContractAllowList', () => {

  it('Add an address to a contract allow list', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const bob = privateKeyWrapper('//Bob');
      const [contract, deployer] = await deployFlipper(api, privateKeyWrapper);

      const allowListedBefore = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(contract.address, bob.address);
      const addEvents = await submitTransactionAsync(deployer, addTx);
      const allowListedAfter = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();

      expect(getGenericResult(addEvents).success).to.be.true;
      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.true;
    });
  });

  it('Adding same address to allow list repeatedly should not produce errors', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const bob = privateKeyWrapper('//Bob');
      const [contract, deployer] = await deployFlipper(api, privateKeyWrapper);

      const allowListedBefore = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(contract.address, bob.address);
      const addEvents = await submitTransactionAsync(deployer, addTx);
      const allowListedAfter = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();
      const addAgainEvents = await submitTransactionAsync(deployer, addTx);
      const allowListedAgainAfter = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();

      expect(getGenericResult(addEvents).success).to.be.true;
      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.true;
      expect(getGenericResult(addAgainEvents).success).to.be.true;
      expect(allowListedAgainAfter).to.be.true;
    });
  });
});

describe.skip('Negative Integration Test addToContractAllowList', () => {

  it('Add an address to a allow list of a non-contract', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const alice = privateKeyWrapper('//Bob');
      const bob = privateKeyWrapper('//Bob');
      const charlieGuineaPig = privateKeyWrapper('//Charlie');

      const allowListedBefore = (await api.query.unique.contractAllowList(charlieGuineaPig.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(charlieGuineaPig.address, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, addTx)).to.be.rejected;
      const allowListedAfter = (await api.query.unique.contractAllowList(charlieGuineaPig.address, bob.address)).toJSON();

      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.false;
    });
  });

  it('Add to a contract allow list using a non-owner address', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const bob = privateKeyWrapper('//Bob');
      const [contract] = await deployFlipper(api, privateKeyWrapper);

      const allowListedBefore = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(contract.address, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, addTx)).to.be.rejected;
      const allowListedAfter = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();

      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.false;
    });
  });

});
