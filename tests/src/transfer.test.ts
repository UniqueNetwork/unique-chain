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
import {itEth, usingEthPlaygrounds} from './eth/util/playgrounds';
import {itSub, Pallets, usingPlaygrounds, expect} from './util/playgrounds';

describe('Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });
  
  itSub('Balance transfers and check balance', async ({helper}) => {
    const alicesBalanceBefore = await helper.balance.getSubstrate(alice.address);
    const bobsBalanceBefore = await helper.balance.getSubstrate(bob.address);

    expect(await helper.balance.transferToSubstrate(alice, bob.address, 1n)).to.be.true;

    const alicesBalanceAfter = await helper.balance.getSubstrate(alice.address);
    const bobsBalanceAfter = await helper.balance.getSubstrate(bob.address);

    expect(alicesBalanceAfter < alicesBalanceBefore).to.be.true;
    expect(bobsBalanceAfter > bobsBalanceBefore).to.be.true;
  });

  itSub('Inability to pay fees error message is correct', async ({helper, privateKey}) => {
    const donor = privateKey('//Alice');
    const [zero] = await helper.arrange.createAccounts([0n], donor);

    // console.error = () => {};
    // The following operation throws an error into the console and the logs. Pay it no heed as long as the test succeeds.
    await expect(helper.balance.transferToSubstrate(zero, donor.address, 1n))
      .to.be.rejectedWith('Inability to pay some fees , e.g. account balance too low');
  });

  itSub('[nft] User can transfer owned token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-1-NFT', description: '', tokenPrefix: 'T'});
    const nft = await collection.mintToken(alice, {Substrate: alice.address});

    await nft.transfer(alice, {Substrate: bob.address});
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: bob.address});
  });

  itSub('[fungible] User can transfer owned token', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-1-FT', description: '', tokenPrefix: 'T'});
    await collection.mint(alice, {Substrate: alice.address}, 10n);

    await collection.transfer(alice, {Substrate: bob.address}, 9n);
    expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(9n);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });

  itSub.ifWithPallets('[refungible] User can transfer owned token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-1-RFT', description: '', tokenPrefix: 'T'});
    const rft = await collection.mintToken(alice, {Substrate: alice.address}, 10n);

    await rft.transfer(alice, {Substrate: bob.address}, 9n);
    expect(await rft.getBalance({Substrate: bob.address})).to.be.equal(9n);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });

  itSub('[nft] Collection admin can transfer owned token', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-2-NFT', description: '', tokenPrefix: 'T'});
    await collection.addAdmin(alice, {Substrate: bob.address});

    const nft = await collection.mintToken(bob, {Substrate: bob.address});
    await nft.transfer(bob, {Substrate: alice.address});

    expect(await nft.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('[fungible] Collection admin can transfer owned token', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-2-FT', description: '', tokenPrefix: 'T'});
    await collection.addAdmin(alice, {Substrate: bob.address});

    await collection.mint(bob, {Substrate: bob.address}, 10n);
    await collection.transfer(bob, {Substrate: alice.address}, 1n);

    expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(9n);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });

  itSub.ifWithPallets('[refungible] Collection admin can transfer owned token', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-2-RFT', description: '', tokenPrefix: 'T'});
    await collection.addAdmin(alice, {Substrate: bob.address});

    const rft = await collection.mintToken(bob, {Substrate: bob.address}, 10n);
    await rft.transfer(bob, {Substrate: alice.address}, 1n);

    expect(await rft.getBalance({Substrate: bob.address})).to.be.equal(9n);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.equal(1n);
  });
});

