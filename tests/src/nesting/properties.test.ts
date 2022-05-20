import {expect} from 'chai';
import privateKey from '../substrate/privateKey';
import usingApi, {executeTransaction} from '../substrate/substrate-api';
import {
  addCollectionAdminExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  getCreateCollectionResult,
  transferExpectSuccess,
} from '../util/helpers';
import {IKeyringPair} from '@polkadot/types/types';

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;

describe('Composite Properties Test', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Makes sure collectionById supplies required fields', async () => {
    await usingApi(async api => {
      const collectionId = await createCollectionExpectSuccess();

      const collectionOption = await api.rpc.unique.collectionById(collectionId);
      expect(collectionOption.isSome).to.be.true;
      let collection = collectionOption.unwrap();
      expect(collection.tokenPropertyPermissions.toHuman()).to.be.empty;
      expect(collection.properties.toHuman()).to.be.empty;

      const propertyPermissions = [
        {key: 'mindgame', permission: {collectionAdmin: true, mutable: false, tokenOwner: true}},
        {key: 'skullduggery', permission: {collectionAdmin: false, mutable: true, tokenOwner: false}},
      ];
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collectionId, propertyPermissions), 
      )).to.not.be.rejected;

      const collectionProperties = [
        {key: 'black_hole', value: 'LIGO'},
        {key: 'electron', value: 'come bond'}, 
      ];
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collectionId, collectionProperties), 
      )).to.not.be.rejected;

      collection = (await api.rpc.unique.collectionById(collectionId)).unwrap();
      expect(collection.tokenPropertyPermissions.toHuman()).to.be.deep.equal(propertyPermissions);
      expect(collection.properties.toHuman()).to.be.deep.equal(collectionProperties);
    });
  });
});

// ---------- COLLECTION PROPERTIES

describe('Integration Test: Collection Properties', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Reads properties from a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();
      const properties = (await api.query.common.collectionProperties(collection)).toJSON();
      expect(properties.map).to.be.empty;
      expect(properties.consumedSpace).to.equal(0);
    });
  });

  it('Sets properties for a collection', async () => {
    await usingApi(async api => {
      const events = await executeTransaction(api, bob, api.tx.unique.createCollectionEx({mode: 'NFT'}));
      const {collectionId} = getCreateCollectionResult(events);

      // As owner
      await expect(executeTransaction(
        api, 
        bob, 
        api.tx.unique.setCollectionProperties(collectionId, [{key: 'electron', value: 'come bond'}]), 
      )).to.not.be.rejected;

      await addCollectionAdminExpectSuccess(bob, collectionId, alice.address);

      // As administrator
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collectionId, [{key: 'black_hole'}]), 
      )).to.not.be.rejected;

      const properties = (await api.rpc.unique.collectionProperties(collectionId, ['electron', 'black_hole'])).toHuman();
      expect(properties).to.be.deep.equal([
        {key: 'electron', value: 'come bond'},
        {key: 'black_hole', value: ''},
      ]);
    });
  });

  it('Changes properties of a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [{key: 'electron', value: 'come bond'}, {key: 'black_hole'}]), 
      )).to.not.be.rejected;

      // Mutate the properties
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [{key: 'electron', value: 'bonded'}, {key: 'black_hole', value: 'LIGO'}]), 
      )).to.not.be.rejected;

      const properties = (await api.rpc.unique.collectionProperties(collection, ['electron', 'black_hole'])).toHuman();
      expect(properties).to.be.deep.equal([
        {key: 'electron', value: 'bonded'},
        {key: 'black_hole', value: 'LIGO'},
      ]);
    });
  });

  it('Deletes properties of a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}]), 
      )).to.not.be.rejected;

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.deleteCollectionProperties(collection, ['electron']), 
      )).to.not.be.rejected;

      const properties = (await api.rpc.unique.collectionProperties(collection, ['electron', 'black_hole'])).toHuman();
      expect(properties).to.be.deep.equal([
        {key: 'black_hole', value: 'LIGO'},
      ]);
    });
  });
});

describe('Negative Integration Test: Collection Properties', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });
  
  it('Fails to set properties in a collection if not its onwer/administrator', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        bob, 
        api.tx.unique.setCollectionProperties(collection, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}]), 
      )).to.be.rejectedWith(/common\.NoPermission/);
  
      const properties = (await api.query.common.collectionProperties(collection)).toJSON();
      expect(properties.map).to.be.empty;
      expect(properties.consumedSpace).to.equal(0);
    });
  });
  
  it('Fails to set properties that exceed the limits', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();
      const spaceLimit = (await api.query.common.collectionProperties(collection)).toJSON().spaceLimit as number; 

      // Mute the general tx parsing error, too many bytes to process
      {
        console.error = () => {};
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.setCollectionProperties(collection, [{key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 9))}]), 
        )).to.be.rejected;
      }

      let properties = (await api.rpc.unique.collectionProperties(collection, ['electron'])).toJSON();
      expect(properties).to.be.empty;

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [
          {key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 18))}, 
          {key: 'black_hole', value: '0'.repeat(Math.ceil(spaceLimit! / 2))}, 
        ]), 
      )).to.be.rejectedWith(/common\.NoSpaceForProperty/);

      properties = (await api.rpc.unique.collectionProperties(collection, ['electron', 'black hole'])).toJSON();
      expect(properties).to.be.empty;
    });
  });
  
  it('Fails to set more properties than it is allowed', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      const propertiesToBeSet = [];
      for (let i = 0; i < 65; i++) {
        propertiesToBeSet.push({
          key: 'electron_' + i,
          value: Math.random() > 0.5 ? 'high' : 'low',
        });
      }

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, propertiesToBeSet), 
      )).to.be.rejectedWith(/common\.PropertyLimitReached/);

      const properties = (await api.query.common.collectionProperties(collection)).toJSON();
      expect(properties.map).to.be.empty;
      expect(properties.consumedSpace).to.equal(0);
    });
  });

  it('Fails to set properties with invalid names', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      const invalidProperties = [
        [{key: 'electron', value: 'negative'}, {key: 'string theory', value: 'understandable'}],
        [{key: 'Mr.Sandman', value: 'Bring me a gene'}],
        [{key: 'déjà vu', value: 'hmm...'}],
      ];

      for (let i = 0; i < invalidProperties.length; i++) {
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.setCollectionProperties(collection, invalidProperties[i]), 
        ), `on rejecting the new badly-named property #${i}`).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
      }

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [{key: '', value: 'nothing must not exist'}]), 
      ), 'on rejecting an unnamed property').to.be.rejectedWith(/common\.EmptyPropertyKey/);

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setCollectionProperties(collection, [
          {key: 'CRISPR-Cas9', value: 'rewriting nature!'},
        ]), 
      ), 'on setting the correctly-but-still-badly-named property').to.not.be.rejected;

      const keys = invalidProperties.flatMap(propertySet => propertySet.map(property => property.key)).concat('CRISPR-Cas9').concat('');

      const properties = (await api.rpc.unique.collectionProperties(collection, keys)).toHuman();
      expect(properties).to.be.deep.equal([
        {key: 'CRISPR-Cas9', value: 'rewriting nature!'},
      ]);

      for (let i = 0; i < invalidProperties.length; i++) {
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.deleteCollectionProperties(collection, invalidProperties[i].map(propertySet => propertySet.key)), 
        ), `on trying to delete the non-existent badly-named property #${i}`).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
      }
    });
  });
});

// ---------- ACCESS RIGHTS

