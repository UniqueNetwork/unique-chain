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
import {executeTransaction, submitTransactionAsync} from '../../substrate/substrate-api';
import {getCreateCollectionResult, getCreateItemResult, UNIQUE, requirePallets, Pallets} from '../../util/helpers';
import {collectionIdToAddress, CompiledContract, createEthAccountWithBalance, createNonfungibleCollection, createRefungibleCollection, GAS_ARGS, itWeb3, tokenIdFromAddress, uniqueNFT, uniqueRefungible, uniqueRefungibleToken} from '../util/helpers';
import {Contract} from 'web3-eth-contract';
import * as solc from 'solc';

import chai from 'chai';
import chaiLike from 'chai-like';
import {IKeyringPair} from '@polkadot/types/types';
chai.use(chaiLike);
const expect = chai.expect;
let fractionalizer: CompiledContract;

async function compileFractionalizer() {
  if (!fractionalizer) {
    const input = {
      language: 'Solidity',
      sources: {
        ['Fractionalizer.sol']: {
          content: (await readFile(`${__dirname}/Fractionalizer.sol`)).toString(),
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*'],
          },
        },
      },
    };
    const json = JSON.parse(solc.compile(JSON.stringify(input), {import: await findImports()}));
    const out = json.contracts['Fractionalizer.sol']['Fractionalizer'];

    fractionalizer = {
      abi: out.abi,
      object: '0x' + out.evm.bytecode.object,
    };
  }
  return fractionalizer;
}

async function findImports() {
  const collectionHelpers = (await readFile(`${__dirname}/../api/CollectionHelpers.sol`)).toString();
  const contractHelpers = (await readFile(`${__dirname}/../api/ContractHelpers.sol`)).toString();
  const uniqueRefungibleToken = (await readFile(`${__dirname}/../api/UniqueRefungibleToken.sol`)).toString();
  const uniqueRefungible = (await readFile(`${__dirname}/../api/UniqueRefungible.sol`)).toString();
  const uniqueNFT = (await readFile(`${__dirname}/../api/UniqueNFT.sol`)).toString();

  return function(path: string) {
    switch (path) {
      case 'api/CollectionHelpers.sol': return {contents: `${collectionHelpers}`};
      case 'api/ContractHelpers.sol': return {contents: `${contractHelpers}`};
      case 'api/UniqueRefungibleToken.sol': return {contents: `${uniqueRefungibleToken}`};
      case 'api/UniqueRefungible.sol': return {contents: `${uniqueRefungible}`};
      case 'api/UniqueNFT.sol': return {contents: `${uniqueNFT}`};
      default: return {error: 'File not found'};
    }
  };
}

async function deployFractionalizer(web3: Web3, owner: string) {
  const compiled = await compileFractionalizer();
  const fractionalizerContract = new web3.eth.Contract(compiled.abi, undefined, {
    data: compiled.object,
    from: owner,
    ...GAS_ARGS,
  });
  return await fractionalizerContract.deploy({data: compiled.object}).send({from: owner});
}

async function initFractionalizer(api: ApiPromise, web3: Web3, privateKeyWrapper: (account: string) => IKeyringPair, owner: string) {
  const fractionalizer = await deployFractionalizer(web3, owner);
  const amount = 10n * UNIQUE;
  await web3.eth.sendTransaction({from: owner, to: fractionalizer.options.address, value: `${amount}`, ...GAS_ARGS});
  const result = await fractionalizer.methods.createAndSetRFTCollection('A', 'B', 'C').send();
  const rftCollectionAddress = result.events.RFTCollectionSet.returnValues._collection;
  return {fractionalizer, rftCollectionAddress};
}

async function createRFTToken(api: ApiPromise, web3: Web3, owner: string, fractionalizer: Contract, amount: bigint) {
  const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
  const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
  const nftTokenId = await nftContract.methods.nextTokenId().call();
  await nftContract.methods.mint(owner, nftTokenId).send();

  await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();
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
  before(async function() {
    await requirePallets(this, [Pallets.ReFungible]);
  });

  itWeb3('Set RFT collection', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const fractionalizer = await deployFractionalizer(web3, owner);
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
    const fractionalizer = await deployFractionalizer(web3, owner);
    const tx = api.tx.balances.transfer(evmToAddress(fractionalizer.options.address), 10n * UNIQUE);
    await submitTransactionAsync(alice, tx);

    const result = await fractionalizer.methods.createAndSetRFTCollection('A', 'B', 'C').send({from: owner});
    expect(result.events).to.be.like({
      RFTCollectionSet: {},
    });
    expect(result.events.RFTCollectionSet.returnValues._collection).to.be.ok;
  });

  itWeb3('Set Allowlist', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const result1 = await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send({from: owner});
    expect(result1.events).to.be.like({
      AllowListSet: {
        returnValues: {
          _collection: nftCollectionAddress,
          _status: true,
        },
      },
    });
    const result2 = await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, false).send({from: owner});
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

    await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();
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
      Defractionalized: {
        returnValues: {
          _rftToken: rftTokenAddress,
          _nftCollection: nftCollectionAddress,
          _nftTokenId: nftTokenId,
        },
      },
    });
  });
});



