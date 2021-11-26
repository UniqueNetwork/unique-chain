/* broken by design
// substrate transactions are sequential, not parallel
// the order of execution is indeterminate

import { IKeyringPair } from '@polkadot/types/types';
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
let Ferdie: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Deleting a collection while add address to allowlist: ', () => {
  // tslint:disable-next-line: max-line-length
  it('Adding an address to the collection allowlist in a block by the admin, and deleting the collection by the owner ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, normalizeAccountId(Bob.address));
      await submitTransactionAsync(Alice, changeAdminTx);
      await waitNewBlocks(1);
      //
      const addAllowlistAdm = api.tx.unique.addToAllowList(collectionId, normalizeAccountId(Ferdie.address));
      const destroyCollection = api.tx.unique.destroyCollection(collectionId);
      await Promise.all([
        addAllowlistAdm.signAndSend(Bob),
        destroyCollection.signAndSend(Alice),
      ]);
      await waitNewBlocks(1);
      let allowList = false;
      allowList = (await api.query.unique.allowList(collectionId, Ferdie.address)).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(allowList).to.be.false;
      await waitNewBlocks(2);
    });
  });
});
*/