describe('Integration Test: Access Rights to Token Properties', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });
  
  it('Reads access rights to properties of a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();
      const propertyRights = (await api.query.common.collectionPropertyPermissions(collection)).toJSON();
      expect(propertyRights).to.be.empty;
    });
  });
  
  it('Sets access rights to properties of a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {mutable: true}}]), 
      )).to.not.be.rejected;

      await addCollectionAdminExpectSuccess(alice, collection, bob.address);

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'mindgame', permission: {collectionAdmin: true, tokenOwner: false}}]), 
      )).to.not.be.rejected;

      const propertyRights = (await api.rpc.unique.propertyPermissions(collection, ['skullduggery', 'mindgame'])).toHuman();
      expect(propertyRights).to.be.deep.equal([
        {key: 'skullduggery', permission: {'mutable': true, 'collectionAdmin': false, 'tokenOwner': false}},
        {key: 'mindgame', permission: {'mutable': false, 'collectionAdmin': true, 'tokenOwner': false}},
      ]);
    });
  });
  
  it('Changes access rights to properties of a collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {mutable: true, collectionAdmin: true}}]), 
      )).to.not.be.rejected;

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {mutable: false, tokenOwner: true}}]), 
      )).to.not.be.rejected;

      const propertyRights = (await api.rpc.unique.propertyPermissions(collection, ['skullduggery'])).toHuman();
      expect(propertyRights).to.be.deep.equal([
        {key: 'skullduggery', permission: {'mutable': false, 'collectionAdmin': false, 'tokenOwner': true}},
      ]);
    });
  });
});

describe('Negative Integration Test: Access Rights to Token Properties', () => {
  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
    });
  });

  it('Prevents from setting access rights to properties of a collection if not an onwer/admin', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        bob, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {mutable: true, tokenOwner: true}}]), 
      )).to.be.rejectedWith(/common\.NoPermission/);

      const propertyRights = (await api.rpc.unique.propertyPermissions(collection, ['skullduggery'])).toJSON();
      expect(propertyRights).to.be.empty;
    });
  });

  it('Prevents from adding too many possible properties', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      const constitution = [];
      for (let i = 0; i < 65; i++) {
        constitution.push({
          key: 'property_' + i,
          permission: Math.random() > 0.5 ? {mutable: true, collectionAdmin: true, tokenOwner: true} : {},
        });
      }

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, constitution), 
      )).to.be.rejectedWith(/common\.PropertyLimitReached/);

      const propertyRights = (await api.query.common.collectionPropertyPermissions(collection)).toJSON();
      expect(propertyRights).to.be.empty;
    });
  });

  it('Prevents access rights to be modified if constant', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {mutable: false, tokenOwner: true}}]), 
      )).to.not.be.rejected;

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'skullduggery', permission: {}}]), 
      )).to.be.rejectedWith(/common\.NoPermission/);

      const propertyRights = (await api.rpc.unique.propertyPermissions(collection, ['skullduggery'])).toHuman();
      expect(propertyRights).to.deep.equal([
        {key: 'skullduggery', permission: {'mutable': false, 'collectionAdmin': false, 'tokenOwner': true}},
      ]);
    });
  });

  it('Prevents adding properties with invalid names', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();

      const invalidProperties = [
        [{key: 'skullduggery', permission: {tokenOwner: true}}, {key: 'im possible', permission: {collectionAdmin: true}}],
        [{key: 'G#4', permission: {tokenOwner: true}}],
        [{key: 'HÆMILTON', permission: {mutable: false, collectionAdmin: true, tokenOwner: true}}],
      ];

      for (let i = 0; i < invalidProperties.length; i++) {
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.setPropertyPermissions(collection, invalidProperties[i]), 
        ), `on setting the new badly-named property #${i}`).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
      }

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: '', permission: {}}]), 
      ), 'on rejecting an unnamed property').to.be.rejectedWith(/common\.EmptyPropertyKey/);

      const correctKey = '--0x03116e387820CA05'; // PolkadotJS would parse this as an already encoded hex-string
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [
          {key: correctKey, permission: {collectionAdmin: true}},
        ]), 
      ), 'on setting the correctly-but-still-badly-named property').to.not.be.rejected;

      const keys = invalidProperties.flatMap(propertySet => propertySet.map(property => property.key)).concat(correctKey).concat('');

      const propertyRights = (await api.rpc.unique.propertyPermissions(collection, keys)).toHuman();
      expect(propertyRights).to.be.deep.equal([
        {key: correctKey, permission: {mutable: false, collectionAdmin: true, tokenOwner: false}},
      ]);
    });
  });
});

