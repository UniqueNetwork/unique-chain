// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';
import {Pallets, requirePalletsOrSkip} from '../util';
import {expect, itEth, usingEthPlaygrounds} from './util';
import {CREATE_COLLECTION_DATA_DEFAULTS, CollectionLimitField, CollectionMode, CreateCollectionData, TokenPermissionField, emptyAddress} from './util/playgrounds/types';
import {CollectionFlag, IEthCrossAccountId, TCollectionMode} from '../util/playgrounds/types';

const DECIMALS = 18;
const CREATE_COLLECTION_DATA_DEFAULTS_ARRAY = [
  [],  // properties
  [],  // tokenPropertyPermissions
  [],  // adminList
  [false, false, []],  // nestingSettings
  [],  // limits
  emptyAddress,  // pendingSponsor
  [0],  // flags
];

type ElementOf<A> = A extends readonly (infer T)[] ? T : never;
function* cartesian<T extends Array<Array<any>>, R extends Array<any>>(internalRest: [...R], ...args: [...T]): Generator<[...R, ...{[K in keyof T]: ElementOf<T[K]>}]> {
  if(args.length === 0) {
    yield internalRest as any;
    return;
  }
  for(const value of args[0]) {
    yield* cartesian([...internalRest, value], ...args.slice(1)) as any;
  }
}

