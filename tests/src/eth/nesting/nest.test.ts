import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';

import {itEth, EthUniqueHelper, usingEthPlaygrounds, expect} from '../util/playgrounds';

const createNestingCollection = async (
  helper: EthUniqueHelper,
  owner: string,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const {collectionAddress, collectionId} = await helper.eth.createNonfungibleCollection(owner, 'A', 'B', 'C');

  const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
  await contract.methods.setCollectionNesting(true).send({from: owner});

  return {collectionId, collectionAddress, contract};
};


describe('EVM nesting tests group', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  describe('Integration Test: EVM Nesting', () => {
    itEth('NFT: allows an Owner to nest/unnest their token', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId, contract} = await createNestingCollection(helper, owner);
  
      // Create a token to be nested
      const targetNFTTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(
        owner,
        targetNFTTokenId,
      ).send({from: owner});
  
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNFTTokenId);
  
      // Create a nested token
      const firstTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(
        targetNftTokenAddress,
        firstTokenId,
      ).send({from: owner});
  
      expect(await contract.methods.ownerOf(firstTokenId).call()).to.be.equal(targetNftTokenAddress);
  
      // Create a token to be nested and nest
      const secondTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(
        owner,
        secondTokenId,
      ).send({from: owner});
  
      await contract.methods.transfer(targetNftTokenAddress, secondTokenId).send({from: owner});
  
      expect(await contract.methods.ownerOf(secondTokenId).call()).to.be.equal(targetNftTokenAddress);
  
      // Unnest token back
      await contract.methods.transferFrom(targetNftTokenAddress, owner, secondTokenId).send({from: owner});
      expect(await contract.methods.ownerOf(secondTokenId).call()).to.be.equal(owner);
    });
  
    itEth('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
  
      const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(helper, owner);
      const {collectionAddress: collectionAddressB, contract: contractB} = await createNestingCollection(helper, owner);
      await contractA.methods.setCollectionNesting(true, [collectionAddressA, collectionAddressB]).send({from: owner});
  
      // Create a token to nest into
      const targetNftTokenId = await contractA.methods.nextTokenId().call();
      await contractA.methods.mint(
        owner,
        targetNftTokenId,
      ).send({from: owner});
      const nftTokenAddressA1 = helper.ethAddress.fromTokenId(collectionIdA, targetNftTokenId);
  
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
    itEth('NFT: disallows to nest token if nesting is disabled', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
  
      const {collectionId, contract} = await createNestingCollection(helper, owner);
      await contract.methods.setCollectionNesting(false).send({from: owner});
  
      // Create a token to nest into
      const targetNftTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(
        owner,
        targetNftTokenId,
      ).send({from: owner});
  
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNftTokenId);
  
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
  
    itEth('NFT: disallows a non-Owner to nest someone else\'s token', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const malignant = await helper.eth.createAccountWithBalance(donor);
  
      const {collectionId, contract} = await createNestingCollection(helper, owner);
  
      // Mint a token
      const targetTokenId = await contract.methods.nextTokenId().call();
      await contract.methods.mint(
        owner,
        targetTokenId,
      ).send({from: owner});
      const targetTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);
  
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
  
    itEth('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const malignant = await helper.eth.createAccountWithBalance(donor);
  
      const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(helper, owner);
      const {collectionAddress: collectionAddressB, contract: contractB} = await createNestingCollection(helper, owner);
  
      await contractA.methods.setCollectionNesting(true, [collectionAddressA, collectionAddressB]).send({from: owner});
  
      // Create a token in one collection
      const nftTokenIdA = await contractA.methods.nextTokenId().call();
      await contractA.methods.mint(
        owner,
        nftTokenIdA,
      ).send({from: owner});
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);
  
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
  
    itEth('NFT: disallows to nest token in an unlisted collection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
  
      const {collectionId: collectionIdA, collectionAddress: collectionAddressA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);
  
      await contractA.methods.setCollectionNesting(true, [collectionAddressA]).send({from: owner});
  
      // Create a token in one collection
      const nftTokenIdA = await contractA.methods.nextTokenId().call();
      await contractA.methods.mint(
        owner,
        nftTokenIdA,
      ).send({from: owner});
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);
  
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
});
