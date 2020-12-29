import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import fs from "fs";
import { Abi, BlueprintPromise as Blueprint, CodePromise, ContractPromise as Contract } from "@polkadot/api-contract";
import { IKeyringPair } from "@polkadot/types/types";
import { ApiPromise, Keyring } from "@polkadot/api";
import { ApiTypes, SubmittableExtrinsic } from "@polkadot/api/types";
import privateKey from "./substrate/privateKey";

chai.use(chaiAsPromised);
const expect = chai.expect;
import { BigNumber } from 'bignumber.js';
import { findUnusedAddress } from './util/helpers';

const value = 0;
const gasLimit = 3000n * 1000000n;
const endowment = `1000000000000000`;
const marketContractAddress = '5CYN9j3YvRkqxewoxeSvRbhAym4465C57uMmX5j4yz99L5H6';

function deployBlueprint(alice: IKeyringPair, code: CodePromise): Promise<Blueprint> {
  return new Promise<Blueprint>(async (resolve, reject) => {
    const unsub = await code
      .createBlueprint()
      .signAndSend(alice, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          // here we have an additional field in the result, containing the blueprint
          resolve(result.blueprint);
          unsub();
        }
      })
  });
}

function deployContract(alice: IKeyringPair, blueprint: Blueprint) : Promise<any> {
  return new Promise<any>(async (resolve, reject) => {
    const endowment = 1000000000000000n;
    const initValue = true;

    const unsub = await blueprint.tx
    .new(endowment, gasLimit, initValue)
    .signAndSend(alice, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        unsub();
        resolve(result);
      }
    });    
  });
}

async function prepareDeployer(api: ApiPromise) {
  // Find unused address
  const deployer = await findUnusedAddress(api);

  // Transfer balance to it
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri(`//Alice`);
  let amount = new BigNumber(endowment);
  amount = amount.plus(1e15);
  const tx = api.tx.balances.transfer(deployer.address, amount.toFixed());
  await submitTransactionAsync(alice, tx);

  return deployer;
}

export async function deployFlipper(api: ApiPromise): Promise<[Contract, IKeyringPair]> {
  const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
  const abi = new Abi(metadata);

  const deployer = await prepareDeployer(api);

  const wasm = fs.readFileSync('./src/flipper/flipper.wasm');

  const code = new CodePromise(api, abi, wasm);

  const blueprint = await deployBlueprint(deployer, code);
  const contract = (await deployContract(deployer, blueprint))['contract'] as Contract;

  const initialGetResponse = await getFlipValue(contract, deployer);
  expect(initialGetResponse).to.be.true;

  return [contract, deployer];
}

async function getFlipValue(contract: Contract, deployer: IKeyringPair) {
  const result = await contract.query.get(deployer.address, value, gasLimit);

  if(!result.result.isSuccess) {
    throw `Failed to get flipper value`;
  }
  return (result.result.asSuccess.data[0] == 0x00) ? false : true;
}

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

  it(`Whitelisted account can call contract.`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");

      const [contract, deployer] = await deployFlipper(api);
      const consoleError = console.error;
      console.error = (...data: any[]) => {
      };

      let expectedFlipValue = await getFlipValue(contract, deployer);

      const flip = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, flip);
      expectedFlipValue = !expectedFlipValue;
      const afterFlip = await getFlipValue(contract,deployer);
      expect(afterFlip).to.be.eq(expectedFlipValue, `Anyone can call new contract.`);

      const deployerCanFlip = async () => {
        expectedFlipValue = !expectedFlipValue;
        const deployerFlip = contract.exec('flip', value, gasLimit);
        await submitTransactionAsync(deployer, deployerFlip);
        const aliceFlip1Response = await getFlipValue(contract, deployer);
        expect(aliceFlip1Response).to.be.eq(expectedFlipValue, `Deployer always can flip.`);
      };
      await deployerCanFlip();

      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, true);
      const enableResult = await submitTransactionAsync(deployer, enableWhiteListTx);
      const flipWithEnabledWhiteList = contract.exec('flip', value, gasLimit);
      await expect(submitTransactionExpectFailAsync(bob, flipWithEnabledWhiteList)).to.be.rejected;
      const flipValueAfterEnableWhiteList = await getFlipValue(contract, deployer);
      expect(flipValueAfterEnableWhiteList).to.be.eq(expectedFlipValue, `Enabling whitelist doesn't make it possible to call contract for everyone.`);

      await deployerCanFlip();

      const addBobToWhiteListTx = api.tx.nft.addToContractWhiteList(contract.address, bob.address);
      const addBobResult = await submitTransactionAsync(deployer, addBobToWhiteListTx);
      const flipWithWhitelistedBob = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, flipWithWhitelistedBob);
      expectedFlipValue = !expectedFlipValue;
      const flipAfterWhiteListed = await getFlipValue(contract,deployer);
      expect(flipAfterWhiteListed).to.be.eq(expectedFlipValue, `Bob was whitelisted, now he can flip.`);

      await deployerCanFlip();

      const removeBobFromWhiteListTx = api.tx.nft.removeFromContractWhiteList(contract.address, bob.address);
      const removeBobResult = await submitTransactionAsync(deployer, removeBobFromWhiteListTx);
      const bobRemoved = contract.exec('flip', value, gasLimit);
      await expect(submitTransactionExpectFailAsync(bob, bobRemoved)).to.be.rejected;
      const afterBobRemoved = await getFlipValue(contract, deployer);
      expect(afterBobRemoved).to.be.eq(expectedFlipValue, `Bob can't call contract, now when he is removeed from white list.`);

      await deployerCanFlip();

      const disableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, false);
      const disableWhiteListResult = await submitTransactionAsync(deployer, disableWhiteListTx);
      const whiteListDisabledFlip = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, whiteListDisabledFlip);
      expectedFlipValue = !expectedFlipValue;
      const afterWhiteListDisabled = await getFlipValue(contract,deployer);
      expect(afterWhiteListDisabled).to.be.eq(expectedFlipValue, `Anyone can call contract with disabled whitelist.`);

      console.error = consoleError;
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
