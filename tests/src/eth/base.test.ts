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

import {Contract} from 'web3-eth-contract';

import {IKeyringPair} from '@polkadot/types/types';
import {EthUniqueHelper, itEth, usingEthPlaygrounds, expect} from './util';


describe('Contract calls', () => {
  let donor: IKeyringPair;

  before(async function () {
    await usingEthPlaygrounds(async (_helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('Call of simple contract fee is less than 0.2 UNQ', async ({helper}) => {
    const deployer = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(deployer);

    const cost = await helper.eth.calculateFee({Ethereum: deployer}, () => flipper.methods.flip().send({from: deployer}));
    expect(cost < BigInt(0.2 * Number(helper.balance.getOneTokenNominal()))).to.be.true;
  });

  itEth('Balance transfer fee is less than 0.2 UNQ', async ({helper}) => {
    const userA = await helper.eth.createAccountWithBalance(donor);
    const userB = helper.eth.createAccount();
    const cost = await helper.eth.calculateFee({Ethereum: userA}, () => helper.getWeb3().eth.sendTransaction({
      from: userA,
      to: userB,
      value: '1000000',
      gas: helper.eth.DEFAULT_GAS,
    }));
    const balanceB = await helper.balance.getEthereum(userB);
    expect(cost - balanceB < BigInt(0.2 * Number(helper.balance.getOneTokenNominal()))).to.be.true;
  });

  itEth('NFT transfer is close to 0.15 UNQ', async ({helper}) => {
    const caller = await helper.eth.createAccountWithBalance(donor);
    const receiver = helper.eth.createAccount();

    const [alice] = await helper.arrange.createAccounts([10n], donor);
    const collection = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'});
    const {tokenId} = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const cost = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, tokenId).send(caller));

    const fee = Number(cost) / Number(helper.balance.getOneTokenNominal());
    const expectedFee = 0.15;
    const tolerance = 0.001;

    expect(Math.abs(fee - expectedFee)).to.be.lessThan(tolerance);
  });
});

describe('ERC165 tests', async () => {
  // https://eips.ethereum.org/EIPS/eip-165

  let erc721MetadataCompatibleNftCollectionId: number;
  let simpleNftCollectionId: number;
  let minter: string;

  const BASE_URI = 'base/';

  async function checkInterface(helper: EthUniqueHelper, interfaceId: string, simpleResult: boolean, compatibleResult: boolean) {
    const simple = helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(simpleNftCollectionId), 'nft', minter);
    const compatible = helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(erc721MetadataCompatibleNftCollectionId), 'nft', minter);

    expect(await simple.methods.supportsInterface(interfaceId).call()).to.equal(simpleResult, `empty (not ERC721Metadata compatible) NFT collection returns not ${simpleResult}`);
    expect(await compatible.methods.supportsInterface(interfaceId).call()).to.equal(compatibleResult, `ERC721Metadata compatible NFT collection returns not ${compatibleResult}`);
  }

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      const donor = await privateKey({filename: __filename});
      const [alice] = await helper.arrange.createAccounts([10n], donor);
      ({collectionId: simpleNftCollectionId} = await helper.nft.mintCollection(alice, {name: 'test', description: 'test', tokenPrefix: 'test'}));
      minter = helper.eth.createAccount();
      ({collectionId: erc721MetadataCompatibleNftCollectionId} = await helper.eth.createERC721MetadataCompatibleNFTCollection(minter, 'n', 'd', 'p', BASE_URI));
    });
  });

  itEth('nonexistent interfaceID - 0xffffffff - always false', async ({helper}) => {
    await checkInterface(helper, '0xffffffff', false, false);
  });

  itEth('ERC721 - 0x780e9d63 - support', async ({helper}) => {
    await checkInterface(helper, '0x780e9d63', true, true);
  });

  itEth('ERC721Metadata - 0x5b5e139f - support', async ({helper}) => {
    await checkInterface(helper, '0x5b5e139f', false, true);
  });

  itEth('ERC721UniqueMintable - 0x476ff149 - support', async ({helper}) => {
    await checkInterface(helper, '0x476ff149', true, true);
  });

  itEth('ERC721Enumerable - 0x780e9d63 - support', async ({helper}) => {
    await checkInterface(helper, '0x780e9d63', true, true);
  });

  itEth('ERC721UniqueExtensions - 0x4468500d - support', async ({helper}) => {
    await checkInterface(helper, '0x4468500d', true, true);
  });

  itEth('ERC721Burnable - 0x42966c68 - support', async ({helper}) => {
    await checkInterface(helper, '0x42966c68', true, true);
  });

  itEth('ERC165 - 0x01ffc9a7 - support', async ({helper}) => {
    await checkInterface(helper, '0x01ffc9a7', true, true);
  });
});
