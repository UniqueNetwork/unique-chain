import {usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {readFile} from 'fs/promises';
import type {IKeyringPair} from '@polkadot/types/types';
import {Contract, HDNodeWallet} from 'ethers';
import {convertToTokens} from '../utils/common.js';
import {makeNames} from '@unique/test-utils/util.js';
import type {ContractImports} from '@unique/test-utils/eth/types.js';

const {dirname} = makeNames(import.meta.url);

const NODE_MODULES = `${dirname}/../../../../node_modules`;

export const CONTRACT_IMPORT: ContractImports[] = [
  {
    fsPath: `${NODE_MODULES}/@rmrk-team/evm-contracts/contracts/RMRK/nestable/RMRKNestable.sol`,
    solPath: '@rmrk-team/evm-contracts/contracts/RMRK/nestable/RMRKNestable.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@rmrk-team/evm-contracts/contracts/RMRK/nestable/IERC6059.sol`,
    solPath: '@rmrk-team/evm-contracts/contracts/RMRK/nestable/IERC6059.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@rmrk-team/evm-contracts/contracts/RMRK/core/RMRKCore.sol`,
    solPath: '@rmrk-team/evm-contracts/contracts/RMRK/core/RMRKCore.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol`,
    solPath: '@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/token/ERC721/IERC721.sol`,
    solPath: '@openzeppelin/contracts/token/ERC721/IERC721.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol`,
    solPath: '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/utils/Address.sol`,
    solPath: '@openzeppelin/contracts/utils/Address.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/utils/Context.sol`,
    solPath: '@openzeppelin/contracts/utils/Context.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@openzeppelin/contracts/utils/introspection/IERC165.sol`,
    solPath: '@openzeppelin/contracts/utils/introspection/IERC165.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@rmrk-team/evm-contracts/contracts/RMRK/library/RMRKErrors.sol`,
    solPath: '@rmrk-team/evm-contracts/contracts/RMRK/library/RMRKErrors.sol',
  },
  {
    fsPath: `${NODE_MODULES}/@rmrk-team/evm-contracts/contracts/RMRK/core/IRMRKCore.sol`,
    solPath: '@rmrk-team/evm-contracts/contracts/RMRK/core/IRMRKCore.sol',
  },
  {
    fsPath: `${dirname}/RMRKNestableMintable.sol`,
    solPath: 'RMRKNestableMintable.sol',
  },
];


const main = async () => {

  await usingEthPlaygrounds(async (helper, privateKey) => {

    const donor = await privateKey('//Alice'); // Seed from account with balance on this network

    const eth = await measureEth(helper, donor);
    const sub = await measureSub(helper, donor);
    const rmrk = await measureRMRK(helper, donor);
    console.table({susbtrate: sub, eth: eth, rmrk: rmrk});
  });
};

async function measureRMRK(helper: EthUniqueHelper, donor: IKeyringPair) {
  const CONTRACT_SOURCE = (
    await readFile(`${dirname}/RMRKNestableMintable.sol`)
  ).toString();
  const RELAYER_SOURCE = (await readFile(`${dirname}/relayer.sol`)).toString();

  const ethSigner = await helper.eth.createAccountWithBalance(donor);

  const rmrk = await helper.ethContract.deployByCode(
    ethSigner,
    'RMRKNestableMintable',
    CONTRACT_SOURCE,
    CONTRACT_IMPORT,
    5000000n,
  );

  const relayer = await helper.ethContract.deployByCode(
    ethSigner,
    'Relayer',
    RELAYER_SOURCE,
    CONTRACT_IMPORT,
    5000000n,
    [await rmrk.getAddress()],
  );

  const relayerAddress = await relayer.getAddress();

  const createTokenFor = async (receiver: string) => {
    const receipt = await (await rmrk.safeMint.send(receiver)).wait(...waitParams);
    const events = helper.eth.normalizeEvents(receipt!);
    return +(events['Transfer'].args.tokenId);
  };

  const nestId = await createTokenFor(ethSigner.address);
  const outerCollectionNestedId = 10;
  const contractOwnedNestId = await createTokenFor(relayerAddress);
  const nextTokenId = contractOwnedNestId + 1;

  const nestTransfer = await helper.arrange.calculcateFee({Ethereum: ethSigner.address}, async () => {
    const addChildData = (await rmrk.addChild.populateTransaction(nestId, outerCollectionNestedId, [])).data;
    await (await relayer.relay.send(addChildData)).wait(...waitParams);
    await (await rmrk.acceptChild.send(nestId, 0, relayerAddress, outerCollectionNestedId)).wait(...waitParams);
  });


  const nestMint = await helper.arrange.calculcateFee({Ethereum: ethSigner.address}, async () => {
    const nestMintData = (await rmrk.nestMint.populateTransaction(await rmrk.getAddress(), nextTokenId, contractOwnedNestId)).data;
    await (await relayer.relay.send(nestMintData)).wait(...waitParams);
    const acceptNestedToken = (await rmrk.acceptChild.populateTransaction(contractOwnedNestId, 0, await rmrk.getAddress(), nextTokenId)).data;
    await (await relayer.relay.send(acceptNestedToken)).wait(...waitParams);
  });


  const unnestToken = await helper.arrange.calculcateFee({Ethereum: ethSigner.address}, async () => {
    const unnestData = (await rmrk.transferChild.populateTransaction(contractOwnedNestId, ethSigner.address, 0, 0, await rmrk.getAddress(), nextTokenId, false, [])).data;
    await (await relayer.relay.send(unnestData)).wait(...waitParams);
  });

  return {mint: convertToTokens(nestMint), transfer: convertToTokens(nestTransfer), unnest: convertToTokens(unnestToken)};
}

async function measureEth(helper: EthUniqueHelper, donor: IKeyringPair) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {collectionId, contract} = await createNestingCollection(helper, owner);

  // Create a token to be nested to
  const mintingTargetNFTTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
  const targetNFTTokenId = helper.eth.normalizeEvents(mintingTargetNFTTokenIdReceipt!).Transfer.args.tokenId;
  const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, +targetNFTTokenId);

  // Create a nested token
  const nestMint = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await (await contract.mint.send(targetNftTokenAddress)).wait(...waitParams);
  });

  // Create a token to be nested and nest
  const mintingSecondTokenIdReceipt = await (await contract.mint.send(owner)).wait(...waitParams);
  const nestedTokenId = helper.eth.normalizeEvents(mintingSecondTokenIdReceipt!).Transfer.args.tokenId;

  const nestTransfer = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await (await contract.transfer.send(targetNftTokenAddress, +nestedTokenId)).wait(...waitParams);
  });

  const unnestToken = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await (await contract.transferFrom.send(targetNftTokenAddress, owner.address, +nestedTokenId)).wait(...waitParams);
  });
  return {mint: convertToTokens(nestMint), transfer: convertToTokens(nestTransfer), unnest: convertToTokens(unnestToken)};
}

