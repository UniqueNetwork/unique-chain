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


import {readFile} from 'fs/promises';

import type {IKeyringPair} from '@polkadot/types/types';
import {evmToAddress} from '@polkadot/util-crypto';

import {Contract, HDNodeWallet} from 'ethers';

import {usingEthPlaygrounds, expect, itEth, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import type {CompiledContract} from '@unique/test-utils/eth/types.js';
import {requirePalletsOrSkip, Pallets, makeNames} from '@unique/test-utils/util.js';

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
  const createCollectionTx = await fractionalizer.createAndSetRFTCollection.send('A', 'B', 'C', {value: createCollectionValue});
  const createCollectionReceipt = await createCollectionTx.wait(...waitParams);

  const events = helper.eth.normalizeEvents(createCollectionReceipt!);
  const rftCollectionAddress = events.RFTCollectionSet.args._collection;

  return {contract: fractionalizer, rftCollectionAddress};
};

// const mintRFTToken = async (helper: EthUniqueHelper, owner: string, fractionalizer: Contract, amount: bigint): Promise<{
//   nftCollectionAddress: string, nftTokenId: number, rftTokenAddress: string
// }> => {
//   const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
//   const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
//   const mintResult = await nftContract.methods.mint(owner).send();
//   const nftTokenId = mintResult.events.Transfer.args.tokenId;

//   await fractionalizer.methods.setNftCollectionIsAllowed(nftCollection.collectionAddress, true).send();
//   await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
//   const result = await fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, amount).send();
//   const {_collection, _tokenId, _rftToken} = result.events.Fractionalized.args;
//   return {
//     nftCollectionAddress: _collection,
//     nftTokenId: _tokenId,
//     rftTokenAddress: _rftToken,
//   };
// };


