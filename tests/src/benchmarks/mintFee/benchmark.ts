import {EthUniqueHelper, usingEthPlaygrounds} from '../../eth/util';
import {readFile} from 'fs/promises';
import {ContractImports, TokenPermissionField} from '../../eth/util/playgrounds/types';
import {
  ICrossAccountId,
  ITokenPropertyPermission,
} from '../../util/playgrounds/types';
import {IKeyringPair} from '@polkadot/types/types';
import {UniqueNFTCollection} from '../../util/playgrounds/unique';
import {Contract} from 'web3-eth-contract';
import {createObjectCsvWriter} from 'csv-writer';

const CONTRACT_IMPORT: ContractImports[] = [
  {
    fsPath: `${__dirname}/../../eth/api/CollectionHelpers.sol`,
    solPath: 'eth/api/CollectionHelpers.sol',
  },
  {
    fsPath: `${__dirname}/../../eth/api/ContractHelpers.sol`,
    solPath: 'eth/api/ContractHelpers.sol',
  },
  {
    fsPath: `${__dirname}/../../eth/api/UniqueRefungibleToken.sol`,
    solPath: 'eth/api/UniqueRefungibleToken.sol',
  },
  {
    fsPath: `${__dirname}/../../eth/api/UniqueRefungible.sol`,
    solPath: 'eth/api/UniqueRefungible.sol',
  },
  {
    fsPath: `${__dirname}/../../eth/api/UniqueNFT.sol`,
    solPath: 'eth/api/UniqueNFT.sol',
  },
];

const PROPERTIES = Array(40)
  .fill(0)
  .map((_, i) => {
    return {
      key: `key_${i}`,
      value: Uint8Array.from(Buffer.from(`value_${i}`)),
    };
  });

const PERMISSIONS: ITokenPropertyPermission[] = PROPERTIES.map((p) => {
  return {
    key: p.key,
    permission: {
      tokenOwner: true,
      collectionAdmin: true,
      mutable: true,
    },
  };
});

interface IBenchmarkResultForProp {
	propertiesNumber: number;
	substrateFee: number;
	ethFee: number;
	ethBulkFee: number;
  ethMintCrossFee: number;
	evmProxyContractFee: number;
	evmProxyContractBulkFee: number;
}
interface IBenchmarkCollection {
  createFee: number,
  mintFee: number,
  transferFee: number,
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
    const NOMINAL = helper.balance.getOneTokenNominal();
    const CONTRACT_SOURCE = (
      await readFile(`${__dirname}/proxyContract.sol`)
    ).toString();
    const ZEPPELIN_OBJECT = '0x' + (await readFile(`${__dirname}/openZeppelin/bin/ZeppelinContract.bin`)).toString();
    const ZEPPELIN_ABI = JSON.parse((await readFile(`${__dirname}/openZeppelin/bin/ZeppelinContract.abi`)).toString());

    const donor = await privateKey('//Alice'); // Seed from account with balance on this network
    const [substrateReceiver] = await helper.arrange.createAccounts([10n], donor);

    const ethSigner = await helper.eth.createAccountWithBalance(donor, 100n);
    const ethReceiver = await helper.eth.createAccountWithBalance(donor, 5n);

    let susbtrateCollection: UniqueNFTCollection | null;
    const createCollectionSubstrateFee = convertToTokens(
      await helper.arrange.calculcateFee({Substrate: donor.address}, async () => {
        susbtrateCollection = await helper.nft.mintCollection(donor, {tokenPropertyPermissions: [
          {
            key: 'url',
            permission: {
              tokenOwner: true,
              collectionAdmin: true,
              mutable: true,
            },
          },
        ]});
      }),
      NOMINAL,
    );

    const susbstrateMintFee = convertToTokens(
      await helper.arrange.calculcateFee(
        {Substrate: donor.address},
        () => susbtrateCollection!.mintToken(donor, {Substrate: substrateReceiver.address}, [{key: 'url', value: 'test'}]),
      ),
      NOMINAL,
    );
    const susbstrateTransferFee = convertToTokens(
      await helper.arrange.calculcateFee(
        {Substrate: substrateReceiver.address},
        () => susbtrateCollection!.transferToken(substrateReceiver, 1, {Substrate: donor.address}),
      ),
      NOMINAL,
    );
    const substrateFee: IBenchmarkCollection = {
      createFee: createCollectionSubstrateFee,
      mintFee: susbstrateMintFee,
      transferFee: susbstrateTransferFee,
    };

    const helperContract = await helper.ethNativeContract.collectionHelpers(ethSigner);

    let ethContract: Contract | null = null;

