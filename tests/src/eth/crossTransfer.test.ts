//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
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
  itWeb3('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async () => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    await createFungibleItemExpectSuccess(alice, collection, {Value: 200n}, {Substrate: alice.address});
    await transferExpectSuccess(collection, 0, alice, {Ethereum: subToEth(charlie.address)} , 200, 'Fungible');
    await transferFromExpectSuccess(collection, 0, alice, {Ethereum: subToEth(charlie.address)}, charlie, 50, 'Fungible');
    await transferExpectSuccess(collection, 0, charlie, bob, 50, 'Fungible');
  });

  itWeb3('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'Fungible', decimalPoints: 0},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
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
  itWeb3('The private key X create a substrate address. Alice sends a token to the corresponding EVM address, and X can send it to Bob in the substrate', async () => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
    const tokenId = await createItemExpectSuccess(alice, collection, 'NFT', {Substrate: alice.address});
    await transferExpectSuccess(collection, tokenId, alice, {Ethereum: subToEth(charlie.address)}, 1, 'NFT');
    await transferFromExpectSuccess(collection, tokenId, alice, {Ethereum: subToEth(charlie.address)}, charlie, 1, 'NFT');
    await transferExpectSuccess(collection, tokenId, charlie, bob, 1, 'NFT');
  });

  itWeb3('The private key X create a EVM address. Alice sends a token to the substrate address corresponding to this EVM address, and X can send it to Bob in the EVM', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const alice = privateKey('//Alice');
    const bob = privateKey('//Bob');
    const charlie = privateKey('//Charlie');
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
