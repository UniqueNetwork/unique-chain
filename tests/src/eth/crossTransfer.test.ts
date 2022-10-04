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

import {itEth, usingEthPlaygrounds} from './util/playgrounds';
import {CrossAccountId} from '../util/playgrounds/unique';
import {IKeyringPair} from '@polkadot/types/types';

describe('Token transfer between substrate address and EVM address. Fungible', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });
  
  itEth('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async ({helper}) => {  
    const bobCA = CrossAccountId.fromKeyring(bob);
    const charlieCA = CrossAccountId.fromKeyring(charlie);

    const collection = await helper.ft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});

    await collection.mint(alice, 200n);
    await collection.transfer(alice, charlieCA.toEthereum(), 200n);
    await collection.transferFrom(alice, charlieCA.toEthereum(), charlieCA, 50n);
    await collection.transfer(charlie, bobCA, 50n);
  });

  itEth('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({helper}) => {
    const aliceProxy = await helper.eth.createAccountWithBalance(donor);
    const bobProxy = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.ft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'ft', aliceProxy);

    await collection.mint(alice, 200n, {Ethereum: aliceProxy});
    await contract.methods.transfer(bobProxy, 50).send({from: aliceProxy});
    await collection.transferFrom(alice, {Ethereum: bobProxy}, CrossAccountId.fromKeyring(bob), 50n);
    await collection.transfer(bob, CrossAccountId.fromKeyring(alice), 50n);
  });
});

describe('Token transfer between substrate address and EVM address. NFT', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = privateKey('//Alice');
      [alice, bob, charlie] = await helper.arrange.createAccounts([10n, 10n, 10n], donor);
    });
  });
  
  itEth('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async ({helper}) => {
    const charlieEth = CrossAccountId.fromKeyring(charlie, 'Ethereum');
    
    const collection = await helper.nft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});
    const token = await collection.mintToken(alice);
    await token.transfer(alice, charlieEth);
    await token.transferFrom(alice, charlieEth, CrossAccountId.fromKeyring(charlie));
    await token.transfer(charlie, CrossAccountId.fromKeyring(bob));
  });

  itEth('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({helper}) => {
    const aliceProxy = await helper.eth.createAccountWithBalance(donor);
    const bobProxy = await helper.eth.createAccountWithBalance(donor);

    const collection = await helper.nft.mintCollection(alice);
    await collection.setLimits(alice, {ownerCanTransfer: true});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', aliceProxy);

    const token = await collection.mintToken(alice);
    await token.transfer(alice, {Ethereum: aliceProxy});
    await contract.methods.transfer(bobProxy, 1).send({from: aliceProxy});
    await token.transferFrom(alice, {Ethereum: bobProxy}, {Substrate: bob.address});
    await token.transfer(bob, {Substrate: charlie.address});
  });
});
