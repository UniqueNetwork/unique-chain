//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import { ApiPromise } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import { createCollectionExpectSuccess, createItemExpectSuccess, nftEventMessage, normalizeAccountId } from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Transfer from event ', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  const checkSection = 'Transfer';
  const checkTreasury = 'Deposit';
  const checkSystem = 'ExtrinsicSuccess';
  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
    });
  });
  it('Check event from transferFrom(): ', async () => {
    await usingApi(async (api: ApiPromise) => {
      const collectionID = await createCollectionExpectSuccess();
      const itemID = await createItemExpectSuccess(Alice, collectionID, 'NFT');
      const transferFrom = api.tx.nft.transferFrom(normalizeAccountId(Alice.address), normalizeAccountId(Bob.address), collectionID, itemID, 1);
      const events = await submitTransactionAsync(Alice, transferFrom);
      const msg = JSON.stringify(nftEventMessage(events));
      expect(msg).to.be.contain(checkSection);
      expect(msg).to.be.contain(checkTreasury);
      expect(msg).to.be.contain(checkSystem);
    });
  });
});

