import type {IKeyringPair} from '@polkadot/types/types';
import {Contract, HDNodeWallet} from 'ethers';

import {itEth, usingEthPlaygrounds, expect, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';

const createNestingCollection = async (
  helper: EthUniqueHelper,
  owner: HDNodeWallet,
  mergeDeprecated = false,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

  const contract = await helper.ethNativeContract.collection(collectionAddress, 'nft', owner, mergeDeprecated);
  await (await contract.setCollectionNesting.send([true, false, []])).wait(...waitParams);

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
      const mintingTargetNFTTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
      const mintingTargetNFTTokenIdEvents = helper.eth.normalizeEvents(mintingTargetNFTTokenIdReceipt!);
      const targetNFTTokenId = +mintingTargetNFTTokenIdEvents.Transfer.args.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNFTTokenId);

      // Create a nested token
      const mintingFirstTokenIdReceipt = await (await contract.mint.send(targetNftTokenAddress)).wait(...waitParams);
      const mintingFirstTokenIdEvents = helper.eth.normalizeEvents(mintingFirstTokenIdReceipt!);
      const firstTokenId = +mintingFirstTokenIdEvents.Transfer.args.tokenId;
      expect(await contract.ownerOf.staticCall(firstTokenId)).to.be.equal(targetNftTokenAddress);

      // Create a token to be nested and nest
      const mintingSecondTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
      const mintingSecondTokenIdEvents = helper.eth.normalizeEvents(mintingSecondTokenIdReceipt!);
      const secondTokenId = mintingSecondTokenIdEvents.Transfer.args.tokenId;

      await (await contract.transfer.send(targetNftTokenAddress, secondTokenId)).wait(...waitParams);
      expect(await contract.ownerOf.staticCall(secondTokenId)).to.be.equal(targetNftTokenAddress);

      // Unnest token back
      await (await contract.transferFrom.send(targetNftTokenAddress, owner, secondTokenId)).wait(...waitParams);
      expect(await contract.ownerOf.staticCall(secondTokenId)).to.be.equal(owner);
    });

    itEth('NFT: collectionNesting()', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionAddress: unnestedCollectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
      const unnestedContract = await helper.ethNativeContract.collection(unnestedCollectionAddress, 'nft', owner);
      expect(await unnestedContract.collectionNesting.staticCall()).to.be.like([false, false, []]);

      const {contract} = await createNestingCollection(helper, owner);
      expect(await contract.collectionNesting.staticCall()).to.be.like([true, false, []]);
      await (await contract.setCollectionNesting.send([true, false, [unnestedCollectionAddress]])).wait(...waitParams);
      expect(await contract.collectionNesting.staticCall()).to.be.like([true, false, [unnestedCollectionAddress]]);
      await (await contract.setCollectionNesting.send([false, true, [unnestedCollectionAddress]])).wait(...waitParams);
      expect(await contract.collectionNesting.staticCall()).to.be.like([false, true, [unnestedCollectionAddress]]);
      await (await contract.setCollectionNesting.send([false, false, []])).wait(...waitParams);
      expect(await contract.collectionNesting.staticCall()).to.be.like([false, false, []]);
    });

    // Sof-deprecated
    itEth('NFT: collectionNestingRestrictedCollectionIds() & collectionNestingPermissions', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const {collectionId: unnestedCollsectionId, collectionAddress: unnsetedCollectionAddress} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');
      const unnestedContract = await helper.ethNativeContract.collection(unnsetedCollectionAddress, 'nft', owner, true);
      expect(await unnestedContract.collectionNestingRestrictedCollectionIds.staticCall()).to.be.like([false, []]);

      const {contract} = await createNestingCollection(helper, owner, true);
      expect(await contract.collectionNestingRestrictedCollectionIds.staticCall()).to.be.like([true, []]);
      await (await contract.setCollectionNesting.send(true, [unnsetedCollectionAddress])).wait(...waitParams);
      expect(await contract.collectionNestingRestrictedCollectionIds.staticCall()).to.be.like([true, [unnestedCollsectionId.toString()]]);
      expect(await contract.collectionNestingPermissions.staticCall()).to.be.like([['1', false], ['0', true]]);
      await (await contract.setCollectionNesting.send(false)).wait(...waitParams);
      expect(await contract.collectionNestingPermissions.staticCall()).to.be.like([['1', false], ['0', false]]);
    });

    itEth('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);
      await (await contractA.setCollectionNesting.send([true, false, [await contractA.getAddress(), await contractB.getAddress()]])).wait(...waitParams);

      // Create a token to nest into
      const mintingtargetNftTokenIdReceipt = await (await contractA.mint.send(owner)).wait(...waitParams);
      const mintingtargetNftTokenIdEvents = helper.eth.normalizeEvents(mintingtargetNftTokenIdReceipt!);
      const targetNftTokenId = +mintingtargetNftTokenIdEvents.Transfer.args.tokenId;
      const nftTokenAddressA1 = helper.ethAddress.fromTokenId(collectionIdA, targetNftTokenId);

      // Create a token for nesting in the same collection as the target
      const mintingTokenIdAReceipt = await (await contractA.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdAEvents = helper.eth.normalizeEvents(mintingTokenIdAReceipt!);
      const nftTokenIdA = +mintingTokenIdAEvents.Transfer.args.tokenId;

      // Create a token for nesting in a different collection
      const mintingTokenIdBReceipt = await (await contractB.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdBEvents = helper.eth.normalizeEvents(mintingTokenIdBReceipt!);
      const nftTokenIdB = +mintingTokenIdBEvents.Transfer.args.tokenId;

      // Nest
      await (await contractA.transfer.send(nftTokenAddressA1, nftTokenIdA)).wait(...waitParams);
      expect(await contractA.ownerOf.staticCall(nftTokenIdA)).to.be.equal(nftTokenAddressA1);

      await (await contractB.transfer.send(nftTokenAddressA1, nftTokenIdB)).wait(...waitParams);
      expect(await contractB.ownerOf.staticCall(nftTokenIdB)).to.be.equal(nftTokenAddressA1);
    });
  });

  describe('Negative Test: EVM Nesting', () => {
    itEth('NFT: disallows to nest token if nesting is disabled', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId, contract} = await createNestingCollection(helper, owner);
      await (await contract.setCollectionNesting.send([false, false, []])).wait(...waitParams);

      // Create a token to nest into
      const mintingTargetTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
      const mintingTargetTokenIdEvents = helper.eth.normalizeEvents(mintingTargetTokenIdReceipt!);
      const targetTokenId = +mintingTargetTokenIdEvents.Transfer.args.tokenId;
      const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);

      // Create a token to nest
      const mintingNftTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
      const mintingNftTokenIdEvents = helper.eth.normalizeEvents(mintingNftTokenIdReceipt!);
      const nftTokenId = mintingNftTokenIdEvents.Transfer.args.tokenId;

      // Try to nest
      await expect(contract.transfer.staticCall(targetNftTokenAddress, nftTokenId)).to.be.rejectedWith('UserIsNotAllowedToNest');
    });

    itEth('NFT: disallows a non-Owner to nest someone else\'s token', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const malignant = await helper.eth.createAccountWithBalance(donor);

      const {collectionId, contract} = await createNestingCollection(helper, owner);

      // Mint a token
      const mintingTargetTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
      const mintingTargetTokenIdEvents = helper.eth.normalizeEvents(mintingTargetTokenIdReceipt!);
      const targetTokenId = +mintingTargetTokenIdEvents.Transfer.args.tokenId;
      const targetTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetTokenId);

      // Mint a token belonging to a different account
      const mintingTokenIdReceipt = await (await contract.mint.send(malignant)).wait(...waitParams);
      const mintingTokenIdEvents = helper.eth.normalizeEvents(mintingTokenIdReceipt!);
      const tokenId = +mintingTokenIdEvents.Transfer.args.tokenId;

      // Try to nest one token in another as a non-owner account
      await expect(contract.transfer.staticCall(targetTokenAddress, tokenId, {from: malignant})).to.be.rejectedWith('UserIsNotAllowedToNest');
    });

    itEth('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);
      const malignant = await helper.eth.createAccountWithBalance(donor);

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);

      await (await contractA.setCollectionNesting.send([true, false, [await contractA.getAddress(), await contractB.getAddress()]])).wait(...waitParams);

      // Create a token in one collection
      const mintingTokenIdAReceipt = await (await contractA.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdAEvents = helper.eth.normalizeEvents(mintingTokenIdAReceipt!);
      const nftTokenIdA = +mintingTokenIdAEvents.Transfer.args.tokenId;
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);

      // Create a token in another collection
      const mintingTokenIdBReceipt = await (await contractB.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdBEvents = helper.eth.normalizeEvents(mintingTokenIdBReceipt!);
      const nftTokenIdB = +mintingTokenIdBEvents.Transfer.args.tokenId;

      // Try to drag someone else's token into the other collection and nest
      await expect(contractB.transfer.staticCall(nftTokenAddressA, nftTokenIdB, {from: malignant})).to.be.rejectedWith('UserIsNotAllowedToNest');
    });

    itEth('NFT: disallows to nest token in an unlisted collection', async ({helper}) => {
      const owner = await helper.eth.createAccountWithBalance(donor);

      const {collectionId: collectionIdA, contract: contractA} = await createNestingCollection(helper, owner);
      const {contract: contractB} = await createNestingCollection(helper, owner);

      await (await contractA.setCollectionNesting.send([true, false, [await contractA.getAddress()]])).wait(...waitParams);

      // Create a token in one collection
      const mintingTokenIdAReceipt = await (await contractA.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdAEvents = helper.eth.normalizeEvents(mintingTokenIdAReceipt!);
      const nftTokenIdA = +mintingTokenIdAEvents.Transfer.args.tokenId;
      const nftTokenAddressA = helper.ethAddress.fromTokenId(collectionIdA, nftTokenIdA);

      // Create a token in another collection
      const mintingTokenIdBReceipt = await (await contractA.mint.send(owner)).wait(...waitParams);
      const mintingTokenIdBEvents = helper.eth.normalizeEvents(mintingTokenIdBReceipt!);
      const nftTokenIdB = +mintingTokenIdBEvents.Transfer.args.tokenId;

      // Try to nest into a token in the other collection, disallowed in the first
      await expect(contractB.transfer.staticCall(nftTokenAddressA, nftTokenIdB)).to.be.rejectedWith('SourceCollectionIsNotAllowedToNest');
    });
  });

  describe('Fungible', () => {
    async function createFungibleCollection(helper: EthUniqueHelper, owner: HDNodeWallet, mode: 'ft' | 'native ft') {
      if(mode === 'ft') {
        const {collectionAddress} = await helper.eth.createFungibleCollection(owner, '', 18, '', '');
        const contract = await helper.ethNativeContract.collection(collectionAddress, 'ft', owner);
        await (await contract.mint.send(owner, 100n)).wait(...waitParams);
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

        const mintingTargetTokenIdReceipt = await (await targetContract.mint.send(owner)).wait(...waitParams);
        const mintingTargetTokenIdEvents = helper.eth.normalizeEvents(mintingTargetTokenIdReceipt!);
        const targetTokenId = +mintingTargetTokenIdEvents.Transfer.args.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        await (await ftContract.transfer.send(targetTokenAddress, 10n)).wait(...waitParams);
        expect(await ftContract.balanceOf.staticCall(targetTokenAddress)).to.be.equal('10');
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

        const mintingTargetTokenIdReceipt = await (await targetContract.mint.send(owner)).wait(...waitParams);
        const mintingTargetTokenIdEvents = helper.eth.normalizeEvents(mintingTargetTokenIdReceipt!);
        const targetTokenId = +mintingTargetTokenIdEvents.Transfer.args.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        await (await ftContract.transfer.send(targetTokenAddress, 10n)).wait(...waitParams);

        await (await ftContract.transferFrom.send(targetTokenAddress, owner, 5n)).wait(...waitParams);
        expect(await ftContract.balanceOf.staticCall(targetTokenAddress)).to.be.equal('5');

        await (await ftContract.transferFrom.send(targetTokenAddress, owner, 5n)).wait(...waitParams);
        expect(await ftContract.balanceOf.staticCall(targetTokenAddress)).to.be.equal('0');
      });
    });

    [
      {mode: 'ft' as const},
      {mode: 'native ft' as const},
    ].map(testCase => {
      itEth(`Disallow nest into collection without nesting permission [${testCase.mode}] (except for native fungible collection)`, async ({helper}) => {
        const owner = await helper.eth.createAccountWithBalance(donor);
        const {collectionId: targetCollectionId, contract: targetContract} = await createNestingCollection(helper, owner);
        await (await targetContract.setCollectionNesting.send([false, false, []])).wait(...waitParams);

        const {contract: ftContract} = await createFungibleCollection(helper, owner, testCase.mode);

        const mintingTargetTokenIdReceipt = await (await targetContract.mint.send(owner)).wait(...waitParams);
        const mintingTargetTokenIdEvents = helper.eth.normalizeEvents(mintingTargetTokenIdReceipt!);
        const targetTokenId = +mintingTargetTokenIdEvents.Transfer.args.tokenId;
        const targetTokenAddress = helper.ethAddress.fromTokenId(targetCollectionId, targetTokenId);

        if(testCase.mode === 'ft') {
          await expect(ftContract.transfer.staticCall(targetTokenAddress, 10n)).to.be.rejectedWith('UserIsNotAllowedToNest');
        } else {
          await expect(ftContract.transfer.staticCall(targetTokenAddress, 10n)).to.be.not.rejected;
        }
      });
    });
  });
});