async function measureSub(helper: EthUniqueHelper, donor: IKeyringPair) {

  const [alice, bob] = await helper.arrange.createAccounts([100n, 100n], donor);

  const targetNFTCollection = await helper.nft.mintCollection(alice);
  const targetTokenBob = await targetNFTCollection.mintToken(alice, {Substrate: bob.address});


  const collectionForNesting = await helper.nft.mintCollection(bob);
  // permissions should be set:
  await targetNFTCollection.setPermissions(alice, {
    nesting: {tokenOwner: true},
  });

  const nestMint = await helper.arrange.calculcateFee({Substrate: bob.address}, async () => {
    await (collectionForNesting.mintToken(bob, targetTokenBob.nestingAccount()));
  });

  const nestedToken2 = await collectionForNesting.mintToken(bob);
  const nestTransfer = await helper.arrange.calculcateFee({Substrate: bob.address}, async () => {
    await nestedToken2.nest(bob, targetTokenBob);
  });

  const unnestToken = await helper.arrange.calculcateFee({Substrate: bob.address}, async () => {
    await nestedToken2.transferFrom(bob, targetTokenBob.nestingAccount(), {Substrate: bob.address});
  });

  return {mint: convertToTokens(nestMint), transfer: convertToTokens(nestTransfer), unnest: convertToTokens(unnestToken)};
}


const createNestingCollection = async (
  helper: EthUniqueHelper,
  owner: HDNodeWallet,
): Promise<{ collectionId: number, collectionAddress: string, contract: Contract }> => {
  const {collectionAddress, collectionId} = await helper.eth.createNFTCollection(owner, 'A', 'B', 'C');

  const contract =  helper.ethNativeContract.collection(collectionAddress, 'nft', owner);
  await (await contract.setCollectionNesting.send([true, false, []])).wait(...waitParams);

  return {collectionId, collectionAddress, contract};
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });






