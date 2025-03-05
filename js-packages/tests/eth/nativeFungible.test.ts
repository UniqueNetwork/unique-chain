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
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import type {IKeyringPair} from '@polkadot/types/types';
import {confirmations, expect, itEth, usingEthPlaygrounds} from '@unique/test-utils/eth/util.js';
import {UniqueHelper} from '@unique-nft/playgrounds/unique.js';

describe('NativeFungible: ERC20 calls', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('approve()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const spender = helper.eth.createAccount();
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    await expect(contract.approve.staticCall(spender, 100)).to.be.rejectedWith('approve not supported');
  });

  itEth('balanceOf()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor, 123n);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const balance = await contract.balanceOf.staticCall(owner);
    expect(balance).to.be.eq('123000000000000000000');
  });

  itEth('decimals()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const realDecimals = (await helper.chain.getChainProperties().tokenDecimals)[0].toString();
    const decimals = await contract.decimals.staticCall();
    expect(decimals).to.be.eq(realDecimals);
  });

  itEth('name()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const realName = await UniqueHelper.detectNetwork(helper.getApi());
    const name = await contract.name.staticCall();
    expect(name).to.be.eq(realName);
  });

  itEth('symbol()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const realName = (await helper.chain.getChainProperties().tokenSymbol)[0];
    const name = await contract.symbol.staticCall();
    expect(name).to.be.eq(realName);
  });

  itEth('totalSupply()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const totalSupplyEth = BigInt(await contract.totalSupply.staticCall());
    const totalSupplySub = await helper.balance.getTotalIssuance();
    expect(totalSupplyEth).to.be.eq(totalSupplySub);
  });

  itEth('transfer()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const balanceOwnerBefore = await helper.balance.getEthereum(owner);
    const balanceReceiverBefore = await helper.balance.getEthereum(receiver);

    await (await contract.transfer.send(receiver, 50)).wait(confirmations);

    const balanceOwnerAfter = await helper.balance.getEthereum(owner);
    const balanceReceiverAfter = await helper.balance.getEthereum(receiver);

    expect(balanceOwnerBefore - 50n > balanceOwnerAfter).to.be.true;
    expect(balanceReceiverBefore + 50n).to.be.equal(balanceReceiverAfter);
  });

  itEth('transferFrom()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const balanceOwnerBefore = await helper.balance.getEthereum(owner);
    const balanceReceiverBefore = await helper.balance.getEthereum(receiver);

    await (await contract.transferFrom(owner, receiver, 50)).wait(confirmations);

    const balanceOwnerAfter = await helper.balance.getEthereum(owner);
    const balanceReceiverAfter = await helper.balance.getEthereum(receiver);

    expect(balanceOwnerBefore - 50n > balanceOwnerAfter).to.be.true;
    expect(balanceReceiverBefore === balanceReceiverAfter - 50n).to.be.true;

    await expect(contract.transferFrom.staticCall(receiver, receiver, 50)).to.be.rejectedWith('ApprovedValueTooLow');
  });
});

describe('NativeFungible: ERC20UniqueExtensions calls', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('transferCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.ethCrossAccount.createAccountWithBalance(donor);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const balanceOwnerBefore = await helper.balance.getEthereum(owner);
    const balanceReceiverBefore = await helper.balance.getEthereum(receiver.eth);

    await (await contract.transferCross.send(receiver, 50)).wait(confirmations);

    const balanceOwnerAfter = await helper.balance.getEthereum(owner);
    const balanceReceiverAfter = await helper.balance.getEthereum(receiver.eth);

    expect(balanceOwnerBefore - 50n > balanceOwnerAfter).to.be.true;
    expect(balanceReceiverBefore === balanceReceiverAfter - 50n).to.be.true;
  });

  itEth('transferFromCross()', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor, 100n);
    const receiver = await helper.eth.createAccountWithBalance(donor, 100n);
    const collectionAddress = helper.ethAddress.fromCollectionId(0);
    const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    const balanceOwnerBefore = await helper.balance.getEthereum(owner);
    const balanceReceiverBefore = await helper.balance.getEthereum(receiver);

    await (await contract.transferFromCross.send(owner, receiver, 50, {from: owner.address})).wait(confirmations);

    const balanceOwnerAfter = await helper.balance.getEthereum(owner);
    const balanceReceiverAfter = await helper.balance.getEthereum(receiver);

    expect(balanceOwnerBefore - 50n > balanceOwnerAfter).to.be.true;
    expect(balanceReceiverBefore === balanceReceiverAfter - 50n).to.be.true;

    await expect(contract.transferFromCross.staticCall(receiver, receiver, 50, {from: owner.address}))
      .to.be.rejectedWith('no permission');
  });
});
