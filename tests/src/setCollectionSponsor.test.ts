//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { default as usingApi } from "./substrate/substrate-api";
import { createCollectionExpectSuccess, setCollectionSponsorExpectSuccess, destroyCollectionExpectSuccess, setCollectionSponsorExpectFailure } from "./util/helpers";
import { Keyring } from "@polkadot/api";
import { IKeyringPair } from "@polkadot/types/types";
import type { AccountId } from '@polkadot/types/interfaces';

chai.use(chaiAsPromised);
const expect = chai.expect;

let bob: IKeyringPair;

describe('integration test: ext. setCollectionSponsor():', () => {

  before(async () => {
    await usingApi(async (api) => {
      const keyring = new Keyring({ type: 'sr25519' });
      bob = keyring.addFromUri(`//Bob`);
    });
  });

  it('Set NFT collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set Fungible collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode: 'Fungible' });
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Set ReFungible collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess({ mode: 'ReFungible' });
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });

  it('Set the same sponsor repeatedly', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
  });
  it('Replace collection sponsor', async () => {
    const collectionId = await createCollectionExpectSuccess();

    const keyring = new Keyring({ type: 'sr25519' });
    const charlie = keyring.addFromUri(`//Charlie`);
    await setCollectionSponsorExpectSuccess(collectionId, bob.address);
    await setCollectionSponsorExpectSuccess(collectionId, charlie.address);
  });
});

describe('(!negative test!) integration test: ext. setCollectionSponsor():', () => {
  before(async () => {
    await usingApi(async (api) => {
      const keyring = new Keyring({ type: 'sr25519' });
      bob = keyring.addFromUri(`//Bob`);
    });
  });

  it('(!negative test!) Add sponsor with a non-owner', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectFailure(collectionId, bob.address, '//Bob');
  });
  it('(!negative test!) Add sponsor to a collection that never existed', async () => {
    // Find the collection that never existed
    const collectionId = 0;
    await usingApi(async (api) => {
      const collectionId = parseInt((await api.query.nft.createdCollectionCount()).toString()) + 1;
    });

    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
  it('(!negative test!) Add sponsor to a collection that was destroyed', async () => {
    const collectionId = await createCollectionExpectSuccess();
    await destroyCollectionExpectSuccess(collectionId);
    await setCollectionSponsorExpectFailure(collectionId, bob.address);
  });
});
