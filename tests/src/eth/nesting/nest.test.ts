import type {IKeyringPair} from '@polkadot/types/types';
import {Contract} from 'web3-eth-contract';

import {itEth, usingEthPlaygrounds, expect} from '../util/index.js';
import {EthUniqueHelper} from '../util/playgrounds/unique.dev.js';

const createNestingCollection = async (
  helper: EthUniqueHelper,
  owner: string,
  mergeDeprecated = false,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

  const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, mergeDeprecated);
  await contract.methods.setCollectionNesting([true, false, []]).send({from: owner});

  return {collectionId, collectionAddress, contract};
};


describe('EVM nesting tests group', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (_, privateKey) => {
      donor = await privateKey({url: import.meta.url});
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

    itEth('NFT: collectionNesting()', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress: unnestedCollectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
      const unnestedContract = await helper.ethNativeContract.collection(unnestedCollectionAddress, 'nft', owner);
      expect(await unnestedContract.methods.collectionNesting().call({from: owner})).to.be.like([false, false, []]);

      const {contract} = await createNestingCollection(helper, owner);
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([true, false, []]);
      await contract.methods.setCollectionNesting([true, false, [unnestedCollectionAddress]]).send({from: owner});
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([true, false, [unnestedCollectionAddress]]);
      await contract.methods.setCollectionNesting([false, true, [unnestedCollectionAddress]]).send({from: owner});
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([false, true, [unnestedCollectionAddress]]);
      await contract.methods.setCollectionNesting([false, false, []]).send({from: owner});
      expect(await contract.methods.collectionNesting().call({from: owner})).to.be.like([false, false, []]);
    });

    // Sof-deprecated
    itEth('NFT: collectionNestingRestrictedCollectionIds() & collectionNestingPermissions', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId: unnestedCollsectionId, collectionAddress: unnsetedCollectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
      const unnestedContract = await helper.ethNativeContract.collection(unnsetedCollectionAddress, 'nft', owner, true);
      expect(await unnestedContract.methods.collectionNestingRestrictedCollectionIds().call({from: owner})).to.be.like([false, []]);

      const {contract} = await createNestingCollection(helper, owner, true);
      expect(await contract.methods.collectionNestingRestrictedCollectionIds().call({from: owner})).to.be.like([true, []]);
      await contract.methods['setCollectionNesting(bool,address[])'](true, [unnsetedCollectionAddress]).send({from: owner});
      expect(await contract.methods.collectionNestingRestrictedCollectionIds().call({from: owner})).to.be.like([true, [unnestedCollsectionId.toString()]]);
      expect(await contract.methods.collectionNestingPermissions().call({from: owner})).to.be.like([['1', false], ['0', true]]);
      await contract.methods['setCollectionNesting(bool)'](false).send({from: owner});
      expect(await contract.methods.collectionNestingPermissions().call({from: owner})).to.be.like([['1', false], ['0', false]]);
    });

    itEth('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);
      await contractA.methods.setCollectionNesting([true, false, [contractA.options.address, contractB.options.address]]).send({from: owner});

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

  describe('Negative Test: EVM Nesting', () => {
    itEth('NFT: disallows to nest token if nesting is disabled', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId, contract} = await createNestingCollection(helper, owner);
      await contract.methods.setCollectionNesting([false, false, []]).send({from: owner});

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

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);

      await contractA.methods.setCollectionNesting([true, false, [contractA.options.address, contractB.options.address]]).send({from: owner});

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

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);

      await contractA.methods.setCollectionNesting([true, false, [contractA.options.address]]).send({from: owner});

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

  describe('Fungible', () => {
    async function createFungibleCollection(helper: EthUniqueHelper, owner: string, mode: 'ft' | 'native ft') {
      if(mode === 'ft') {
        const {collectionAddress} = await helper.eth.createFungibleCollection(owner, '', 18, '', '');
        const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
        await contract.methods.mint(owner, 100n).send({from: owner});
        return {collectionAddress, contract};
      }

      // native ft
      const collectionAddress = helper.ethAddress.fromCollectionId(0);
      const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
      return {collectionAddress, contract};
    }

    [
      {mode: 'ft' as const},
      {mode: 'native ft' as const},
    ].map(testCase => {
      itEth(`Allow nest [${testCase.mode}]`, async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId: targetCollectionId, contract: targetContract} = await createNestingCollection(helper, owner);
        const {contract: ftContract} = await createFungibleCollection(helper, owner, testCase.mode);

        const mintingTargetTokenIdResult = await targetContract.methods.mint(owner).send({from: owner});
        const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        await ftContract.methods.transfer(targetTokenAddress, 10n).send({from: owner});
        expect(await ftContract.methods.balanceOf(targetTokenAddress).call({from: owner})).to.be.equal('10');
      });
    });

    [
      {mode: 'ft' as const},
      {mode: 'native ft' as const},
    ].map(testCase => {
      itEth(`Allow partial/full unnest [${testCase.mode}]`, async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId: targetCollectionId, contract: targetContract} = await createNestingCollection(helper, owner);
        const {contract: ftContract} = await createFungibleCollection(helper, owner, testCase.mode);

        const mintingTargetTokenIdResult = await targetContract.methods.mint(owner).send({from: owner});
        const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        await ftContract.methods.transfer(targetTokenAddress, 10n).send({from: owner});

        await ftContract.methods.transferFrom(targetTokenAddress, owner, 5n).send({from: owner});
        expect(await ftContract.methods.balanceOf(targetTokenAddress).call({from: owner})).to.be.equal('5');

        await ftContract.methods.transferFrom(targetTokenAddress, owner, 5n).send({from: owner});
        expect(await ftContract.methods.balanceOf(targetTokenAddress).call({from: owner})).to.be.equal('0');
      });
    });

    [
      {mode: 'ft' as const},
      {mode: 'native ft' as const},
    ].map(testCase => {
      itEth(`Disallow nest into collection without nesting permission [${testCase.mode}] (except for native fungible collection)`, async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId: targetCollectionId, contract: targetContract} = await createNestingCollection(helper, owner);
        await targetContract.methods.setCollectionNesting([false, false, []]).send({from: owner});

        const {contract: ftContract} = await createFungibleCollection(helper, owner, testCase.mode);

        const mintingTargetTokenIdResult = await targetContract.methods.mint(owner).send({from: owner});
        const targetTokenId = mintingTargetTokenIdResult.events.Transfer.returnValues.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        if(testCase.mode === 'ft') {
          await expect(ftContract.methods.transfer(targetTokenAddress, 10n).call({from: owner})).to.be.rejectedWith('UserIsNotAllowedToNest');
        } else {
          await expect(ftContract.methods.transfer(targetTokenAddress, 10n).call({from: owner})).to.be.not.rejected;
        }
      });
    });
  });
});
