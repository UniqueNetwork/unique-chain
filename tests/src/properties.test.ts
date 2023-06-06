import {IKeyringPair} from '@polkadot/types/types';
import {itSub, usingPlaygrounds} from './util';
import {expect} from 'chai';

describe('Negative change properties:', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({url: import.meta.url});
      [alice, bob, charlie] = await helper.arrange.createAccounts([100n, 100n, 100n], donor);
    });
  });

  itSub('No editing rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: false, collectionAdmin: false, tokenOwner: false}}],
    });
    const token = await collection.mintToken(alice, {Substrate: bob.address});
    const setPropTx = () => token.setProperties(alice, [{key: 'k', value: 'v'}]);
    await expect(setPropTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('User does`t have access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
    });
    const token = await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    const setPropTx = () => token.setProperties(charlie, [{key: 'k', value: 'v'}]);
    await expect(setPropTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Admin does`t have access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
    });
    const token = await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    const setPropTx = () => token.setProperties(alice, [{key: 'k', value: 'v'}]);
    await expect(setPropTx()).to.be.rejectedWith(/common\.NoPermission/);
  });

  itSub('Token owner does`t have access rights', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'col', description: 'descr', tokenPrefix: 'COL',
      tokenPropertyPermissions: [{key: 'k', permission: {mutable: true, collectionAdmin: false, tokenOwner: false}}],
    });
    const token = await collection.mintToken(alice, {Substrate: bob.address}, [{key: 'k', value: 'v'}]);
    const setPropTx = () => token.setProperties(bob, [{key: 'k', value: 'v'}]);
    await expect(setPropTx()).to.be.rejectedWith(/common\.NoPermission/);
  });
});