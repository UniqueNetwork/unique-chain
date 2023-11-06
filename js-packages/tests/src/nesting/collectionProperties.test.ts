// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import type {IKeyringPair} from '@polkadot/types/types';
import {itSub, Pallets, usingPlaygrounds, expect, requirePalletsOrSkip, sizeOfProperty} from '../util/index.js';

describe('Integration Test: Collection Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([200n, 10n], donor);
    });
  });

  itSub('Properties are initially empty', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    expect(await collection.getProperties()).to.be.empty;
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'ft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testSuite => describe(`${testSuite.mode.toUpperCase()}`, () => {
    before(async function() {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async helper => {
        requirePalletsOrSkip(this, helper, testSuite.requiredPallets);
      });
    });

    itSub('Sets properties for a collection', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      // As owner
      await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}])).to.be.fulfilled;

      await collection.addAdmin(alice, {Substrate: bob.address});

      // As administrator
      await expect(collection.setProperties(bob, [{key: 'black_hole'}])).to.be.fulfilled;

      const properties = await collection.getProperties();
      expect(properties).to.include.deep.members([
        {key: 'electron', value: 'come bond'},
        {key: 'black_hole', value: ''},
      ]);
    });

    itSub('Check valid names for collection properties keys', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      // alpha symbols
      await expect(collection.setProperties(alice, [{key: 'answer'}])).to.be.fulfilled;

      // numeric symbols
      await expect(collection.setProperties(alice, [{key: '451'}])).to.be.fulfilled;

      // underscore symbol
      await expect(collection.setProperties(alice, [{key: 'black_hole'}])).to.be.fulfilled;

      // dash symbol
      await expect(collection.setProperties(alice, [{key: '-'}])).to.be.fulfilled;

      // dot symbol
      await expect(collection.setProperties(alice, [{key: 'once.in.a.long.long.while...', value: 'you get a little lost'}])).to.be.fulfilled;

      const properties = await collection.getProperties();
      expect(properties).to.include.deep.members([
        {key: 'answer', value: ''},
        {key: '451', value: ''},
        {key: 'black_hole', value: ''},
        {key: '-', value: ''},
        {key: 'once.in.a.long.long.while...', value: 'you get a little lost'},
      ]);
    });

    itSub('Changes properties of a collection', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: ''}])).to.be.fulfilled;

      // Mutate the properties
      await expect(collection.setProperties(alice, [{key: 'black_hole', value: 'LIGO'}])).to.be.fulfilled;

      const properties = await collection.getProperties();
      expect(properties).to.include.deep.members([
        {key: 'electron', value: 'come bond'},
        {key: 'black_hole', value: 'LIGO'},
      ]);
    });

    itSub('Deletes properties of a collection', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      await expect(collection.setProperties(alice, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}])).to.be.fulfilled;

      await expect(collection.deleteProperties(alice, ['electron'])).to.be.fulfilled;

      const properties = await collection.getProperties(['black_hole', 'electron']);
      expect(properties).to.be.deep.equal([
        {key: 'black_hole', value: 'LIGO'},
      ]);
    });

    itSub('Allows modifying a collection property multiple times with the same size', async({helper}) => {
      const propKey = 'tok-prop';

      const collection = await helper[testSuite.mode].mintCollection(alice);

      const maxCollectionPropertiesSize = 40960;

      const propDataSize = 4096;

      let propDataChar = 'a';
      const makeNewPropData = () => {
        propDataChar = String.fromCharCode(propDataChar.charCodeAt(0) + 1);
        return `${propDataChar}`.repeat(propDataSize);
      };

      const property = {key: propKey, value: makeNewPropData()};
      await collection.setProperties(alice, [property]);
      const originalSpace = await collection.getPropertiesConsumedSpace();
      expect(originalSpace).to.be.equal(sizeOfProperty(property));

      const sameSizePropertiesPossibleNum = maxCollectionPropertiesSize / propDataSize;

      // It is possible to modify a property as many times as needed.
      // It will not consume any additional space.
      for(let i = 0; i < sameSizePropertiesPossibleNum + 1; i++) {
        await collection.setProperties(alice, [{key: propKey, value: makeNewPropData()}]);
        const consumedSpace = await collection.getPropertiesConsumedSpace();
        expect(consumedSpace).to.be.equal(originalSpace);
      }
    });

    itSub('Adding then removing a collection property doesn\'t change the consumed space', async({helper}) => {
      const propKey = 'tok-prop';

      const collection = await helper[testSuite.mode].mintCollection(alice);
      const originalSpace = await collection.getPropertiesConsumedSpace();

      const propDataSize = 4096;
      const propData = 'a'.repeat(propDataSize);

      const property = {key: propKey, value: propData};
      await collection.setProperties(alice, [property]);
      let consumedSpace = await collection.getPropertiesConsumedSpace();
      expect(consumedSpace).to.be.equal(sizeOfProperty(property));

      await collection.deleteProperties(alice, [propKey]);
      consumedSpace = await collection.getPropertiesConsumedSpace();
      expect(consumedSpace).to.be.equal(originalSpace);
    });

    itSub('Modifying a collection property with different sizes correctly changes the consumed space', async({helper}) => {
      const propKey = 'tok-prop';

      const collection = await helper[testSuite.mode].mintCollection(alice);
      const originalSpace = await collection.getPropertiesConsumedSpace();

      const initProp = {key: propKey, value: 'a'.repeat(4096)};
      const biggerProp = {key: propKey, value: 'b'.repeat(5000)};
      const smallerProp = {key: propKey, value: 'c'.repeat(4000)};

      let consumedSpace;
      let expectedConsumedSpaceDiff;

      await collection.setProperties(alice, [initProp]);
      consumedSpace = await collection.getPropertiesConsumedSpace();
      expectedConsumedSpaceDiff = sizeOfProperty(initProp) - originalSpace;
      expect(consumedSpace).to.be.equal(originalSpace + expectedConsumedSpaceDiff);

      await collection.setProperties(alice, [biggerProp]);
      consumedSpace = await collection.getPropertiesConsumedSpace();
      expectedConsumedSpaceDiff = sizeOfProperty(biggerProp) - sizeOfProperty(initProp);
      expect(consumedSpace).to.be.equal(sizeOfProperty(initProp) + expectedConsumedSpaceDiff);

      await collection.setProperties(alice, [smallerProp]);
      consumedSpace = await collection.getPropertiesConsumedSpace();
      expectedConsumedSpaceDiff = sizeOfProperty(biggerProp) - sizeOfProperty(smallerProp);
      expect(consumedSpace).to.be.equal(sizeOfProperty(biggerProp) - expectedConsumedSpaceDiff);
    });
  }));
});

