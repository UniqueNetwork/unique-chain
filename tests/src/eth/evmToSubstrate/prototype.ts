// import {createEthAccountWithBalance} from '../util/helpers';
import {EthUniqueHelper, usingEthPlaygrounds} from '../util/playgrounds';
import {readFile} from 'fs/promises';
import {ContractImports} from '../util/playgrounds/types';
import {Contract} from '@polkadot/api-contract/base';
import Web3 from 'web3';
import {IProperty, ITokenPropertyPermission} from '../../util/playgrounds/types';
import {addressToEvm, decodeAddress} from '@polkadot/util-crypto';
import nonFungibleAbi from '../nonFungibleAbi.json';

import {IKeyringPair} from '@polkadot/types/types';

enum SponsoringMode {
	Disabled = 0,
	Allowlisted = 1,
	Generous = 2,
}

const WS_ENDPOINT = 'wss://ws-rc.unique.network';
const CONTRACT_IMPORT: ContractImports[] = [
  {
    fsPath: `${__dirname}/../api/CollectionHelpers.sol`,
    solPath: 'api/CollectionHelpers.sol',
  },
  {
    fsPath: `${__dirname}/../api/ContractHelpers.sol`,
    solPath: 'api/ContractHelpers.sol',
  },
  {
    fsPath: `${__dirname}/../api/UniqueRefungibleToken.sol`,
    solPath: 'api/UniqueRefungibleToken.sol',
  },
  {
    fsPath: `${__dirname}/../api/UniqueRefungible.sol`,
    solPath: 'api/UniqueRefungible.sol',
  },
  {
    fsPath: `${__dirname}/../api/UniqueNFT.sol`,
    solPath: 'api/UniqueNFT.sol',
  },
];
const main = async () => {
  await usingEthPlaygrounds(async (helper, privateKey) => {
    const contractSource = (
      await readFile(`${__dirname}/EvmToSubstrateHelper.sol`)
    ).toString();
      
    
    const donor = privateKey('//Alice'); // Seed from account with balance on this network
    const myAccount = privateKey('//Bob'); // replace with account from polkadot extension
    console.log('donor raw sub: ', donor.addressRaw);
    console.log('donor sub->eth->sub: ', decodeAddress(await helper.address.ethToSubstrate(helper.address.substrateToEth(donor.address))));
    console.log('donor sub: ', donor.address);

    console.log('donor raw eth: ', Uint8Array.from(Buffer.from(helper.address.substrateToEth(donor.address).slice(2), 'hex')));
    console.log('donor eth: ', helper.address.substrateToEth(donor.address));
    
    const signer = await helper.eth.createAccountWithBalance(donor, 100n);
    
    console.log('\nsigner eth: ', signer);
    console.log('signer raw eth: ', Uint8Array.from(Buffer.from(signer.slice(2), 'hex')));
    console.log('signer raw sub: ', decodeAddress(await helper.address.ethToSubstrate(signer)));

    const collection = await helper.nft.mintCollection(donor, {
      name: 'test mintToSubstrate',
      description: 'EVMHelpers',
      tokenPrefix: 'ap',
      tokenPropertyPermissions: [
        {
          key: 'url',
          permission: {
            tokenOwner: true,
            collectionAdmin: true,
            mutable: true,
          },
        },
      ],
      limits: {sponsorTransferTimeout: 0, sponsorApproveTimeout: 0}, permissions: {mintMode: true},
    });
   
    await collection.addToAllowList(donor, {Ethereum: helper.address.substrateToEth(donor.address)});
    await collection.addToAllowList(donor, {Substrate: donor.address});
    await collection.addAdmin(donor, {Ethereum: signer});
    await collection.addAdmin(donor, {Ethereum: helper.address.substrateToEth(donor.address)});
    
    console.log('collection admin(s)): ', await collection.getAdmins());
    console.log('collection owner(s)): ', await collection.getAllowList());
    const fee = await helper.arrange.calculcateFee({Substrate: donor.address}, () => collection.mintToken(donor, {Substrate: myAccount.address}));
    console.log(`\ncollection mint from susbtrate : ${fee}\n`);
    
    const collectionEthAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
    const collectionContract = helper.ethNativeContract.collection(
      collectionEthAddress,
      'nft',
    );
    const receiverEthAddress = helper.address.substrateToEth(myAccount.address);
    console.log('myAccount eth mirror: ', receiverEthAddress);
    console.log('contract eth mirror: ', collectionEthAddress);

    let subTokenId = await collectionContract.methods.nextTokenId().call();

    let encodedCall = collectionContract.methods
      .mint(receiverEthAddress, subTokenId)
      .encodeABI();

    const ethFee = await helper.arrange.calculcateFee(
      {Substrate: donor.address},
      async () => {
        await helper.eth.sendEVM(
          donor,
          collectionContract.options.address,
          encodedCall,
          '0',
        );
      },
    );

    console.log(`\ncollection mint from eth : ${ethFee}\n`);

    subTokenId = await collectionContract.methods.nextTokenId().call();
    
    const contract = await helper.ethContract.deployByCode(signer, 'EvmToSubstrate', contractSource, CONTRACT_IMPORT);
    console.log('contract Address', contract.options.address);
    await helper.eth.transferBalanceFromSubstrate(donor, contract.options.address, 100n);
    
    await collection.addToAllowList(donor, {Ethereum: contract.options.address});
    await collection.addAdmin(donor, {Ethereum: contract.options.address});
   
    
    const feeForProxyContractMinting = await helper.arrange.calculcateFee(
      {Ethereum: signer},
      async () => {
        await contract.methods.mintToSubstrate(helper.ethAddress.fromCollectionId(collection.collectionId), myAccount.addressRaw).send({from: signer});
      },
    );
      
    console.log(`\ncollection mint from contract to the Substrate Id: ${feeForProxyContractMinting}\n`);
    subTokenId = await collectionContract.methods.nextTokenId().call();
      
    /// *** properties part *** 
      
    console.log('\t\t\t *** Properties Fees ***\n');

    const propertiesNumber = 20;
    
    const properties = Array(40).fill(0).map((_, i) => { return {key: `key_${i}`, value: Uint8Array.from(Buffer.from(`value_${i}`))}; });
    const permissions: ITokenPropertyPermission[] = properties.map(p => { return {key: p.key, permission: {tokenOwner: true,
      collectionAdmin: true,
      mutable: true}}; });
        
    await collection.setTokenPropertyPermissions(donor, permissions);
        
    
    const mintWithPropProxyContractFee = await helper.arrange.calculcateFee({Ethereum: signer}, async () => {
      await contract.methods.mintToSubstrateWithProperty(helper.ethAddress
        .fromCollectionId(collection.collectionId), myAccount.addressRaw, properties.slice(0, propertiesNumber)).send({from: signer});
    });
    console.log(`collection mint from contract to the Substrate Id: ${mintWithPropProxyContractFee}`);
    
    const collectionForSubstrateBench = await createCollectionForPropertiesBenchmarks(helper, privateKey, signer, contract.options.address, permissions);
    
    const mintWithPropSubstrate = await helper.arrange.calculcateFee({Substrate: donor.address}, async () => {
      await collectionForSubstrateBench
        .mintToken(donor, {Substrate: myAccount.address}, properties.slice(0, propertiesNumber).map(p => { return {key: p.key, value: Buffer.from(p.value).toString()}; }));
    });
    
    console.log(`collection mint from susbtrate: ${mintWithPropSubstrate}`);
    
    const collectionForEvmBench = await createCollectionForPropertiesBenchmarks(helper, privateKey, signer, contract.options.address, permissions);
    const evmContract = helper.ethNativeContract.collection(helper.ethAddress.fromCollectionId(collectionForEvmBench.collectionId), 'nft');
    
    subTokenId = await evmContract.methods.nextTokenId().call();

    encodedCall = evmContract.methods
      .mint(receiverEthAddress, subTokenId)
      .encodeABI();
    
    const evmCallWithPropFee = await helper.arrange.calculcateFee(
      {Substrate: donor.address},
      async () => {

        await helper.eth.sendEVM(
          donor,
          evmContract.options.address,
          encodedCall,
          '0',
        );
        
        for (const val of properties.slice(0, propertiesNumber)) {
          
          encodedCall = await evmContract.methods
            .setProperty(subTokenId, val.key, Buffer.from(val.value))
            .encodeABI();
          
          await helper.eth.sendEVM(
            donor,
            evmContract.options.address,
            encodedCall,
            '0',
          );
        }
      },
    );
    
    console.log(`collection mint from eth : ${evmCallWithPropFee}`);

    console.log('All done');
  });
};
    
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
    
    
async function createCollectionForPropertiesBenchmarks(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => IKeyringPair,
  ethSigner: string,
  proxyContract: string,
  permissions: ITokenPropertyPermission[],
) {
    
  const donor = privateKey('//Alice'); // Seed from account with balance on this network
    
    
  const collection = await helper.nft.mintCollection(donor, {
    name: 'test mintToSubstrate',
    description: 'EVMHelpers',
    tokenPrefix: 'ap',
    tokenPropertyPermissions: [
      {
        key: 'url',
        permission: {
          tokenOwner: true,
          collectionAdmin: true,
          mutable: true,
        },
      },
    ],
    limits: {sponsorTransferTimeout: 0, sponsorApproveTimeout: 0}, permissions: {mintMode: true},
  });
   
  await collection.addToAllowList(donor, {Ethereum: helper.address.substrateToEth(donor.address)});
  await collection.addToAllowList(donor, {Substrate: donor.address});
  await collection.addAdmin(donor, {Ethereum: ethSigner});
  await collection.addAdmin(donor, {Ethereum: helper.address.substrateToEth(donor.address)});
  await collection.addToAllowList(donor, {Ethereum: proxyContract});
  await collection.addAdmin(donor, {Ethereum: proxyContract});
  await collection.setTokenPropertyPermissions(donor, permissions);
  
  return collection;
} 