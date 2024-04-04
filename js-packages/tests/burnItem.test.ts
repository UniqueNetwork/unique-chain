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
import {expect, itSub, usingPlaygrounds} from '@unique/test-utils/util.js';


describe('integration test: ext. burnItem():', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice] = await helper.arrange.createAccounts([100n], donor);
    });
  });

  itSub('Burn item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await token.burn(alice);
    expect(await token.doesExist()).to.be.false;
  });

  itSub('Burn item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 10);
    await collection.mint(alice, 10n);

    await collection.burnTokens(alice, 1n);
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(9n);
  });
});

describe('integration test: ext. burnItem() with admin permissions:', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Burn item in NFT collection', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    const token = await collection.mintToken(alice);

    await token.burnFrom(bob, {Substrate: alice.address});
    expect(await token.doesExist()).to.be.false;
  });

  itSub('Burn item in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 0);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    await collection.addAdmin(alice, {Substrate: bob.address});
    await collection.mint(alice, 10n);

    await collection.burnTokensFrom(bob, {Substrate: alice.address}, 1n);
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(9n);
  });
});

describe('Negative integration test: ext. burnItem():', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);
    });
  });

  itSub('Burn a token that was never created', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    await expect(collection.burnToken(alice, 10)).to.be.rejectedWith('common.TokenNotFound');
  });

  itSub('Burn a token using the address that does not own it', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);

    await expect(token.burn(bob)).to.be.rejectedWith('common.NoPermission');
  });

  itSub('Transfer a burned token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice);
    const token = await collection.mintToken(alice);
    await token.burn(alice);

    await expect(token.transfer(alice, {Substrate: bob.address})).to.be.rejectedWith('common.TokenNotFound');
  });

  itSub('Burn more than owned in Fungible collection', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {}, 0);
    await collection.mint(alice, 10n);

    await expect(collection.burnTokens(alice, 11n)).to.be.rejectedWith('common.TokenValueTooLow');
    expect(await collection.getBalance({Substrate: alice.address})).to.eq(10n);
  });

  itSub('Zero burn NFT', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Coll', description: 'Desc', tokenPrefix: 'T'});
    const tokenAlice = await collection.mintToken(alice, {Substrate: alice.address});
    const tokenBob = await collection.mintToken(alice, {Substrate: bob.address});

    // 1. Zero burn of own tokens allowed:
    await helper.executeExtrinsic(alice, 'api.tx.unique.burnItem', [collection.collectionId, tokenAlice.tokenId, 0]);
    // 2. Zero burn of non-owned tokens not allowed:
    await expect(helper.executeExtrinsic(alice, 'api.tx.unique.burnItem', [collection.collectionId, tokenBob.tokenId, 0])).to.be.rejectedWith('common.NoPermission');
    // 3. Zero burn of non-existing tokens not allowed:
    await expect(helper.executeExtrinsic(alice, 'api.tx.unique.burnItem', [collection.collectionId, 9999, 0])).to.be.rejectedWith('common.TokenNotFound');
    expect(await tokenAlice.doesExist()).to.be.true;
    expect(await tokenAlice.getOwner()).to.deep.eq({Substrate: alice.address});
    expect(await tokenBob.getOwner()).to.deep.eq({Substrate: bob.address});
    // 4. Storage is not corrupted:
    await tokenAlice.transfer(alice, {Substrate: bob.address});
    await tokenBob.transfer(bob, {Substrate: alice.address});
    expect(await tokenAlice.getOwner()).to.deep.eq({Substrate: bob.address});
    expect(await tokenBob.getOwner()).to.deep.eq({Substrate: alice.address});
  });

  itSub('zero burnFrom NFT', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Zero', description: 'Zero transfer', tokenPrefix: 'TF'});
    const notApprovedNft = await collection.mintToken(alice, {Substrate: bob.address});
    const approvedNft = await collection.mintToken(alice, {Substrate: bob.address});
    await approvedNft.approve(bob, {Substrate: alice.address});

    // 1. Zero burnFrom of non-existing tokens not allowed:
    await expect(helper.executeExtrinsic(alice, 'api.tx.unique.burnFrom', [collection.collectionId, {Substrate: bob.address}, 9999, 0])).to.be.rejectedWith('common.ApprovedValueTooLow');
    // 2. Zero burnFrom of not approved tokens not allowed:
    await expect(helper.executeExtrinsic(alice, 'api.tx.unique.burnFrom', [collection.collectionId, {Substrate: bob.address}, notApprovedNft.tokenId, 0])).to.be.rejectedWith('common.ApprovedValueTooLow');
    // 3. Zero burnFrom of approved tokens allowed:
    await helper.executeExtrinsic(alice, 'api.tx.unique.burnFrom', [collection.collectionId, {Substrate: bob.address}, approvedNft.tokenId, 0]);

    // 4.1 approvedNft still approved:
    expect(await approvedNft.isApproved({Substrate: alice.address})).to.be.true;
    // 4.2 bob is still the owner:
    expect(await approvedNft.getOwner()).to.deep.eq({Substrate: bob.address});
    expect(await notApprovedNft.getOwner()).to.deep.eq({Substrate: bob.address});
    // 4.3 Alice can burn approved nft:
    await approvedNft.burnFrom(alice, {Substrate: bob.address});
    expect(await approvedNft.doesExist()).to.be.false;
  });
});
