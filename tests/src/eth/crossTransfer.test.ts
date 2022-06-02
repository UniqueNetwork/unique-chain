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

import {createCollectionExpectSuccess,
  createFungibleItemExpectSuccess,
  transferExpectSuccess,
  transferFromExpectSuccess,
  createItemExpectSuccess} from '../util/helpers';
import {collectionIdToAddress,
  createEthAccountWithBalance,
  subToEth,
  GAS_ARGS, itWeb3} from './util/helpers';
import fungibleAbi from './fungibleAbi.json';
import nonFungibleAbi from './nonFungibleAbi.json';

describe('Token transfer between substrate address and EVM address. Fungible', () => {
  itWeb3('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async ({privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper!('//Alice');
    const bob = privateKeyWrapper!('//Bob');
    const charlie = privateKeyWrapper!('//Charlie');
    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Substrate: alice.address});
    await transferExpectSuccess(collection, 0, alice, {Ethereum: subToEth(charlie.address)} , 200, 'Fungible');
    await transferFromExpectSuccess(collection, 0, alice, {Ethereum: subToEth(charlie.address)}, charlie, 50, 'Fungible');
    await transferExpectSuccess(collection, 0, charlie, bob, 50, 'Fungible');
  });

  itWeb3('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKeyWrapper!('//Alice');
    const bob = privateKeyWrapper!('//Bob');
    const bobProxy = await createEthAccountWithBalance(api, web3);
    const aliceProxy = await createEthAccountWithBalance(api, web3);

    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, alice.address);
    await transferExpectSuccess(collection, 0, alice, {Ethereum: aliceProxy} , 200, 'Fungible');
    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleAbi as any, address, {from: aliceProxy, ...GAS_ARGS});

    await contract.methods.transfer(bobProxy, 50).send({from: aliceProxy});
    await transferFromExpectSuccess(collection, 0, alice, {Ethereum: bobProxy}, bob, 50, 'Fungible');
    await transferExpectSuccess(collection, 0, bob, alice, 50, 'Fungible');
  });
});

describe('Token transfer between substrate address and EVM address. NFT', () => {
  itWeb3('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async ({privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper!('//Alice');
    const bob = privateKeyWrapper!('//Bob');
    const charlie = privateKeyWrapper!('//Charlie');
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});
    await transferExpectSuccess(collection, tokenId, alice, {Ethereum: subToEth(charlie.address)}, 1, 'NFT');
    await transferFromExpectSuccess(collection, tokenId, alice, {Ethereum: subToEth(charlie.address)}, charlie, 1, 'NFT');
    await transferExpectSuccess(collection, tokenId, charlie, bob, 1, 'NFT');
  });

  itWeb3('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({api, web3, privateKeyWrapper}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const alice = privateKeyWrapper!('//Alice');
    const bob = privateKeyWrapper!('//Bob');
    const charlie = privateKeyWrapper!('//Charlie');
    const bobProxy = await createEthAccountWithBalance(api, web3);
    const aliceProxy = await createEthAccountWithBalance(api, web3);
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});
    await transferExpectSuccess(collection, tokenId, alice, {Ethereum: aliceProxy} , 1, 'NFT');
    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: aliceProxy, ...GAS_ARGS});
    await contract.methods.transfer(bobProxy, 1).send({from: aliceProxy});
    await transferFromExpectSuccess(collection, tokenId, alice, {Ethereum: bobProxy}, bob, 1, 'NFT');
    await transferExpectSuccess(collection, tokenId, bob, charlie, 1, 'NFT');
  });
});