describe('Negative Integration Test Transfer(recipient, collection_id, item_id, value)', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice, bob] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('[nft] Transfer with not existed collection_id', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.nft.transferToken(alice, collectionId, 1, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('[fungible] Transfer with not existed collection_id', async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.ft.transfer(alice, collectionId, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub.ifWithPallets('[refungible] Transfer with not existed collection_id', [Pallets.ReFungible], async ({helper}) => {
    const collectionId = (1 << 32) - 1;
    await expect(helper.rft.transferToken(alice, collectionId, 1, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('[nft] Transfer with deleted collection_id', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-Neg-1-NFT', description: '', tokenPrefix: 'T'});
    const nft = await collection.mintToken(alice, {Substrate: alice.address});

    await nft.burn(alice);
    await collection.burn(alice);

    await expect(nft.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('[fungible] Transfer with deleted collection_id', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-Neg-1-FT', description: '', tokenPrefix: 'T'});
    await collection.mint(alice, {Substrate: alice.address}, 10n);

    await collection.burnTokens(alice, 10n);
    await collection.burn(alice);

    await expect(collection.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });
  
  itSub.ifWithPallets('[refungible] Transfer with deleted collection_id', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-Neg-1-RFT', description: '', tokenPrefix: 'T'});
    const rft = await collection.mintToken(alice, {Substrate: alice.address}, 10n);

    await rft.burn(alice, 10n);
    await collection.burn(alice);

    await expect(rft.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.CollectionNotFound/);
  });

  itSub('[nft] Transfer with not existed item_id', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-Neg-2-NFT', description: '', tokenPrefix: 'T'});
    await expect(collection.transferToken(alice, 1, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenNotFound/);
  });

  itSub('[fungible] Transfer with not existed item_id', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-Neg-2-FT', description: '', tokenPrefix: 'T'});
    await expect(collection.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub.ifWithPallets('[refungible] Transfer with not existed item_id', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-Neg-2-RFT', description: '', tokenPrefix: 'T'});
    await expect(collection.transferToken(alice, 1, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('[nft] Transfer with deleted item_id', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-Neg-3-NFT', description: '', tokenPrefix: 'T'});
    const nft = await collection.mintToken(alice, {Substrate: alice.address});

    await nft.burn(alice);

    await expect(nft.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenNotFound/);
  });

  itSub('[fungible] Transfer with deleted item_id', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-Neg-3-FT', description: '', tokenPrefix: 'T'});
    await collection.mint(alice, {Substrate: alice.address}, 10n);

    await collection.burnTokens(alice, 10n);

    await expect(collection.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub.ifWithPallets('[refungible] Transfer with deleted item_id', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-Neg-3-RFT', description: '', tokenPrefix: 'T'});
    const rft = await collection.mintToken(alice, {Substrate: alice.address}, 10n);

    await rft.burn(alice, 10n);

    await expect(rft.transfer(alice, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
  });

  itSub('[nft] Transfer with recipient that is not owner', async ({helper}) => {
    const collection = await helper.nft.mintCollection(alice, {name: 'Transfer-Neg-4-NFT', description: '', tokenPrefix: 'T'});
    const nft = await collection.mintToken(alice, {Substrate: alice.address});

    await expect(nft.transfer(bob, {Substrate: bob.address}))
      .to.be.rejectedWith(/common\.NoPermission/);
    expect(await nft.getOwner()).to.be.deep.equal({Substrate: alice.address});
  });

  itSub('[fungible] Transfer with recipient that is not owner', async ({helper}) => {
    const collection = await helper.ft.mintCollection(alice, {name: 'Transfer-Neg-4-FT', description: '', tokenPrefix: 'T'});
    await collection.mint(alice, {Substrate: alice.address}, 10n);

    await expect(collection.transfer(bob, {Substrate: bob.address}, 9n))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
    expect(await collection.getBalance({Substrate: bob.address})).to.be.equal(0n);
    expect(await collection.getBalance({Substrate: alice.address})).to.be.equal(10n);
  });

  itSub.ifWithPallets('[refungible] Transfer with recipient that is not owner', [Pallets.ReFungible], async ({helper}) => {
    const collection = await helper.rft.mintCollection(alice, {name: 'Transfer-1-RFT', description: '', tokenPrefix: 'T'});
    const rft = await collection.mintToken(alice, {Substrate: alice.address}, 10n);

    await expect(rft.transfer(bob, {Substrate: bob.address}, 9n))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
    expect(await rft.getBalance({Substrate: bob.address})).to.be.equal(0n);
    expect(await rft.getBalance({Substrate: alice.address})).to.be.equal(10n);
  });
});

describe('Transfers to self (potentially over substrate-evm boundary)', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = privateKey('//Alice');
    });
  });
  
  itEth('Transfers to self. In case of same frontend', async ({helper}) => {
    const [owner] = await helper.arrange.createAccounts([10n], donor);
    const collection = await helper.ft.mintCollection(owner, {});
    await collection.mint(owner, {Substrate: owner.address}, 100n);

    const ownerProxy = helper.address.substrateToEth(owner.address);

    // transfer to own proxy
    await collection.transfer(owner, {Ethereum: ownerProxy}, 10n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(90n);
    expect(await collection.getBalance({Ethereum: ownerProxy})).to.be.equal(10n);

    // transfer-from own proxy to own proxy again
    await collection.transferFrom(owner, {Ethereum: ownerProxy}, {Ethereum: ownerProxy}, 5n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(90n);
    expect(await collection.getBalance({Ethereum: ownerProxy})).to.be.equal(10n);
  });

  itEth('Transfers to self. In case of substrate-evm boundary', async ({helper}) => {
    const [owner] = await helper.arrange.createAccounts([10n], donor);
    const collection = await helper.ft.mintCollection(owner, {});
    await collection.mint(owner, {Substrate: owner.address}, 100n);

    const ownerProxy = helper.address.substrateToEth(owner.address);

    // transfer to own proxy
    await collection.transfer(owner, {Ethereum: ownerProxy}, 10n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(90n);
    expect(await collection.getBalance({Ethereum: ownerProxy})).to.be.equal(10n);

    // transfer-from own proxy to self
    await collection.transferFrom(owner, {Ethereum: ownerProxy}, {Substrate: owner.address}, 5n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(95n);
    expect(await collection.getBalance({Ethereum: ownerProxy})).to.be.equal(5n);
  });

  itEth('Transfers to self. In case of inside substrate-evm', async ({helper}) => {
    const [owner] = await helper.arrange.createAccounts([10n], donor);
    const collection = await helper.ft.mintCollection(owner, {});
    await collection.mint(owner, {Substrate: owner.address}, 100n);

    // transfer to self again
    await collection.transfer(owner, {Substrate: owner.address}, 10n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(100n);

    // transfer-from self to self again
    await collection.transferFrom(owner, {Substrate: owner.address}, {Substrate: owner.address}, 5n);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(100n);
  });

  itEth('Transfers to self. In case of inside substrate-evm when not enought "Fungibles"', async ({helper}) => {
    const [owner] = await helper.arrange.createAccounts([10n], donor);
    const collection = await helper.ft.mintCollection(owner, {});
    await collection.mint(owner, {Substrate: owner.address}, 10n);

    // transfer to self again
    await expect(collection.transfer(owner, {Substrate: owner.address}, 11n))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);

    // transfer-from self to self again
    await expect(collection.transferFrom(owner, {Substrate: owner.address}, {Substrate: owner.address}, 12n))
      .to.be.rejectedWith(/common\.TokenValueTooLow/);
    expect(await collection.getBalance({Substrate: owner.address})).to.be.equal(10n);
  });
});
