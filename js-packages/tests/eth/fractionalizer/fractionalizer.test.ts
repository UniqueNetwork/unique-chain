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


import {readFile} from 'node:fs/promises';

import type {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';

import {Contract, HDNodeWallet} from 'ethers';

import {usingEthPlaygrounds, expect, itEth, waitParams} from '@unique/test-utils/eth/util';
import {EthUniqueHelper} from '@unique/test-utils/eth';
import type {CompiledContract} from '@unique/test-utils/eth/types';
import {before, describe, requirePalletsOrSkip, Pallets, makeNames} from '@unique/test-utils/util';

const {dirname} = makeNames(import.meta.url);

let compiledFractionalizer: CompiledContract;

const EVM_ABI_DIR = `${dirname}/../../../evm-abi`;

const compileContract = async (helper: EthUniqueHelper): Promise<CompiledContract> => {
  if(!compiledFractionalizer) {
    compiledFractionalizer = await helper.ethContract.compile('Fractionalizer', (await readFile(`${dirname}/Fractionalizer.sol`)).toString(), [
      {solPath: 'api/CollectionHelpers.sol', fsPath: `${EVM_ABI_DIR}/api/CollectionHelpers.sol`},
      {solPath: 'api/ContractHelpers.sol', fsPath: `${EVM_ABI_DIR}/api/ContractHelpers.sol`},
      {solPath: 'api/UniqueRefungibleToken.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueRefungibleToken.sol`},
      {solPath: 'api/UniqueRefungible.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueRefungible.sol`},
      {solPath: 'api/UniqueNFT.sol', fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`},
    ]);
  }
  return compiledFractionalizer;
};


const deployContract = async (helper: EthUniqueHelper, owner: HDNodeWallet): Promise<Contract> => {
  const compiled = await compileContract(helper);
  return await helper.ethContract.deployByAbi(owner, compiled.abi, compiled.bytecode);
};


const initContract = async (helper: EthUniqueHelper, owner: HDNodeWallet): Promise<{contract: Contract, rftCollectionAddress: string}> => {
  const fractionalizer = await deployContract(helper, owner);

  const amount = 10n * helper.balance.getOneTokenNominal();
  const sendTx = await owner.sendTransaction({to: await fractionalizer.getAddress(), value: amount, gasLimit: helper.eth.DEFAULT_GAS_LIMIT});
  await sendTx.wait(...waitParams);

  const createCollectionValue = 2n * helper.balance.getOneTokenNominal();
  const createCollectionTx = await fractionalizer.createAndSetRFTCollection('A', 'B', 'C', {value: createCollectionValue});
  const createCollectionReceipt = await createCollectionTx.wait(...waitParams);

  const events = helper.eth.normalizeEvents(createCollectionReceipt!);
  const rftCollectionAddress = events.RFTCollectionSet.args._collection;

  return {contract: fractionalizer, rftCollectionAddress};
};

const mintRFTToken = async (helper: EthUniqueHelper, owner: HDNodeWallet, fractionalizer: Contract, amount: bigint): Promise<{
  nftCollectionAddress: string, nftTokenId: number, rftTokenAddress: string
}> => {
  const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
  const nftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;

  await (await fractionalizer.setNftCollectionIsAllowed(nftCollection.collectionAddress, true)).wait(...waitParams);
  await (await nftContract.approve(await fractionalizer.getAddress(), nftTokenId)).wait(...waitParams);
  const receipt = await fractionalizer.nft2rft(nftCollection.collectionAddress, nftTokenId, amount);
  const result = await receipt.wait(...waitParams);
  const {_collection, _tokenId, _rftToken} = helper.eth.normalizeEvents(result!).Fractionalized.args;
  return {
    nftCollectionAddress: _collection,
    nftTokenId: Number(_tokenId),
    rftTokenAddress: _rftToken,
  };
};


describe('Fractionalizer contract usage', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
      requirePalletsOrSkip(helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('Set RFT collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
    const rftContract = await helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);

    const fractionalizer = await deployContract(helper, owner);
    const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(await fractionalizer.getAddress());

    const addCollectionTx = await rftContract.addCollectionAdminCross.send(fractionalizerAddressCross);
    await addCollectionTx.wait(...waitParams);

    const setRFTCollectionTx = await fractionalizer.setRFTCollection.send(rftCollection.collectionAddress);
    const setRFTCollectionReceipt = await setRFTCollectionTx.wait(...waitParams);

    const events = helper.eth.normalizeEvents(setRFTCollectionReceipt!);

    expect(events).to.be.like({
      RFTCollectionSet: {
        args: {
          _collection: rftCollection.collectionAddress,
        },
      },
    });
  });

  itEth('Mint RFT collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const fractionalizer = await deployContract(helper, owner);
    await helper.balance.transferToSubstrate(donor, evmToAddress(await fractionalizer.getAddress()), 10n * helper.balance.getOneTokenNominal());

    const tx = await fractionalizer.createAndSetRFTCollection.send('A', 'B', 'C', {value: 2n * helper.balance.getOneTokenNominal()});
    const receipt = await tx.wait(...waitParams);
    const events = helper.eth.normalizeEvents(receipt!);

    expect(events).to.be.like({RFTCollectionSet: {}});
    expect(events.RFTCollectionSet.args._collection).to.be.ok;
  });

  itEth('Set Allowlist', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const {contract: fractionalizer} = await initContract(helper, owner);
    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');

    for(const isAllowed of [true, false]) {
      const tx = await fractionalizer.setNftCollectionIsAllowed.send(nftCollection.collectionAddress, isAllowed);
      const receipt = await tx.wait(...waitParams);
      const events = helper.eth.normalizeEvents(receipt!);

      expect(events).to.be.like({
        AllowListSet: {
          args: {
            _collection: nftCollection.collectionAddress,
            _status: isAllowed.toString(),
          },
        },
      });
    }
  });

  itEth('NFT to RFT', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);

    const mintTx = await nftContract.mint.send(owner);
    const mintReceipt = await mintTx.wait(...waitParams);
    const mintEvents = helper.eth.normalizeEvents(mintReceipt!);

    const nftTokenId = mintEvents.Transfer.args.tokenId;

    const {contract: fractionalizer} = await initContract(helper, owner);

    const isAllowedTx = await fractionalizer.setNftCollectionIsAllowed.send(nftCollection.collectionAddress, true);
    await isAllowedTx.wait(...waitParams);

    await (await nftContract.approve.send(await fractionalizer.getAddress(), nftTokenId)).wait(...waitParams);

    const sendTx = await fractionalizer.nft2rft.send(nftCollection.collectionAddress, nftTokenId, 100);
    const sendReceipt = await sendTx.wait(...waitParams);
    const sendEvents = helper.eth.normalizeEvents(sendReceipt!);

    expect(sendEvents).to.be.like({
      Fractionalized: {
        args: {
          _collection: nftCollection.collectionAddress,
          _tokenId: nftTokenId,
          _amount: '100',
        },
      },
    });

    const rftTokenAddress = sendEvents.Fractionalized.args._rftToken;
    const rftTokenContract = helper.ethNativeContract.rftToken(rftTokenAddress, owner);
    expect(await rftTokenContract.balanceOf(owner)).to.equal(100n);
  });

  itEth('RFT to NFT', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
    const {rftTokenAddress, nftCollectionAddress, nftTokenId} = await mintRFTToken(helper, owner, fractionalizer, 100n);

    const {collectionId, tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
    const refungibleAddress = helper.ethAddress.fromCollectionId(collectionId);
    expect(rftCollectionAddress).to.be.equal(refungibleAddress);
    const refungibleTokenContract = await helper.ethNativeContract.rftToken(rftTokenAddress, owner);
    await (await refungibleTokenContract.approve(await fractionalizer.getAddress(), 100)).wait(...waitParams);
    const result = await (await fractionalizer.rft2nft(refungibleAddress, tokenId)).wait(...waitParams);
    const events = helper.eth.normalizeEvents(result!);
    expect(events.Defractionalized).to.be.like({
      event: 'Defractionalized',
      args: {
        _rftToken: rftTokenAddress,
        _nftCollection: nftCollectionAddress,
        _nftTokenId: String(nftTokenId),
      },
    });
  });

  itEth('Test fractionalizer NFT <-> RFT mapping ', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
    const {rftTokenAddress, nftCollectionAddress, nftTokenId} = await mintRFTToken(helper, owner, fractionalizer, 100n);

    const {collectionId, tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
    const refungibleAddress = helper.ethAddress.fromCollectionId(collectionId);
    expect(rftCollectionAddress).to.be.equal(refungibleAddress);
    const refungibleTokenContract = await helper.ethNativeContract.rftToken(rftTokenAddress, owner);
    await refungibleTokenContract.approve(await fractionalizer.getAddress(), 100);

    const rft2nft = await fractionalizer.rft2nftMapping(rftTokenAddress);
    expect(rft2nft).to.be.like([
      nftCollectionAddress,
      BigInt(nftTokenId),
    ]);

    const nft2rft = await fractionalizer.nft2rftMapping(nftCollectionAddress, nftTokenId);
    expect(Number(nft2rft)).to.be.eq(tokenId);
  });
});



describe('Negative Integration Tests for fractionalizer', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
      requirePalletsOrSkip(helper, [Pallets.ReFungible]);
      donor = await privateKey({url: import.meta.url});
    });
  });

  itEth('call setRFTCollection twice', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
    const refungibleContract = await helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);

    const fractionalizer = await deployContract(helper, owner);
    const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(await fractionalizer.getAddress());
    await (await refungibleContract.addCollectionAdminCross(fractionalizerAddressCross)).wait(...waitParams);
    await (await fractionalizer.setRFTCollection(rftCollection.collectionAddress)).wait(...waitParams);

    await expect(fractionalizer.setRFTCollection.staticCall(rftCollection.collectionAddress))
      .to.be.rejectedWith('RFT collection is already set');
  });

  itEth('call setRFTCollection with NFT collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);

    const fractionalizer = await deployContract(helper, owner);
    const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(await fractionalizer.getAddress());
    await (await nftContract.addCollectionAdminCross(fractionalizerAddressCross)).wait(...waitParams);

    await expect(fractionalizer.setRFTCollection.staticCall(nftCollection.collectionAddress))
      .to.be.rejectedWith('Wrong collection type. Collection is not refungible.');
  });

  itEth('call setRFTCollection while not collection admin', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const fractionalizer = await deployContract(helper, owner);
    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');

    await expect(fractionalizer.setRFTCollection.staticCall(rftCollection.collectionAddress))
      .to.be.rejectedWith('Fractionalizer contract should be an admin of the collection');
  });

  itEth('call setRFTCollection after createAndSetRFTCollection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const fractionalizer = await deployContract(helper, owner);
    await helper.balance.transferToSubstrate(donor, evmToAddress(await fractionalizer.getAddress()), 10n * helper.balance.getOneTokenNominal());

    const result = await (await fractionalizer.createAndSetRFTCollection('A', 'B', 'C', {from: owner, value: 2n * helper.balance.getOneTokenNominal()})).wait(...waitParams);
    const collectionIdAddress = helper.eth.normalizeEvents(result!).RFTCollectionSet.args._collection;

    await expect(fractionalizer.setRFTCollection.staticCall(collectionIdAddress))
      .to.be.rejectedWith('RFT collection is already set');
  });

  itEth('call nft2rft without setting RFT collection for contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
    const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
    const nftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;

    const fractionalizer = await deployContract(helper, owner);

    await expect(fractionalizer.nft2rft.staticCall(nftCollection.collectionAddress, nftTokenId, 100))
      .to.be.rejectedWith('RFT collection is not set');
  });

  itEth('call nft2rft while not owner of NFT token', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const nftOwner = await helper.eth.createAccountWithBalance(donor);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
    const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
    const nftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;
    await (await nftContract.transfer(nftOwner, 1)).wait(...waitParams);

    const {contract: fractionalizer} = await initContract(helper, owner);
    await (await fractionalizer.setNftCollectionIsAllowed(nftCollection.collectionAddress, true)).wait(...waitParams);

    await expect(fractionalizer.nft2rft.staticCall(nftCollection.collectionAddress, nftTokenId, 100))
      .to.be.rejectedWith('Only token owner could fractionalize it');
  });

  itEth('call nft2rft while not in list of allowed accounts', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
    const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
    const nftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;

    const {contract: fractionalizer} = await initContract(helper, owner);

    await nftContract.approve(await fractionalizer.getAddress(), nftTokenId);
    await expect(fractionalizer.nft2rft.staticCall(nftCollection.collectionAddress, nftTokenId, 100))
      .to.be.rejectedWith('Fractionalization of this collection is not allowed by admin');
  });

  itEth('call nft2rft while fractionalizer doesnt have approval for nft token', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
    const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
    const nftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;

    const {contract: fractionalizer} = await initContract(helper, owner);

    await (await fractionalizer.setNftCollectionIsAllowed(nftCollection.collectionAddress, true)).wait(...waitParams);
    await expect(fractionalizer.nft2rft.staticCall(nftCollection.collectionAddress, nftTokenId, 100))
      .to.be.rejectedWith('ApprovedValueTooLow');
  });

  itEth('call rft2nft without setting RFT collection for contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const fractionalizer = await deployContract(helper, owner);
    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
    const refungibleContract = await helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);
    const mintResult = await (await refungibleContract.mint(owner)).wait(...waitParams);
    const rftTokenId = helper.eth.normalizeEvents(mintResult!).Transfer.args.tokenId;

    await expect(fractionalizer.rft2nft.staticCall(rftCollection.collectionAddress, rftTokenId))
      .to.be.rejectedWith('RFT collection is not set');
  });

  itEth('call rft2nft for RFT token that is not from configured RFT collection', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const {contract: fractionalizer} = await initContract(helper, owner);
    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
    const refungibleContract = helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);
    const mintResult = await (await refungibleContract.mint(owner)).wait(...waitParams);
    const rftTokenId = helper.eth.normalizeEvents(mintResult).Transfer.args.tokenId;

    await expect(fractionalizer.rft2nft.staticCall(rftCollection.collectionAddress, rftTokenId))
      .to.be.rejectedWith('Wrong RFT collection');
  });

  itEth('call rft2nft for RFT token that was not minted by fractionalizer contract', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
    const refungibleContract = helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);

    const fractionalizer = await deployContract(helper, owner);

    const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(await fractionalizer.getAddress());
    await (await refungibleContract.addCollectionAdminCross(fractionalizerAddressCross)).wait(...waitParams);
    await (await fractionalizer.setRFTCollection(rftCollection.collectionAddress)).wait(...waitParams);

    const mintResult = await (await refungibleContract.mint(owner)).wait(...waitParams);
    const rftTokenId = helper.eth.normalizeEvents(mintResult).Transfer.args.tokenId;

    await expect(fractionalizer.rft2nft.staticCall(rftCollection.collectionAddress, rftTokenId))
      .to.be.rejectedWith('No corresponding NFT token found');
  });

  itEth('call rft2nft without owning all RFT pieces', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const receiver = await helper.eth.createAccountWithBalance(donor);

    const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
    const {rftTokenAddress} = await mintRFTToken(helper, owner, fractionalizer, 100n);

    const {tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
    const refungibleTokenContract = helper.ethNativeContract.rftToken(rftTokenAddress, owner);
    await (await refungibleTokenContract.transfer(receiver, 50)).wait(...waitParams);
    await (await (refungibleTokenContract.connect(receiver) as Contract).approve(fractionalizer.getAddress(), 50)).wait(...waitParams);
    await expect((fractionalizer.connect(receiver) as Contract).rft2nft.staticCall(rftCollectionAddress, tokenId))
      .to.be.rejectedWith('Not all pieces are owned by the caller');
  });

  itEth('send QTZ/UNQ to contract from non owner', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);
    const payer = await helper.eth.createAccountWithBalance(donor);

    const fractionalizer = await deployContract(helper, owner);
    const amount = 10n * helper.balance.getOneTokenNominal();
    const receipt = await payer.sendTransaction({to: await fractionalizer.getAddress(), value: `${amount}`, gasLimit: helper.eth.DEFAULT_GAS_LIMIT});

    await expect(receipt.wait(...waitParams)).to.be.rejected;
  });

  itEth('fractionalize NFT with NFT transfers disallowed', async ({helper}) => {
    const nftCollection = await helper.nft.mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});

    const owner = await helper.eth.createAccountWithBalance(donor);
    const nftToken = await nftCollection.mintToken(donor, {Ethereum: owner.address});
    await helper.executeExtrinsic(donor, 'api.tx.unique.setTransfersEnabledFlag', [nftCollection.collectionId, false], true);
    const nftCollectionAddress = helper.ethAddress.fromCollectionId(nftCollection.collectionId);
    const {contract: fractionalizer} = await initContract(helper, owner);
    await (await fractionalizer.setNftCollectionIsAllowed(nftCollectionAddress, true)).wait(...waitParams);

    const nftContract = await helper.ethNativeContract.collection(nftCollectionAddress, 'nft', owner);
    await (await nftContract.approve(fractionalizer.getAddress(), nftToken.tokenId)).wait(...waitParams);
    await expect(fractionalizer.nft2rft.staticCall(nftCollectionAddress, nftToken.tokenId, 100))
      .to.be.rejectedWith('TransferNotAllowed');
  });

  itEth('fractionalize NFT with RFT transfers disallowed', async ({helper}) => {
    const owner = await helper.eth.createAccountWithBalance(donor);

    const rftCollection = await helper.rft.mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});
    const rftCollectionAddress = helper.ethAddress.fromCollectionId(rftCollection.collectionId);
    const fractionalizer = await deployContract(helper, owner);
    await rftCollection.addAdmin(donor, {Ethereum: await fractionalizer.getAddress()});

    await fractionalizer.setRFTCollection(rftCollectionAddress);
    await helper.executeExtrinsic(donor, 'api.tx.unique.setTransfersEnabledFlag', [rftCollection.collectionId, false], true);

    const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
    const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
    const mintResult = await (await nftContract.mint(owner)).wait(...waitParams);
    const nftTokenId = helper.eth.normalizeEvents(mintResult).Transfer.args.tokenId;

    await (await fractionalizer.setNftCollectionIsAllowed(nftCollection.collectionAddress, true)).wait(...waitParams);
    await (await nftContract.approve(fractionalizer.getAddress(), nftTokenId)).wait(...waitParams);

    await expect(fractionalizer.nft2rft.staticCall(nftCollection.collectionAddress, nftTokenId, 100n))
      .to.be.rejectedWith('TransferNotAllowed');
  });
});
