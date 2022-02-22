//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import {expect} from 'chai';
import privateKey from './substrate/privateKey';
import usingApi, {executeTransaction, submitTransactionAsync} from './substrate/substrate-api';
import {createCollectionExpectFailure, createCollectionExpectSuccess, getCreateCollectionResult, getDetailedCollectionInfo} from './util/helpers';

describe('integration test: ext. createCollection():', () => {
  it('Create new NFT collection', async () => {
    await createCollectionExpectSuccess({name: 'A', description: 'B', tokenPrefix: 'C', mode: {type: 'NFT'}});
  });
  it('Create new NFT collection whith collection_name of maximum length (64 bytes)', async () => {
    await createCollectionExpectSuccess({name: 'A'.repeat(64)});
  });
  it('Create new NFT collection whith collection_description of maximum length (256 bytes)', async () => {
    await createCollectionExpectSuccess({description: 'A'.repeat(256)});
  });
  it('Create new NFT collection whith token_prefix of maximum length (16 bytes)', async () => {
    await createCollectionExpectSuccess({tokenPrefix: 'A'.repeat(16)});
  });
  it('Create new Fungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
  });
  it('Create new ReFungible collection', async () => {
    await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
  });
  it('Create new collection with extra fields', async () => {
    await usingApi(async api => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const tx = api.tx.unique.createCollectionEx({
        mode: {Fungible: 8},
        access: 'AllowList',
        name: [1],
        description: [2],
        tokenPrefix: '0x000000',
        offchainSchema: '0x111111',
        schemaVersion: 'Unique',
        pendingSponsor: bob.address,
        limits: {
          accountTokenOwnershipLimit: 3,
        },
        variableOnChainSchema: '0x222222',
        constOnChainSchema: '0x333333',
        metaUpdatePermission: 'Admin',
      });
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);

      const collection = (await getDetailedCollectionInfo(api, result.collectionId))!;
      expect(collection.owner.toString()).to.equal(alice.address);
      expect(collection.mode.asFungible.toNumber()).to.equal(8);
      expect(collection.access.isAllowList).to.be.true;
      expect(collection.name.map(v => v.toNumber())).to.deep.equal([1]);
      expect(collection.description.map(v => v.toNumber())).to.deep.equal([2]);
      expect(collection.tokenPrefix.toString()).to.equal('0x000000');
      expect(collection.offchainSchema.toString()).to.equal('0x111111');
      expect(collection.schemaVersion.isUnique).to.be.true;
      expect(collection.sponsorship.asUnconfirmed.toString()).to.equal(bob.address);
      expect(collection.limits.accountTokenOwnershipLimit.unwrap().toNumber()).to.equal(3);
      expect(collection.variableOnChainSchema.toString()).to.equal('0x222222');
      expect(collection.constOnChainSchema.toString()).to.equal('0x333333');
      expect(collection.metaUpdatePermission.isAdmin).to.be.true;
    });
  });
});

describe('(!negative test!) integration test: ext. createCollection():', () => {
  it('(!negative test!) create new NFT collection whith incorrect data (collection_name)', async () => {
    await createCollectionExpectFailure({name: 'A'.repeat(65), mode: {type: 'NFT'}});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (collection_description)', async () => {
    await createCollectionExpectFailure({description: 'A'.repeat(257), mode: {type: 'NFT'}});
  });
  it('(!negative test!) create new NFT collection whith incorrect data (token_prefix)', async () => {
    await createCollectionExpectFailure({tokenPrefix: 'A'.repeat(17), mode: {type: 'NFT'}});
  });
  it('fails when bad limits are set', async () => {
    await usingApi(async api => {
      const alice = privateKey('//Alice');
      const tx = api.tx.unique.createCollectionEx({mode: 'NFT', limits: {tokenLimit: 0}});
      await expect(executeTransaction(api, alice, tx)).to.be.rejectedWith(/^common.CollectionTokenLimitExceeded$/);
    });
  });
});
