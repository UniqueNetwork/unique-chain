import {ApiPromise} from '@polkadot/api';
import {Contract} from 'web3-eth-contract';
import {expect} from 'chai';
import Web3 from 'web3';
import {createEthAccountWithBalance, evmCollectionHelpers, GAS_ARGS, getCollectionAddressFromResult, itWeb3, tokenIdToAddress} from '../../eth/util/helpers';
import nonFungibleAbi from '../nonFungibleAbi.json';

const createNestingCollection = async (
  api: ApiPromise,
  web3: Web3,
  owner: string,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const collectionHelper = evmCollectionHelpers(web3, owner);
        
  const result = await collectionHelper.methods
    .createNonfungibleCollection('A', 'B', 'C')
    .send();
  const {collectionIdAddress: collectionAddress, collectionId} = await getCollectionAddressFromResult(api, result);

  const contract = new web3.eth.Contract(nonFungibleAbi as any, collectionAddress, {from: owner, ...GAS_ARGS});
  await contract.methods.addCollectionAdmin(owner).send();
  await contract.methods.setCollectionNesting(true).send({from: owner});

  return {collectionId, collectionAddress, contract};
};

describe('Integration Test: EVM Nesting', () => {
  itWeb3('NFT: allows an Owner to nest/unnest their token', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const {collectionId, contract} = await createNestingCollection(api, web3, owner);

    // Create a token to be nested
    const nftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      nftTokenId,
    ).send({from: owner});

    // Nest into a token
    const firstTargetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      firstTargetNftTokenId,
    ).send({from: owner});

    const targetNftTokenAddress = tokenIdToAddress(collectionId, firstTargetNftTokenId);

    await contract.methods.transfer(targetNftTokenAddress, nftTokenId).send({from: owner});
    expect(await contract.methods.ownerOf(nftTokenId).call()).to.be.equal(targetNftTokenAddress);

    // Re-nest into another
    const secondTargetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      secondTargetNftTokenId,
    ).send({from: owner});
    const nextNftTokenAddress = tokenIdToAddress(collectionId, secondTargetNftTokenId);

    await contract.methods.transfer(nextNftTokenAddress, nftTokenId).send({from: owner});
    expect(await contract.methods.ownerOf(nftTokenId).call()).to.be.equal(nextNftTokenAddress);
  });

  itWeb3('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(api, web3, owner);
    const {collectionAddress: collectionAddressB, contract: contractB} = await createNestingCollection(api, web3, owner);
    await contractA.methods.setCollectionNesting(true, [collectionAddressA, collectionAddressB]).send({from: owner});

    // Create a token to nest into
    const targetNftTokenId = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      targetNftTokenId,
    ).send({from: owner});
    const nftTokenAddressA1 = tokenIdToAddress(collectionIdA, targetNftTokenId);

    // Create a token for nesting in the same collection as the target
    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});

    // Create a token for nesting in a different collection
    const nftTokenIdB = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      owner,
      nftTokenIdB,
    ).send({from: owner});

    // Nest
    await contractA.methods.transfer(nftTokenAddressA1, nftTokenIdA).send({from: owner});
    expect(await contractA.methods.ownerOf(nftTokenIdA).call()).to.be.equal(nftTokenAddressA1);

    await contractB.methods.transfer(nftTokenAddressA1, nftTokenIdB).send({from: owner});
    expect(await contractB.methods.ownerOf(nftTokenIdB).call()).to.be.equal(nftTokenAddressA1);
  });
});

describe('Negative Test: EVM Nesting', async() => {
  itWeb3('NFT: disallows to nest token if nesting is disabled', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionId, contract} = await createNestingCollection(api, web3, owner);
    await contract.methods.setCollectionNesting(false).send({from: owner});

    // Create a token to nest into
    const targetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      targetNftTokenId,
    ).send({from: owner});

    const targetNftTokenAddress = tokenIdToAddress(collectionId, targetNftTokenId);

    // Create a token to nest
    const nftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      nftTokenId,
    ).send({from: owner});

    // Try to nest
    await expect(contract.methods
      .transfer(targetNftTokenAddress, nftTokenId)
      .call({from: owner})).to.be.rejectedWith('UserIsNotAllowedToNest');
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const malignant = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionId, contract} = await createNestingCollection(api, web3, owner);

    // Mint a token
    const targetTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      targetTokenId,
    ).send({from: owner});
    const targetTokenAddress = tokenIdToAddress(collectionId, targetTokenId);
    
    // Mint a token belonging to a different account
    const tokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      malignant,
      tokenId,
    ).send({from: owner});
      
    // Try to nest one token in another as a non-owner account
    await expect(contract.methods
      .transfer(targetTokenAddress, tokenId)
      .call({from: malignant})).to.be.rejectedWith('UserIsNotAllowedToNest');
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const malignant = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(api, web3, owner);
    const {collectionAddress: collectionAddressB, contract: contractB} = await createNestingCollection(api, web3, owner);

    await contractA.methods.setCollectionNesting(true, [collectionAddressA, collectionAddressB]).send({from: owner});

    // Create a token in one collection
    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});
    const nftTokenAddressA = tokenIdToAddress(collectionIdA, nftTokenIdA);

    // Create a token in another collection belonging to someone else
    const nftTokenIdB = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      malignant,
      nftTokenIdB,
    ).send({from: owner});

    // Try to drag someone else's token into the other collection and nest
    await expect(contractB.methods
      .transfer(nftTokenAddressA, nftTokenIdB)
      .call({from: malignant})).to.be.rejectedWith('UserIsNotAllowedToNest');
  });
  
  itWeb3('NFT: disallows to nest token in an unlisted collection', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);

    const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(api, web3, owner);
    const {contract: contractB} = await createNestingCollection(api, web3, owner);

    await contractA.methods.setCollectionNesting(true, [collectionAddressA]).send({from: owner});

    // Create a token in one collection
    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});
    const nftTokenAddressA = tokenIdToAddress(collectionIdA, nftTokenIdA);

    // Create a token in another collection
    const nftTokenIdB = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      owner,
      nftTokenIdB,
    ).send({from: owner});

    // Try to nest into a token in the other collection, disallowed in the first
    await expect(contractB.methods
      .transfer(nftTokenAddressA, nftTokenIdB)
      .call()).to.be.rejectedWith('SourceCollectionIsNotAllowedToNest');
  });
});