describe('Create collection from EVM', () => {
  let donor: IKeyringPair;
  let nominal: bigint;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      nominal = helper.balance.getOneTokenNominal();
    });
  });

  describe('Fungible collection', () => {
    before(async function() {
      await usingEthPlaygrounds((helper) => {
        requirePalletsOrSkip(this, helper, [Pallets.Fungible]);
        return Promise.resolve();
      });
    });

    itEth('Collection address exist', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

      expect(await collectionHelpers
        .methods.isCollectionExist(collectionAddressForNonexistentCollection).call())
        .to.be.false;

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Exister', 'absolutely anything', 'WIWT', 'ft', DECIMALS)).send();
      expect(await collectionHelpers
        .methods.isCollectionExist(collectionAddress).call())
        .to.be.true;

      // check collectionOwner:
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
      const collectionOwner = await collectionEvm.methods.collectionOwner().call();
      expect(helper.address.restoreCrossAccountFromBigInt(BigInt(collectionOwner.sub))).to.eq(helper.address.ethToSubstrate(owner, true));
    });

    itEth('destroyCollection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('Exister', 'absolutely anything', 'WIWT', 'ft', DECIMALS)).send();
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);

      const result = await collectionHelper.methods
        .destroyCollection(collectionAddress)
        .send({from: owner});

      const events = helper.eth.normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address: collectionHelper.options.address,
          event: 'CollectionDestroyed',
          args: {
            collectionId: collectionAddress,
          },
        },
      ]);

      expect(await collectionHelper.methods
        .isCollectionExist(collectionAddress)
        .call()).to.be.false;
      expect(await helper.collection.getData(collectionId)).to.be.null;
    });

    itEth('(!negative test!) Create collection (bad lengths)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
      {
        const MAX_NAME_LENGTH = 64;
        const collectionName = 'A'.repeat(MAX_NAME_LENGTH + 1);
        const description = 'A';
        const tokenPrefix = 'A';

        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Fungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);
      }
      {
        const MAX_DESCRIPTION_LENGTH = 256;
        const collectionName = 'A';
        const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
        const tokenPrefix = 'A';
        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Fungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
      }
      {
        const MAX_TOKEN_PREFIX_LENGTH = 16;
        const collectionName = 'A';
        const description = 'A';
        const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Fungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
      }
    });

    itEth('(!negative test!) cannot create collection if value !== 2', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
      const expects = [0n, 1n, 30n].map(async value => {
        await expect(collectionHelper.methods
          .createCollection([
            'Peasantry',
            'absolutely anything',
            'TWIW',
            CollectionMode.Fungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(value * nominal)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
      });
      await Promise.all(expects);
    });
  });

  describe('Nonfungible collection', () => {
    before(async function() {
      await usingEthPlaygrounds((helper) => {
        requirePalletsOrSkip(this, helper, [Pallets.NFT]);
        return Promise.resolve();
      });
    });

    itEth('Create collection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const name = 'CollectionEVM';
      const description = 'Some description';
      const prefix = 'token prefix';

      // todo:playgrounds this might fail when in async environment.
      const collectionCountBefore = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;
      const {collectionId, collectionAddress, events} = await helper.eth.createCollection(owner, new CreateCollectionData(name, description, prefix, 'nft')).send();

      expect(events).to.be.deep.equal([
        {
          address: '0x6C4E9fE1AE37a41E93CEE429e8E1881aBdcbb54F',
          event: 'CollectionCreated',
          args: {
            owner: owner,
            collectionId: collectionAddress,
          },
        },
      ]);

      const collectionCountAfter = +(await helper.callRpc('api.rpc.unique.collectionStats')).created;

      const collection = helper.nft.getCollectionObject(collectionId);
      const data = (await collection.getData())!;

      // Parallel test safety
      expect(collectionCountAfter - collectionCountBefore).to.be.gte(1);
      expect(collectionId).to.be.eq(collectionCountAfter);
      expect(data.name).to.be.eq(name);
      expect(data.description).to.be.eq(description);
      expect(data.raw.tokenPrefix).to.be.eq(prefix);
      expect(data.raw.mode).to.be.eq('NFT');

      const options = await collection.getOptions();

      expect(options.tokenPropertyPermissions).to.be.empty;
    });

    // this test will occasionally fail when in async environment.
    itEth('Check collection address exist', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const expectedCollectionId = +(await helper.callRpc('api.rpc.unique.collectionStats')).created + 1;
      const expectedCollectionAddress = helper.ethAddress.fromCollectionId(expectedCollectionId);
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

      expect(await collectionHelpers.methods
        .isCollectionExist(expectedCollectionAddress)
        .call()).to.be.false;

      await collectionHelpers.methods
        .createCollection([
          'A',
          'A',
          'A',
          CollectionMode.Nonfungible,
          0,
          ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
        ])
        .send({value: Number(2n * helper.balance.getOneTokenNominal())});

      expect(await collectionHelpers.methods
        .isCollectionExist(expectedCollectionAddress)
        .call()).to.be.true;
    });
  });

  describe('Create RFT collection from EVM', () => {
    before(async function() {
      await usingEthPlaygrounds((helper) => {
        requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
        return Promise.resolve();
      });
    });

    itEth('Create collection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const name = 'CollectionEVM';
      const description = 'Some description';
      const prefix = 'token prefix';

      const {collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData(name, description, prefix, 'rft')).send();
      const data = (await helper.rft.getData(collectionId))!;
      const collection = helper.rft.getCollectionObject(collectionId);

      expect(data.name).to.be.eq(name);
      expect(data.description).to.be.eq(description);
      expect(data.raw.tokenPrefix).to.be.eq(prefix);
      expect(data.raw.mode).to.be.eq('ReFungible');

      const options = await collection.getOptions();

      expect(options.tokenPropertyPermissions).to.be.empty;
    });

    itEth('Create collection with properties & get description', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const name = 'CollectionEVM';
      const description = 'Some description';
      const prefix = 'token prefix';
      const baseUri = 'BaseURI';

      const {collectionId, collectionAddress} = await helper.eth.createERC721MetadataCompatibleRFTCollection(owner, name, description, prefix, baseUri);
      const contract = helper.ethNativeContract.collection(collectionAddress, 'nft');

      const collection = helper.rft.getCollectionObject(collectionId);
      const data = (await collection.getData())!;

      expect(data.name).to.be.eq(name);
      expect(data.description).to.be.eq(description);
      expect(data.raw.tokenPrefix).to.be.eq(prefix);
      expect(data.raw.mode).to.be.eq('ReFungible');

      expect(await contract.methods.description().call()).to.deep.equal(description);

      const options = await collection.getOptions();
      expect(options.tokenPropertyPermissions).to.be.deep.equal([
        {
          key: 'URI',
          permission: {mutable: true, collectionAdmin: true, tokenOwner: false},
        },
        {
          key: 'URISuffix',
          permission: {mutable: true, collectionAdmin: true, tokenOwner: false},
        },
      ]);
    });

    itEth('Set sponsorship', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const ss58Format = helper.chain.getChainProperties().ss58Format;
      const {collectionId, collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Sponsor', 'absolutely anything', 'ENVY', 'rft')).send();

      const collection = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);
      const sponsorCross = helper.ethCrossAccount.fromAddress(sponsor);
      await collection.methods.setCollectionSponsorCross(sponsorCross).send();

      let data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.sponsorship.Unconfirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));

      await expect(collection.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

      const sponsorCollection = helper.ethNativeContract.collection(collectionAddress, 'rft', sponsor);
      await sponsorCollection.methods.confirmCollectionSponsorship().send();

      data = (await helper.rft.getData(collectionId))!;
      expect(data.raw.sponsorship.Confirmed).to.be.equal(evmToAddress(sponsor, Number(ss58Format)));
    });

    itEth('Collection address exist', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionAddressForNonexistentCollection = '0x17C4E6453CC49AAAAEACA894E6D9683E00112233';
      const collectionHelpers = helper.ethNativeContract.collectionHelpers(owner);

      expect(await collectionHelpers
        .methods.isCollectionExist(collectionAddressForNonexistentCollection).call())
        .to.be.false;

      const {collectionAddress} = await helper.eth.createCollection(owner, new CreateCollectionData('Exister', 'absolutely anything', 'WIWT', 'rft')).send();
      expect(await collectionHelpers
        .methods.isCollectionExist(collectionAddress).call())
        .to.be.true;

      // check collectionOwner:
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'ft', owner, true);
      const collectionOwner = await collectionEvm.methods.collectionOwner().call();
      expect(helper.address.restoreCrossAccountFromBigInt(BigInt(collectionOwner.sub))).to.eq(helper.address.ethToSubstrate(owner, true));
    });

    itEth('destroyCollection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress, collectionId} = await helper.eth.createCollection(owner, new CreateCollectionData('Limits', 'absolutely anything', 'OLF', 'rft')).send();
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);

      await expect(collectionHelper.methods
        .destroyCollection(collectionAddress)
        .send({from: owner})).to.be.fulfilled;

      expect(await collectionHelper.methods
        .isCollectionExist(collectionAddress)
        .call()).to.be.false;
      expect(await helper.collection.getData(collectionId)).to.be.null;
    });

    itEth('(!negative test!) Create collection (bad lengths)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
      {
        const MAX_NAME_LENGTH = 64;
        const collectionName = 'A'.repeat(MAX_NAME_LENGTH + 1);
        const description = 'A';
        const tokenPrefix = 'A';

        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Refungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('name is too long. Max length is ' + MAX_NAME_LENGTH);
      }
      {
        const MAX_DESCRIPTION_LENGTH = 256;
        const collectionName = 'A';
        const description = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
        const tokenPrefix = 'A';
        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Refungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('description is too long. Max length is ' + MAX_DESCRIPTION_LENGTH);
      }
      {
        const MAX_TOKEN_PREFIX_LENGTH = 16;
        const collectionName = 'A';
        const description = 'A';
        const tokenPrefix = 'A'.repeat(MAX_TOKEN_PREFIX_LENGTH + 1);
        await expect(collectionHelper.methods
          .createCollection([
            collectionName,
            description,
            tokenPrefix,
            CollectionMode.Refungible,
            DECIMALS,
            ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
          ])
          .call({value: Number(2n * nominal)})).to.be.rejectedWith('token_prefix is too long. Max length is ' + MAX_TOKEN_PREFIX_LENGTH);
      }
    });

    itEth('(!negative test!) Create collection (no funds)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const collectionHelper = helper.ethNativeContract.collectionHelpers(owner);
      await expect(collectionHelper.methods
        .createCollection([
          'Peasantry',
          'absolutely anything',
          'TWIW',
          CollectionMode.Refungible,
          0,
          ...CREATE_COLLECTION_DATA_DEFAULTS_ARRAY,
        ])
        .call({value: Number(1n * nominal)})).to.be.rejectedWith('Sent amount not equals to collection creation price (2000000000000000000)');
    });
  });

  describe('Sponsoring', () => {
    itEth('Сan remove collection sponsor', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddr(sponsor);

      const {collectionAddress} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'Sponsor collection',
          description: '1',
          tokenPrefix: '1',
          collectionMode: 'nft',
          pendingSponsor: sponsorCross,
        },
      ).send();
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;

      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      let sponsorStruct = await collectionEvm.methods.collectionSponsor().call({from: owner});
      expect(helper.address.restoreCrossAccountFromBigInt(BigInt(sponsorStruct.sub))).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;

      await collectionEvm.methods.removeCollectionSponsor().send({from: owner});

      sponsorStruct = await collectionEvm.methods.collectionSponsor().call({from: owner});
      expect(sponsorStruct.eth).to.be.eq('0x0000000000000000000000000000000000000000');
    });

    itEth('Can sponsor from evm address via access list', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsorEth = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddr(sponsorEth);

      const {collectionId, collectionAddress} = await helper.eth.createERC721MetadataCompatibleCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'Sponsor collection',
          description: '1',
          tokenPrefix: '1',
          collectionMode: 'nft',
          pendingSponsor: sponsorCross,
          limits: [{field: CollectionLimitField.SponsoredDataRateLimit, value: 30n}],
          tokenPropertyPermissions: [{key: 'key', permissions: [{code: TokenPermissionField.TokenOwner, value: true}]}],
        },
        '',
      );

      const collectionSub = helper.nft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      let sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));
      // Account cannot confirm sponsorship if it is not set as a sponsor
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

      // Sponsor can confirm sponsorship:
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});
      sponsorship = (await collectionSub.getData())!.raw.sponsorship;
      expect(sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsorEth, true));

      // Create user with no balance:
      const user = helper.ethCrossAccount.createAccount();
      const nextTokenId = await collectionEvm.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');

      // Set collection permissions:
      const oldPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(oldPermissions.mintMode).to.be.false;
      expect(oldPermissions.access).to.be.equal('Normal');

      await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
      await collectionEvm.methods.addToCollectionAllowListCross(user).send({from: owner});
      await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

      const newPermissions = (await collectionSub.getData())!.raw.permissions;
      expect(newPermissions.mintMode).to.be.true;
      expect(newPermissions.access).to.be.equal('AllowList');

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
      const userBalanceBefore =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

      // User can mint token without balance:
      {
        const result = await collectionEvm.methods.mintCross(user, [{key: 'key', value: Buffer.from('Value')}]).send({from: user.eth});
        const event = helper.eth.normalizeEvents(result.events)
          .find(event => event.event === 'Transfer');

        expect(event).to.be.deep.equal({
          address: collectionAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: user.eth,
            tokenId: '1',
          },
        });

        // await collectionEvm.methods.setProperties(1, [{key: 'key', value: Buffer.from('Value1')}]).send({from: user.eth});

        const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
        const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsorEth));
        const userBalanceAfter =  await helper.balance.getSubstrate(helper.address.ethToSubstrate(user.eth));

        expect(await collectionEvm.methods.properties(nextTokenId, []).call())
          .to.be.like([
            [
              'key',
              '0x' + Buffer.from('Value').toString('hex'),
            ],
          ]);
        expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
        expect(userBalanceAfter).to.be.eq(userBalanceBefore);
        expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
      }
    });

    itEth('Check that transaction via EVM spend money from sponsor address', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsor = await helper.eth.createAccountWithBalance(donor);
      const sponsorCross = helper.ethCrossAccount.fromAddr(sponsor);
      const user = helper.eth.createAccount();
      const userCross = helper.ethCrossAccount.fromAddress(user);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'Sponsor collection',
          description: '1',
          tokenPrefix: '1',
          collectionMode: 'nft',
          pendingSponsor: sponsorCross,
          adminList: [userCross],
        },
        '',
      );

      const collectionSub = helper.nft.getCollectionObject(collectionId);
      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
      // Set collection sponsor:
      let collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Unconfirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));
      await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('ConfirmSponsorshipFail');

      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
      collectionData = (await collectionSub.getData())!;
      expect(collectionData.raw.sponsorship.Confirmed).to.be.eq(helper.address.ethToSubstrate(sponsor, true));

      const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));

      const mintingResult = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
      const tokenId = mintingResult.events.Transfer.returnValues.tokenId;

      const event = helper.eth.normalizeEvents(mintingResult.events)
        .find(event => event.event === 'Transfer');
      const address = helper.ethAddress.fromCollectionId(collectionId);

      expect(event).to.be.deep.equal({
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: '1',
        },
      });
      expect(await collectionEvm.methods.tokenURI(tokenId).call({from: user})).to.be.equal('Test URI');

      const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
      expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
      const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
      expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
    });

    itEth('Can reassign collection sponsor', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const sponsorEth = await helper.eth.createAccountWithBalance(donor);
      const sponsorCrossEth = helper.ethCrossAccount.fromAddr(sponsorEth);
      const [sponsorSub] = await helper.arrange.createAccounts([100n], donor);
      const sponsorCrossSub = helper.ethCrossAccount.fromKeyringPair(sponsorSub);

      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'Sponsor collection',
          description: '1',
          tokenPrefix: '1',
          collectionMode: 'nft',
          pendingSponsor: sponsorCrossEth,
        },
        '',
      );
      const collectionSub = helper.nft.getCollectionObject(collectionId);
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      // Set and confirm sponsor:
      await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsorEth});

      // Can reassign sponsor:
      await collectionEvm.methods.setCollectionSponsorCross(sponsorCrossSub).send({from: owner});
      const collectionSponsor = (await collectionSub.getData())?.raw.sponsorship;
      expect(collectionSponsor).to.deep.eq({Unconfirmed: sponsorSub.address});
    });

    [
      'transfer',
      'transferCross',
      'transferFrom',
      'transferFromCross',
    ].map(testCase =>
      itEth(`[${testCase}] Check that transfer via EVM spend money from sponsor address`, async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const sponsor = await helper.eth.createAccountWithBalance(donor);
        const sponsorCross = helper.ethCrossAccount.fromAddr(sponsor);
        const user = await helper.eth.createAccountWithBalance(donor);
        const userCross = helper.ethCrossAccount.fromAddress(user);

        const {collectionAddress} = await helper.eth.createERC721MetadataCompatibleCollection(
          owner,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'Sponsor collection',
            description: '1',
            tokenPrefix: '1',
            collectionMode: 'rft',
            pendingSponsor: sponsorCross,
            adminList: [userCross],
          },
          '',
        );
        const receiver = await helper.eth.createAccountWithBalance(donor);
        const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'rft', owner);

        await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});

        const result = await collectionEvm.methods.mintWithTokenURI(user, 'Test URI').send({from: user});
        const tokenId = result.events.Transfer.returnValues.tokenId;

        const ownerBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
        const sponsorBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
        const userBalanceBefore = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));

        switch (testCase) {
          case 'transfer':
            await collectionEvm.methods.transfer(receiver, tokenId).send({from: user});
            break;
          case 'transferCross':
            await collectionEvm.methods.transferCross(helper.ethCrossAccount.fromAddress(receiver), tokenId).send({from: user});
            break;
          case 'transferFrom':
            await collectionEvm.methods.transferFrom(user, receiver, tokenId).send({from: user});
            break;
          case 'transferFromCross':
            await collectionEvm.methods.transferFromCross(helper.ethCrossAccount.fromAddress(user), helper.ethCrossAccount.fromAddress(receiver), tokenId).send({from: user});
            break;
        }

        const ownerBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(owner));
        expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
        const sponsorBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(sponsor));
        expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
        const userBalanceAfter = await helper.balance.getSubstrate(helper.address.ethToSubstrate(user));
        expect(userBalanceAfter).to.be.eq(userBalanceBefore);
      }));
  });

  describe('Collection admins', () => {
    let donor: IKeyringPair;

    before(async function() {
      await usingEthPlaygrounds(async (_helper, privateKey) => {
        donor = await privateKey({url: import.meta.url});
      });
    });

    [
      {mode: 'nft' as const, requiredPallets: []},
      {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
      {mode: 'ft' as const, requiredPallets: []},
    ].map(testCase => {
      itEth.ifWithPallets(`can add account admin by owner for ${testCase.mode}`, testCase.requiredPallets, async ({helper, privateKey}) => {
        // arrange
        const owner = await helper.eth.createAccountWithBalance(donor);
        const adminSub = await privateKey('//admin2');
        const adminEth = helper.eth.createAccount().toLowerCase();

        const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
        const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);

        const {collectionAddress, collectionId} = await helper.eth.createCollection(
          owner,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'Mint collection',
            description: 'a',
            tokenPrefix: 'b',
            collectionMode: testCase.mode,
            adminList: [adminCrossSub, adminCrossEth],
          },
        ).send();
        const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner, true);

        // 1. Expect api.rpc.unique.adminlist returns admins:
        const adminListRpc = await helper.collection.getAdmins(collectionId);
        expect(adminListRpc).to.has.length(2);
        expect(adminListRpc).to.be.deep.contain.members([{Substrate: adminSub.address}, {Ethereum: adminEth}]);

        // 2. Expect methods.collectionAdmins == api.rpc.unique.adminlist
        let adminListEth = await collectionEvm.methods.collectionAdmins().call();
        adminListEth = adminListEth.map((element: IEthCrossAccountId) => helper.address.convertCrossAccountFromEthCrossAccount(element));
        expect(adminListRpc).to.be.like(adminListEth);

        // 3. check isOwnerOrAdminCross returns true:
        expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossSub).call()).to.be.true;
        expect(await collectionEvm.methods.isOwnerOrAdminCross(adminCrossEth).call()).to.be.true;
      });
    });

    itEth('cross account admin can mint', async ({helper}) => {
      // arrange: create collection and accounts
      const owner = await helper.eth.createAccountWithBalance(donor);
      const adminEth = (await helper.eth.createAccountWithBalance(donor)).toLowerCase();
      const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);
      const [adminSub] = await helper.arrange.createAccounts([100n], donor);
      const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
      const {collectionAddress, collectionId} = await helper.eth.createERC721MetadataCompatibleCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'Mint collection',
          description: 'a',
          tokenPrefix: 'b',
          collectionMode: 'nft',
          adminList: [adminCrossSub, adminCrossEth],
        },
        'uri',
      );
      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner, true);

      // admin (sub and eth) can mint token:
      await collectionEvm.methods.mint(owner).send({from: adminEth});
      await helper.nft.mintToken(adminSub, {collectionId, owner: {Ethereum: owner}});

      expect(await helper.collection.getLastTokenId(collectionId)).to.eq(2);
    });

    itEth('cannot add invalid cross account admin', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const [admin] = await helper.arrange.createAccounts([100n, 100n], donor);

      const adminCross = {
        eth: helper.address.substrateToEth(admin.address),
        sub: admin.addressRaw,
      };

      await expect(helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'A',
          description: 'B',
          tokenPrefix: 'C',
          collectionMode: 'nft',
          adminList: [adminCross],
        },
      ).call()).to.be.rejected;
    });

    itEth('Remove [cross] admin by owner', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const [adminSub] = await helper.arrange.createAccounts([10n], donor);
      const adminEth = (await helper.eth.createAccountWithBalance(donor)).toLowerCase();
      const adminCrossSub = helper.ethCrossAccount.fromKeyringPair(adminSub);
      const adminCrossEth = helper.ethCrossAccount.fromAddress(adminEth);

      const {collectionAddress, collectionId} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'A',
          description: 'B',
          tokenPrefix: 'C',
          collectionMode: 'nft',
          adminList: [adminCrossSub, adminCrossEth],
        },
      ).send();

      const collectionEvm = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      {
        const adminList = await helper.collection.getAdmins(collectionId);
        expect(adminList).to.deep.include({Substrate: adminSub.address});
        expect(adminList).to.deep.include({Ethereum: adminEth});
      }

      await collectionEvm.methods.removeCollectionAdminCross(adminCrossSub).send();
      await collectionEvm.methods.removeCollectionAdminCross(adminCrossEth).send();
      const adminList = await helper.collection.getAdmins(collectionId);
      expect(adminList.length).to.be.eq(0);

      // Non admin cannot mint:
      await expect(helper.nft.mintToken(adminSub, {collectionId, owner: {Substrate: adminSub.address}})).to.be.rejectedWith(/common.PublicMintingNotAllowed/);
      await expect(collectionEvm.methods.mint(adminEth).send({from: adminEth})).to.be.rejected;
    });
  });

  describe('Collection limits', () => {
    describe('Can set collection limits', () => {
      [
        {case: 'nft' as const},
        {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
        {case: 'ft' as const},
      ].map(testCase =>
        itEth.ifWithPallets(`for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
          const owner = await helper.eth.createAccountWithBalance(donor);

          const limits = {
            accountTokenOwnershipLimit: 1000n,
            sponsoredDataSize: 1024n,
            sponsoredDataRateLimit: 30n,
            tokenLimit: 1000000n,
            sponsorTransferTimeout: 6n,
            sponsorApproveTimeout: 6n,
            ownerCanTransfer: 1n,
            ownerCanDestroy: 0n,
            transfersEnabled: 0n,
          };

          const {collectionId, collectionAddress} = await helper.eth.createCollection(
            owner,
            {
              ...CREATE_COLLECTION_DATA_DEFAULTS,
              name: 'Limits',
              description: 'absolutely anything',
              tokenPrefix: 'FLO',
              collectionMode: testCase.case,
              limits: [
                {field: CollectionLimitField.AccountTokenOwnership, value: limits.accountTokenOwnershipLimit},
                {field: CollectionLimitField.SponsoredDataSize, value: limits.sponsoredDataSize},
                {field: CollectionLimitField.SponsoredDataRateLimit, value: limits.sponsoredDataRateLimit},
                {field: CollectionLimitField.TokenLimit, value: limits.tokenLimit},
                {field: CollectionLimitField.SponsorTransferTimeout, value: limits.sponsorTransferTimeout},
                {field: CollectionLimitField.SponsorApproveTimeout, value: limits.sponsorApproveTimeout},
                {field: CollectionLimitField.OwnerCanTransfer, value: limits.ownerCanTransfer},
                {field: CollectionLimitField.OwnerCanDestroy, value: limits.ownerCanDestroy},
                {field: CollectionLimitField.TransferEnabled, value: limits.transfersEnabled},
              ],
            },
          ).send();

          const expectedLimits = {
            accountTokenOwnershipLimit: 1000,
            sponsoredDataSize: 1024,
            sponsoredDataRateLimit: {blocks: 30},
            tokenLimit: 1000000,
            sponsorTransferTimeout: 6,
            sponsorApproveTimeout: 6,
            ownerCanTransfer: true,
            ownerCanDestroy: false,
            transfersEnabled: false,
          };

          const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.case, owner);

          // Check limits from sub:
          const data = (await helper.rft.getData(collectionId))!;
          expect(data.raw.limits).to.deep.eq(expectedLimits);
          expect(await helper.collection.getEffectiveLimits(collectionId)).to.deep.eq(expectedLimits);
          // Check limits from eth:
          const limitsEvm = await collectionEvm.methods.collectionLimits().call({from: owner});
          expect(limitsEvm).to.have.length(9);
          expect(limitsEvm[0]).to.deep.eq([CollectionLimitField.AccountTokenOwnership.toString(), [true, limits.accountTokenOwnershipLimit.toString()]]);
          expect(limitsEvm[1]).to.deep.eq([CollectionLimitField.SponsoredDataSize.toString(), [true, limits.sponsoredDataSize.toString()]]);
          expect(limitsEvm[2]).to.deep.eq([CollectionLimitField.SponsoredDataRateLimit.toString(), [true, limits.sponsoredDataRateLimit.toString()]]);
          expect(limitsEvm[3]).to.deep.eq([CollectionLimitField.TokenLimit.toString(), [true, limits.tokenLimit.toString()]]);
          expect(limitsEvm[4]).to.deep.eq([CollectionLimitField.SponsorTransferTimeout.toString(), [true, limits.sponsorTransferTimeout.toString()]]);
          expect(limitsEvm[5]).to.deep.eq([CollectionLimitField.SponsorApproveTimeout.toString(), [true, limits.sponsorApproveTimeout.toString()]]);
          expect(limitsEvm[6]).to.deep.eq([CollectionLimitField.OwnerCanTransfer.toString(), [true, limits.ownerCanTransfer.toString()]]);
          expect(limitsEvm[7]).to.deep.eq([CollectionLimitField.OwnerCanDestroy.toString(), [true, limits.ownerCanDestroy.toString()]]);
          expect(limitsEvm[8]).to.deep.eq([CollectionLimitField.TransferEnabled.toString(), [true, limits.transfersEnabled.toString()]]);
        }));
    });

    describe('(!negative test!) Cannot set invalid collection limits', () => {
      [
        {case: 'nft' as const},
        {case: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
        {case: 'ft' as const},
      ].map(testCase =>
        itEth.ifWithPallets(`for ${testCase.case}`, testCase.requiredPallets || [], async ({helper}) => {
          const invalidLimits = {
            accountTokenOwnershipLimit: BigInt(Number.MAX_SAFE_INTEGER),
            transfersEnabled: 3,
          };

          const createCollectionData = {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'Limits',
            description: 'absolutely anything',
            tokenPrefix: 'ISNI',
            collectionMode: testCase.case,
          };

          const owner = await helper.eth.createAccountWithBalance(donor);
          await expect(helper.eth.createCollection(
            owner,
            {
              ...createCollectionData,
              limits: [{field: 9 as CollectionLimitField, value: 1n}],
            },
          ).call()).to.be.rejectedWith('value not convertible into enum "CollectionLimitField"');

          await expect(helper.eth.createCollection(
            owner,
            {
              ...createCollectionData,
              limits: [{field: CollectionLimitField.AccountTokenOwnership, value: invalidLimits.accountTokenOwnershipLimit}],
            },
          ).call()).to.be.rejectedWith(`can't convert value to u32 "${invalidLimits.accountTokenOwnershipLimit}"`);

          await expect(helper.eth.createCollection(
            owner,
            {
              ...createCollectionData,
              limits: [{field: CollectionLimitField.TransferEnabled, value: 3n}],
            },
          ).call()).to.be.rejectedWith(`can't convert value to boolean "${invalidLimits.transfersEnabled}"`);

          await expect(helper.eth.createCollection(
            owner,
            {
              ...createCollectionData,
              limits: [{field: CollectionLimitField.SponsoredDataSize, value: -1n}],
            },
          ).call()).to.be.rejectedWith('value out-of-bounds');
        }));
    });
  });

  describe('Collection properties', () => {

    [
      {mode: 'nft' as const, methodParams: [{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]},
      {mode: 'rft' as const, methodParams: [{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]},
      {mode: 'ft' as const, methodParams: [{key: 'testKey1', value: Buffer.from('testValue1')}, {key: 'testKey2', value: Buffer.from('testValue2')}], expectedProps: [{key: 'testKey1', value: 'testValue1'}, {key: 'testKey2', value: 'testValue2'}]},
    ].map(testCase =>
      itEth.ifWithPallets(`Collection properties can be set for ${testCase.mode}`, testCase.mode === 'rft' ? [Pallets.ReFungible] : [], async({helper}) => {
        const caller = await helper.eth.createAccountWithBalance(donor);
        const callerCross = helper.ethCrossAccount.fromAddress(caller);
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId, collectionAddress} = await helper.eth.createCollection(
          owner,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'name',
            description: 'test',
            tokenPrefix: 'test',
            collectionMode: testCase.mode,
            adminList: [callerCross],
            properties: testCase.methodParams,
          },
        ).send();

        const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, caller);

        const raw = (await helper[testCase.mode].getData(collectionId))?.raw;
        expect(raw.properties).to.deep.equal(testCase.expectedProps);

        // collectionProperties returns properties:
        expect(await collectionEvm.methods.collectionProperties([]).call()).to.be.like(testCase.expectedProps.map(prop => helper.ethProperty.property(prop.key, prop.value)));
      }));

    [
      {mode: 'nft' as const},
      {mode: 'rft' as const},
      {mode: 'ft' as const},
    ].map(testCase =>
      itEth.ifWithPallets(`Collection properties can be deleted for ${testCase.mode}`, testCase.mode === 'rft' ? [Pallets.ReFungible] : [], async({helper}) => {
        const caller = await helper.eth.createAccountWithBalance(donor);
        const callerCross = helper.ethCrossAccount.fromAddress(caller);
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId, collectionAddress} = await helper.eth.createCollection(
          owner,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'name',
            description: 'test',
            tokenPrefix: 'test',
            collectionMode: testCase.mode,
            adminList: [callerCross],
            properties:[
              {key: 'testKey1', value: Buffer.from('testValue1')},
              {key: 'testKey2', value: Buffer.from('testValue2')},
              {key: 'testKey3', value: Buffer.from('testValue3')}],
          },
        ).send();

        const collectionEvm = helper.ethNativeContract.collection(collectionAddress, testCase.mode, caller);

        await collectionEvm.methods.deleteCollectionProperties(['testKey1', 'testKey2']).send({from: caller});

        const raw = (await helper[testCase.mode].getData(collectionId))?.raw;

        expect(raw.properties.length).to.equal(1);
        expect(raw.properties).to.deep.equal([{key: 'testKey3', value: 'testValue3'}]);
      }));

    itEth('(!negative test!) Cannot set invalid properties', async({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const callerCross = helper.ethCrossAccount.fromAddress(caller);
      const owner = await helper.eth.createAccountWithBalance(donor);
      const createCollectionData = {
        ...CREATE_COLLECTION_DATA_DEFAULTS,
        name: 'name',
        description: 'test',
        tokenPrefix: 'test',
        collectionMode: 'nft' as TCollectionMode,
        adminList: [callerCross],
      };
      await expect(helper.eth.createCollection(
        owner,
        {
          ...createCollectionData,
          properties: [{key: '', value: Buffer.from('val1')}],
        },
      ).call()).to.be.rejected;

      await expect(helper.eth.createCollection(
        owner,
        {
          ...createCollectionData,
          properties: [{key: 'déjà vu', value: Buffer.from('hmm...')}],
        },
      ).call()).to.be.rejected;

      await expect(helper.eth.createCollection(
        owner,
        {
          ...createCollectionData,
          properties: [{key: 'a'.repeat(257), value: Buffer.from('val3')}],
        },
      ).call()).to.be.rejected;
    });

    itEth('(!negative test!) cannot delete properties of non-owned collections', async ({helper}) => {
      const caller = await helper.eth.createAccountWithBalance(donor);
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'name',
          description: 'test',
          tokenPrefix: 'test',
          collectionMode: 'nft',
          properties:[
            {key: 'testKey1', value: Buffer.from('testValue1')},
            {key: 'testKey2', value: Buffer.from('testValue2')}],
        },
      ).send();

      const collectionEvm = await helper.ethNativeContract.collection(collectionAddress, 'nft', caller);

      await expect(collectionEvm.methods.deleteCollectionProperties(['testKey2']).send({from: caller})).to.be.rejected;
    });
  });

  describe('Token property permissions', () => {
    [
      {mode: 'nft' as const, requiredPallets: []},
      {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    ].map(testCase =>
      itEth.ifWithPallets(`[${testCase.mode}] Can set all possible token property permissions`, testCase.requiredPallets, async({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const caller = await helper.ethCrossAccount.createAccountWithBalance(donor);
        for(const [mutable,collectionAdmin, tokenOwner] of cartesian([], [false, true], [false, true], [false, true])) {
          const {collectionId, collectionAddress} = await helper.eth.createCollection(
            owner,
            {
              ...CREATE_COLLECTION_DATA_DEFAULTS,
              name: 'A',
              description: 'B',
              tokenPrefix: 'C',
              collectionMode: testCase.mode,
              adminList: [caller],
              tokenPropertyPermissions: [
                {
                  key: 'testKey',
                  permissions: [
                    {code: TokenPermissionField.Mutable, value: mutable},
                    {code: TokenPermissionField.TokenOwner, value: tokenOwner},
                    {code: TokenPermissionField.CollectionAdmin, value: collectionAdmin},
                  ],
                },
              ],
            },
          ).send();
          const collection = helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

          expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([{
            key: 'testKey',
            permission: {mutable, collectionAdmin, tokenOwner},
          }]);

          expect(await collection.methods.tokenPropertyPermissions().call({from: caller.eth})).to.be.like([
            ['testKey', [
              [TokenPermissionField.Mutable.toString(), mutable],
              [TokenPermissionField.TokenOwner.toString(), tokenOwner],
              [TokenPermissionField.CollectionAdmin.toString(), collectionAdmin]],
            ],
          ]);
        }
      }));

    [
      {mode: 'nft' as const, requiredPallets: []},
      {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    ].map(testCase =>
      itEth.ifWithPallets(`[${testCase.mode}] Can set multiple token property permissions`, testCase.requiredPallets, async({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId, collectionAddress} = await helper.eth.createCollection(
          owner,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'A',
            description: 'B',
            tokenPrefix: 'C',
            collectionMode: testCase.mode,
            tokenPropertyPermissions: [
              {
                key: 'testKey_0',
                permissions: [
                  {code: TokenPermissionField.Mutable, value: true},
                  {code: TokenPermissionField.TokenOwner, value: true},
                  {code: TokenPermissionField.CollectionAdmin, value: true}],
              },
              {
                key: 'testKey_1',
                permissions: [
                  {code: TokenPermissionField.Mutable, value: true},
                  {code: TokenPermissionField.TokenOwner, value: false},
                  {code: TokenPermissionField.CollectionAdmin, value: true}],
              },
              {
                key: 'testKey_2',
                permissions: [
                  {code: TokenPermissionField.Mutable, value: false},
                  {code: TokenPermissionField.TokenOwner, value: true},
                  {code: TokenPermissionField.CollectionAdmin, value: false}],
              },
            ],
          },
        ).send();
        const collection = await helper.ethNativeContract.collection(collectionAddress, testCase.mode, owner);

        expect(await helper[testCase.mode].getPropertyPermissions(collectionId)).to.be.deep.equal([
          {
            key: 'testKey_0',
            permission: {mutable: true, tokenOwner: true, collectionAdmin: true},
          },
          {
            key: 'testKey_1',
            permission: {mutable: true, tokenOwner: false, collectionAdmin: true},
          },
          {
            key: 'testKey_2',
            permission: {mutable: false, tokenOwner: true, collectionAdmin: false},
          },
        ]);

        expect(await collection.methods.tokenPropertyPermissions().call({from: owner})).to.be.like([
          ['testKey_0', [
            [TokenPermissionField.Mutable.toString(), true],
            [TokenPermissionField.TokenOwner.toString(), true],
            [TokenPermissionField.CollectionAdmin.toString(), true]],
          ],
          ['testKey_1', [
            [TokenPermissionField.Mutable.toString(), true],
            [TokenPermissionField.TokenOwner.toString(), false],
            [TokenPermissionField.CollectionAdmin.toString(), true]],
          ],
          ['testKey_2', [
            [TokenPermissionField.Mutable.toString(), false],
            [TokenPermissionField.TokenOwner.toString(), true],
            [TokenPermissionField.CollectionAdmin.toString(), false]],
          ],
        ]);
      }));

    [
      {mode: 'nft' as const, requiredPallets: []},
      {mode: 'rft' as const, requiredPallets: [Pallets.ReFungible]},
    ].map(testCase =>
      itEth.ifWithPallets(`Can be deleted for ${testCase.mode}`, testCase.requiredPallets, async({helper}) => {
        const caller = await helper.eth.createAccountWithBalance(donor);
        const receiver = await helper.ethCrossAccount.createAccountWithBalance(donor);
        const {collectionAddress} = await helper.eth.createCollection(
          caller,
          {
            ...CREATE_COLLECTION_DATA_DEFAULTS,
            name: 'A',
            description: 'B',
            tokenPrefix: 'C',
            collectionMode: testCase.mode,
            adminList: [receiver],
            tokenPropertyPermissions: [
              {
                key: 'testKey',
                permissions: [
                  {code: TokenPermissionField.Mutable, value: true},
                  {code: TokenPermissionField.CollectionAdmin, value: true}],
              },
              {
                key: 'testKey_1',
                permissions: [
                  {code: TokenPermissionField.Mutable, value: true},
                  {code: TokenPermissionField.CollectionAdmin, value: true}],
              },
            ],
          },
        ).send();

        const collection = helper.ethNativeContract.collection(collectionAddress, testCase.mode, caller);
        const tokenId = (await collection.methods.mintCross(receiver, [{key: 'testKey', value: Buffer.from('testValue')}, {key: 'testKey_1', value: Buffer.from('testValue_1')}]).send()).events.Transfer.returnValues.tokenId;
        expect(await collection.methods.properties(tokenId, ['testKey', 'testKey_1']).call()).to.has.length(2);

        await collection.methods.deleteProperties(tokenId, ['testKey', 'testKey_1']).send({from: caller});
        expect(await collection.methods.properties(tokenId, ['testKey', 'testKey_1']).call()).to.has.length(0);
      }));
  });

  describe('Nesting', () => {
    itEth('NFT: allows an Owner to nest/unnest their token', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress, collectionId} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'A',
          description: 'B',
          tokenPrefix: 'C',
          collectionMode: 'nft',
          nestingSettings: {token_owner: true, collection_admin: false, restricted: []},
        },
      ).send();

      const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      // Create a token to be nested to
      const mintingTargetNFTTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const targetNFTTokenId = mintingTargetNFTTokenIdResult.events.Transfer.returnValues.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNFTTokenId);

      // Create a nested token
      const mintingFirstTokenIdResult = await contract.methods.mint(targetNftTokenAddress).send({from: owner});
      const firstTokenId = mintingFirstTokenIdResult.events.Transfer.returnValues.tokenId;
      expect(await contract.methods.ownerOf(firstTokenId).call()).to.be.equal(targetNftTokenAddress);

      // Create a token to be nested and nest
      const mintingSecondTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const secondTokenId = mintingSecondTokenIdResult.events.Transfer.returnValues.tokenId;

      await contract.methods.transfer(targetNftTokenAddress, secondTokenId).send({from: owner});
      expect(await contract.methods.ownerOf(secondTokenId).call()).to.be.equal(targetNftTokenAddress);

      // Unnest token back
      await contract.methods.transferFrom(targetNftTokenAddress, owner, secondTokenId).send({from: owner});
      expect(await contract.methods.ownerOf(secondTokenId).call()).to.be.equal(owner);
    });

    itEth('NFT: collectionNesting()', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress: unnestedCollectionAddress} = await helper.eth.createCollection(
        owner,
        new CreateCollectionData('A', 'B', 'C', 'nft'),
      ).send();

      const unnestedContract = helper.ethNativeContract.collection(unnestedCollectionAddress, 'nft', owner);
      expect(await unnestedContract.methods.collectionNesting().call({from: owner})).to.be.like([false, false, []]);

      const {collectionAddress} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'A',
          description: 'B',
          tokenPrefix: 'C',
          collectionMode: 'nft',
          nestingSettings: {token_owner: true, collection_admin: false, restricted: [unnestedCollectionAddress.toString()]},
        },
      ).send();

      const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([true, false, [unnestedCollectionAddress.toString()]]);
      await contract.methods.setCollectionNesting([false, false, []]).send({from: owner});
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([false, false, []]);
    });

    itEth('NFT: disallows to nest token if nesting is disabled', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId, collectionAddress} = await helper.eth.createCollection(
        owner,
        {
          ...CREATE_COLLECTION_DATA_DEFAULTS,
          name: 'A',
          description: 'B',
          tokenPrefix: 'C',
          collectionMode: 'nft',
          nestingSettings: {token_owner: false, collection_admin: false, restricted: []},
        },
      ).send();

      const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

      // Create a token to nest into
      const mintingTargetTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);

      // Create a token to nest
      const mintingNftTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const nftTokenId = mintingNftTokenIdResult.events.Transfer.returnValues.tokenId;

      // Try to nest
      await expect(contract.methods
        .transfer(targetNftTokenAddress, nftTokenId)
        .call({from: owner})).to.be.rejectedWith('UserIsNotAllowedToNest');
    });
  });

  describe('Flags', () => {
    const createCollectionData = {
      ...CREATE_COLLECTION_DATA_DEFAULTS,
      name: 'A',
      description: 'B',
      tokenPrefix: 'C',
      collectionMode: 'nft' as TCollectionMode,
    };

    itEth('NFT: use numbers for flags', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      {
        const {collectionId} = await helper.eth.createCollection(owner, {...createCollectionData, flags: 0}).send();
        expect((await helper.nft.getData(collectionId))?.raw.flags).to.be.deep.equal({foreign: false, erc721metadata: false});
      }

      {
        const {collectionId} = await helper.eth.createCollection(owner, {...createCollectionData, flags: 64}).send();
        expect((await helper.nft.getData(collectionId))?.raw.flags).to.be.deep.equal({foreign: false, erc721metadata: true});
      }
    });

    itEth('NFT: can\'t set foreign flag number', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      {
        await expect(helper.eth.createCollection(owner, {...createCollectionData, flags: 128}).call({from: owner})).to.be.rejectedWith(/internal flags were used/);
      }

      {
        await expect(helper.eth.createCollection(owner, {...createCollectionData, flags: 192}).call({from: owner})).to.be.rejectedWith(/internal flags were used/);
      }
    });

    itEth('NFT: use enum for flags', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      {
        const {collectionId} = await helper.eth.createCollection(owner, {...createCollectionData, flags: [CollectionFlag.Erc721metadata]}).send();
        expect((await helper.nft.getData(collectionId))?.raw.flags).to.be.deep.equal({foreign: false, erc721metadata: true});
      }
    });

    itEth('NFT: foreign flag enum is ignored', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      {
        await expect(helper.eth.createCollection(owner, {...createCollectionData, flags: [CollectionFlag.Foreign]}).call({from: owner})).to.be.rejectedWith(/internal flags were used/);
      }

      {
        await expect(helper.eth.createCollection(owner, {...createCollectionData, flags: [CollectionFlag.Erc721metadata | CollectionFlag.Foreign]}).call({from: owner})).to.be.rejectedWith(/internal flags were used/);
      }
    });
  });
});
