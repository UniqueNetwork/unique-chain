//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

// https://unique-network.readthedocs.io/en/latest/jsapi.html#setchainlimits
import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from '../substrate/privateKey';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {uniqueEventMessage} from '../util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Create collection event ', () => {
  let alice: IKeyringPair;
  const checkSection = 'CollectionCreated';
  const checkTreasury = 'Deposit';
  const checkSystem = 'ExtrinsicSuccess';
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
    });
  });
  it('Check event from createCollection(): ', async () => {
    await usingApi(async (api: ApiPromise) => {
      const tx = api.tx.unique.createCollection([0x31], [0x32], '0x33', 'NFT');
      const events = await submitTransactionAsync(alice, tx);
      const msg = JSON.stringify(uniqueEventMessage(events));
      expect(msg).to.be.contain(checkSection);
      expect(msg).to.be.contain(checkTreasury);
      expect(msg).to.be.contain(checkSystem);
    });
  });
});
