import { expect } from "chai";
import usingApi from "./substrate/substrate-api";
import fs from "fs";
import { Abi, BlueprintPromise, CodePromise } from "@polkadot/api-contract";
import { IKeyringPair } from "@polkadot/types/types";
import { Keyring } from "@polkadot/api";
import { ApiTypes, SubmittableExtrinsic } from "@polkadot/api/types";

const value = 0;
const gasLimit = 3000n * 1000000n;

function deployBlueprint(alice: IKeyringPair, code: CodePromise): Promise<BlueprintPromise> {
  return new Promise<BlueprintPromise>(async (resolve, reject) => {
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

function deployContract(alice: IKeyringPair, blueprint: BlueprintPromise) : Promise<any> {
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

function runTransaction(privateKey: IKeyringPair, extrinsic: SubmittableExtrinsic<ApiTypes>) {
  return new Promise<void>(async (resolve, reject) => {
    extrinsic.signAndSend(privateKey, async result => {
        if(!result.isInBlock) {
          return;
        }

        if(result.findRecord('system', 'ExtrinsicSuccess')) {
          resolve();
        }
        else {
          reject('Failed to flip value.');
        }
      })
  });
}

describe('Contracts', () => {
  it(`Can deploy smart contract Flipper, instantiate it and call it's get and flip messages.`, async () => {
    await usingApi(async api => {
      const keyring = new Keyring({ type: 'sr25519' });
      const alice = keyring.addFromUri("//Alice");
      
      const wasm = fs.readFileSync('./src/flipper/flipper.wasm');
      
      const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
      const abi = new Abi(metadata);

      const code = new CodePromise(api, abi, wasm);

      const blueprint = await deployBlueprint(alice, code);
      const contract = (await deployContract(alice, blueprint))['contract'];

      const getFlipValue = async () => {
        const result = await contract.query.get(alice.address, value, gasLimit);

        if(!result.result.isSuccess) {
          throw `Failed to get flipper value`;
        }
        return (result.result.asSuccess.data[0] == 0x00) ? false : true;
      }

      const initialGetResponse = await getFlipValue();
      expect(initialGetResponse).to.be.true;

      const flip = contract.exec('flip', value, gasLimit);
      await runTransaction(alice, flip);

      const afterFlipGetResponse = await getFlipValue();

      expect(afterFlipGetResponse).to.be.false;
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
      // await runTransaction(alicesPrivateKey, transfer);

      // const [alicesBalanceAfter, bobsBalanceAfter] = await getBalance(api, [alicesPublicKey, bobsPublicKey]);

      // expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
      // expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
    });
  })
});
