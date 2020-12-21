import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi } from "./substrate/substrate-api";
import { createCollectionExpectSuccess, createCollectionExpectFailure } from "./util/helpers";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('integration test: ext. createCollection():', () => {
  it('Create new NFT collection', async () => {
    await createCollectionExpectSuccess('A', 'B', 'C', 'NFT');
  });
  it('Create new NFT collection whith collection_name of maximum length (64 bytes)', async () => {
    await createCollectionExpectSuccess(
      'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCD',
      '1', '1', 'NFT');
  });
  it('Create new NFT collection whith collection_description of maximum length (256 bytes)', async () => {
    await createCollectionExpectSuccess(
      'A', 
      'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJabcdef',
      '1', 'NFT');
  });
  it('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async () => {
    await createCollectionExpectSuccess(
      '1', 
      '1',
      'ABCDEFGHIJABCDEF', 'NFT');
  });
  it('Create new Fungible collection', async () => {
    await createCollectionExpectSuccess('1', '1', '1', 'Fungible');
  });
  it('Create new ReFungible collection', async () => {
    await createCollectionExpectSuccess('1', '1', '1', 'ReFungible');
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (mode)', async () => {
    await usingApi(async (api) => {
      const AcollectionCount = parseInt((await api.query.nft.collectionCount()).toString());

      const badTransaction = async function () { 
        await createCollectionExpectSuccess('1', '1', '1', 'BadMode');
      };
      expect(badTransaction()).to.be.rejected;

      const BcollectionCount = parseInt((await api.query.nft.collectionCount()).toString());
      expect(BcollectionCount).to.be.equal(AcollectionCount, 'Error: Incorrect collection created.');
    });
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await createCollectionExpectFailure(
      'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDE', 
      '1', '1', 'NFT');
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await createCollectionExpectFailure('1',
      'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJabcdefg',
      '1', 'NFT');
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await createCollectionExpectFailure('1', '1', 
    'ABCDEFGHIJABCDEFG',
    'NFT');
  });
});