    const createCollectionEthFee = convertToTokens(
      await helper.arrange.calculcateFee({Ethereum: ethSigner}, async () => {
        const result = await helperContract.methods.createNFTCollection('a', 'b', 'c').send({from: ethSigner, value: Number(2n * helper.balance.getOneTokenNominal())});
        ethContract = await helper.ethNativeContract.collection(helper.ethAddress.normalizeAddress(result.events.CollectionCreated.returnValues.collectionId), 'nft', ethSigner);
      }),
      NOMINAL,
    );

    await ethContract!.methods.setTokenPropertyPermissions([
      ['url', [
        [TokenPermissionField.Mutable, true],
        [TokenPermissionField.TokenOwner, true],
        [TokenPermissionField.CollectionAdmin, true]],
      ],
    ]).send({from: ethSigner});

    const ethMintFee = convertToTokens(await helper.arrange.calculcateFee(
      {Ethereum: ethSigner},
      () => ethContract!.methods.mintCross(
        helper.ethCrossAccount.fromAddress(ethReceiver),
        [{key: 'url', value: Buffer.from('test')}],
      )
        .send({from: ethSigner}),
    ), NOMINAL);

    const ethTransferFee = convertToTokens(await helper.arrange.calculcateFee(
      {Ethereum: ethReceiver},
      () => ethContract!.methods.transferFrom(ethReceiver, ethSigner, 1)
        .send({from: ethReceiver}),
    ), NOMINAL);

    const ethFee: IBenchmarkCollection = {
      createFee: createCollectionEthFee,
      mintFee: ethMintFee,
      transferFee: ethTransferFee,
    };

    let zeppelelinContract: Contract | null = null;

    const zeppelinDeployFee = convertToTokens(
      await helper.arrange.calculcateFee({Ethereum: ethSigner}, async () => {
        zeppelelinContract = await helper.ethContract.deployByAbi(
          ethSigner,
          ZEPPELIN_ABI,
          ZEPPELIN_OBJECT,
        );
      }),
      NOMINAL,
    );

    const zeppelinMintFee = convertToTokens(await helper.arrange.calculcateFee(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.safeMint(ethReceiver, 'test').send({from: ethSigner}),
    ), NOMINAL);


    const zeppelinTransferFee = convertToTokens(await helper.arrange.calculcateFee(
      {Ethereum: ethReceiver},
      () => zeppelelinContract!.methods.safeTransferFrom(ethReceiver, ethSigner, 0).send({from: ethReceiver}),
    ), NOMINAL);

    const zeppelinFee: IBenchmarkCollection = {
      createFee: zeppelinDeployFee,
      mintFee: zeppelinMintFee,
      transferFee: zeppelinTransferFee,
    };

    console.log('collection ops fees');
    const results = {substrate: substrateFee, eth: ethFee, zeppelin: zeppelinFee};
    console.table(results);

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

    for (let i = 1; i <= 20; i++) {
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

async function createCollectionForBenchmarks(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
  ethSigner: string,
  proxyContract: string,
  permissions: ITokenPropertyPermission[],
) {
  const donor = await privateKey('//Alice');

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
    limits: {sponsorTransferTimeout: 0, sponsorApproveTimeout: 0},
    permissions: {mintMode: true},
  });

  await collection.addToAllowList(donor, {
    Ethereum: helper.address.substrateToEth(donor.address),
  });
  await collection.addToAllowList(donor, {Substrate: donor.address});
  await collection.addAdmin(donor, {Ethereum: ethSigner});
  await collection.addAdmin(donor, {
    Ethereum: helper.address.substrateToEth(donor.address),
  });
  await collection.addToAllowList(donor, {Ethereum: proxyContract});
  await collection.addAdmin(donor, {Ethereum: proxyContract});
  await collection.setTokenPropertyPermissions(donor, permissions);

  return collection;
}

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
  const ethSigner = await helper.eth.createAccountWithBalance(donor, 100n);

  const nominal = helper.balance.getOneTokenNominal();

  await helper.eth.transferBalanceFromSubstrate(
    donor,
    proxyContract.options.address,
    100n,
  );

  const collection = await createCollectionForBenchmarks(
    helper,
    privateKey,
    ethSigner,
    proxyContract.options.address,
    PERMISSIONS,
  );

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
  const ethSigner = await helper.eth.createAccountWithBalance(donor, 100n);

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
        PROPERTIES.slice(0, setup.propertiesNumber).map((p) => {
          return {key: p.key, value: Buffer.from(p.value).toString()};
        }),
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

      for (const val of PROPERTIES.slice(0, setup.propertiesNumber)) {
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
        .send({from: ethSigner, gas: 25_000_000});
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
  const collection = await createCollectionForBenchmarks(
    helper,
    privateKey,
    ethSigner,
    proxyContractAddress,
    PERMISSIONS,
  );
  return helper.arrange.calculcateFee(payer, async () => {
    await calculatedCall(collection);
  });
}
function convertToTokens(value: bigint, nominal: bigint): number {
  return Number((value * 1000n) / nominal) / 1000;
}
