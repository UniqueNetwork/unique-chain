import {expect} from 'chai';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {getCreateCollectionResult} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {strToUTF16} from '../util/util';
import waitNewBlocks from '../substrate/wait-new-blocks';
// Used for polkadot-launch signalling
import find from 'find-process';

// todo un-skip for migrations
describe.skip('Migration testing for pallet-common', () => {
  let alice: IKeyringPair;

  before(async() => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper!('//Alice');
    });
  });

  it('Preserves collection settings after migration', async () => {
    let oldVersion: number;
    let collectionId: number;
    let collectionOld: any;

    await usingApi(async api => {
      // Create a collection for comparison before and after the upgrade
      const tx = api.tx.unique.createCollectionEx({
        mode: 'NFT',
        access: 'AllowList',
        name: strToUTF16('Mojave Pictures'),
        description: strToUTF16('$2.2 billion power plant!'),
        tokenPrefix: '0x0002030',
        //offchainSchema: '0x111111',
        //schemaVersion: 'Unique',
        limits: {
          accountTokenOwnershipLimit: 3,
        },
        //constOnChainSchema: '0x333333',
      });
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);
      collectionId = result.collectionId;

      // Get the pre-upgrade collection info
      collectionOld = (await api.query.common.collectionById(collectionId)).toJSON();

      // Get the pre-upgrade spec version
      oldVersion = (api.consts.system.version.toJSON() as any).specVersion;
    });

    console.log(`Now waiting for the parachain upgrade from ${oldVersion!}...`);

    let newVersion = oldVersion!;
    let connectionFailCounter = 0;

    // Cooperate with polkadot-launch if it's running (assuming custom name change to 'polkadot-launch'), and send a custom signal
    find('name', 'polkadot-launch', true).then((list) => {
      for (const proc of list) {
        process.kill(proc.pid, 'SIGUSR1');
      }
    });

    // And wait for the parachain upgrade
    {
      // Catch warnings like 'RPC methods not decorated' and keep the 'waiting' message in front
      const stdlog = console.warn.bind(console);
      let warnCount = 0;
      console.warn = function(...args){
        if (arguments.length <= 2 || !args[2].includes('RPC methods not decorated')) {
          warnCount++;
          stdlog.apply(console, args as any);
        }
      };

      let oldWarnCount = 0;
      while (newVersion == oldVersion! && connectionFailCounter < 2) {
        try {
          await usingApi(async api => {
            await waitNewBlocks(api);
            newVersion = (api.consts.system.version.toJSON() as any).specVersion;
            if (warnCount > oldWarnCount) {
              console.log(`Still waiting for the parachain upgrade from ${oldVersion!}...`);
              oldWarnCount = warnCount;
            }
            await new Promise(resolve => setTimeout(resolve, 6000));
          });
        } catch (_) {
          connectionFailCounter++;
          await new Promise(resolve => setTimeout(resolve, 12000));
        }
      }
    }

    await usingApi(async api => {
      const collectionNew = (await api.query.common.collectionById(collectionId)).toJSON() as any;

      // Make sure the extra fields are what they should be
      //const constOnChainSchema = await api.query.common.collectionData(collectionId, 'ConstOnChainSchema');
      //const offchainSchema = await api.query.common.collectionData(collectionId, 'OffchainSchema');

      //expect(constOnChainSchema.toHex()).to.be.deep.equal(collectionOld.constOnChainSchema);
      //expect(offchainSchema.toHex()).to.be.deep.equal(collectionOld.offchainSchema);
      expect(collectionNew).to.have.nested.property('limits.nestingRule');

      // Get rid of extra fields to perform comparison on the rest of the collection
      delete collectionNew.limits.nestingRule;
      //delete collectionOld.constOnChainSchema;
      //delete collectionOld.offchainSchema;

      expect(collectionNew).to.be.deep.equal(collectionOld);
    });
  });
});
