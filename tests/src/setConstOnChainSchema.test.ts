import { Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  destroyCollectionExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

let Alice: IKeyringPair;
let Bob: IKeyringPair;
let Shema: any;
let largeShema: any;

before(async () => {
  await usingApi(async (api) => {
    const keyring = new Keyring({ type: 'sr25519' });
    Alice = keyring.addFromUri('//Alice');
    Bob = keyring.addFromUri('//Bob');
    Shema = '0x31';
    largeShema = '0x391d2323232320486572652077696c6c20626520666f7572206e6f6465732023232323\
    0a0a0a232064697361626c65206d646e730a2320666f7263652049503420636f6e6e656374696f6e730a23\
    2066696c74657220636f6e6e656374696f6e732077697468207566770a0a0a0a0a232056616c696461746f\
    7220310a0a0a2e2f6e6674205c0a2d2d626173652d70617468202f746d702f616c696365205c0a2d2d6368\
    61696e206c6f63616c205c0a2d2d616c696365205c0a2d2d6e6f64652d6b65792030303030303030303030\
    30303030303030303030303030303030303030303030303030303030303030303030303030303030303030\
    3030303030303030303031205c0a2d2d74656c656d657472792d75726c20277773733a2f2f74656c656d65\
    7472792e706f6c6b61646f742e696f2f7375626d69742f203027205c0a2d2d76616c696461746f72205c0a\
    2d2d6e6f2d6d646e73205c0a2d2d6c697374656e2d616464723d2f6970342f302e302e302e302f7463702f\
    3330333333205c0a2d6c747261636520263e2056616c696461746f72312e6c6f670a0a2320446563203037\
    2031393a33303a33392e3832312020494e464f20f09f8fb720204c6f63616c206e6f6465206964656e7469\
    74792069733a20313244334b6f6f5745796f70704e43557838597836366f5639664a6e7269587743635877\
    44445541326b6a36766e63366944457020286c656761637920726570726573656e746174696f6e3a203132\
    44334b6f6f5745796f70704e43557838597836366f5639664a6e726958774363587744445541326b6a3676\
    6e63366944457029202020200a0a0a232056616c696461746f7220320a0a0a0a2e2f6e6674205c0a2d2d62\
    6173652d70617468202f746d702f626f62205c0a2d2d636861696e206c6f63616c205c0a2d2d626f62205c\
    0a2d2d74656c656d657472792d75726c20277773733a2f2f74656c656d657472792e706f6c6b61646f742e\
    696f2f7375626d69742f203027205c0a2d2d76616c696461746f72205c0a2d2d6e6f2d6d646e73205c0a2d\
    2d6c697374656e2d616464723d2f6970342f302e302e302e302f7463702f3330333333205c0a2d2d626f6f\
    746e6f646573202f6970342f31302e3231312e35352e392f7463702f33303333332f7032702f313244334b\
    6f6f5745796f70704e43557838597836366f5639664a6e726958774363587744445541326b6a36766e6336\
    69444570205c0a2d6c747261636520263e2056616c696461746f72322e6c6f670a0a232044656320303720\
    31393a33373a30312e3535322020494e464f20f09f8fb720204c6f63616c206e6f6465206964656e746974\
    792069733a20313244334b6f6f574d6f69635a62595266676a714d396f5965354a774b63467644635a5250\
    4843707856316762665057514d327720286c656761637920726570726573656e746174696f6e3a20313244\
    334b6f6f574d6f69635a62595266676a714d396f5965354a774b63467644635a5250484370785631676266\
    5057514d327729202020200a0a0a0a23204761746577617920310a0a0a2e2f6e6674205c0a2d2d62617365\
    2d70617468202f746d702f6761746577617931205c0a2d2d636861696e206c6f63616c205c0a2d2d6e616d\
    652047617465576179205c0a2d2d77732d65787465726e616c205c0a2d2d7270632d636f727320616c6c20\
    5c0a2d2d6e6f2d6d646e73205c0a2d2d6c697374656e2d616464723d2f6970342f302e302e302e302f7463\
    702f3330333333205c0a2d2d626f6f746e6f646573202f6970342f31302e3231312e35352e392f7463702f\
    33303333332f7032702f313244334b6f6f5745796f70704e43557838597836366f5639664a6e7269587743\
    63587744445541326b6a36766e633669444570202f6970342f31302e3231312e35352e31302f7463702f33\
    303333332f7032702f313244334b6f6f574d6f69635a62595266676a714d396f5965354a774b6346764463\
    5a52504843707856316762665057514d3277202d6c747261636520263e2047617465776179312e6c6f670a\
    0a0a23204761746577617920320a0a0a2e2f6e6674205c0a2d2d626173652d70617468202f746d702f6761\
    746577617932205c0a2d2d636861696e206c6f63616c205c0a2d2d6e616d652047617465576179205c0a2d\
    2d77732d65787465726e616c205c0a2d2d7270632d636f727320616c6c205c0a2d2d6e6f2d6d646e73205c\
    0a2d2d6c697374656e2d616464723d2f6970342f302e302e302e302f7463702f3330333333205c0a2d2d62\
    6f6f746e6f646573202f6970342f31302e3231312e35352e392f7463702f33303333332f7032702f313244\
    334b6f6f5745796f70704e43557838597836366f5639664a6e726958774363587744445541326b6a36766e\
    633669444570202f6970342f31302e3231312e35352e31302f7463702f33303333332f7032702f31324433\
    4b6f6f574346456166744d4373503842596144764d45735362555065454256366554674e726e6b37425675\
    51726e5666202d6c747261636520263e2047617465776179322e6c6f670a0a';
  });
});
describe('Integration Test ext. setConstOnChainSchema()', () => {

  it('Run extrinsic with parameters of the collection id, set the scheme', async () => {
      await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collection(collectionId));
      expect(collection.Owner.toString()).to.be.eq(Alice.address);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await submitTransactionAsync(Alice, setShema);
    });
});

  it('Checking collection data using the ConstOnChainSchema parameter', async () => {
      await usingApi(async (api) => {
        const collectionId = await createCollectionExpectSuccess();
        const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
        await submitTransactionAsync(Alice, setShema);
        const collection: any = (await api.query.nft.collection(collectionId));
        expect(collection.ConstOnChainSchema.toString()).to.be.eq(Shema);

    });
  });
});

describe('Negative Integration Test ext. setConstOnChainSchema()', () => {

  it('Set a non-existent collection', async () => {
    await usingApi(async (api) => {
      // tslint:disable-next-line: radix
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
  });
});

  it('Set a previously deleted collection', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      await destroyCollectionExpectSuccess(collectionId);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
  });
});

  it('Set invalid data in schema (size too large:> 1024b)', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, largeShema);
      await expect(submitTransactionExpectFailAsync(Alice, setShema)).to.be.rejected;
  });
});

  it('Execute method not on behalf of the collection owner', async () => {
    await usingApi(async (api) => {
      const collectionId = await createCollectionExpectSuccess();
      const collection: any = (await api.query.nft.collection(collectionId));
      expect(collection.Owner.toString()).to.be.eq(Alice.address);
      const setShema = api.tx.nft.setConstOnChainSchema(collectionId, Shema);
      await expect(submitTransactionExpectFailAsync(Bob, setShema)).to.be.rejected;
  });
});

});