// ---------- TOKEN PROPERTIES

describe('Integration Test: Token Properties', () => {
  let collection: number;
  let token: number;
  let permissions: {permission: any, signers: IKeyringPair[]}[];

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');

      permissions = [
        {permission: {mutable: true, collectionAdmin: true}, signers: [alice, bob]},
        {permission: {mutable: false, collectionAdmin: true}, signers: [alice, bob]},
        {permission: {mutable: true, tokenOwner: true}, signers: [charlie]},
        {permission: {mutable: false, tokenOwner: true}, signers: [charlie]},
        {permission: {mutable: true, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
        {permission: {mutable: false, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie]},
      ];
    });
  });

  beforeEach(async () => {
    await usingApi(async () => {
      collection = await createCollectionExpectSuccess();
      token = await createItemExpectSuccess(alice, collection, 'NFT');
      await addCollectionAdminExpectSuccess(alice, collection, bob.address);
      await transferExpectSuccess(collection, token, alice, charlie);
    });
  });
  
  it('Reads yet empty properties of a token', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess();
      const token = await createItemExpectSuccess(alice, collection, 'NFT');
  
      const properties = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON();
      expect(properties.map).to.be.empty;
      expect(properties.consumedSpace).to.be.equal(0);

      const tokenData = (await api.rpc.unique.tokenData(collection, token, ['anything'])).toJSON().properties;
      expect(tokenData).to.be.empty;
    });
  });

  it('Assigns properties to a token according to permissions', async () => {
    await usingApi(async api => {
      const propertyKeys: string[] = [];
      let i = 0;
      for (const permission of permissions) {
        for (const signer of permission.signers) {
          const key = i + '_' + signer.address;
          propertyKeys.push(key);

          await expect(executeTransaction(
            api, 
            alice, 
            api.tx.unique.setPropertyPermissions(collection, [{key: key, permission: permission.permission}]), 
          ), `on setting permission ${i} by ${signer.address}`).to.not.be.rejected;

          await expect(executeTransaction(
            api, 
            signer, 
            api.tx.unique.setTokenProperties(collection, token, [{key: key, value: 'Serotonin increase'}]), 
          ), `on adding property ${i} by ${signer.address}`).to.not.be.rejected;
        }

        i++;
      }

      const properties = (await api.rpc.unique.tokenProperties(collection, token, propertyKeys)).toHuman() as any[];
      const tokensData = (await api.rpc.unique.tokenData(collection, token, propertyKeys)).toHuman().properties as any[];
      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].value).to.be.equal('Serotonin increase');
        expect(tokensData[i].value).to.be.equal('Serotonin increase');
      }
    });
  });

  it('Changes properties of a token according to permissions', async () => {
    await usingApi(async api => {
      const propertyKeys: string[] = [];
      let i = 0;
      for (const permission of permissions) {
        if (!permission.permission.mutable) continue;
        
        for (const signer of permission.signers) {
          const key = i + '_' + signer.address;
          propertyKeys.push(key);

          await expect(executeTransaction(
            api, 
            alice, 
            api.tx.unique.setPropertyPermissions(collection, [{key: key, permission: permission.permission}]), 
          ), `on setting permission ${i} by ${signer.address}`).to.not.be.rejected;

          await expect(executeTransaction(
            api, 
            signer, 
            api.tx.unique.setTokenProperties(collection, token, [{key: key, value: 'Serotonin increase'}]), 
          ), `on adding property ${i} by ${signer.address}`).to.not.be.rejected;

          await expect(executeTransaction(
            api, 
            signer, 
            api.tx.unique.setTokenProperties(collection, token, [{key: key, value: 'Serotonin stable'}]), 
          ), `on changing property ${i} by ${signer.address}`).to.not.be.rejected;
        }

        i++;
      }

      const properties = (await api.rpc.unique.tokenProperties(collection, token, propertyKeys)).toHuman() as any[];
      const tokensData = (await api.rpc.unique.tokenData(collection, token, propertyKeys)).toHuman().properties as any[];
      for (let i = 0; i < properties.length; i++) {
        expect(properties[i].value).to.be.equal('Serotonin stable');
        expect(tokensData[i].value).to.be.equal('Serotonin stable');
      }
    });
  });

  it('Deletes properties of a token according to permissions', async () => {
    await usingApi(async api => {
      const propertyKeys: string[] = [];
      let i = 0;

      for (const permission of permissions) {
        if (!permission.permission.mutable) continue;
        
        for (const signer of permission.signers) {
          const key = i + '_' + signer.address;
          propertyKeys.push(key);

          await expect(executeTransaction(
            api, 
            alice, 
            api.tx.unique.setPropertyPermissions(collection, [{key: key, permission: permission.permission}]), 
          ), `on setting permission ${i} by ${signer.address}`).to.not.be.rejected;

          await expect(executeTransaction(
            api, 
            signer, 
            api.tx.unique.setTokenProperties(collection, token, [{key: key, value: 'Serotonin increase'}]), 
          ), `on adding property ${i} by ${signer.address}`).to.not.be.rejected;

          await expect(executeTransaction(
            api, 
            signer, 
            api.tx.unique.deleteTokenProperties(collection, token, [key]), 
          ), `on deleting property ${i} by ${signer.address}`).to.not.be.rejected;
        }
        
        i++;
      }

      const properties = (await api.rpc.unique.tokenProperties(collection, token, propertyKeys)).toJSON() as any[];
      expect(properties).to.be.empty;
      const tokensData = (await api.rpc.unique.tokenData(collection, token, propertyKeys)).toJSON().properties as any[];
      expect(tokensData).to.be.empty;
      expect((await api.query.nonfungible.tokenProperties(collection, token)).toJSON().consumedSpace).to.be.equal(0);
    });
  });
});

