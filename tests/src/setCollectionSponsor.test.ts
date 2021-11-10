//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi} from './substrate/substrate-api';
import {createCollectionExpectSuccess,
  setCollectionSponsorExpectSuccess,
  destroyCollectionExpectSuccess,
  setCollectionSponsorExpectFailure,
  addCollectionAdminExpectSuccess,
} from './util/helpers';
import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';

chai.use(chaiAsPromised);

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('integration test: ext. setCollectionSponsor():', () => {

  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
    });
  });

  it('Set NFT collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set Fungible collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set ReFungible collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });

  it('Set the same sponsor repeatedly', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Replace collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();

    const keyring = new Keyring({type: 'sr25519'});
    const charlie = keyring.addFromUri('//Charlie');
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, charlie.address);
  });
});

describe('(!negative test!) integration test: ext. setCollectionSponsor():', () => {
  before(async () => {
    await usingApi(async () => {
      const keyring = new Keyring({type: 'sr25519'});
      alice = keyring.addFromUri('//Alice');
      bob = keyring.addFromUri('//Bob');
      charlie = keyring.addFromUri('//Charlie');
    });
  });

  it('(!negative test!) Add sponsor with a non-owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectFailure(collectionId, bob.address, '//Bob');
  });
  it('(!negative test!) Add sponsor to a collection that never existed', async () => {
    // Find the collection that never existed
    let collectionId = 0;
    await usingApi(async (api) => {
      collectionId = (await api.query.common.createdCollectionCount()).toNumber() + 1;
    });

    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
  it('(!negative test!) Add sponsor to a collection that was destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
  it('(!negative test!) Collection admin add sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await addCollectionAdminExpectSuccess(alice, collectionId, bob.address);
    await setCollectionSponsorExpectFailure(collectionId, charlie.address, '//Bob');
  });
});
