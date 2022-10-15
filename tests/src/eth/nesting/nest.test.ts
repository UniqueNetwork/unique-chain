import {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';

import {itEth, EthUniqueHelper, usingEthPlaygrounds, expect} from '../util/playgrounds';

const createNestingCollection = async (
  helper: EthUniqueHelper,
  owner: string,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

  const contract = helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
  await contract.methods.setCollectionNesting(true).send({from: owner});

  return {collectionId, collectionAddress, contract};
};


describe('EVM nesting tests group', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = privateKey('//Alice');
    });
  });

  describe('Integration Test: EVM Nesting', () => {
    itEth('NFT: allows an Owner to nest/unnest their token', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId, contract} = await createNestingCollection(helper, owner);

      // Create a token to be nested to
      const mintingTargetNFTTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const targetNFTTokenId = mintingTargetNFTTokenIdResult.events.Transfer.returnValues.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNFTTokenId);

      // Create a nested token
      const mintingFirstTokenIdResult = await contract.methods.mint(targetNftTokenAddress).send({from: owner});
      const firstTokenId = mintingFirstTokenIdResult.events.Transfer.returnValues.tokenId;
      expect(await contract.methods.ownerOf(firstTokenId).call()).to.be.equal(targetNftTokenAddress);

      // Create a token to be nested and nest
      const mintingSecondTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const secondTokenId = mintingSecondTokenIdResult.events.Transfer.returnValues.tokenId;

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
      const mintingtargetNftTokenIdResult = await contractA.methods.mint(owner).send({from: owner});
      const targetNftTokenId = mintingtargetNftTokenIdResult.events.Transfer.returnValues.tokenId;
      const nftTokenAddressA1 = helper.ethAddress.fromTokenId(collectionIdA, targetNftTokenId);

      // Create a token for nesting in the same collection as the target
      const mintingTokenIdAResult = await contractA.methods.mint(owner).send({from: owner});
      const nftTokenIdA = mintingTokenIdAResult.events.Transfer.returnValues.tokenId;

      // Create a token for nesting in a different collection
      const mintingTokenIdBResult = await contractB.methods.mint(owner).send({from: owner});
      const nftTokenIdB = mintingTokenIdBResult.events.Transfer.returnValues.tokenId;

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
      const mintingTargetTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);

      // Create a token to nest
      const mintingNftTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const nftTokenId = mintingNftTokenIdResult.events.Transfer.returnValues.tokenId;

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
      const mintingTargetTokenIdResult = await contract.methods.mint(owner).send({from: owner});
      const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
      const targetTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);

      // Mint a token belonging to a different account
      const mintingTokenIdResult = await contract.methods.mint(malignant).send({from: owner});
      const tokenId = mintingTokenIdResult.events.Transfer.returnValues.tokenId;

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
      const mintingTokenIdAResult = await contractA.methods.mint(owner).send({from: owner});
      const nftTokenIdA = mintingTokenIdAResult.events.Transfer.returnValues.tokenId;
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);

      // Create a token in another collection
      const mintingTokenIdBResult = await contractB.methods.mint(malignant).send({from: owner});
      const nftTokenIdB = mintingTokenIdBResult.events.Transfer.returnValues.tokenId;

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
      const mintingTokenIdAResult = await contractA.methods.mint(owner).send({from: owner});
      const nftTokenIdA = mintingTokenIdAResult.events.Transfer.returnValues.tokenId;
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);

      // Create a token in another collection
      const mintingTokenIdBResult = await contractB.methods.mint(owner).send({from: owner});
      const nftTokenIdB = mintingTokenIdBResult.events.Transfer.returnValues.tokenId;


      // Try to nest into a token in the other collection, disallowed in the first
      await expect(contractB.methods
        .transfer(nftTokenAddressA, nftTokenIdB)
        .call()).to.be.rejectedWith('SourceCollectionIsNotAllowedToNest');
    });
  });
});