describe('Negative Integration Test: Token Properties', () => {
  let collection: number;
  let token: number;
  let originalSpace: number;
  let constitution: {permission: any, signers: IKeyringPair[], sinner: IKeyringPair}[];

  before(async () => {
    await usingApi(async () => {
      alice = privateKey('//Alice');
      bob = privateKey('//Bob');
      charlie = privateKey('//Charlie');
      const dave = privateKey('//Dave');

      constitution = [
        {permission: {mutable: true, collectionAdmin: true}, signers: [alice, bob], sinner: charlie},
        {permission: {mutable: false, collectionAdmin: true}, signers: [alice, bob], sinner: charlie},
        {permission: {mutable: true, tokenOwner: true}, signers: [charlie], sinner: alice},
        {permission: {mutable: false, tokenOwner: true}, signers: [charlie], sinner: alice},
        {permission: {mutable: true, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie], sinner: dave},
        {permission: {mutable: false, collectionAdmin: true, tokenOwner: true}, signers: [alice, bob, charlie], sinner: dave},
      ];
    });
  });

  beforeEach(async () => {
    collection = await createCollectionExpectSuccess();
    token = await createItemExpectSuccess(alice, collection, 'NFT');
    await addCollectionAdminExpectSuccess(alice, collection, bob.address);
    await transferExpectSuccess(collection, token, alice, charlie);
        
    await usingApi(async api => {
      let i = 0;
      for (const passage of constitution) {
        const signer = passage.signers[0];
        
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.setPropertyPermissions(collection, [{key: `${i}`, permission: passage.permission}]), 
        ), `on setting permission ${i} by ${signer.address}`).to.not.be.rejected;

        await expect(executeTransaction(
          api, 
          signer, 
          api.tx.unique.setTokenProperties(collection, token, [{key: `${i}`, value: 'Serotonin increase'}]), 
        ), `on adding property ${i} by ${signer.address}`).to.not.be.rejected;

        i++;
      }

      originalSpace = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON().consumedSpace as number;
    });
  });

  it('Forbids changing/deleting properties of a token if the user is outside of permissions', async () => {
    await usingApi(async api => {
      let i = -1;
      for (const forbiddance of constitution) {
        i++;
        if (!forbiddance.permission.mutable) continue;

        await expect(executeTransaction(
          api, 
          forbiddance.sinner, 
          api.tx.unique.setTokenProperties(collection, token, [{key: `${i}`, value: 'Serotonin down'}]), 
        ), `on failing to change property ${i} by ${forbiddance.sinner.address}`).to.be.rejectedWith(/common\.NoPermission/);

        await expect(executeTransaction(
          api, 
          forbiddance.sinner, 
          api.tx.unique.deleteTokenProperties(collection, token, [`${i}`]), 
        ), `on failing to delete property ${i} by ${forbiddance.sinner.address}`).to.be.rejectedWith(/common\.NoPermission/);
      }

      const properties = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON();
      expect(properties.consumedSpace).to.be.equal(originalSpace);
    });
  });

  it('Forbids changing/deleting properties of a token if the property is permanent (constant)', async () => {
    await usingApi(async api => {
      let i = -1;
      for (const permission of constitution) {
        i++;
        if (permission.permission.mutable) continue;

        await expect(executeTransaction(
          api, 
          permission.signers[0], 
          api.tx.unique.setTokenProperties(collection, token, [{key: `${i}`, value: 'Serotonin down'}]), 
        ), `on failing to change property ${i} by ${permission.signers[0].address}`).to.be.rejectedWith(/common\.NoPermission/);

        await expect(executeTransaction(
          api, 
          permission.signers[0], 
          api.tx.unique.deleteTokenProperties(collection, token, [i.toString()]), 
        ), `on failing to delete property ${i} by ${permission.signers[0].address}`).to.be.rejectedWith(/common\.NoPermission/);
      }

      const properties = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON();
      expect(properties.consumedSpace).to.be.equal(originalSpace);
    });
  });

  it('Forbids adding properties to a token if the property is not declared / forbidden with the \'None\' permission', async () => {
    await usingApi(async api => {
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setTokenProperties(collection, token, [{key: 'non-existent', value: 'I exist!'}]), 
      ), 'on failing to add a previously non-existent property').to.be.rejectedWith(/common\.NoPermission/);
        
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [{key: 'now-existent', permission: {}}]), 
      ), 'on setting a new non-permitted property').to.not.be.rejected;

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setTokenProperties(collection, token, [{key: 'now-existent', value: 'I exist!'}]), 
      ), 'on failing to add a property forbidden by the \'None\' permission').to.be.rejectedWith(/common\.NoPermission/);

      expect((await api.rpc.unique.tokenProperties(collection, token, ['non-existent', 'now-existent'])).toJSON()).to.be.empty;
      const properties = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON();
      expect(properties.consumedSpace).to.be.equal(originalSpace);
    });
  });

  it('Forbids adding too many properties to a token', async () => {
    await usingApi(async api => {
      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setPropertyPermissions(collection, [
          {key: 'a_holy_book', permission: {collectionAdmin: true, tokenOwner: true}}, 
          {key: 'young_years', permission: {collectionAdmin: true, tokenOwner: true}},
        ]), 
      ), 'on setting a new non-permitted property').to.not.be.rejected;

      // Mute the general tx parsing error
      {
        console.error = () => {};
        await expect(executeTransaction(
          api, 
          alice, 
          api.tx.unique.setCollectionProperties(collection, [{key: 'a_holy_book', value: 'word '.repeat(6554)}]), 
        )).to.be.rejected;
      }

      await expect(executeTransaction(
        api, 
        alice, 
        api.tx.unique.setTokenProperties(collection, token, [
          {key: 'a_holy_book', value: 'word '.repeat(3277)}, 
          {key: 'young_years', value: 'neverending'.repeat(1490)},
        ]), 
      )).to.be.rejectedWith(/common\.NoSpaceForProperty/);

      expect((await api.rpc.unique.tokenProperties(collection, token, ['a_holy_book', 'young years'])).toJSON()).to.be.empty;
      const propertiesMap = (await api.query.nonfungible.tokenProperties(collection, token)).toJSON();
      expect(propertiesMap.consumedSpace).to.be.equal(originalSpace);
    });
  });
});