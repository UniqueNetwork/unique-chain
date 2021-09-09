import { IKeyringPair } from '@polkadot/types/types';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, { submitTransactionAsync } from '../substrate/substrate-api';
import {
  addToWhiteListExpectSuccess,
  createCollectionExpectSuccess,
  getCreateItemResult,
  setMintPermissionExpectSuccess,
  normalizeAccountId,
  waitNewBlocks,
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Ferdie: IKeyringPair;

const AccountTokenOwnershipLimit = 4;
const SponsoredMintSize = 4294967295;
const TokenLimit = 4;
const SponsorTimeout = 14400;
const OwnerCanTransfer = false;
const OwnerCanDestroy = false;

before(async () => {
  await usingApi(async () => {
    Alice = privateKey('//Alice');
    Bob = privateKey('//Bob');
    Ferdie = privateKey('//Ferdie');
  });
});

describe('Token limit exceeded collection: ', () => {
  // tslint:disable-next-line: max-line-length
  it('The number of tokens created in the collection from different addresses exceeds the allowed collection limit ', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await setMintPermissionExpectSuccess(Alice, collectionId, true);
      await addToWhiteListExpectSuccess(Alice, collectionId, Ferdie.address);
      await addToWhiteListExpectSuccess(Alice, collectionId, Bob.address);
      const setCollectionLim = api.tx.nft.setCollectionLimits(
        collectionId,
        {
          AccountTokenOwnershipLimit,
          SponsoredMintSize,
          TokenLimit,
          // tslint:disable-next-line: object-literal-sort-keys
          SponsorTimeout,
          OwnerCanTransfer,
          OwnerCanDestroy,
        },
      );
      const subTx = await submitTransactionAsync(Alice, setCollectionLim);
      const subTxTesult = getCreateItemResult(subTx);
      // tslint:disable-next-line:no-unused-expression
      expect(subTxTesult.success).to.be.true;
      await waitNewBlocks(2);

      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const mintItemOne = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Ferdie.address), args);
      const mintItemTwo = api.tx.nft
        .createMultipleItems(collectionId, normalizeAccountId(Bob.address), args);
      await Promise.all([
        mintItemOne.signAndSend(Ferdie),
        mintItemTwo.signAndSend(Bob),
      ]);
      await waitNewBlocks(2);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(3);
      // TokenLimit = 4. The first transaction is successful. The second should fail.
      await waitNewBlocks(2);
    });
  });
});
