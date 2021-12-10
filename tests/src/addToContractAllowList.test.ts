//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import privateKey from './substrate/privateKey';
import {
  deployFlipper,
} from './util/contracthelpers';
import {
  getGenericResult,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.skip('Integration Test addToContractAllowList', () => {

  it('Add an address to a contract allow list', async () => {
    await usingApi(async api => {
      const bob = privateKey('//Bob');
      const [contract, deployer] = await deployFlipper(api);

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
    await usingApi(async api => {
      const bob = privateKey('//Bob');
      const [contract, deployer] = await deployFlipper(api);

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
    await usingApi(async api => {
      const alice = privateKey('//Bob');
      const bob = privateKey('//Bob');
      const charlieGuineaPig = privateKey('//Charlie');

      const allowListedBefore = (await api.query.unique.contractAllowList(charlieGuineaPig.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(charlieGuineaPig.address, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, addTx)).to.be.rejected;
      const allowListedAfter = (await api.query.unique.contractAllowList(charlieGuineaPig.address, bob.address)).toJSON();

      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.false;
    });
  });

  it('Add to a contract allow list using a non-owner address', async () => {
    await usingApi(async api => {
      const bob = privateKey('//Bob');
      const [contract] = await deployFlipper(api);

      const allowListedBefore = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.unique.addToContractAllowList(contract.address, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, addTx)).to.be.rejected;
      const allowListedAfter = (await api.query.unique.contractAllowList(contract.address, bob.address)).toJSON();

      expect(allowListedBefore).to.be.false;
      expect(allowListedAfter).to.be.false;
    });
  });

});
