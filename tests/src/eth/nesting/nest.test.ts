import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';
import { collectionIdToAddress, createEthAccountWithBalance, GAS_ARGS, itWeb3, tokenIdToAddress} from '../../eth/util/helpers';
import usingApi, {submitTransactionAsync} from '../../substrate/substrate-api';
import {createCollectionExpectSuccess, setCollectionLimitsExpectSuccess} from '../../util/helpers';
import nonFungibleAbi from '../nonFungibleAbi.json';

let alice: IKeyringPair;

const getCollectionFromSubstrate = async (api: ApiPromise, ethAddress: string): Promise<{ collectionId: number, address: string }> => {
  const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
  await setCollectionLimitsExpectSuccess(alice, collectionId, {nestingRule: 'Owner'});
  await submitTransactionAsync(alice, api.tx.unique.addCollectionAdmin(collectionId, {Ethereum: ethAddress}));
  return {collectionId, address: collectionIdToAddress(collectionId)};
};

describe('Integration Test: Nesting', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  itWeb3('NFT: allows an Owner to nest/unnest their token', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    // const receiver = await createEthAccountWithBalance(api, web3);

    // const helper = evmCollectionHelper(web3, owner);
    // const collectionName = 'CollectionEVM';
    // const description = 'Some description';
    // const tokenPrefix = 'token prefix';
  
    // const collection = await helper.methods
    //   .create721Collection(collectionName, description, tokenPrefix)
    //   .send();

    const {collectionId, address} = await getCollectionFromSubstrate(api, owner);

    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const nftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      nftTokenId,
    ).send({from: owner});

    const firstTargetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      firstTargetNftTokenId,
    ).send({from: owner});

    const targetNftTokenAddress = tokenIdToAddress(collectionId, firstTargetNftTokenId);

    await contract.methods.transfer(targetNftTokenAddress, nftTokenId).send({from: owner});
    expect(await contract.methods.ownerOf(nftTokenId).call()).to.be.equal(targetNftTokenAddress);
    
    const secondTargetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      secondTargetNftTokenId,
    ).send({from: owner});
    const nextNftTokenAddress = tokenIdToAddress(collectionId, secondTargetNftTokenId);
      
    await contract.methods.transfer(nextNftTokenAddress, nftTokenId).send({from: owner});
    expect(await contract.methods.ownerOf(nftTokenId).call()).to.be.equal(nextNftTokenAddress);
  });

  itWeb3('NFT: allows an Owner to nest/unnest their token (Restricted nesting)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const {collectionId: collectionIdA, address: addressCollectionA} = await getCollectionFromSubstrate(api, owner);
    const {collectionId: collectionIdB, address: addressCollectionB} = await getCollectionFromSubstrate(api, owner);


    const contractA = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionA, {from: owner, ...GAS_ARGS});
    const contractB = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionB, {from: owner, ...GAS_ARGS});

    const nftTokenIdA1 = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA1,
    ).send({from: owner});
    const nftTokenAddressA1 = tokenIdToAddress(collectionIdA, nftTokenIdA1);

    const nftTokenIdA2 = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA2,
    ).send({from: owner});

    const nftTokenIdB1 = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      owner,
      nftTokenIdB1,
    ).send({from: owner});

    await setCollectionLimitsExpectSuccess(alice, collectionIdA, {nestingRule: {OwnerRestricted:[collectionIdA, collectionIdB]}});

    await contractA.methods.transfer(nftTokenAddressA1, nftTokenIdA2).send({from: owner});
    expect(await contractA.methods.ownerOf(nftTokenIdA2).call()).to.be.equal(nftTokenAddressA1);

    await contractB.methods.transfer(nftTokenAddressA1, nftTokenIdB1).send({from: owner});
    expect(await contractB.methods.ownerOf(nftTokenIdB1).call()).to.be.equal(nftTokenAddressA1);
  });
});

describe('Negative Test: Nesting', async() => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  itWeb3('NFT: disallows to nest token if nesting is disabled', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const {collectionId, address} = await getCollectionFromSubstrate(api, owner);
    await setCollectionLimitsExpectSuccess(alice, collectionId, {nestingRule: 'Disabled'});

    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: owner, ...GAS_ARGS});

    const nftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      nftTokenId,
    ).send({from: owner});

    const targetNftTokenId = await contract.methods.nextTokenId().call();
    await contract.methods.mint(
      owner,
      targetNftTokenId,
    ).send({from: owner});

    const targetNftTokenAddress = tokenIdToAddress(collectionId, targetNftTokenId);

    await expect(contract.methods
      .transfer(targetNftTokenAddress, nftTokenId)
      .call()).to.be.rejectedWith('NestingIsDisabled');
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);
    const receiver = await createEthAccountWithBalance(api, web3);

    const {collectionId: collectionIdA, address: addressCollectionA} = await getCollectionFromSubstrate(api, owner);
    const {collectionId: collectionIdB, address: addressCollectionB} = await getCollectionFromSubstrate(api, receiver);

    const contractA = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionA, {from: owner, ...GAS_ARGS});
    const contractB = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionB, {from: receiver, ...GAS_ARGS});

    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});
    
    const nftTokenIdB = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      receiver,
      nftTokenIdB,
    ).send({from: receiver});
      
    const nftTokenAddressB = tokenIdToAddress(collectionIdB, nftTokenIdB);

    await expect(contractA.methods
      .transfer(nftTokenAddressB, nftTokenIdA)
      .call()).to.be.rejectedWith('OnlyOwnerAllowedToNest');
  });
  
  itWeb3('NFT: disallows a non-Owner to nest someone else\'s token (Restricted nesting)', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const {collectionId: collectionIdA, address: addressCollectionA} = await getCollectionFromSubstrate(api, owner);
    const {collectionId: collectionIdB, address: addressCollectionB} = await getCollectionFromSubstrate(api, owner);

    const contractA = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionA, {from: owner, ...GAS_ARGS});
    const contractB = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionB, {from: owner, ...GAS_ARGS});

    await setCollectionLimitsExpectSuccess(alice, collectionIdA, {nestingRule: {OwnerRestricted:[collectionIdA]}});

    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});
    
    const nftTokenIdB = await contractB.methods.nextTokenId().call();
    await contractB.methods.mint(
      owner,
      nftTokenIdB,
    ).send({from: owner});
      
    const nftTokenAddressA = tokenIdToAddress(collectionIdA, nftTokenIdA);

    await expect(contractB.methods
      .transfer(nftTokenAddressA, nftTokenIdB)
      .call()).to.be.rejectedWith('SourceCollectionIsNotAllowedToNest');
  });
  
  itWeb3('NFT: disallows to nest token in an unlisted collection', async ({api, web3}) => {
    const owner = await createEthAccountWithBalance(api, web3);

    const {collectionId: collectionIdA, address: addressCollectionA} = await getCollectionFromSubstrate(api, owner);

    const contractA = new web3.eth.Contract(nonFungibleAbi as any, addressCollectionA, {from: owner, ...GAS_ARGS});

    await setCollectionLimitsExpectSuccess(alice, collectionIdA, {nestingRule: {OwnerRestricted:[]}});

    const nftTokenIdA = await contractA.methods.nextTokenId().call();
    await contractA.methods.mint(
      owner,
      nftTokenIdA,
    ).send({from: owner});
    
    const nftTokenAddressA = tokenIdToAddress(collectionIdA, nftTokenIdA);

    await expect(contractA.methods
      .transfer(nftTokenAddressA, nftTokenIdA)
      .call()).to.be.rejectedWith('SourceCollectionIsNotAllowedToNest');
  });
});
