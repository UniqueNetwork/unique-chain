//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import privateKey from "./substrate/privateKey";
import {
  deployFlipper
} from "./util/contracthelpers";
import {
  getGenericResult
} from "./util/helpers"

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test addToContractWhiteList', () => {

  it(`Add an address to a contract white list`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");
      const [contract, deployer] = await deployFlipper(api);

      const whiteListedBefore = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.nft.addToContractWhiteList(contract.address, bob.address);
      const addEvents = await submitTransactionAsync(deployer, addTx);
      const whiteListedAfter = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();

      expect(getGenericResult(addEvents).success).to.be.true;
      expect(whiteListedBefore).to.be.false;
      expect(whiteListedAfter).to.be.true;
    });
  });

  it(`Adding same address to white list repeatedly should not produce errors`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");
      const [contract, deployer] = await deployFlipper(api);

      const whiteListedBefore = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.nft.addToContractWhiteList(contract.address, bob.address);
      const addEvents = await submitTransactionAsync(deployer, addTx);
      const whiteListedAfter = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();
      const addAgainEvents = await submitTransactionAsync(deployer, addTx);
      const whiteListedAgainAfter = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();

      expect(getGenericResult(addEvents).success).to.be.true;
      expect(whiteListedBefore).to.be.false;
      expect(whiteListedAfter).to.be.true;
      expect(getGenericResult(addAgainEvents).success).to.be.true;
      expect(whiteListedAgainAfter).to.be.true;
    });
  });
});

describe('Negative Integration Test addToContractWhiteList', () => {

  it(`Add an address to a white list of a non-contract`, async () => {
    await usingApi(async api => {
      const alice = privateKey("//Bob");
      const bob = privateKey("//Bob");
      const charlieGuineaPig = privateKey("//Charlie");

      const whiteListedBefore = (await api.query.nft.contractWhiteList(charlieGuineaPig.address, bob.address)).toJSON();
      const addTx = api.tx.nft.addToContractWhiteList(charlieGuineaPig.address, bob.address);
      await expect(submitTransactionExpectFailAsync(alice, addTx)).to.be.rejected;
      const whiteListedAfter = (await api.query.nft.contractWhiteList(charlieGuineaPig.address, bob.address)).toJSON();

      expect(whiteListedBefore).to.be.false;
      expect(whiteListedAfter).to.be.false;
    });
  });

  it(`Add to a contract white list using a non-owner address`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");
      const [contract, deployer] = await deployFlipper(api);

      const whiteListedBefore = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();
      const addTx = api.tx.nft.addToContractWhiteList(contract.address, bob.address);
      await expect(submitTransactionExpectFailAsync(bob, addTx)).to.be.rejected;
      const whiteListedAfter = (await api.query.nft.contractWhiteList(contract.address, bob.address)).toJSON();

      expect(whiteListedBefore).to.be.false;
      expect(whiteListedAfter).to.be.false;
    });
  });

});
