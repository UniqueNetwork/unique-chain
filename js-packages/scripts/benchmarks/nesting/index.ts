import {usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {readFile} from 'fs/promises';
import type {IKeyringPair} from '@polkadot/types/types';
import {Contract, HDNodeWallet} from 'ethers';
import {convertToTokens} from '../utils/common.js';
import {makeNames} from '@unique/test-utils/util.js';
import type {ContractImports} from '@unique/test-utils/eth/types.js';
import type {RMRKNestableMintable} from './ABIGEN/index.js';

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

  const contract = await helper.ethContract.deployByCode(
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
    [contract.options.address],
  );

  const relayerAddress = relayer.options.address;

  const rmrk = contract as any as RMRKNestableMintable;
  const createTokenFor = async (receiver: string) => {
    const tokenReceipt = await rmrk.methods.safeMint(receiver).send({from: ethSigner});
    return tokenReceipt.events!['Transfer'].returnValues.tokenId as number;
  };


  const nestId = await createTokenFor(ethSigner);
  const outerCollectionNestedId = 10;
  const contractOwnedNestId = await createTokenFor(relayerAddress);
  const nextTokenId = contractOwnedNestId + 1;

  const nestTransfer = await helper.arrange.calculcateFee({Ethereum: ethSigner.address}, async () => {
    const addChildData = rmrk.methods.addChild(nestId, outerCollectionNestedId, []).encodeABI();
    await relayer.methods.relay(addChildData).send({from: ethSigner});
    await rmrk.methods.acceptChild(nestId, 0, relayerAddress, outerCollectionNestedId).send({from: ethSigner});
  });


  const nestMint = await helper.arrange.calculcateFee({Ethereum: ethSigner}, async () => {
    const nestMintData = rmrk.methods.nestMint(rmrk.options.address, nextTokenId, contractOwnedNestId).encodeABI();
    await relayer.methods.relay(nestMintData).send({from: ethSigner});
    const acceptNestedToken = rmrk.methods.acceptChild(contractOwnedNestId, 0, rmrk.options.address, nextTokenId).encodeABI();
    await relayer.methods.relay(acceptNestedToken).send({from: ethSigner});
  });


  const unnestToken = await helper.arrange.calculcateFee({Ethereum: ethSigner}, async () => {
    const unnestData = rmrk.methods.transferChild(contractOwnedNestId, ethSigner, 0, 0, rmrk.options.address, nextTokenId, false, []).encodeABI();
    await relayer.methods.relay(unnestData).send({from: ethSigner});
  });

  return {mint: convertToTokens(nestMint), transfer: convertToTokens(nestTransfer), unnest: convertToTokens(unnestToken)};
}

async function measureEth(helper: EthUniqueHelper, donor: IKeyringPair) {
  const owner = await helper.eth.createAccountWithBalance(donor);
  const {collectionId, contract} = await createNestingCollection(helper, owner);

  // Create a token to be nested to
  const mintingTargetNFTTokenIdResult = await contract.methods.mint(owner).send({from: owner});
  const targetNFTTokenId = mintingTargetNFTTokenIdResult.events.Transfer.returnValues.tokenId;
  const targetNftTokenAddress = helper.ethAddress.fromTokenId(collectionId, targetNFTTokenId);

  // Create a nested token
  const nestMint = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await contract.methods.mint(targetNftTokenAddress).send({from: owner});
  });

  // Create a token to be nested and nest
  const mintingSecondTokenIdResult = await contract.methods.mint(owner).send({from: owner});
  const nestedTokenId = mintingSecondTokenIdResult.events.Transfer.returnValues.tokenId;

  const nestTransfer = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await contract.methods.transfer(targetNftTokenAddress, nestedTokenId).send({from: owner});
  });

  const unnestToken = await helper.arrange.calculcateFee({Ethereum: owner.address}, async () => {
    await contract.methods.transferFrom(targetNftTokenAddress, owner, nestedTokenId).send({from: owner});
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
  await (await contract.setCollectionNesting.send(true)).wait(...waitParams);

  return {collectionId, collectionAddress, contract};
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });






