import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import fs from "fs";
import { Abi, ContractPromise as Contract } from "@polkadot/api-contract";
import privateKey from "./substrate/privateKey";
import {
  deployFlipper,
  getFlipValue,
  deployTransferContract,
} from "./util/contracthelpers";

import {
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getGenericResult
} from "./util/helpers";


chai.use(chaiAsPromised);
const expect = chai.expect;

const value = 0;
const gasLimit = 3000n * 1000000n;
const marketContractAddress = '5CYN9j3YvRkqxewoxeSvRbhAym4465C57uMmX5j4yz99L5H6';

describe('Contracts', () => {
  it(`Can deploy smart contract Flipper, instantiate it and call it's get and flip messages.`, async () => {
    await usingApi(async api => {
      const [contract, deployer] = await deployFlipper(api);
      const initialGetResponse = await getFlipValue(contract, deployer);

      const bob = privateKey("//Bob");
      const flip = contract.tx.flip(value, gasLimit);
      await submitTransactionAsync(bob, flip);

      const afterFlipGetResponse = await getFlipValue(contract, deployer);
      expect(afterFlipGetResponse).not.to.be.eq(initialGetResponse, 'Flipping should change value.');
    });
  });

  it('Can initialize contract instance', async () => {
    await usingApi(async (api) => {
      const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
      const abi = new Abi(metadata);
      const newContractInstance = new Contract(api, abi, marketContractAddress);
      expect(newContractInstance).to.have.property('address');
      expect(newContractInstance.address.toString()).to.equal(marketContractAddress);
    });
  });

  it('Can transfer NFT using smart contract.', async () => {
    await usingApi(async api => {
      const alice = privateKey("//Alice");
      const bob = privateKey("//Bob");

      // Prep work
      const collectionId = await createCollectionExpectSuccess();
      const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
      const [contract, deployer] = await deployTransferContract(api);
      const tokenBefore: any = await api.query.nft.nftItemList(collectionId, tokenId);
      
      // Transfer
      const transferTx = contract.tx.transfer(value, gasLimit, bob.address, collectionId, tokenId, 1);
      const events = await submitTransactionAsync(alice, transferTx);
      const result = getGenericResult(events);
      const tokenAfter: any = await api.query.nft.nftItemList(collectionId, tokenId);

      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      expect(tokenBefore.Owner.toString()).to.be.equal(alice.address);
      expect(tokenAfter.Owner.toString()).to.be.equal(bob.address);
    });
  });
});
