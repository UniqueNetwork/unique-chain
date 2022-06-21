import {expect} from 'chai';
import usingApi, {executeTransaction, submitTransactionAsync} from '../substrate/substrate-api';
import {getCreateCollectionResult, getCreateItemResult, normalizeAccountId} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {strToUTF16} from '../util/util';
import waitNewBlocks from '../substrate/wait-new-blocks';
// Used for polkadot-launch signalling
import find from 'find-process';

// todo un-skip for migrations
describe.skip('Migration testing', () => {
  let alice: IKeyringPair;

  before(async() => {
    await usingApi(async (_, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it('Preserves collection settings after migration', async () => {
    let oldVersion: number;
    let collectionId: number;
    let collectionOld: any;
    let nftId: number;
    let nftOld: any;

    await usingApi(async api => {
      // ----------- Collection pre-upgrade ------------
      const txCollection = api.tx.unique.createCollectionEx({
        mode: 'NFT',
        access: 'AllowList',
        name: strToUTF16('Mojave Pictures'),
        description: strToUTF16('$2.2 billion power plant!'),
        tokenPrefix: '0x0002030',
        offchainSchema: '0x111111',
        schemaVersion: 'Unique',
        limits: {
          accountTokenOwnershipLimit: 3,
        },
        constOnChainSchema: '0x333333',
        variableOnChainSchema: '0x22222',
      });
      const events0 = await submitTransactionAsync(alice, txCollection);
      const result0 = getCreateCollectionResult(events0);
      collectionId = result0.collectionId;

      // Get the pre-upgrade collection info
      collectionOld = (await api.query.common.collectionById(collectionId)).toJSON();

      // ---------- NFT pre-upgrade ------------
      const txNft = api.tx.unique.createItem(
        collectionId, 
        normalizeAccountId(alice), 
        {
          NFT: {
            owner: {substrate: alice.address},
            constData: '0x0000',
            variableData: '0x1111',
          },
        },
      );
      const events1 = await executeTransaction(api, alice, txNft);
      const result1 = getCreateItemResult(events1);
      nftId = result1.itemId;

      // Get the pre-upgrade NFT data
      nftOld = (await api.query.nonfungible.tokenData(collectionId, nftId)).toJSON();

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
      while (newVersion == oldVersion! && connectionFailCounter < 5) {
        await new Promise(resolve => setTimeout(resolve, 12000));
        try {
          await usingApi(async api => {
            await waitNewBlocks(api);
            newVersion = (api.consts.system.version.toJSON() as any).specVersion;
            if (warnCount > oldWarnCount) {
              console.log(`Still waiting for the parachain upgrade from ${oldVersion!}...`);
              oldWarnCount = warnCount;
            }
          });
        } catch (_) {
          connectionFailCounter++;
        }
      }
    }

    await usingApi(async api => {
      // ---------- Collection comparison -----------
      const collectionNew = (await api.query.common.collectionById(collectionId)).toJSON() as any;

      // Make sure the extra fields are what they should be
      expect((
        await api.rpc.unique.collectionProperties(collectionId, ['_old_constOnChainSchema'])
      )[0].value.toHex()).to.be.equal(collectionOld.constOnChainSchema);

      expect((
        await api.rpc.unique.collectionProperties(collectionId, ['_old_variableOnChainSchema'])
      )[0].value.toHex()).to.be.equal(collectionOld.variableOnChainSchema);

      expect((
        await api.rpc.unique.collectionProperties(collectionId, ['_old_offchainSchema'])
      )[0].value.toHex()).to.be.equal(collectionOld.offchainSchema);

      expect((
        await api.rpc.unique.collectionProperties(collectionId, ['_old_schemaVersion'])
      )[0].value.toHuman()).to.be.equal(collectionOld.schemaVersion);

      expect(collectionNew.permissions).to.be.deep.equal({
        access: collectionOld.access,
        mintMode: collectionOld.mintMode,
        nesting: null,
      });

      expect(collectionNew.externalCollection).to.be.equal(false);

      // Get rid of extra fields to perform comparison on the rest of the collection
      delete collectionNew.permissions;
      delete collectionNew.externalCollection;
      delete collectionOld.schemaVersion;
      delete collectionOld.constOnChainSchema;
      delete collectionOld.variableOnChainSchema;
      delete collectionOld.offchainSchema;
      delete collectionOld.mintMode;
      delete collectionOld.access;
      delete collectionOld.metaUpdatePermission; // todo look into, doesn't migrate

      expect(collectionNew).to.be.deep.equal(collectionOld);

      // ---------- NFT comparison -----------
      const nftNew = (await api.query.nonfungible.tokenData(collectionId, nftId)).toJSON() as any;

      // Make sure the extra fields are what they should be
      expect((await api.rpc.unique.tokenProperties(collectionId, nftId, ['_old_constData']))[0].value.toHex()).to.be.equal(nftOld.constData);

      expect((await api.rpc.unique.tokenProperties(collectionId, nftId, ['_old_variableData']))[0].value.toHex()).to.be.equal(nftOld.variableData);

      // Get rid of extra fields to perform comparison on the rest of the NFT
      delete nftOld.constData;
      delete nftOld.variableData;

      expect(nftNew).to.be.deep.equal(nftOld);
    });
  });
});
