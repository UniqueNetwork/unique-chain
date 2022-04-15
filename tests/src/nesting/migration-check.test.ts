import {expect} from 'chai';
import privateKey from '../substrate/privateKey';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {getCreateCollectionResult} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {strToUTF16} from '../util/util';
import waitNewBlocks from '../substrate/wait-new-blocks';

// todo skip
describe.skip('Migration testing for pallet-common', () => {
  let alice: IKeyringPair;
  
  before(async() => {
    await usingApi(async api => {
      alice = privateKey('//Alice');
    });
  });

  it('Preserves collection settings', async () => {
    let old_version: number;
    let collection_id: number;
    let collection_old: any;

    await usingApi(async api => {
      // Create a collection for comparison before and after the upgrade
      const tx = api.tx.unique.createCollectionEx({
        mode: 'NFT',
        access: 'AllowList',
        name: strToUTF16("Mojave Pictures"),
        description: strToUTF16("$2.2 billion power plant!"),
        tokenPrefix: '0x0002030',
        offchainSchema: '0x111111',
        schemaVersion: 'Unique',
        limits: {
          accountTokenOwnershipLimit: 3,
        },
        variableOnChainSchema: '0x222222',
        constOnChainSchema: '0x333333',
        metaUpdatePermission: 'Admin',
      });
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);
      collection_id = result.collectionId;

      // Get the pre-upgrade collection info
      collection_old = (await api.query.common.collectionById(collection_id)).toJSON();

      // Get the pre-upgrade spec version
      old_version = (api.consts.system.version.toJSON() as any).specVersion;
    });

    console.log(`Now waiting for the parachain upgrade from ${old_version!}...`);

    let new_version = old_version!;
    let connection_fail_counter = 0;

    // And wait for the parachain upgrade
    while (new_version == old_version! && connection_fail_counter < 2) {
      try {
        await usingApi(async api => {
          await waitNewBlocks(api);
          new_version = (api.consts.system.version.toJSON() as any).specVersion;
        });
      } catch (_) {
        connection_fail_counter++;
        await new Promise( resolve => setTimeout(resolve, 12000) );
      }
    }

    await usingApi(async api => {
      const collection_new = (await api.query.common.collectionById(collection_id)).toJSON() as any;
      
      // Make sure the extra fields are what they should be
      const variable_on_chain_schema = await api.query.common.collectionData(collection_id, "VariableOnChainSchema");
      const const_on_chain_schema = await api.query.common.collectionData(collection_id, "ConstOnChainSchema");
      const offchain_schema = await api.query.common.collectionData(collection_id, "OffchainSchema");

      expect(variable_on_chain_schema.toHex()).to.be.deep.equal((collection_old.variableOnChainSchema));
      expect(const_on_chain_schema.toHex()).to.be.deep.equal(collection_old.constOnChainSchema);
      expect(offchain_schema.toHex()).to.be.deep.equal(collection_old.offchainSchema);
      expect(collection_new).to.have.nested.property('limits.nestingRule');

      // Get rid of extra fields to perform comparison on the rest of the collection
      delete collection_new.limits.nestingRule;
      delete collection_old.constOnChainSchema;
      delete collection_old.offchainSchema;
      delete collection_old.variableOnChainSchema;

      expect(collection_new).to.be.deep.equal(collection_old);
    });
  });
});
  