//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { default as usingApi } from './substrate/substrate-api';
import { Keyring } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import { 
  createCollectionExpectSuccess, 
  createItemExpectSuccess,
} from './util/helpers';

let alice: IKeyringPair;

describe('integration test: ext. createItem():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({ type: 'sr25519' });
      alice = keyring.addFromUri('//Alice');
    });
  });

  it('Create new item in NFT collection', async () => {
    const createMode = 'NFT';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
  it('Create new item in Fungible collection', async () => {
    const createMode = 'Fungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode, decimalPoints: 0}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
  it('Create new item in ReFungible collection', async () => {
    const createMode = 'ReFungible';
    const newCollectionID = await createCollectionExpectSuccess({mode: {type: createMode}});
    await createItemExpectSuccess(alice, newCollectionID, createMode);
  });
});
