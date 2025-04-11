import {usingEthPlaygrounds, waitParams} from '@unique/test-utils/eth/util.js';
import {EthUniqueHelper} from '@unique/test-utils/eth/index.js';
import {readFile} from 'fs/promises';
import {CollectionLimitField,  CreateCollectionData,  TokenPermissionField} from '@unique/test-utils/eth/types.js';
import type {IKeyringPair} from '@polkadot/types/types';
import {UniqueFTCollection, UniqueNFTCollection} from '@unique-nft/playgrounds/unique.js';
import {Contract} from 'ethers';
import {createObjectCsvWriter} from 'csv-writer';
import {FunctionFeeVM} from '../utils/types.js';
import type {IFunctionFee} from '../utils/types.js';
import {convertToTokens, createCollectionForBenchmarks, PERMISSIONS, PROPERTIES, SUBS_PROPERTIES} from '../utils/common.js';
import {makeNames} from '@unique/test-utils/util.js';


const {dirname} = makeNames(import.meta.url);

const main = async () => {

  const headers = [
    'function',
    'ethFee',
    'ethGas',
    'substrate',
    'zeppelinFee',
    'zeppelinGas',
  ];

  const csvWriter20 = createObjectCsvWriter({
    path: 'erc20.csv',
    header: headers,
  });

  const csvWriter721 = createObjectCsvWriter({
    path: 'erc721.csv',
    header: headers,
  });

  await usingEthPlaygrounds(async (helper, privateKey) => {
    console.log('\n ERC20 ops fees');
    const erc20 = FunctionFeeVM.fromModel(await erc20CalculateFeeGas(helper, privateKey));
    console.table(erc20);
    await csvWriter20.writeRecords(FunctionFeeVM.toCsv(erc20));

    console.log('\n ERC721 ops fees');
    const erc721 = FunctionFeeVM.fromModel(await erc721CalculateFeeGas(helper, privateKey));
    console.table(erc721);

    await csvWriter721.writeRecords(FunctionFeeVM.toCsv(erc721));
  });
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });

async function erc721CalculateFeeGas(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,
): Promise<IFunctionFee> {
  const res: IFunctionFee = {};
  const donor = await privateKey('//Alice');
  const [subReceiver] = await helper.arrange.createAccounts([10n], donor);
  const ethSigner = await helper.eth.createAccountWithBalance(donor);
  const ethReceiver = await helper.eth.createAccountWithBalance(donor);
  const crossSigner = helper.ethCrossAccount.fromAddress(ethSigner);
  const crossReceiver = helper.ethCrossAccount.fromAddress(ethReceiver);
  const collection = (await createCollectionForBenchmarks(
    'nft',
    helper,
    privateKey,
    ethSigner.address,
    null,
    PERMISSIONS,
  )) as UniqueNFTCollection;

  const helperContract = helper.ethNativeContract.collectionHelpers(ethSigner);
  let zeppelelinContract: Contract | null = null;
  const ZEPPELIN_OBJECT = '0x' + (await readFile(`${dirname}/../utils/openZeppelin/ERC721/bin/ZeppelinContract.bin`)).toString();
  const ZEPPELIN_ABI = JSON.parse((await readFile(`${dirname}/../utils/openZeppelin/ERC721/bin/ZeppelinContract.abi`)).toString());

  const evmContract = await helper.ethNativeContract.collection(
    helper.ethAddress.fromCollectionId(collection.collectionId),
    'nft',
    ethSigner,
    true,
  );

  res['createCollection'] = await helper.arrange.calculcateFeeGas(
    {Ethereum: ethSigner.address},
    async () => await (await helperContract.createNFTCollection.send('test','test','test', {value: (2n * helper.balance.getOneTokenNominal())})
    ).wait(...waitParams),
  );

  res['createCollection'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.nft.mintCollection(
      donor,
      {name: 'test', description: 'test', tokenPrefix: 'test'},
    ),
  )));

  res['createCollection'].zeppelin = await helper.arrange.calculcateFeeGas(
    {Ethereum: ethSigner.address},
    async () => {
      zeppelelinContract = await helper.ethContract.deployByAbi(
        ethSigner,
        ZEPPELIN_ABI,
        ZEPPELIN_OBJECT,
      );
    },
  );

  res['mint'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mint.send(ethSigner)).wait(...waitParams),
    );

  res['mint'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.safeMint.send(ethSigner, '')).wait(...waitParams),
    );

  res['mintCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mintCross.send(crossSigner, [])).wait(...waitParams),
    );

  res['mint'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintToken(
      donor,
      {Substrate: donor.address},
    ),
  )));

  res['mintCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintMultipleTokens(donor, [{
      owner: {Substrate: donor.address},
    }]),
  )));

  res['mintWithTokenURI'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mintWithTokenURI.send(ethSigner, 'Test URI')).wait(...waitParams),
    );

  res['mintWithTokenURI'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintToken(
      donor,
      {Ethereum: ethSigner.address},
      [{key: 'URI', value: 'Test URI'}],
    ),
  )));

  res['mintWithTokenURI'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.safeMint.send(ethSigner, 'Test URI')).wait(...waitParams),
    );

  res['setProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setProperties.send(1, PROPERTIES.slice(0,1))).wait(...waitParams),
    );

  res['deleteProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.deleteProperties.send(1, [PROPERTIES[0].key])).wait(...waitParams),
    );

  res['setProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setTokenProperties(
      donor,
      1,
      SUBS_PROPERTIES.slice(0, 1),
    ),
  )));

  res['deleteProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.deleteTokenProperties(
      donor,
      1,
      SUBS_PROPERTIES.slice(0, 1)
        .map(p => p.key),
    ),
  )));

  res['transfer'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.transfer.send(ethReceiver, 1)).wait(...waitParams),
    );

  res['safeTransferFrom*'] = {
    zeppelin:
      await helper.arrange.calculcateFeeGas(
        {Ethereum: ethSigner.address},
        async () => await (await zeppelelinContract!.safeTransferFrom.send(ethSigner, ethReceiver, 0)).wait(...waitParams),
      ),
  };

  res['transferCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).transferCross.send(crossSigner, 1)).wait(...waitParams),
    );

  res['transferCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.transferToken(
      donor,
      3,
      {Substrate: subReceiver.address},
    ),
  )));
  await collection.approveToken(subReceiver, 3, {Substrate: donor.address});

  res['transferFrom*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.transferFrom.send(ethSigner, ethReceiver, 1)).wait(...waitParams),
    );

  res['transferFrom*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>zeppelelinContract!.connect(ethReceiver)).transferFrom.send(ethReceiver, ethSigner, 0)).wait(...waitParams),
    );


  res['transferFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).transferFromCross.send(crossReceiver, crossSigner, 1)).wait(...waitParams),
    );

  res['transferFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.transferTokenFrom(donor, 3, {Substrate: subReceiver.address}, {Substrate: donor.address}),
  )));

  res['burn'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.burn.send(1)).wait(...waitParams),
    );

  res['burn'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.burnToken(donor, 3),
  )));

  res['approve*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.approve.send(ethReceiver, 2)).wait(...waitParams),
    );

  res['approve*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.approve.send(ethReceiver, 0)).wait(...waitParams),
    );

  res['approveCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.approveCross.send(crossReceiver, 2)).wait(...waitParams),
    );

  res['approveCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.approveToken(donor, 4, {Substrate: subReceiver.address}),
  )));

  res['setApprovalForAll*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setApprovalForAll.send(ethReceiver, true)).wait(...waitParams),
    );

  res['setApprovalForAll*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.setApprovalForAll.send(ethReceiver, true)).wait(...waitParams),
    );

  res['setApprovalForAll*'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.nft.setAllowanceForAll(donor, collection.collectionId, {Substrate: subReceiver.address}, true),
  )));

  res['burnFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).burnFromCross.send(crossSigner, 2)).wait(...waitParams),
    );

  res['burnFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.burnTokenFrom(subReceiver, 4, {Substrate: donor.address}),
  )));

  res['setTokenPropertyPermissions'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setTokenPropertyPermissions.send([
        ['url', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ])).wait(...waitParams),
    );

  res['setTokenPropertyPermissions'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setTokenPropertyPermissions(donor, [{key: 'url', permission: {
      tokenOwner: true,
      collectionAdmin: true,
      mutable: true,
    }}]),
  )));

  res['setCollectionSponsorCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionSponsorCross.send(crossReceiver)).wait(...waitParams),
    );

  res['confirmCollectionSponsorship'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).confirmCollectionSponsorship.send()).wait(...waitParams),
    );

  res['removeCollectionSponsor'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.removeCollectionSponsor.send()).wait(...waitParams),
    );

  res['setCollectionSponsorCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setSponsor(donor, subReceiver.address),
  )));

  res['confirmCollectionSponsorship'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.confirmSponsorship(subReceiver),
  )));

  res['removeCollectionSponsor'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeSponsor(donor),
  )));

  res['setCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionProperties.send(PROPERTIES.slice(0, 1))).wait(...waitParams),
    );

  res['deleteCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.deleteCollectionProperties.send(PROPERTIES.slice(0,1).map(p => p.key))).wait(...waitParams),
    );
  res['setCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => ({key: p.key, value: p.value.toString()}))),
  )));

  res['deleteCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.deleteProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => p.key)),
  )));

  res['setCollectionLimit'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionLimit.send({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})).wait(...waitParams),
    );

  res['setCollectionLimit'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setLimits(donor, {accountTokenOwnershipLimit: 1000}),
  )));

  const {collectionAddress} = await helper.eth.createCollection(ethSigner, new CreateCollectionData('A', 'B', 'C', 'nft')).send();
  const collectionWithEthOwner = await helper.ethNativeContract.collection(collectionAddress, 'nft', ethSigner, true);


  res['addCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.addCollectionAdminCross.send(crossReceiver)).wait(...waitParams),
    );

  res['removeCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.removeCollectionAdminCross.send(crossReceiver)).wait(...waitParams),
    );

  res['addCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addAdmin(donor, {Ethereum: ethReceiver.address}),
  )));

  res['removeCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeAdmin(donor, {Ethereum: ethReceiver.address}),
  )));

  res['setCollectionNesting'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract['setCollectionNesting(bool)'].send(true)).wait(...waitParams),
    );

  res['setCollectionNesting[]'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract['setCollectionNesting(bool)'].send([true, false, [collectionAddress]])).wait(...waitParams),
    );

  res['setCollectionNesting'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.disableNesting(donor),
  )));

  res['setCollectionNesting[]'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(
      donor,
      {
        nesting: {
          tokenOwner: true,
          restricted: [collection.collectionId],
        },
      },
    ),
  )));

  res['setCollectionAccess'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionAccess.send(1)).wait(...waitParams),
    );

  res['setCollectionAccess'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {access: 'AllowList'}),
  )));

  res['addToCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.addToCollectionAllowListCross.send(crossReceiver)).wait(...waitParams),
    );

  res['removeFromCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.removeFromCollectionAllowListCross.send(crossReceiver)).wait(...waitParams),
    );

  res['addToCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addToAllowList(donor, {Ethereum: ethReceiver.address}),
  )));

  res['removeFromCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeFromAllowList(donor, {Ethereum: ethReceiver.address}),
  )));

  res['setCollectionMintMode'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionMintMode.send(true)).wait(...waitParams),
    );

  res['setCollectionMintMode'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {mintMode: false}),
  )));

  res['changeCollectionOwnerCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.changeCollectionOwnerCross.send(crossReceiver)).wait(...waitParams),
    );

  res['changeCollectionOwnerCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.changeOwner(donor, subReceiver.address),
  )));

  return res;
}