describe('Negative Integration Tests for fractionalizer', () => {
  before(async function() {
    await requirePallets(this, [Pallets.ReFungible]);
  });

  itWeb3('call setRFTCollection twice', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {collectionIdAddress} = await createRefungibleCollection(api, web3, owner);
    const refungibleContract = uniqueRefungible(web3, collectionIdAddress, owner);

    const fractionalizer = await deployFractionalizer(web3, owner);
    await refungibleContract.methods.addCollectionAdmin(fractionalizer.options.address).send();
    await fractionalizer.methods.setRFTCollection(collectionIdAddress).send();

    await expect(fractionalizer.methods.setRFTCollection(collectionIdAddress).call())
      .to.be.rejectedWith(/RFT collection is already set$/g);
  });

  itWeb3('call setRFTCollection with NFT collection', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {collectionIdAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, collectionIdAddress, owner);

    const fractionalizer = await deployFractionalizer(web3, owner);
    await nftContract.methods.addCollectionAdmin(fractionalizer.options.address).send();

    await expect(fractionalizer.methods.setRFTCollection(collectionIdAddress).call())
      .to.be.rejectedWith(/Wrong collection type. Collection is not refungible.$/g);
  });

  itWeb3('call setRFTCollection while not collection admin', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const fractionalizer = await deployFractionalizer(web3, owner);
    const {collectionIdAddress} = await createRefungibleCollection(api, web3, owner);

    await expect(fractionalizer.methods.setRFTCollection(collectionIdAddress).call())
      .to.be.rejectedWith(/Fractionalizer contract should be an admin of the collection$/g);
  });

  itWeb3('call setRFTCollection after createAndSetRFTCollection', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const fractionalizer = await deployFractionalizer(web3, owner);
    const tx = api.tx.balances.transfer(evmToAddress(fractionalizer.options.address), 10n * UNIQUE);
    await submitTransactionAsync(alice, tx);

    const result = await fractionalizer.methods.createAndSetRFTCollection('A', 'B', 'C').send({from: owner});
    const collectionIdAddress = result.events.RFTCollectionSet.returnValues._collection;

    await expect(fractionalizer.methods.setRFTCollection(collectionIdAddress).call())
      .to.be.rejectedWith(/RFT collection is already set$/g);
  });

  itWeb3('call nft2rft without setting RFT collection for contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();

    const fractionalizer = await deployFractionalizer(web3, owner);

    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).call())
      .to.be.rejectedWith(/RFT collection is not set$/g);
  });

  itWeb3('call nft2rft while not owner of NFT token', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const nftOwner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();
    await nftContract.methods.transfer(nftOwner, 1).send();


    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();

    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).call())
      .to.be.rejectedWith(/Only token owner could fractionalize it$/g);
  });

  itWeb3('call nft2rft while not in list of allowed accounts', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();

    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);

    await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).call())
      .to.be.rejectedWith(/Fractionalization of this collection is not allowed by admin$/g);
  });

  itWeb3('call nft2rft while fractionalizer doesnt have approval for nft token', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();

    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);

    await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();
    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).call())
      .to.be.rejectedWith(/ApprovedValueTooLow$/g);
  });

  itWeb3('call rft2nft without setting RFT collection for contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const fractionalizer = await deployFractionalizer(web3, owner);
    const {collectionIdAddress: rftCollectionAddress} = await createRefungibleCollection(api, web3, owner);
    const refungibleContract = uniqueRefungible(web3, rftCollectionAddress, owner);
    const rftTokenId = await refungibleContract.methods.nextTokenId().call();
    await refungibleContract.methods.mint(owner, rftTokenId).send();
    
    await expect(fractionalizer.methods.rft2nft(rftCollectionAddress, rftTokenId).call())
      .to.be.rejectedWith(/RFT collection is not set$/g);
  });

  itWeb3('call rft2nft for RFT token that is not from configured RFT collection', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    const {collectionIdAddress: rftCollectionAddress} = await createRefungibleCollection(api, web3, owner);
    const refungibleContract = uniqueRefungible(web3, rftCollectionAddress, owner);
    const rftTokenId = await refungibleContract.methods.nextTokenId().call();
    await refungibleContract.methods.mint(owner, rftTokenId).send();
    
    await expect(fractionalizer.methods.rft2nft(rftCollectionAddress, rftTokenId).call())
      .to.be.rejectedWith(/Wrong RFT collection$/g);
  });

  itWeb3('call rft2nft for RFT token that was not minted by fractionalizer contract', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {collectionIdAddress: rftCollectionAddress} = await createRefungibleCollection(api, web3, owner);

    const fractionalizer = await deployFractionalizer(web3, owner);
    const refungibleContract = uniqueRefungible(web3, rftCollectionAddress, owner);

    await refungibleContract.methods.addCollectionAdmin(fractionalizer.options.address).send();
    await fractionalizer.methods.setRFTCollection(rftCollectionAddress).send();

    const rftTokenId = await refungibleContract.methods.nextTokenId().call();
    await refungibleContract.methods.mint(owner, rftTokenId).send();
    
    await expect(fractionalizer.methods.rft2nft(rftCollectionAddress, rftTokenId).call())
      .to.be.rejectedWith(/No corresponding NFT token found$/g);
  });

  itWeb3('call rft2nft without owning all RFT pieces', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {fractionalizer, rftCollectionAddress} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    const {rftTokenAddress} = await createRFTToken(api, web3, owner, fractionalizer, 100n);
    
    const {tokenId} = tokenIdFromAddress(rftTokenAddress);
    const refungibleTokenContract = uniqueRefungibleToken(web3, rftTokenAddress, owner);
    await refungibleTokenContract.methods.transfer(receiver, 50).send();
    await refungibleTokenContract.methods.approve(fractionalizer.options.address, 50).send();
    await expect(fractionalizer.methods.rft2nft(rftCollectionAddress, tokenId).call())
      .to.be.rejectedWith(/Not all pieces are owned by the caller$/g);
  });

  itWeb3('send QTZ/UNQ to contract from non owner', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const payer = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const fractionalizer = await deployFractionalizer(web3, owner);
    const amount = 10n * UNIQUE;
    await expect(web3.eth.sendTransaction({from: payer, to: fractionalizer.options.address, value: `${amount}`, ...GAS_ARGS})).to.be.rejected;
  });

  itWeb3('fractionalize NFT with NFT transfers disallowed', async ({api, web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');
    let collectionId;
    {
      const tx = api.tx.unique.createCollectionEx({name: 'A', description: 'B', tokenPrefix: 'C', mode: 'NFT'});
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);
      collectionId = result.collectionId;
    }
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    let nftTokenId;
    {
      const createData = {nft: {}};
      const tx = api.tx.unique.createItem(collectionId, {Ethereum: owner}, createData as any);
      const events = await executeTransaction(api, alice, tx);
      const result = getCreateItemResult(events);
      nftTokenId = result.itemId;
    }
    {
      const tx = api.tx.unique.setTransfersEnabledFlag(collectionId, false);
      await executeTransaction(api, alice, tx);
    }
    const nftCollectionAddress = collectionIdToAddress(collectionId);
    const {fractionalizer} = await initFractionalizer(api, web3, privateKeyWrapper, owner);
    await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();

    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100).call())
      .to.be.rejectedWith(/TransferNotAllowed$/g);
  });
  
  itWeb3('fractionalize NFT with RFT transfers disallowed', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const alice = privateKeyWrapper('//Alice');

    let collectionId;
    {
      const tx = api.tx.unique.createCollectionEx({name: 'A', description: 'B', tokenPrefix: 'C', mode: 'ReFungible'});
      const events = await submitTransactionAsync(alice, tx);
      const result = getCreateCollectionResult(events);
      collectionId = result.collectionId;
    }
    const rftCollectionAddress = collectionIdToAddress(collectionId);
    const fractionalizer = await deployFractionalizer(web3, owner);
    {
      const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, {Ethereum: fractionalizer.options.address});
      await submitTransactionAsync(alice, changeAdminTx);
    }
    await fractionalizer.methods.setRFTCollection(rftCollectionAddress).send();
    {
      const tx = api.tx.unique.setTransfersEnabledFlag(collectionId, false);
      await executeTransaction(api, alice, tx);
    }

    const {collectionIdAddress: nftCollectionAddress} = await createNonfungibleCollection(api, web3, owner);
    const nftContract = uniqueNFT(web3, nftCollectionAddress, owner);
    const nftTokenId = await nftContract.methods.nextTokenId().call();
    await nftContract.methods.mint(owner, nftTokenId).send();

    await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();
    await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();

    await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftTokenId, 100n).call())
      .to.be.rejectedWith(/TransferNotAllowed$/g);
  });
});
