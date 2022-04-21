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

import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, deployFlipper, ethBalanceViaSub, GAS_ARGS, itWeb3, recordEthFee, usingWeb3} from './util/helpers';
import {expect} from 'chai';
import {createCollectionExpectSuccess, createItemExpectSuccess, UNIQUE} from '../util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import privateKey from '../substrate/privateKey';
import {Contract} from 'web3-eth-contract';
import Web3 from 'web3';

describe('Contract calls', () => {
  itWeb3('Call of simple contract fee is less than 0.2 UNQ', async ({web3, api}) => {
    const deployer = await createEthAccountWithBalance(api, web3);
    const flipper = await deployFlipper(web3, deployer);

    const cost = await recordEthFee(api, deployer, () => flipper.methods.flip().send({from: deployer}));
    expect(cost < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });

  itWeb3('Balance transfer fee is less than 0.2 UNQ', async ({web3, api}) => {
    const userA = await createEthAccountWithBalance(api, web3);
    const userB = createEthAccount(web3);

    const cost = await recordEthFee(api, userA, () => web3.eth.sendTransaction({from: userA, to: userB, value: '1000000', ...GAS_ARGS}));
    const balanceB = await ethBalanceViaSub(api, userB);
    expect(cost - balanceB < BigInt(0.2 * Number(UNIQUE))).to.be.true;
  });

  itWeb3('NFT transfer is close to 0.15 UNQ', async ({web3, api}) => {
    const caller = await createEthAccountWithBalance(api, web3);
    const receiver = createEthAccount(web3);

    const alice = privateKey('//Alice');
    const collection = await createCollectionExpectSuccess({
      mode: {type: 'NFT'},
    });
    const itemId = await createItemExpectSuccess(alice, collection, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const cost = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, itemId).send(caller));

    const fee = Number(cost) / Number(UNIQUE);
    const expectedFee = 0.15;
    const tolerance = 0.00002;

    expect(Math.abs(fee - expectedFee)).to.be.lessThan(tolerance);
  });
});

describe('ERC165 tests', async () => {
  // https://eips.ethereum.org/EIPS/eip-165

  let collection: number;
  let minter: string;

  function contract(web3: Web3): Contract {
    return new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collection), {from: minter, ...GAS_ARGS});
  }

  before(async () => {
    await usingWeb3 (async (web3) => {
      collection = await createCollectionExpectSuccess();
      minter = createEthAccount(web3);
    });
  });
  
  itWeb3('interfaceID == 0xffffffff always false', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0xffffffff').call()).to.be.false;
  });

  itWeb3('ERC721 support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x58800161').call()).to.be.true;
  });

  itWeb3('ERC721Metadata support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x5b5e139f').call()).to.be.true;
  });

  itWeb3('ERC721Mintable support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x68ccfe89').call()).to.be.true;
  });

  itWeb3('ERC721Enumerable support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x780e9d63').call()).to.be.true;
  });

  itWeb3('ERC721UniqueExtensions support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0xe562194d').call()).to.be.true;
  });

  itWeb3('ERC721Burnable support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x42966c68').call()).to.be.true;
  });

  itWeb3('ERC165 support', async ({web3}) => {
    expect(await contract(web3).methods.supportsInterface('0x01ffc9a7').call()).to.be.true;
  });
});
