import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi, { submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enablePublicMintingExpectSuccess,
  enableWhiteListExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;

describe.only('Integration Test ext. addToWhiteList()', () => {

  before(async () => {
    await usingApi(async (api) => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Execute the extrinsic with parameters: Collection ID and address to add to the white list', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
  });

  it('Whitelisted minting: list restrictions', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
    await enableWhiteListExpectSuccess(Alice, collectionId);
    await enablePublicMintingExpectSuccess(Alice, collectionId);
    await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
  });
});

describe.only('Negative Integration Test ext. addToWhiteList()', () => {

  it('White list an address in the collection that does not exist', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const Bob = privateKey('//Bob');

      const tx = api.tx.nft.addToWhiteList(collectionId, Bob.address);
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });

  it('White list an address in the collection that was destroyed', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.nft.addToWhiteList(collectionId, Bob.address);
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });

  it('White list an address in the collection that does not have white list access enabled', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      const Ferdie = privateKey('//Ferdie');
      const collectionId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(Alice, collectionId);
      await enablePublicMintingExpectSuccess(Alice, collectionId);
      const tx = api.tx.nft.createItem(collectionId, Ferdie.address, 'NFT');
      await expect(submitTransactionExpectFailAsync(Ferdie, tx)).to.be.rejected;
    });
  });

});
