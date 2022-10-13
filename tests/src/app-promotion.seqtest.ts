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

import {IKeyringPair} from '@polkadot/types/types';
import {itSub, usingPlaygrounds, Pallets, requirePalletsOrSkip} from './util';
import {expect} from './eth/util';

let superuser: IKeyringPair;
let donor: IKeyringPair;
let palletAdmin: IKeyringPair;

describe('App promotion', () => {
  before(async function () {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.AppPromotion]);
      superuser = await privateKey('//Alice');
      donor = await privateKey({filename: __filename});
      palletAdmin = await privateKey('//PromotionAdmin');
      const api = helper.getApi();
      await helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: palletAdmin.address})));
    });
  });

  after(async function () {
    await usingPlaygrounds(async (helper) => {
      if (helper.fetchMissingPalletNames([Pallets.AppPromotion]).length != 0) return;
      const api = helper.getApi();
      await helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: palletAdmin.address})));
    });
  });

  describe('admin adress', () => {
    itSub('can be set by sudo only', async ({helper}) => {
      const api = helper.getApi();
      const [nonAdmin] = await helper.arrange.createAccounts([10n], donor);
      // nonAdmin can not set admin not from himself nor as a sudo
      await expect(helper.signTransaction(nonAdmin, api.tx.appPromotion.setAdminAddress({Substrate: nonAdmin.address}))).to.be.rejected;
      await expect(helper.signTransaction(nonAdmin, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: nonAdmin.address})))).to.be.rejected;
    });
    
    itSub('can be any valid CrossAccountId', async ({helper}) => {
      // We are not going to set an eth address as a sponsor,
      // but we do want to check, it doesn't break anything;
      const api = helper.getApi();
      const [account] = await helper.arrange.createAccounts([10n], donor);
      const ethAccount = helper.address.substrateToEth(account.address); 
      // Alice sets Ethereum address as a sudo. Then Substrate address back...
      await expect(helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Ethereum: ethAccount})))).to.be.fulfilled;
      await expect(helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: palletAdmin.address})))).to.be.fulfilled;
        
      // ...It doesn't break anything;
      const collection = await helper.nft.mintCollection(account, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
      await expect(helper.signTransaction(account, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.rejected;
    });
  
    itSub('can be reassigned', async ({helper}) => {
      const api = helper.getApi();
      const [oldAdmin, newAdmin, collectionOwner] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
      const collection  = await helper.nft.mintCollection(collectionOwner, {name: 'New', description: 'New Collection', tokenPrefix: 'Promotion'});
        
      await expect(helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: oldAdmin.address})))).to.be.fulfilled;
      await expect(helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: newAdmin.address})))).to.be.fulfilled;
      await expect(helper.signTransaction(oldAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.rejected;
        
      await expect(helper.signTransaction(newAdmin, api.tx.appPromotion.sponsorCollection(collection.collectionId))).to.be.fulfilled;
    });
  });
});