async function erc20CalculateFeeGas(
  helper: EthUniqueHelper,
  privateKey: (seed: string) => Promise<IKeyringPair>,

): Promise<IFunctionFee> {
  const res: IFunctionFee = {};
  const donor = await privateKey('//Alice');
  const [subReceiver] = await helper.arrange.createAccounts([10n], donor);
  const ethSigner = await helper.eth.createAccountWithBalance(donor);
  const ethReceiver = await helper.eth.createAccountWithBalance(donor);
  const crossSigner = helper.ethCrossAccount.fromAddress(ethSigner);
  const crossReceiver = helper.ethCrossAccount.fromAddress(ethReceiver);
  const collection = (await createCollectionForBenchmarks(
    'ft',
    helper,
    privateKey,
    ethSigner.address,
    null,
    PERMISSIONS,
  )) as UniqueFTCollection;

  const helperContract = await helper.ethNativeContract.collectionHelpers(ethSigner);
  let zeppelelinContract: Contract | null = null;
  const ZEPPELIN_OBJECT = '0x' + (await readFile(`${dirname}/../utils/openZeppelin/ERC20/bin/ZeppelinContract.bin`)).toString();
  const ZEPPELIN_ABI = JSON.parse((await readFile(`${dirname}/../utils/openZeppelin/ERC20/bin/ZeppelinContract.abi`)).toString());

  const evmContract = await helper.ethNativeContract.collection(
    helper.ethAddress.fromCollectionId(collection.collectionId),
    'ft',
    ethSigner,
    true,
  );

  res['createCollection'] = await helper.arrange.calculcateFeeGas(
    {Ethereum: ethSigner.address},
    async () => await (await helperContract.createFTCollection.send('test', 18,'test','test', {value: (2n * helper.balance.getOneTokenNominal())})).wait(...waitParams),
  );

  res['createCollection'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.ft.mintCollection(
      donor,
      {name: 'test', description: 'test', tokenPrefix: 'test'},
      18,
    ),
  )));

  res['createCollection'].zeppelin = await helper.arrange.calculcateFeeGas(
    {Ethereum: ethSigner.address},
    async () => {
      zeppelelinContract = await helper.ethContract.deployByAbi(
        ethSigner,
        ZEPPELIN_ABI,
        ZEPPELIN_OBJECT,
      );
    },
  );

  res['mint'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mint.send(ethSigner, 1)).wait(...waitParams),
    );

  res['mint'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.mint.send(ethSigner, 1)).wait(...waitParams),
    );

  res['mintCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mintCross.send(crossSigner, 1)).wait(...waitParams),
    );

  res['mintCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mint(
      donor,
      10n,
      {Substrate: donor.address},
    ),
  )));

  res['mintBulk'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.mintBulk.send([{to: ethSigner, amount: 1}])).wait(...waitParams),
    );

  res['mintBulk'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.executeExtrinsic(donor, 'api.tx.unique.createMultipleItemsEx',[collection.collectionId, {
      Fungible: new Map([
        [JSON.stringify({Ethereum: ethSigner.address}), 1],
      ]),
    }], true),
  )));

  res['transfer*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.transfer.send(ethReceiver, 1)).wait(...waitParams),
    );

  res['transfer*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.transfer.send(ethReceiver, 1)).wait(...waitParams),
    );

  res['transferCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).transferCross.send(crossSigner, 1)).wait(...waitParams),
    );

  res['transferCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.transfer(
      donor,
      {Substrate: subReceiver.address},
      1n,
    ),
  )));
  await collection.approveTokens(subReceiver, {Substrate: donor.address}, 1n);

  res['transferFrom*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.transferFrom.send(ethSigner, ethReceiver, 1)).wait(...waitParams),
    );

  await (await (<Contract>zeppelelinContract!.connect(ethReceiver)).approve.send(ethSigner, 10)).wait(...waitParams);

  res['transferFrom*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.transferFrom.send(ethReceiver, ethSigner, 1)).wait(...waitParams),
    );

  res['transferFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).transferFromCross.send(crossReceiver, crossSigner, 1)).wait(...waitParams),
    );

  res['transferFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.transferFrom(donor, {Substrate: subReceiver.address}, {Substrate: donor.address}, 1n),
  )));


  res['burnTokens'] = {fee: 0n, gas: 0n};
  res['burnTokens'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.burnTokens(donor, 1n),
  )));


  res['approve*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.approve.send(ethReceiver, 2)).wait(...waitParams),
    );

  res['approve*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await zeppelelinContract!.approve.send(ethReceiver, 10)).wait(...waitParams),
    );

  res['approveCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.approveCross.send(crossReceiver, 2)).wait(...waitParams),
    );

  res['approveCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.approveTokens(donor, {Substrate: subReceiver.address}, 1n),
  )));

  res['burnFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).burnFromCross.send(crossSigner, 1)).wait(...waitParams),
    );

  res['burnFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.burnTokensFrom(subReceiver, {Substrate: donor.address}, 1n),
  )));

  res['setCollectionSponsorCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionSponsorCross.send(crossReceiver)).wait(...waitParams),
    );

  res['confirmCollectionSponsorship'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver.address},
      async () => await (await (<Contract>evmContract.connect(ethReceiver)).confirmCollectionSponsorship.send()).wait(...waitParams),
    );

  res['removeCollectionSponsor'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.removeCollectionSponsor.send()).wait(...waitParams),
    );

  res['setCollectionSponsorCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setSponsor(donor, subReceiver.address),
  )));

  res['confirmCollectionSponsorship'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.confirmSponsorship(subReceiver),
  )));

  res['removeCollectionSponsor'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeSponsor(donor),
  )));

  res['setCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionProperties.send(PROPERTIES.slice(0, 1))).wait(...waitParams),
    );

  res['deleteCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.deleteCollectionProperties.send(PROPERTIES.slice(0,1).map(p => p.key))).wait(...waitParams),
    );
  res['setCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => ({key: p.key, value: p.value.toString()}))),
  )));

  res['deleteCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.deleteProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => p.key)),
  )));

  res['setCollectionLimit'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionLimit.send({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}})).wait(...waitParams),
    );

  res['setCollectionLimit'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setLimits(donor, {accountTokenOwnershipLimit: 1000}),
  )));

  const {collectionAddress} = await helper.eth.createCollection(ethSigner, new CreateCollectionData('A', 'B', 'C', 'nft')).send();
  const collectionWithEthOwner = await helper.ethNativeContract.collection(collectionAddress, 'nft', ethSigner, true);


  res['addCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.addCollectionAdminCross.send(crossReceiver)).wait(...waitParams),
    );

  res['removeCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.removeCollectionAdminCross.send(crossReceiver)).wait(...waitParams),
    );

  res['addCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addAdmin(donor, {Ethereum: ethReceiver.address}),
  )));

  res['removeCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeAdmin(donor, {Ethereum: ethReceiver.address}),
  )));

  res['setCollectionNesting'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract['setCollectionNesting(bool)'].send(true)).wait(...waitParams),
    );

  res['setCollectionNesting[]'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract['setCollectionNesting(bool)'].send(true)).wait(...waitParams),
    );

  res['setCollectionNesting'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.disableNesting(donor),
  )));

  res['setCollectionNesting[]'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(
      donor,
      {
        nesting: {
          tokenOwner: true,
          restricted: [collection.collectionId],
        },
      },
    ),
  )));

  res['setCollectionAccess'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionAccess.send(1)).wait(...waitParams),
    );

  res['setCollectionAccess'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {access: 'AllowList'}),
  )));

  res['addToCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.addToCollectionAllowListCross.send(crossReceiver)).wait(...waitParams),
    );

  res['removeFromCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.removeFromCollectionAllowListCross.send(crossReceiver)).wait(...waitParams),
    );

  res['addToCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addToAllowList(donor, {Ethereum: ethReceiver.address}),
  )));

  res['removeFromCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeFromAllowList(donor, {Ethereum: ethReceiver.address}),
  )));

  res['setCollectionMintMode'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await evmContract.setCollectionMintMode.send(true)).wait(...waitParams),
    );

  res['setCollectionMintMode'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {mintMode: false}),
  )));

  res['changeCollectionOwnerCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner.address},
      async () => await (await collectionWithEthOwner.changeCollectionOwnerCross.send(crossReceiver)).wait(...waitParams),
    );

  res['changeCollectionOwnerCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.changeOwner(donor, subReceiver.address),
  )));

  return res;
}
