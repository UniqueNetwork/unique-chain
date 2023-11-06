import {usingEthPlaygrounds} from '@unique/tests/src/eth/util/index.js';
import {EthUniqueHelper} from '@unique/tests/src/eth/util/playgrounds/unique.dev.js';
import {readFile} from 'fs/promises';
import type {ICrossAccountId} from '@unique/playgrounds/src/types.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {UniqueNFTCollection} from '@unique/playgrounds/src/unique.js';
import {Contract} from 'web3-eth-contract';
import {createObjectCsvWriter} from 'csv-writer';
import {convertToTokens, createCollectionForBenchmarks, PERMISSIONS, PROPERTIES} from '../utils/common.js';
import {makeNames} from '@unique/tests/src/util/index.js';
import type {ContractImports} from '@unique/tests/src/eth/util/playgrounds/types.js';

const {dirname} = makeNames(import.meta.url);

export const CONTRACT_IMPORT: ContractImports[] = [
  {
    fsPath: `${dirname}/../../eth/api/CollectionHelpers.sol`,
    solPath: 'eth/api/CollectionHelpers.sol',
  },
  {
    fsPath: `${dirname}/../../eth/api/ContractHelpers.sol`,
    solPath: 'eth/api/ContractHelpers.sol',
  },
  {
    fsPath: `${dirname}/../../eth/api/UniqueRefungibleToken.sol`,
    solPath: 'eth/api/UniqueRefungibleToken.sol',
  },
  {
    fsPath: `${dirname}/../../eth/api/UniqueRefungible.sol`,
    solPath: 'eth/api/UniqueRefungible.sol',
  },
  {
    fsPath: `${dirname}/../../eth/api/UniqueNFT.sol`,
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
    proxyContract.options.address,
    100n,
  );

  const collection = (await createCollectionForBenchmarks(
    'nft',
    helper,
    privateKey,
    ethSigner,
    proxyContract.options.address,
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
  );

  const receiverEthAddress = helper.address.substrateToEth(substrateReceiver.address);

  const encodedCall = collectionContract.methods
    .mint(receiverEthAddress)
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

  const evmProxyContractFee = await helper.arrange.calculcateFee(
    {Ethereum: ethSigner},
    async () => {
      await proxyContract.methods
        .mintToSubstrate(
          helper.ethAddress.fromCollectionId(collection.collectionId),
          substrateReceiver.addressRaw,
        )
        .send({from: ethSigner});
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
    ethSigner,
    proxyContract.options.address,
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
    ethSigner,
    proxyContract.options.address,
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
        undefined,
        true,
      );

      const subTokenId = await evmContract.methods.nextTokenId().call();

      let encodedCall = evmContract.methods
        .mint(receiverEthAddress)
        .encodeABI();

      await helper.eth.sendEVM(
        donor,
        evmContract.options.address,
        encodedCall,
        '0',
      );

      for(const val of PROPERTIES.slice(0, setup.propertiesNumber)) {
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

  const ethBulkFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Substrate: donor.address},
    ethSigner,
    proxyContract.options.address,
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
      );

      const subTokenId = await evmContract.methods.nextTokenId().call();

      let encodedCall = evmContract.methods
        .mint(receiverEthAddress)
        .encodeABI();

      await helper.eth.sendEVM(
        donor,
        evmContract.options.address,
        encodedCall,
        '0',
      );

      encodedCall = await evmContract.methods
        .setProperties(
          subTokenId,
          PROPERTIES.slice(0, setup.propertiesNumber),
        )
        .encodeABI();

      await helper.eth.sendEVM(
        donor,
        evmContract.options.address,
        encodedCall,
        '0',
      );
    },
  );

  const ethMintCrossFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner},
    ethSigner,
    proxyContract.options.address,
    async (collection) => {
      const evmContract = await helper.ethNativeContract.collection(
        helper.ethAddress.fromCollectionId(collection.collectionId),
        'nft',
      );

      await evmContract.methods.mintCross(
        helper.ethCrossAccount.fromAddress(receiverEthAddress),
        PROPERTIES.slice(0, setup.propertiesNumber),
      )
        .send({from: ethSigner});
    },
  );

  const proxyContractFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner},
    ethSigner,
    proxyContract.options.address,
    async (collection) => {
      await proxyContract.methods
        .mintToSubstrateWithProperty(
          helper.ethAddress.fromCollectionId(collection.collectionId),
          susbstrateReceiver.addressRaw,
          PROPERTIES.slice(0, setup.propertiesNumber),
        )
        .send({from: ethSigner});
    },
  );

  const proxyContractBulkFee = await calculateFeeNftMintWithProperties(
    helper,
    privateKey,
    {Ethereum: ethSigner},
    ethSigner,
    proxyContract.options.address,
    async (collection) => {
      await proxyContract.methods
        .mintToSubstrateBulkProperty(
          helper.ethAddress.fromCollectionId(collection.collectionId),
          susbstrateReceiver.addressRaw,
          PROPERTIES.slice(0, setup.propertiesNumber),
        )
        .send({from: ethSigner});
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



