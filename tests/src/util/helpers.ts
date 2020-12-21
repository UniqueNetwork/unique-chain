import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { EventRecord } from '@polkadot/types/interfaces';
import { default as usingApi, submitTransactionAsync } from "../substrate/substrate-api";
import privateKey from '../substrate/privateKey';
import { alicesPublicKey } from "../accounts";
import { strToUTF16, utf16ToStr, hexToStr } from '../util/util';

chai.use(chaiAsPromised);
const expect = chai.expect;

type CreateCollectionResult = {
  success: boolean,
  collectionId: number
};

function getCreateCollectionResult(events: EventRecord[]): CreateCollectionResult {
  let success = false;
  let collectionId: number = 0;
  events.forEach(({ phase, event: { data, method, section } }) => {
    // console.log(`    ${phase}: ${section}.${method}:: ${data}`);
    if (method == 'ExtrinsicSuccess') {
      success = true;
    } else if ((section == 'nft') && (method == 'Created')) {
      collectionId = parseInt(data[0].toString());
    }
  });
  let result: CreateCollectionResult = {
    success,
    collectionId
  }
  return result;
}

export async function createCollectionExpectSuccess(name: string, description: string, tokenPrefix: string, mode: string) {
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(strToUTF16(name), strToUTF16(description), strToUTF16(tokenPrefix), mode);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Get the collection 
    const collection: any = (await api.query.nft.collection(result.collectionId)).toJSON();

    // What to expect
    expect(result.success).to.be.true;
    expect(result.collectionId).to.be.equal(BcollectionCount);
    expect(collection).to.be.not.null;
    expect(BcollectionCount).to.be.equal(AcollectionCount+1, 'Error: NFT collection NOT created.');
    expect(collection.Owner).to.be.equal(alicesPublicKey);
    expect(utf16ToStr(collection.Name)).to.be.equal(name);
    expect(utf16ToStr(collection.Description)).to.be.equal(description);
    expect(hexToStr(collection.TokenPrefix)).to.be.equal(tokenPrefix);
  });
}
  
export async function createCollectionExpectFailure(name: string, description: string, tokenPrefix: string, mode: string) {
  await usingApi(async (api) => {
    // Get number of collections before the transaction
    const AcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // Run the CreateCollection transaction
    const alicePrivateKey = privateKey('//Alice');
    const tx = api.tx.nft.createCollection(name, description, tokenPrefix, mode);
    const events = await submitTransactionAsync(alicePrivateKey, tx);
    const result = getCreateCollectionResult(events);

    // Get number of collections after the transaction
    const BcollectionCount = parseInt((await api.query.nft.createdCollectionCount()).toString());

    // What to expect
    expect(result.success).to.be.false;
    expect(BcollectionCount).to.be.equal(AcollectionCount, 'Error: Collection with incorrect data created.');
  });
}
  