describe('Negative Integration Test: Collection Properties', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([1000n, 100n], donor);
    });
  });

  [
    {mode: 'nft' as const, requiredPallets: []},
    {mode: 'ft' as const, requiredPallets: []},
    {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
  ].map(testSuite => describe(`${testSuite.mode.toUpperCase()}`, () => {
    before(async function() {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async helper => {
        requirePalletsOrSkip(this, helper, testSuite.requiredPallets);
      });
    });

    itSub('Fails to set properties in a collection if not its onwer/administrator', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      await expect(collection.setProperties(bob, [{key: 'electron', value: 'come bond'}, {key: 'black_hole', value: 'LIGO'}]))
        .to.be.rejectedWith(/common\.NoPermission/);

      expect(await collection.getProperties()).to.be.empty;
    });

    itSub('Fails to set properties that exceed the limits', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      const spaceLimit = (helper.getApi().consts.unique.maxCollectionPropertiesSize as any).toNumber();

      // Mute the general tx parsing error, too many bytes to process
      {
        console.error = () => {};
        await expect(collection.setProperties(alice, [
          {key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 9))},
        ])).to.be.rejected;
      }

      expect(await collection.getProperties(['electron'])).to.be.empty;

      await expect(collection.setProperties(alice, [
        {key: 'electron', value: 'low high '.repeat(Math.ceil(spaceLimit! / 18))},
        {key: 'black_hole', value: '0'.repeat(Math.ceil(spaceLimit! / 2))},
      ])).to.be.rejectedWith(/common\.NoSpaceForProperty/);

      expect(await collection.getProperties(['electron', 'black_hole'])).to.be.empty;
    });

    itSub('Fails to set more properties than it is allowed', async ({helper}) =>  {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      const propertiesToBeSet = [];
      for(let i = 0; i < 65; i++) {
        propertiesToBeSet.push({
          key: 'electron_' + i,
          value: Math.random() > 0.5 ? 'high' : 'low',
        });
      }

      await expect(collection.setProperties(alice, propertiesToBeSet)).
        to.be.rejectedWith(/common\.PropertyLimitReached/);

      expect(await collection.getProperties()).to.be.empty;
    });

    itSub('Fails to set properties with invalid names', async ({helper}) => {
      const collection = await helper[testSuite.mode].mintCollection(alice);

      const invalidProperties = [
        [{key: 'electron', value: 'negative'}, {key: 'string theory', value: 'understandable'}],
        [{key: 'Mr/Sandman', value: 'Bring me a gene'}],
        [{key: 'déjà vu', value: 'hmm...'}],
      ];

      for(let i = 0; i < invalidProperties.length; i++) {
        await expect(
          collection.setProperties(alice, invalidProperties[i]),
          `on rejecting the new badly-named property #${i}`,
        ).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
      }

      await expect(
        collection.setProperties(alice, [{key: '', value: 'nothing must not exist'}]),
        'on rejecting an unnamed property',
      ).to.be.rejectedWith(/common\.EmptyPropertyKey/);

      await expect(
        collection.setProperties(alice, [{key: 'CRISPR-Cas9', value: 'rewriting nature!'}]),
        'on setting the correctly-but-still-badly-named property',
      ).to.be.fulfilled;

      const keys = invalidProperties.flatMap(propertySet => propertySet.map(property => property.key)).concat('CRISPR-Cas9').concat('');

      const properties = await collection.getProperties(keys);
      expect(properties).to.be.deep.equal([
        {key: 'CRISPR-Cas9', value: 'rewriting nature!'},
      ]);

      for(let i = 0; i < invalidProperties.length; i++) {
        await expect(
          collection.deleteProperties(alice, invalidProperties[i].map(propertySet => propertySet.key)),
          `on trying to delete the non-existent badly-named property #${i}`,
        ).to.be.rejectedWith(/common\.InvalidCharacterInPropertyKey/);
      }
    });

    itSub('Forbids to repair a collection if called with non-sudo', async({helper}) => {
      const collection = await helper[testSuite.mode].mintCollection(alice, {properties: [
        {key: 'sea-creatures', value: 'mermaids'},
        {key: 'goldenratio', value: '1.6180339887498948482045868343656381177203091798057628621354486227052604628189'},
      ]});

      await expect(helper.executeExtrinsic(alice, 'api.tx.unique.forceRepairCollection', [collection.collectionId], true))
        .to.be.rejectedWith(/BadOrigin/);
    });
  }));
});
