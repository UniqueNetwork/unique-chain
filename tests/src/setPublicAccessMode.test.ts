// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import { ApiPromise, Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import usingApi, {submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  enablePublicMintingExpectSuccess,
  enableWhiteListExpectSuccess,
} from './util/helpers';
import { utf16ToStr } from './util/util';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;

describe('Integration Test setPublicAccessMode(): ', () => {
  before(async () => {
    await usingApi(async (api) => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });

  it('Run extrinsic with collection id parameters, set the whitelist mode for the collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId: number = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(Alice, collectionId);
      await enablePublicMintingExpectSuccess(Alice, collectionId);
      await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
      await createItemExpectSuccess(Bob, collectionId, 'NFT', Bob.address);
    });
  });

  it('Whitelisted collection limits', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(Alice, collectionId);
      await enablePublicMintingExpectSuccess(Alice, collectionId);
      const tx = api.tx.nft.createItem(collectionId, Bob.address, 'NFT');
      await expect(submitTransactionExpectFailAsync(Bob, tx)).to.be.rejected;
    });
  });
});

describe('Negative Integration Test ext. setPublicAccessMode(): ', () => {
  it('Set a non-existent collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: radix
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'WhiteList');
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });

  it('Set the collection that has been deleted', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'WhiteList');
      await expect(submitTransactionExpectFailAsync(Alice, tx)).to.be.rejected;
    });
  });

  it('Re-set the list mode already set in quantity', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionId: number = await createCollectionExpectSuccess();
      await enableWhiteListExpectSuccess(Alice, collectionId);
      await enableWhiteListExpectSuccess(Alice, collectionId);
    });
  });

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api: ApiPromise) => {
      // tslint:disable-next-line: no-bitwise
      const collectionId = await createCollectionExpectSuccess();
      const tx = api.tx.nft.setPublicAccessMode(collectionId, 'WhiteList');
      await expect(submitTransactionExpectFailAsync(Bob, tx)).to.be.rejected;
    });
  });
});
