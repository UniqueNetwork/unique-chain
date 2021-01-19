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

describe('Integration Test ext. addToWhiteList()', () => {

  it('Execute the extrinsic with parameters: Collection ID and address to add to the white list', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const collectionId = await createCollectionExpectSuccess();
      const whiteListedBefore = (await api.query.nft.whiteList(collectionId, Bob.address)).toJSON();
      await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
      const whiteListedAfter = (await api.query.nft.whiteList(collectionId, Bob.address)).toJSON();
      // tslint:disable-next-line: no-unused-expression
      expect(whiteListedBefore).to.be.false;
      // tslint:disable-next-line: no-unused-expression
      expect(whiteListedAfter).to.be.true;
    });
  });

  it('Whitelisted minting: list restrictions', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const collectionId = await createCollectionExpectSuccess();
      const whiteListedBefore = (await api.query.nft.whiteList(collectionId, Bob.address)).toJSON();
      await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
      const whiteListedAfter = (await api.query.nft.whiteList(collectionId, Bob.address)).toJSON();
      // tslint:disable-next-line: no-unused-expression
      expect(whiteListedBefore).to.be.false;
      // tslint:disable-next-line: no-unused-expression
      expect(whiteListedAfter).to.be.true;
      await enableWhiteListExpectSuccess(Alice, collectionId);
      await enablePublicMintingExpectSuccess(Alice, collectionId);
      await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
    });
  });
});

describe('Negative Integration Test ext. addToWhiteList()', () => {

  it('White list an address in the collection that does not exist', async () => {
    await usingApi(async (api) => {
      const Alice = privateKey('//Alice');
      // tslint:disable-next-line: no-bitwise
      const collectionId = (1 << 32) - 1;
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
