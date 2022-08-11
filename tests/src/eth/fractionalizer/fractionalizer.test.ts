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


import Web3 from 'web3';
import {ApiPromise} from '@polkadot/api';
import {evmToAddress} from '@polkadot/util-crypto';
import {readFile} from 'fs/promises';
import fractionalizerAbi from './FractionalizerAbi.json';
import {submitTransactionAsync} from '../../substrate/substrate-api';
import {UNIQUE} from '../../util/helpers';
import {collectionIdToAddress, createEthAccountWithBalance, createNonfungibleCollection, createRefungibleCollection, GAS_ARGS, itWeb3, tokenIdFromAddress, uniqueNFT, uniqueRefungible, uniqueRefungibleToken} from '../util/helpers';
import {Contract} from 'web3-eth-contract';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiLike from 'chai-like';
import {IKeyringPair} from '@polkadot/types/types';
chai.use(chaiAsPromised);
chai.use(chaiLike);
const expect = chai.expect;

async function deployFractionalizer(api: ApiPromise, web3: Web3, owner: string) {
  const fractionalizerContract = new web3.eth.Contract(fractionalizerAbi as any, undefined, {
    from: owner,
    ...GAS_ARGS,
  });
  return await fractionalizerContract.deploy({data: (await readFile(`${__dirname}/Fractionalizer.bin`)).toString()}).send({from: owner});
}

async function initFractionalizer(api: ApiPromise, web3: Web3, privateKeyWrapper: (account: string) => IKeyringPair, owner: string) {
  const fractionalizer = await deployFractionalizer(api, web3, owner);
  const tx = api.tx.balances.transfer(evmToAddress(fractionalizer.options.address), 10n * UNIQUE);
  const alice = privateKeyWrapper('//Alice');
  await submitTransactionAsync(alice, tx);
  const result = await fractionalizer.methods.mintRFTCollection('A', 'B', 'C').send();
  const rftCollectionAddress = result.events.RFTCollectionSet.returnValues._collection;
  return {fractionalizer, rftCollectionAddress};
}

async function createRFTToken(api: ApiPromise, web3: Web3, owner: string, fractionalizer: Contract, amount: bigint) {
  const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
  const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
  const nftTokenId = await nftContract.methods.nextTokenId().call();
  await nftContract.methods.mint(owner, nftTokenId).send();

  await fractionalizer.methods.setAllowlist(nftCollectionAddress, true).send();
  await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
  const result = await fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, amount).send();
  const {_collection, _tokenId, _rftToken} = result.events.Fractionalized.returnValues;
  return {
    nftCollectionAddress: _collection,
    nftTokenId: _tokenId,
    rftTokenAddress: _rftToken,
  };
}

describe('Fractionalizer contract usage', () => {
  itWeb3('Set RFT collection', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const fractionalizer = await deployFractionalizer(api, web3, owner);
    const {collectionIdAddress} = await createRefungibleCollection(api, web3, owner);
    const refungibleContract = uniqueRefungible(web3, collectionIdAddress, owner);
    await refungibleContract.methods.addCollectionAdmin(fractionalizer.options.address).send();
    const result = await fractionalizer.methods.setRFTCollection(collectionIdAddress).send();
    expect(result.events).to.be.like({
      RFTCollectionSet: {
        returnValues: {
          _collection: collectionIdAddress,
        },
      },
    });
  });

  itWeb3('Mint RFT collection', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const fractionalizer = await deployFractionalizer(api, web3, owner);
    const tx = api.tx.balances.transfer(evmToAddress(fractionalizer.options.address), 10n * UNIQUE);
    await submitTransactionAsync(alice, tx);

    const result = await fractionalizer.methods.mintRFTCollection('A', 'B', 'C').send({from: owner});
    expect(result.events).to.be.like({
      RFTCollectionSet: {},
    });
    expect(result.events.RFTCollectionSet.returnValues._collection).to.be.ok;
  });

  itWeb3('Set Allowlist', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);    

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const result1 = await fractionalizer.methods.setAllowlist(nftCollectionAddress, true).send({from: owner});
    expect(result1.events).to.be.like({
      AllowListSet: {
        returnValues: {
          _collection: nftCollectionAddress,
          _status: true,
        },
      },
    });
    const result2 = await fractionalizer.methods.setAllowlist(nftCollectionAddress, false).send({from: owner});
    expect(result2.events).to.be.like({
      AllowListSet: {
        returnValues: {
          _collection: nftCollectionAddress,
          _status: false,
        },
      },
    });
  });

  itWeb3('NFT to RFT', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();

    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);

    await fractionalizer.methods.setAllowlist(nftCollectionAddress, true).send();
    await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
    const result = await fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).send();
    expect(result.events).to.be.like({
      Fractionalized: {
        returnValues: {
          _collection: nftCollectionAddress,
          _tokenId: nftTokenId,
          _amount: '100',
        },
      },
    });
    const rftTokenAddress = result.events.Fractionalized.returnValues._rftToken;
    const rftTokenContract = uniqueRefungibleToken(web3, rftTokenAddress, owner);
    expect(await rftTokenContract.methods.balanceOf(owner).call()).to.equal('100');
  });

  itWeb3('RFT to NFT', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {fractionalizer, rftCollectionAddress} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    const {rftTokenAddress, nftCollectionAddress, nftTokenId} = await createRFTToken(api, web3, owner, fractionalizer, 100n);

    const {collectionId, tokenId} = tokenIdFromAddress(rftTokenAddress);
    const refungibleAddress = collectionIdToAddress(collectionId);
    expect(rftCollectionAddress).to.be.equal(refungibleAddress);
    const refungibleTokenContract = uniqueRefungibleToken(web3, rftTokenAddress, owner);
    await refungibleTokenContract.methods.approve(fractionalizer.options.address, 100).send();
    const result = await fractionalizer.methods.rft2nft(refungibleAddress, tokenId).send();
    expect(result.events).to.be.like({
      DeFractionalized: {
        returnValues: {
          _rftToken: rftTokenAddress,
          _nftCollection: nftCollectionAddress,
          _nftTokenId: nftTokenId,
        },
      },
    });
  });
});