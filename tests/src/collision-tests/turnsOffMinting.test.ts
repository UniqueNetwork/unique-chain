import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi from '../substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  setMintPermissionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Ferdie: IKeyringPair;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Turns off minting mode: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The collection owner turns off minting mode and there are minting transactions in the same block ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setMintPermissionExpectSuccess(Alice, collectionId, true);
      await addToWhiteListExpectSuccess(Alice, collectionId, Ferdie.address);

      const mintItem = api.tx.nft.createItem(collectionId, normalizeAccountId(Ferdie.address), 'NFT');
      const offMinting = api.tx.nft.setMintPermission(collectionId, false);
      await Promise.all([
        mintItem.signAndSend(Ferdie),
        offMinting.signAndSend(Alice),
      ]);
      let itemList = false;
      itemList = (await (api.query.nft.nftItemList(collectionId, mintItem))).toJSON() as boolean;
      // tslint:disable-next-line: no-unused-expression
      expect(itemList).to.be.null;
      await waitNewBlocks(2);
    });
  });
});
