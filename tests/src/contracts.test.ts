import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import fs from "fs";
import { Abi, ContractPromise as Contract } from "@polkadot/api-contract";
import privateKey from "./substrate/privateKey";
import {
  deployFlipper,
  getFlipValue
} from "./util/contracthelpers";

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
      const flip = contract.exec('flip', value, gasLimit);
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

  it.skip('Can transfer balance using smart contract.', async () => {
    await usingApi(async api => {
      // const [alicesBalanceBefore, bobsBalanceBefore] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);
      // const wasm = fs.readFileSync('./src/balance-transfer-contract/calls.wasm');
      // const contract = compactAddLength(u8aToU8a(wasm));

      // const metadata = JSON.parse(fs.readFileSync('./src/balance-transfer-contract/metadata.json').toString('utf-8'));
      // const abi = new Abi(api.registry as any, metadata);

      // const alicesPrivateKey = privateKey('//Alice');

      // const contractHash = await deployContract(api, contract, alicesPrivateKey);

      // // const args = abi.constructors[0]();
      // const instanceAccountId = await instantiateContract(api, contractHash, /*args,*/ alicesPrivateKey);
      // const contractInstance = new ContractPromise(api, abi, instanceAccountId);
      // const bob = new GenericAccountId(api.registry, bobsPublicKey);

      // const transfer = contractInstance.exec('balance_transfer', 0, 1000000000000n, [bob, new u128(api.registry, 1000000)]);
      // await submitTransactionAsync(alicesPrivateKey, transfer);

      // const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      // expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
      // expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
    });
  });
});