describe('Fractionalizer contract usage', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
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

    expect(events.events).to.be.like({RFTCollectionSet: {}});
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
            _status: isAllowed,
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

    await nftContract.approve.send(await fractionalizer.getAddress(), nftTokenId);

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
    const rftTokenContract = helper.ethNativeContract.rftToken(rftTokenAddress);
    expect(await rftTokenContract.balanceOf(owner)).to.equal('100');
  });

  //   itEth('RFT to NFT', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
  //     const {rftTokenAddress, nftCollectionAddress, nftTokenId} = await mintRFTToken(helper, owner, fractionalizer, 100n);

  //     const {collectionId, tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
  //     const refungibleAddress = helper.ethAddress.fromCollectionId(collectionId);
  //     expect(rftCollectionAddress).to.be.equal(refungibleAddress);
  //     const refungibleTokenContract = await helper.ethNativeContract.rftToken(rftTokenAddress, owner);
  //     await refungibleTokenContract.methods.approve(fractionalizer.options.address, 100).send();
  //     const result = await fractionalizer.methods.rft2nft(refungibleAddress, tokenId).send();
  //     expect(result.events).to.be.like({
  //       Defractionalized: {
  //         args: {
  //           _rftToken: rftTokenAddress,
  //           _nftCollection: nftCollectionAddress,
  //           _nftTokenId: nftTokenId,
  //         },
  //       },
  //     });
  //   });

  //   itEth('Test fractionalizer NFT <-> RFT mapping ', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
  //     const {rftTokenAddress, nftCollectionAddress, nftTokenId} = await mintRFTToken(helper, owner, fractionalizer, 100n);

  //     const {collectionId, tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
  //     const refungibleAddress = helper.ethAddress.fromCollectionId(collectionId);
  //     expect(rftCollectionAddress).to.be.equal(refungibleAddress);
  //     const refungibleTokenContract = await helper.ethNativeContract.rftToken(rftTokenAddress, owner);
  //     await refungibleTokenContract.methods.approve(fractionalizer.options.address, 100).send();

  //     const rft2nft = await fractionalizer.methods.rft2nftMapping(rftTokenAddress).call();
  //     expect(rft2nft).to.be.like({
  //       _collection: nftCollectionAddress,
  //       _tokenId: nftTokenId,
  //     });

  //     const nft2rft = await fractionalizer.methods.nft2rftMapping(nftCollectionAddress, nftTokenId).call();
  //     expect(nft2rft).to.be.eq(tokenId.toString());
  //   });
  // });



  // describe('Negative Integration Tests for fractionalizer', () => {
  //   let donor: IKeyringPair;

  //   before(async function() {
  //     await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
  //       requirePalletsOrSkip(this, helper, [Pallets.ReFungible]);
  //       donor = await privateKey({url: import.meta.url});
  //     });
  //   });

  //   itEth('call setRFTCollection twice', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
  //     const refungibleContract = await helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);

  //     const fractionalizer = await deployContract(helper, owner);
  //     const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(fractionalizer.options.address);
  //     await refungibleContract.methods.addCollectionAdminCross(fractionalizerAddressCross).send();
  //     await fractionalizer.methods.setRFTCollection(rftCollection.collectionAddress).send();

  //     await expect(fractionalizer.methods.setRFTCollection(rftCollection.collectionAddress).call())
  //       .to.be.rejectedWith(/RFT collection is already set$/g);
  //   });

  //   itEth('call setRFTCollection with NFT collection', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);

  //     const fractionalizer = await deployContract(helper, owner);
  //     const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(fractionalizer.options.address);
  //     await nftContract.methods.addCollectionAdminCross(fractionalizerAddressCross).send();

  //     await expect(fractionalizer.methods.setRFTCollection(nftCollection.collectionAddress).call())
  //       .to.be.rejectedWith(/Wrong collection type. Collection is not refungible.$/g);
  //   });

  //   itEth('call setRFTCollection while not collection admin', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const fractionalizer = await deployContract(helper, owner);
  //     const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');

  //     await expect(fractionalizer.methods.setRFTCollection(rftCollection.collectionAddress).call())
  //       .to.be.rejectedWith(/Fractionalizer contract should be an admin of the collection$/g);
  //   });

  //   itEth('call setRFTCollection after createAndSetRFTCollection', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const fractionalizer = await deployContract(helper, owner);
  //     await helper.balance.transferToSubstrate(donor, evmToAddress(fractionalizer.options.address), 10n * helper.balance.getOneTokenNominal());

  //     const result = await fractionalizer.methods.createAndSetRFTCollection('A', 'B', 'C').send({from: owner, value: Number(2n * helper.balance.getOneTokenNominal())});
  //     const collectionIdAddress = result.events.RFTCollectionSet.args._collection;

  //     await expect(fractionalizer.methods.setRFTCollection(collectionIdAddress).call())
  //       .to.be.rejectedWith(/RFT collection is already set$/g);
  //   });

  //   itEth('call nft2rft without setting RFT collection for contract', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  //     const mintResult = await nftContract.methods.mint(owner).send();
  //     const nftTokenId = mintResult.events.Transfer.args.tokenId;

  //     const fractionalizer = await deployContract(helper, owner);

  //     await expect(fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, 100).call())
  //       .to.be.rejectedWith(/RFT collection is not set$/g);
  //   });

  //   itEth('call nft2rft while not owner of NFT token', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const nftOwner = await helper.eth.createAccountWithBalance(donor);

  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  //     const mintResult = await nftContract.methods.mint(owner).send();
  //     const nftTokenId = mintResult.events.Transfer.args.tokenId;
  //     await nftContract.methods.transfer(nftOwner, 1).send();


  //     const {contract: fractionalizer} = await initContract(helper, owner);
  //     await fractionalizer.methods.setNftCollectionIsAllowed(nftCollection.collectionAddress, true).send();

  //     await expect(fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, 100).call())
  //       .to.be.rejectedWith(/Only token owner could fractionalize it$/g);
  //   });

  //   itEth('call nft2rft while not in list of allowed accounts', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  //     const mintResult = await nftContract.methods.mint(owner).send();
  //     const nftTokenId = mintResult.events.Transfer.args.tokenId;

  //     const {contract: fractionalizer} = await initContract(helper, owner);

  //     await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();
  //     await expect(fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, 100).call())
  //       .to.be.rejectedWith(/Fractionalization of this collection is not allowed by admin$/g);
  //   });

  //   itEth('call nft2rft while fractionalizer doesnt have approval for nft token', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  //     const mintResult = await nftContract.methods.mint(owner).send();
  //     const nftTokenId = mintResult.events.Transfer.args.tokenId;

  //     const {contract: fractionalizer} = await initContract(helper, owner);

  //     await fractionalizer.methods.setNftCollectionIsAllowed(nftCollection.collectionAddress, true).send();
  //     await expect(fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, 100).call())
  //       .to.be.rejectedWith(/ApprovedValueTooLow$/g);
  //   });

  //   itEth('call rft2nft without setting RFT collection for contract', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const fractionalizer = await deployContract(helper, owner);
  //     const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
  //     const refungibleContract = await helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);
  //     const mintResult = await refungibleContract.methods.mint(owner).send();
  //     const rftTokenId = mintResult.events.Transfer.args.tokenId;

  //     await expect(fractionalizer.methods.rft2nft(rftCollection.collectionAddress, rftTokenId).call())
  //       .to.be.rejectedWith(/RFT collection is not set$/g);
  //   });

  //   itEth('call rft2nft for RFT token that is not from configured RFT collection', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const {contract: fractionalizer} = await initContract(helper, owner);
  //     const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
  //     const refungibleContract = helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);
  //     const mintResult = await refungibleContract.methods.mint(owner).send();
  //     const rftTokenId = mintResult.events.Transfer.args.tokenId;

  //     await expect(fractionalizer.methods.rft2nft(rftCollection.collectionAddress, rftTokenId).call())
  //       .to.be.rejectedWith(/Wrong RFT collection$/g);
  //   });

  //   itEth('call rft2nft for RFT token that was not minted by fractionalizer contract', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const rftCollection = await helper.eth.createRFTCollection(owner, 'rft', 'RFT collection', 'RFT');
  //     const refungibleContract = helper.ethNativeContract.collection(rftCollection.collectionAddress, 'rft', owner);

  //     const fractionalizer = await deployContract(helper, owner);

  //     const fractionalizerAddressCross = helper.ethCrossAccount.fromAddress(fractionalizer.options.address);
  //     await refungibleContract.methods.addCollectionAdminCross(fractionalizerAddressCross).send();
  //     await fractionalizer.methods.setRFTCollection(rftCollection.collectionAddress).send();

  //     const mintResult = await refungibleContract.methods.mint(owner).send();
  //     const rftTokenId = mintResult.events.Transfer.args.tokenId;

  //     await expect(fractionalizer.methods.rft2nft(rftCollection.collectionAddress, rftTokenId).call())
  //       .to.be.rejectedWith(/No corresponding NFT token found$/g);
  //   });

  //   itEth('call rft2nft without owning all RFT pieces', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const receiver = await helper.eth.createAccountWithBalance(donor);

  //     const {contract: fractionalizer, rftCollectionAddress} = await initContract(helper, owner);
  //     const {rftTokenAddress} = await mintRFTToken(helper, owner, fractionalizer, 100n);

  //     const {tokenId} = helper.ethAddress.extractTokenId(rftTokenAddress);
  //     const refungibleTokenContract = helper.ethNativeContract.rftToken(rftTokenAddress, owner);
  //     await refungibleTokenContract.methods.transfer(receiver, 50).send();
  //     await refungibleTokenContract.methods.approve(fractionalizer.options.address, 50).send({from: receiver});
  //     await expect(fractionalizer.methods.rft2nft(rftCollectionAddress, tokenId).call({from: receiver}))
  //       .to.be.rejectedWith(/Not all pieces are owned by the caller$/g);
  //   });

  //   itEth('send QTZ/UNQ to contract from non owner', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const payer = await helper.eth.createAccountWithBalance(donor);

  //     const fractionalizer = await deployContract(helper, owner);
  //     const amount = 10n * helper.balance.getOneTokenNominal();
  //     const web3 = helper.getWeb3();
  //     await expect(web3.eth.sendTransaction({from: payer, to: fractionalizer.options.address, value: `${amount}`, gas: helper.eth.DEFAULT_GAS})).to.be.rejected;
  //   });

  //   itEth('fractionalize NFT with NFT transfers disallowed', async ({helper}) => {
  //     const nftCollection = await helper.nft.mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});

  //     const owner = await helper.eth.createAccountWithBalance(donor);
  //     const nftToken = await nftCollection.mintToken(donor, {Ethereum: owner});
  //     await helper.executeExtrinsic(donor, 'api.tx.unique.setTransfersEnabledFlag', [nftCollection.collectionId, false], true);
  //     const nftCollectionAddress = helper.ethAddress.fromCollectionId(nftCollection.collectionId);
  //     const {contract: fractionalizer} = await initContract(helper, owner);
  //     await fractionalizer.methods.setNftCollectionIsAllowed(nftCollectionAddress, true).send();

  //     const nftContract = await helper.ethNativeContract.collection(nftCollectionAddress, 'nft', owner);
  //     await nftContract.methods.approve(fractionalizer.options.address, nftToken.tokenId).send();
  //     await expect(fractionalizer.methods.nft2rft(nftCollectionAddress, nftToken.tokenId, 100).call())
  //       .to.be.rejectedWith(/TransferNotAllowed$/g);
  //   });

  //   itEth('fractionalize NFT with RFT transfers disallowed', async ({helper}) => {
  //     const owner = await helper.eth.createAccountWithBalance(donor);

  //     const rftCollection = await helper.rft.mintCollection(donor, {name: 'A', description: 'B', tokenPrefix: 'C'});
  //     const rftCollectionAddress = helper.ethAddress.fromCollectionId(rftCollection.collectionId);
  //     const fractionalizer = await deployContract(helper, owner);
  //     await rftCollection.addAdmin(donor, {Ethereum: fractionalizer.options.address});

  //     await fractionalizer.methods.setRFTCollection(rftCollectionAddress).send();
  //     await helper.executeExtrinsic(donor, 'api.tx.unique.setTransfersEnabledFlag', [rftCollection.collectionId, false], true);

  //     const nftCollection = await helper.eth.createNFTCollection(owner, 'nft', 'NFT collection', 'NFT');
  //     const nftContract = await helper.ethNativeContract.collection(nftCollection.collectionAddress, 'nft', owner);
  //     const mintResult = await nftContract.methods.mint(owner).send();
  //     const nftTokenId = mintResult.events.Transfer.args.tokenId;

  //     await fractionalizer.methods.setNftCollectionIsAllowed(nftCollection.collectionAddress, true).send();
  //     await nftContract.methods.approve(fractionalizer.options.address, nftTokenId).send();

//     await expect(fractionalizer.methods.nft2rft(nftCollection.collectionAddress, nftTokenId, 100n).call())
//       .to.be.rejectedWith(/TransferNotAllowed$/g);
//   });
});
