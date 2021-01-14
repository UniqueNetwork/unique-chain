// https://unique-network.readthedocs.io/en/latest/jsapi.html#setschemaversion
import { ApiPromise, Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, {submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import { ICollectionInterface } from './types';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
  getCreatedCollectionCount,
  getCreateItemResult,
  getDetailedCollectionInfo,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let alice: IKeyringPair;
let collectionIdForTesting: number;

/*
1. We create collection.
2. Save just created collection id.
3. Use this id for setSchemaVersion.
*/

describe('hooks', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('choose or create collection for testing', async () => {
    await usingApi(async () => {
      collectionIdForTesting = await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
    });
  });
});

describe('setSchemaVersion positive', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('execute setSchemaVersion with image url and unique ', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setSchemaVersion(collectionIdForTesting, 'Unique');
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo).to.be.exist;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo ? collectionInfo.SchemaVersion.toString() : '').to.be.equal('Unique');
    });
  });

  it('validate schema version with just entered data', async () => {
    await usingApi(async (api: ApiPromise) => {
      tx = api.tx.nft.setSchemaVersion(collectionIdForTesting, 'ImageURL');
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateItemResult(events);
      const collectionInfo = await getDetailedCollectionInfo(api, collectionIdForTesting) as ICollectionInterface;
      // tslint:disable-next-line:no-unused-expression
      expect(result.success).to.be.true;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo).to.be.exist;
      // tslint:disable-next-line:no-unused-expression
      expect(collectionInfo ? collectionInfo.SchemaVersion.toString() : '').to.be.equal('ImageURL');
    });
  });
});

describe('setSchemaVersion negative', () => {
  let tx;
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });
  it('execute setSchemaVersion for not exists collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionCount = await getCreatedCollectionCount(api);
      const nonExistedCollectionId = collectionCount + 1;
      tx = api.tx.nft.setSchemaVersion(nonExistedCollectionId, 'ImageURL');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
      /*try {
        await submitTransactionAsync(alice, tx);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }*/
    });
  });

  it('execute setSchemaVersion with not correct schema version', async () => {
    await usingApi(async (api: ApiPromise) => {
      try {
        tx = api.tx.nft.setSchemaVersion(collectionIdForTesting, 'Test');
        await submitTransactionAsync(alice, tx);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
    });
  });

  it('execute setSchemaVersion for deleted collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      await destroyCollectionExpectSuccess(collectionIdForTesting);
      tx = api.tx.nft.setSchemaVersion(collectionIdForTesting, 'ImageURL');
      await expect(submitTransactionExpectFailAsync(alice, tx)).to.be.rejected;
      /*try {
        tx = api.tx.nft.setSchemaVersion(collectionIdForTesting, 'ImageURL');
        await submitTransactionAsync(alice, tx);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }*/
    });
  });
});
