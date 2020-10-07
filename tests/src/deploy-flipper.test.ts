import { expect } from "chai";
import usingApi from "./substrate/substrate-api";
import promisifySubstrate from "./substrate/promisify-substrate";
import fs from "fs";
import privateKey from "./substrate/privateKey";
import { compactAddLength, u8aToU8a } from '@polkadot/util';
import { Hash, AccountId } from "@polkadot/types/interfaces";
import { Abi, PromiseContract } from "@polkadot/api-contract";
import { ISubmittableResult } from "@polkadot/types/types";
import BN from "bn.js";
import { alicesPublicKey } from "./accounts";

describe('Flipper', () => {
  it(`Can deploy smart contract Flipper, instantiate it and call it's get and flip messages.`, async () => {
    await usingApi(async api => {
      const wasm = fs.readFileSync('./src/flipper/flipper.wasm');
      const contract = compactAddLength(u8aToU8a(wasm));

      const metadata = JSON.parse(fs.readFileSync('./src/flipper/metadata.json').toString('utf-8'));
      const abi = new Abi(api.registry as any, metadata);

      const alicesPrivateKey = privateKey('//Alice');

      const contractHash = await promisifySubstrate(api, () => {
        return new Promise<Hash>(async (resolve, reject) => {
          const unsubscribe = api.tx.contracts.putCode(contract).signAndSend(alicesPrivateKey, async result => {
            if(!result.isInBlock){
              return;
            }

            const record = result.findRecord('contracts', 'CodeStored');

            if(record) {
              (await unsubscribe)();
              resolve(record.event.data[0] as unknown as Hash);
            } else {
              reject('Failed to find contract hash in putCode transaction result.');
            }
          });
        })
      })();


      const instanceAccountId = await promisifySubstrate(api, () => {
        return new Promise<AccountId>((resolve, reject) => {
          const args = abi.constructors[0](true);
          const unsubscribe = api.tx.contracts.instantiate(1000000000000000n, 1000000000000n, contractHash, args)
            .signAndSend(alicesPrivateKey, async (result:ISubmittableResult) => {
              if(!result.isInBlock) {
                return;
              }
              const record = result.findRecord('contracts', 'Instantiated');
              if(record) {
                (await unsubscribe)();
                expect(alicesPublicKey).to.be.equal(record.event.data[0].toString());
                resolve(record.event.data[1] as AccountId);
              } else {
                reject('Failed to find instantiated event,');
              }
            });
        });
      })();

      const contractInstance = new PromiseContract(api, abi, instanceAccountId);
      const getFlipValue = async () => {
        return await promisifySubstrate(api, async () => {
          const result = await contractInstance.call('rpc', 'get', 0, new BN('1000000000000'))
            .send(alicesPublicKey);
          if(!result.isSuccess) {
            throw 'Failed to get flipper value';
          }
          return result.output && result.output.valueOf && result.output.valueOf();
        })();
      }

      const initialGetResponse = await getFlipValue();
      expect(initialGetResponse).to.be.true;

      await promisifySubstrate(api, async () => {
        return new Promise<void>(async (resolve, reject) => {
          api.tx.contracts.call(contractInstance.address.toString(), 0, 1000000000000n, contractInstance.getMessage('flip').fn())
            .signAndSend(alicesPrivateKey, async result => {
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
      })();

      const afterFlipGetResponse = await getFlipValue();

      expect(afterFlipGetResponse).to.be.false;
    });
  });
});
