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

import {itEth, usingEthPlaygrounds, expect} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {Pallets} from '../util';

const EVM_COLLECTION_HELPERS_ADDRESS = '0x6c4e9fe1ae37a41e93cee429e8e1881abdcbb54f';

describe('[eth]CollectionHelperAddress test: ERC20/ERC721 ', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  itEth('NFT', async ({helper}) => {
    const owner =  await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress: nftCollectionAddress} = await helper.eth.createNFTCollection(owner, 'Sponsor', 'absolutely anything', 'ROC');
    const nftCollection = await helper.ethNativeContract.collection(nftCollectionAddress, 'nft', owner);

    expect((await nftCollection.methods.collectionHelperAddress().call())
      .toString().toLowerCase()).to.be.equal(EVM_COLLECTION_HELPERS_ADDRESS);
  });

  itEth.ifWithPallets('RFT ', [Pallets.ReFungible], async ({helper}) => {
    const owner =  await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress: rftCollectionAddress} = await helper.eth.createRFTCollection(owner, 'Sponsor', 'absolutely anything', 'ROC');

    const rftCollection = await helper.ethNativeContract.collection(rftCollectionAddress, 'rft', owner);
    expect((await rftCollection.methods.collectionHelperAddress().call())
      .toString().toLowerCase()).to.be.equal(EVM_COLLECTION_HELPERS_ADDRESS);
  });

  itEth('FT', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {collectionAddress} = await helper.eth.createFungibleCollection(owner, 'Sponsor', 18, 'absolutely anything', 'ROC');
    const collection = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);

    expect((await collection.methods.collectionHelperAddress().call())
      .toString().toLowerCase()).to.be.equal(EVM_COLLECTION_HELPERS_ADDRESS);
  });

  itEth('[collectionHelpers] convert collectionId into address', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const collectionId = 7;
    const collectionAddress = helper.ethAddress.fromCollectionId(collectionId);
    const helperContract = await helper.ethNativeContract.collectionHelpers(owner);

    expect(await helperContract.methods.collectionAddress(collectionId).call()).to.be.equal(collectionAddress);
    expect(parseInt(await helperContract.methods.collectionId(collectionAddress).call())).to.be.equal(collectionId);
  });

});