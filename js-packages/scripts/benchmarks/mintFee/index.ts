import {usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {readFile} from 'fs/promises';
import type {ICrossAccountId} from '@unique-nft/playgrounds/types.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {UniqueNFTCollection} from '@unique-nft/playgrounds/unique.js';
import {Contract} from 'ethers';
import {createObjectCsvWriter} from 'csv-writer';
import {convertToTokens, createCollectionForBenchmarks, PERMISSIONS, PROPERTIES} from '../utils/common.js';
import {makeNames} from '@unique/test-utils/util.js';
import type {ContractImports} from '@unique/test-utils/eth/types.js';

const {dirname} = makeNames(import.meta.url);

const EVM_ABI_DIR = `${dirname}/../../../evm-abi`;

export const CONTRACT_IMPORT: ContractImports[] = [
  {
    fsPath: `${EVM_ABI_DIR}/api/CollectionHelpers.sol`,
    solPath: 'eth/api/CollectionHelpers.sol',
  },
  {
    fsPath: `${EVM_ABI_DIR}/api/ContractHelpers.sol`,
    solPath: 'eth/api/ContractHelpers.sol',
  },
  {
    fsPath: `${EVM_ABI_DIR}/api/UniqueRefungibleToken.sol`,
    solPath: 'eth/api/UniqueRefungibleToken.sol',
  },
  {
    fsPath: `${EVM_ABI_DIR}/api/UniqueRefungible.sol`,
    solPath: 'eth/api/UniqueRefungible.sol',
  },
  {
    fsPath: `${EVM_ABI_DIR}/api/UniqueNFT.sol`,
    solPath: 'eth/api/UniqueNFT.sol',
  },
];

interface IBenchmarkResultForProp {
	propertiesNumber: number;
	substrateFee: number;
	ethFee: number;
	ethBulkFee: number;
  ethMintCrossFee: number;
	evmProxyContractFee: number;
	evmProxyContractBulkFee: number;
}

const main = async () => {
  const benchmarks = [
    'substrateFee',
    'ethFee',
    'ethBulkFee',
    'ethMintCrossFee',
    'evmProxyContractFee',
    'evmProxyContractBulkFee',
  ];
  const headers = [
    'propertiesNumber',
    ...benchmarks,
  ];


  const csvWriter = createObjectCsvWriter({
    path: 'properties.csv',
    header: headers,
  });

  await usingEthPlaygrounds(async (helper, privateKey) => {
    const CONTRACT_SOURCE = (
      await readFile(`${dirname}/proxyContract.sol`)
    ).toString();

    const donor = await privateKey('//Alice'); // Seed from account with balance on this network
    const ethSigner = await helper.eth.createAccountWithBalance(donor);

    const contract = await helper.ethContract.deployByCode(
      ethSigner,
      'ProxyMint',
      CONTRACT_SOURCE,
      CONTRACT_IMPORT,
    );

    const fees = await benchMintFee(helper, privateKey, contract);
    console.log('Minting without properties');
    console.table(fees);

    const result: IBenchmarkResultForProp[] = [];
    const csvResult: IBenchmarkResultForProp[] = [];

    for(let i = 1; i <= 20; i++) {
      const benchResult = await benchMintWithProperties(helper, privateKey, contract, {
        propertiesNumber: i,
      }) as any;

      csvResult.push(benchResult);

      const minFee = Math.min(...(benchmarks.map(x => benchResult[x])));
      for(const key of benchmarks) {
        const keyPercent = Math.round((benchResult[key] / minFee) * 100);
        benchResult[key] = `${benchResult[key]} (${keyPercent}%)`;
      }

      result.push(benchResult);
    }

    await csvWriter.writeRecords(csvResult);

    console.log('Minting with properties');
    console.table(result, headers);
  });
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });



async function benchMintFee(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
  proxyContract: Contract,
): Promise<{
	substrateFee: number;
	ethFee: number;
	evmProxyContractFee: number;
}> {
  const donor = await privateKey('//Alice');
  const substrateReceiver = await privateKey('//Bob');
  const ethSigner = await helper.eth.createAccountWithBalance(donor);

  const nominal = helper.balance.getOneTokenNominal();

  await helper.eth.transferBalanceFromSubstrate(
    donor,
    await proxyContract.getAddress(),
    100n,
  );

  const collection = (await createCollectionForBenchmarks(
    'nft',
    helper,
    privateKey,
    ethSigner.address,
    await proxyContract.getAddress(),
    PERMISSIONS,
  )) as UniqueNFTCollection;

  const substrateFee = await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintToken(donor, {Substrate: substrateReceiver.address}),
  );

  const collectionEthAddress = helper.ethAddress.fromCollectionId(collection.collectionId);
  const collectionContract = await helper.ethNativeContract.collection(
    collectionEthAddress,
    'nft',
    ethSigner,
  );

  const receiverEthAddress = helper.address.substrateToEth(substrateReceiver.address);

  const encodedCall = (await collectionContract.mint.populateTransaction(receiverEthAddress)).data;

  const ethFee = await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    async () => {
      await helper.eth.sendEVM(
        donor,
        await collectionContract.getAddress(),
        encodedCall,
        '0',
      );
    },
  );

  const evmProxyContractFee = await helper.arrange.calculcateFee(
    {Ethereum: ethSigner.address},
    async () => {
      await (await proxyContract.mintToSubstrate.send(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        substrateReceiver.addressRaw,
      )).wait(...waitParams);
    },
  );

  return {
    substrateFee: convertToTokens(substrateFee, nominal),
    ethFee: convertToTokens(ethFee, nominal),
    evmProxyContractFee: convertToTokens(evmProxyContractFee, nominal),
  };
}

