/* broken by design
// substrate transactions are sequential, not parallel
// the order of execution is indeterminate

import { IKeyringPair } from '@polkadot/types/types';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
  });
});

describe('Deprivation of admin rights: ', () => {
  // tslint:disable-next-line: max-line-length
  it('In the block, the collection admin adds a token or changes data, and the collection owner deprives the admin of rights ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);
      await waitNewBlocks(1);
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const addItemAdm = api.tx.unique.createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      const removeAdm = api.tx.unique.removeCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await Promise.all([
        addItemAdm.signAndSend(Bob),
        removeAdm.signAndSend(Alice),
      ]);
      await waitNewBlocks(2);
      const itemsListIndex = await api.query.unique.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndex.toNumber()).to.be.equal(0);
      const adminList: any = (await api.query.unique.adminList(collectionId));
      expect(adminList).not.to.be.contains(normalizeAccountId(Bob.address));
      await waitNewBlocks(2);
    });
  });
});
*/