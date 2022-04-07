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

import {expect} from 'chai';
import {createCollectionExpectSuccess} from '../util/helpers';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, itWeb3, normalizeEvents} from './util/helpers';
import fungibleMetadataAbi from './fungibleMetadataAbi.json';
import privateKey from '../substrate/privateKey';
import {submitTransactionAsync} from '../substrate/substrate-api';
import nonFungibleAbi from './nonFungibleAbi.json';

describe('Common metadata', () => {
  itWeb3('Returns collection name', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      name: 'token name',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const name = await contract.methods.name().call();

    expect(name).to.equal('token name');
  });

  itWeb3('Returns symbol name', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      tokenPrefix: 'TOK',
      mode: {type: 'NFT'},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const symbol = await contract.methods.symbol().call();

    expect(symbol).to.equal('TOK');
  });
});

describe('Fungible metadata', () => {
  itWeb3('Returns fungible decimals', async ({api, web3}) => {
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'Fungible', decimalPoints: 6},
    });
    const caller = await createEthAccountWithBalance(api, web3);

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address, {from: caller, ...GAS_ARGS});
    const decimals = await contract.methods.decimals().call();

    expect(+decimals).to.equal(6);
  });
});

describe.only('Support ERC721Metadata', () => {
  itWeb3('Check unsupport ERC721Metadata ShemaVersion::Unique', async ({web3, api}) => {
    const collectionId = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
      shemaVersion: 'Unique',
    });
    const collection = await api.rpc.unique.collectionById(collectionId);
    expect(collection.isSome).to.be.true;
    expect(collection.unwrap().schemaVersion.toHuman()).to.be.eq('Unique');

    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, {Ethereum: caller});
    await submitTransactionAsync(alice, changeAdminTx);

    const address = collectionIdToAddress(collectionId);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    await expect(contract.methods.name().call()).to.be.rejectedWith('Unsupported shema version! Support only ImageURL');
    await expect(contract.methods.symbol().call()).to.be.rejectedWith('Unsupported shema version! Support only ImageURL');

    const receiver = createEthAccount(web3);
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    await expect(contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send({from: caller})).to.be.rejected;

    await expect(contract.methods.mintBulkWithTokenURI(
      receiver,
      [
        [nextTokenId, 'Test URI 0'],
        [+nextTokenId + 1, 'Test URI 1'],
        [+nextTokenId + 2, 'Test URI 2'],
      ],
    ).send({from: caller})).to.be.rejected;
  });

  itWeb3('Check support ERC721Metadata for ShemaVersion::ImageURL', async ({web3, api}) => {
    const collectionId = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
      name: 'some_name',
      tokenPrefix: 'some_prefix',
    });
    const collection = await api.rpc.unique.collectionById(collectionId);
    expect(collection.isSome).to.be.true;
    expect(collection.unwrap().schemaVersion.toHuman()).to.be.eq('ImageURL');

    const alice = privateKey('//Alice');

    const caller = await createEthAccountWithBalance(api, web3);
    const changeAdminTx = api.tx.unique.addCollectionAdmin(collectionId, {Ethereum: caller});
    await submitTransactionAsync(alice, changeAdminTx);

    const address = collectionIdToAddress(collectionId);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});
    
    expect(await contract.methods.name().call()).to.be.eq('some_name');
    expect(await contract.methods.symbol().call()).to.be.eq('some_prefix');

    const receiver = createEthAccount(web3);
    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    const result = await contract.methods.mintWithTokenURI(
      receiver,
      nextTokenId,
      'Test URI',
    ).send({from: caller});
    const events = normalizeEvents(result.events);

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: receiver,
          tokenId: nextTokenId,
        },
      },
    ]);

    expect(await contract.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
  });
});