async function benchMintWithProperties(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
  proxyContract: Contract,
  setup: { propertiesNumber: number },
): Promise<IBenchmarkResultForProp> {
  const donor = await privateKey('//Alice'); // Seed from account with balance on this network
  const ethSigner = await helper.eth.createAccountWithBalance(donor);

  const susbstrateReceiver = await privateKey('//Bob');
  const receiverEthAddress = helper.address.substrateToEth(susbstrateReceiver.address);

  const nominal = helper.balance.getOneTokenNominal();

  const substrateFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Substrate: donor.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      await collection.mintToken(
        donor,
        {Substrate: susbstrateReceiver.address},
        PROPERTIES.slice(0, setup.propertiesNumber).map((p) => ({key: p.key, value: Buffer.from(p.value).toString()})),
      );
    },
  );

  const ethFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Substrate: donor.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
        undefined as any,
        true,
      );

      const subTokenId = await evmContract.nextTokenId.staticCall();

      let encodedCall = (await evmContract.mint.populateTransaction(receiverEthAddress)).data;

      await helper.eth.sendEVM(
        donor,
        await evmContract.getAddress(),
        encodedCall,
        '0',
      );

      for(const val of PROPERTIES.slice(0, setup.propertiesNumber)) {
        encodedCall = (await evmContract.setProperty.populateTransaction(
          subTokenId, val.key, Buffer.from(val.value)
        )).data;

        await helper.eth.sendEVM(
          donor,
          await evmContract.getAddress(),
          encodedCall,
          '0',
        );
      }
    },
  );

  const ethBulkFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Substrate: donor.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
        undefined as any,
      );

      const subTokenId = await evmContract.nextTokenId.staticCall();

      let encodedCall = (await evmContract.mint.populateTransaction(receiverEthAddress)).data;

      await helper.eth.sendEVM(
        donor,
        await evmContract.getAddress(),
        encodedCall,
        '0',
      );

      encodedCall = (await evmContract.setProperties.populateTransaction(
        subTokenId, PROPERTIES.slice(0, setup.propertiesNumber)
      )).data;

      await helper.eth.sendEVM(
        donor,
        await evmContract.getAddress(),
        encodedCall,
        '0',
      );
    },
  );

  const ethMintCrossFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
        undefined as any,
      );

      await (await evmContract.mintCross.send(
        helper.ethCrossAccount.fromAddress(receiverEthAddress),
        PROPERTIES.slice(0, setup.propertiesNumber),
      )).wait(...waitParams);
    },
  );

  const proxyContractFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      await (await proxyContract.mintToSubstrateWithProperty(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        susbstrateReceiver.addressRaw,
        PROPERTIES.slice(0, setup.propertiesNumber),
      )).wait(...waitParams);
    },
  );

  const proxyContractBulkFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner.address},
    ethSigner.address,
    await proxyContract.getAddress(),
    async (collection) => {
      await (await proxyContract.mintToSubstrateBulkProperty.send(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        susbstrateReceiver.addressRaw,
        PROPERTIES.slice(0, setup.propertiesNumber),
      )).wait(...waitParams);
    },
  );

  return {
    propertiesNumber: setup.propertiesNumber,
    substrateFee: convertToTokens(substrateFee, nominal),
    ethFee: convertToTokens(ethFee, nominal),
    ethBulkFee: convertToTokens(ethBulkFee, nominal),
    ethMintCrossFee: convertToTokens(ethMintCrossFee, nominal),
    evmProxyContractFee: convertToTokens(proxyContractFee, nominal),
    evmProxyContractBulkFee: convertToTokens(proxyContractBulkFee, nominal),
  };
}

async function calculateFeeNftMintWithProperties(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
  payer: ICrossAccountId,
  ethSigner: string,
  proxyContractAddress: string,
  calculatedCall: (collection: UniqueNFTCollection) => Promise<any>,
): Promise<bigint> {
  const collection = (await createCollectionForBenchmarks(
    'nft',
    helper,
    privateKey,
    ethSigner,
    proxyContractAddress,
    PERMISSIONS,
  )) as UniqueNFTCollection;
  return helper.arrange.calculcateFee(payer, async () => {
    await calculatedCall(collection);
  });
}



