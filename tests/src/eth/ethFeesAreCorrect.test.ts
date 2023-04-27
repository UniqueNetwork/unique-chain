// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
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
// along with Unique Network. If not, see <http://witww.gnu.org/licenses/>.

import {IKeyringPair} from '@polkadot/types/types';
import {itEth, usingEthPlaygrounds, expect} from './util';

describe('Eth fees are correct', () => {
  let donor: IKeyringPair;
  let minter: IKeyringPair;
  let alice: IKeyringPair;

  before(async () => {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({url: import.meta.url});
      [minter, alice] = await helper.arrange.createAccounts([100n, 200n], donor);
    });
  });


  itEth('web3 fees are the same as evm.call fees', async ({helper}) => {
    const collection = await helper.nft.mintCollection(minter, {});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const aliceEth = helper.address.substrateToEth(alice.address);

    const {tokenId: tokenA} = await collection.mintToken(minter, {Ethereum: owner});
    const {tokenId: tokenB} = await collection.mintToken(minter, {Ethereum: aliceEth});

    const collectionAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner);

    const balanceBeforeWeb3Transfer = await helper.balance.getEthereum(owner);
    await contract.methods.transfer(receiver, tokenA).send({from: owner});
    const balanceAfterWeb3Transfer = await helper.balance.getEthereum(owner);
    const web3Diff = balanceBeforeWeb3Transfer - balanceAfterWeb3Transfer;

    const encodedCall = contract.methods.transfer(receiver, tokenB)
      .encodeABI();

    const balanceBeforeEvmCall = await helper.balance.getSubstrate(alice.address);
    await helper.eth.sendEVM(
      alice,
      collectionAddress,
      encodedCall,
      '0',
    );
    const balanceAfterEvmCall = await helper.balance.getSubstrate(alice.address);
    const evmCallDiff = balanceBeforeEvmCall - balanceAfterEvmCall;

    expect(web3Diff).to.be.equal(evmCallDiff);
  });
});
