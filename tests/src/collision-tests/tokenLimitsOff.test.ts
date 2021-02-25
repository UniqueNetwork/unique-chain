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
} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;
interface ITokenDataType {
  Owner: number[];
  ConstData: number[];
  VariableData: number[];
}
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
      const timeoutPromise = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));
      await timeoutPromise(10000);
      //
      const args = [{ nft: ['0x31', '0x31'] }, { nft: ['0x32', '0x32'] }, { nft: ['0x33', '0x33'] }];
      const mintItemOne = api.tx.nft
        .createMultipleItems(collectionId, Ferdie.address, args);
      const mintItemTwo = api.tx.nft
        .createMultipleItems(collectionId, Bob.address, args);
      await Promise.all
      ([
        mintItemOne.signAndSend(Ferdie),
        mintItemTwo.signAndSend(Bob),
      ]);
      await timeoutPromise(10000);
      const itemsListIndexAfter = await api.query.nft.itemListIndex(collectionId) as unknown as BN;
      expect(itemsListIndexAfter.toNumber()).to.be.equal(6); // Maybe 4? TokenLimit = 4.
      const token1Data = await api.query.nft.nftItemList(collectionId, 1) as unknown as ITokenDataType;
      const token2Data = await api.query.nft.nftItemList(collectionId, 2) as unknown as ITokenDataType;
      const token3Data = await api.query.nft.nftItemList(collectionId, 3) as unknown as ITokenDataType;
      const token4Data = await api.query.nft.nftItemList(collectionId, 4) as unknown as ITokenDataType;
      const token5Data = await api.query.nft.nftItemList(collectionId, 5) as unknown as ITokenDataType;
      const token6Data = await api.query.nft.nftItemList(collectionId, 6) as unknown as ITokenDataType;

      expect(token1Data.Owner.toString()).to.be.equal(Bob.address);
      expect(token2Data.Owner.toString()).to.be.equal(Bob.address);
      expect(token3Data.Owner.toString()).to.be.equal(Bob.address);
      expect(token4Data.Owner.toString()).to.be.equal(Ferdie.address);
      expect(token5Data.Owner.toString()).to.be.equal(Ferdie.address);
      expect(token6Data.Owner.toString()).to.be.equal(Ferdie.address);
    });
  });
});
