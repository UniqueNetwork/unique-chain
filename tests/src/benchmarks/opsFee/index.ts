import {EthUniqueHelper, usingEthPlaygrounds} from '../../eth/util';
import {readFile} from 'fs/promises';
import {CollectionLimitField,  TokenPermissionField} from '../../eth/util/playgrounds/types';
import {IKeyringPair} from '@polkadot/types/types';
import {UniqueFTCollection, UniqueNFTCollection} from '../../util/playgrounds/unique';
import {Contract} from 'web3-eth-contract';
import {createObjectCsvWriter} from 'csv-writer';
import {FunctionFeeVM, IFunctionFee} from '../utils/types';
import {convertToTokens, createCollectionForBenchmarks, PERMISSIONS, PROPERTIES, SUBS_PROPERTIES} from '../utils/common';
import {makeNames} from '../../util';


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
  const ethSigner = await helper.eth.createAccountWithBalance(donor, 100n);
  const ethReceiver = await helper.eth.createAccountWithBalance(donor, 10n);
  const crossSigner = helper.ethCrossAccount.fromAddress(ethSigner);
  const crossReceiver = helper.ethCrossAccount.fromAddress(ethReceiver);
  const collection = (await createCollectionForBenchmarks(
    'nft',
    helper,
    privateKey,
    ethSigner,
    null,
    PERMISSIONS,
  )) as UniqueNFTCollection;

  const helperContract = await helper.ethNativeContract.collectionHelpers(ethSigner);
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
    {Ethereum: ethSigner},
    () => helperContract.methods.createNFTCollection('test','test','test').send({from: ethSigner, value: Number(2n * helper.balance.getOneTokenNominal())}),
  );

  res['createCollection'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.nft.mintCollection(
      donor,
      {name: 'test', description: 'test', tokenPrefix: 'test'},
    ),
  )));

  res['createCollection'].zeppelin = await helper.arrange.calculcateFeeGas(
    {Ethereum: ethSigner},
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
      {Ethereum: ethSigner},
      () => evmContract.methods.mint(ethSigner).send(),
    );

  res['mint'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.safeMint(ethSigner, '').send({from: ethSigner}),
    );

  res['mintCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.mintCross(crossSigner, []).send(),
    );

  res['mint'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintToken(
      donor,
      {owner: donor.address},
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
      {Ethereum: ethSigner},
      () => evmContract.methods.mintWithTokenURI(ethSigner, 'Test URI').send(),
    );

  res['mintWithTokenURI'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.mintToken(
      donor,
      {
        owner:  {Ethereum: ethSigner},
        properties: [{key: 'URI', value: 'Test URI'}],
      },
    ),
  )));

  res['mintWithTokenURI'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.safeMint(ethSigner, 'Test URI').send({from: ethSigner}),
    );

  res['setProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.setProperties(1, PROPERTIES.slice(0,1)).send(),
    );

  res['deleteProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.deleteProperties(1, [PROPERTIES[0].key]).send(),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.transfer(ethReceiver, 1).send(),
    );

  res['safeTransferFrom*'] = {
    zeppelin:
      await helper.arrange.calculcateFeeGas(
        {Ethereum: ethSigner},
        () => zeppelelinContract!.methods.safeTransferFrom(ethSigner, ethReceiver, 0).send({from: ethSigner}),
      ),
  };

  res['transferCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.transferCross(crossSigner, 1).send({from: ethReceiver}),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.transferFrom(ethSigner, ethReceiver, 1).send(),
    );

  res['transferFrom*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => zeppelelinContract!.methods.transferFrom(ethReceiver, ethSigner, 0).send({from: ethReceiver}),
    );


  res['transferFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.transferFromCross(crossReceiver, crossSigner, 1).send({from:ethReceiver}),
    );

  res['transferFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.transferTokenFrom(donor, 3, {Substrate: subReceiver.address}, {Substrate: donor.address}),
  )));

  res['burn'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.burn(1).send(),
    );

  res['burn'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.burnToken(donor, 3),
  )));

  res['approve*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.approve(ethReceiver, 2).send(),
    );

  res['approve*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.approve(ethReceiver, 0).send({from: ethSigner}),
    );

  res['approveCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.approveCross(crossReceiver, 2).send(),
    );

  res['approveCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.approveToken(donor, 4, {Substrate: subReceiver.address}),
  )));

  res['setApprovalForAll*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.setApprovalForAll(ethReceiver, true).send(),
    );

  res['setApprovalForAll*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.setApprovalForAll(ethReceiver, true).send({from: ethSigner}),
    );

  res['setApprovalForAll*'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.nft.setAllowanceForAll(donor, collection.collectionId, {Substrate: subReceiver.address}, true),
  )));

  res['burnFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.burnFromCross(crossSigner, 2).send({from:ethReceiver}),
    );

  res['burnFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.burnTokenFrom(subReceiver, 4, {Substrate: donor.address}),
  )));

  res['setTokenPropertyPermissions'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setTokenPropertyPermissions([
        ['url', [
          [TokenPermissionField.Mutable, true],
          [TokenPermissionField.TokenOwner, true],
          [TokenPermissionField.CollectionAdmin, true]],
        ],
      ]).send(),
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
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionSponsorCross(crossReceiver).send(),
    );

  res['confirmCollectionSponsorship'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () =>  evmContract.methods.confirmCollectionSponsorship().send({from: ethReceiver}),
    );

  res['removeCollectionSponsor'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.removeCollectionSponsor().send(),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.setCollectionProperties(PROPERTIES.slice(0, 1)).send(),
    );

  res['deleteCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.deleteCollectionProperties(PROPERTIES.slice(0,1).map(p => p.key)).send(),
    );
  res['setCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => { return {key: p.key, value: p.value.toString()}; })),
  )));

  res['deleteCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.deleteProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => p.key)),
  )));

  res['setCollectionLimit'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}}).send(),
    );

  res['setCollectionLimit'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setLimits(donor, {accountTokenOwnershipLimit: 1000}),
  )));

  const {collectionAddress} = await helper.eth.createCollection('nft', ethSigner, 'A', 'B', 'C');
  const collectionWithEthOwner = await helper.ethNativeContract.collection(collectionAddress, 'nft', ethSigner, true);


  res['addCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.addCollectionAdminCross(crossReceiver).send(),
    );

  res['removeCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.removeCollectionAdminCross(crossReceiver).send(),
    );

  res['addCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addAdmin(donor, {Ethereum: ethReceiver}),
  )));

  res['removeCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeAdmin(donor, {Ethereum: ethReceiver}),
  )));

  res['setCollectionNesting'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionNesting(true).send(),
    );

  res['setCollectionNesting[]'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionNesting(true, [collectionAddress]).send(),
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
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionAccess(1).send(),
    );

  res['setCollectionAccess'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {access: 'AllowList'}),
  )));

  res['addToCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.addToCollectionAllowListCross(crossReceiver).send(),
    );

  res['removeFromCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.removeFromCollectionAllowListCross(crossReceiver).send(),
    );

  res['addToCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addToAllowList(donor, {Ethereum: ethReceiver}),
  )));

  res['removeFromCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeFromAllowList(donor, {Ethereum: ethReceiver}),
  )));

  res['setCollectionMintMode'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionMintMode(true).send(),
    );

  res['setCollectionMintMode'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {mintMode: false}),
  )));

  res['changeCollectionOwnerCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.changeCollectionOwnerCross(crossReceiver).send(),
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
  const ethSigner = await helper.eth.createAccountWithBalance(donor, 100n);
  const ethReceiver = await helper.eth.createAccountWithBalance(donor, 10n);
  const crossSigner = helper.ethCrossAccount.fromAddress(ethSigner);
  const crossReceiver = helper.ethCrossAccount.fromAddress(ethReceiver);
  const collection = (await createCollectionForBenchmarks(
    'ft',
    helper,
    privateKey,
    ethSigner,
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
    {Ethereum: ethSigner},
    () => helperContract.methods.createFTCollection('test', 18,'test','test').send({from: ethSigner, value: Number(2n * helper.balance.getOneTokenNominal())}),
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
    {Ethereum: ethSigner},
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
      {Ethereum: ethSigner},
      () => evmContract.methods.mint(ethSigner, 1).send(),
    );

  res['mint'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.mint(ethSigner, 1).send(),
    );

  res['mintCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.mintCross(crossSigner, 1).send(),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.mintBulk([{to: ethSigner, amount: 1}]).send(),
    );

  res['mintBulk'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => helper.executeExtrinsic(donor, 'api.tx.unique.createMultipleItemsEx',[collection.collectionId, {
      Fungible: new Map([
        [JSON.stringify({Ethereum: ethSigner}), 1],
      ]),
    }], true),
  )));

  res['transfer*'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.transfer(ethReceiver, 1).send(),
    );

  res['transfer*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.transfer(ethReceiver, 1).send(),
    );

  res['transferCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.transferCross(crossSigner, 1).send({from: ethReceiver}),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.transferFrom(ethSigner, ethReceiver, 1).send(),
    );

  await zeppelelinContract!.methods.approve(ethSigner, 10).send({from: ethReceiver});

  res['transferFrom*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.transferFrom(ethReceiver, ethSigner, 1).send({from: ethSigner}),
    );

  res['transferFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.transferFromCross(crossReceiver, crossSigner, 1).send({from:ethReceiver}),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.approve(ethReceiver, 2).send(),
    );

  res['approve*'].zeppelin =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => zeppelelinContract!.methods.approve(ethReceiver, 10).send(),
    );

  res['approveCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () => evmContract.methods.approveCross(crossReceiver, 2).send(),
    );

  res['approveCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.approveTokens(donor, {Substrate: subReceiver.address}, 1n),
  )));

  res['burnFromCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () => evmContract.methods.burnFromCross(crossSigner, 1).send({from:ethReceiver}),
    );

  res['burnFromCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: subReceiver.address},
    () => collection.burnTokensFrom(subReceiver, {Substrate: donor.address}, 1n),
  )));

  res['setCollectionSponsorCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionSponsorCross(crossReceiver).send(),
    );

  res['confirmCollectionSponsorship'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethReceiver},
      () =>  evmContract.methods.confirmCollectionSponsorship().send({from: ethReceiver}),
    );

  res['removeCollectionSponsor'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.removeCollectionSponsor().send(),
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
      {Ethereum: ethSigner},
      () => evmContract.methods.setCollectionProperties(PROPERTIES.slice(0, 1)).send(),
    );

  res['deleteCollectionProperties'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.deleteCollectionProperties(PROPERTIES.slice(0,1).map(p => p.key)).send(),
    );
  res['setCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => { return {key: p.key, value: p.value.toString()}; })),
  )));

  res['deleteCollectionProperties'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.deleteProperties(donor, PROPERTIES.slice(0, 1)
      .map(p => p.key)),
  )));

  res['setCollectionLimit'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionLimit({field: CollectionLimitField.AccountTokenOwnership, value: {status: true, value: 1000}}).send(),
    );

  res['setCollectionLimit'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setLimits(donor, {accountTokenOwnershipLimit: 1000}),
  )));

  const {collectionAddress} = await helper.eth.createCollection('nft', ethSigner, 'A', 'B', 'C');
  const collectionWithEthOwner = await helper.ethNativeContract.collection(collectionAddress, 'nft', ethSigner, true);


  res['addCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.addCollectionAdminCross(crossReceiver).send(),
    );

  res['removeCollectionAdminCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.removeCollectionAdminCross(crossReceiver).send(),
    );

  res['addCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addAdmin(donor, {Ethereum: ethReceiver}),
  )));

  res['removeCollectionAdminCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeAdmin(donor, {Ethereum: ethReceiver}),
  )));

  res['setCollectionNesting'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionNesting(true).send(),
    );

  res['setCollectionNesting[]'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionNesting(true, [collectionAddress]).send(),
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
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionAccess(1).send(),
    );

  res['setCollectionAccess'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {access: 'AllowList'}),
  )));

  res['addToCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.addToCollectionAllowListCross(crossReceiver).send(),
    );

  res['removeFromCollectionAllowListCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.removeFromCollectionAllowListCross(crossReceiver).send(),
    );

  res['addToCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.addToAllowList(donor, {Ethereum: ethReceiver}),
  )));

  res['removeFromCollectionAllowListCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.removeFromAllowList(donor, {Ethereum: ethReceiver}),
  )));

  res['setCollectionMintMode'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  evmContract.methods.setCollectionMintMode(true).send(),
    );

  res['setCollectionMintMode'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.setPermissions(donor, {mintMode: false}),
  )));

  res['changeCollectionOwnerCross'] =
    await helper.arrange.calculcateFeeGas(
      {Ethereum: ethSigner},
      () =>  collectionWithEthOwner.methods.changeCollectionOwnerCross(crossReceiver).send(),
    );

  res['changeCollectionOwnerCross'].substrate = convertToTokens((await helper.arrange.calculcateFee(
    {Substrate: donor.address},
    () => collection.changeOwner(donor, subReceiver.address),
  )));

  return res;
}
