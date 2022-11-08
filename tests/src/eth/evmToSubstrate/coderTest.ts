import { EthUniqueHelper, usingEthPlaygrounds } from '../util';
import { readFile } from 'fs/promises';
import { ContractImports } from '../util/playgrounds/types';
import { Contract } from '@polkadot/api-contract/base';
import Web3 from 'web3';
import {
	IProperty,
	ITokenPropertyPermission,
} from '../../util/playgrounds/types';
import { addressToEvm, decodeAddress } from '@polkadot/util-crypto';
import nonFungibleAbi from '../nonFungibleAbi.json';
import { IKeyringPair } from '@polkadot/types/types';

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
		const contract_source = (
			await readFile(`${__dirname}/EvmToSubstrateHelper.sol`)
		).toString();

		const donor = await privateKey('//Alice'); // Seed from account with balance on this network
		const myAccount = await privateKey('//Bob'); // replace with account from polkadot extension
		const signer = await helper.eth.createAccountWithBalance(donor, 100n);
		console.log(`signer data: ${Uint8Array.from(Buffer.from(signer.slice(2), 'hex'))}`)
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
			limits: { sponsorTransferTimeout: 0, sponsorApproveTimeout: 0 },
			permissions: { mintMode: true },
		});

		await collection.addToAllowList(donor, {
			Ethereum: helper.address.substrateToEth(donor.address),
		});
		await collection.addToAllowList(donor, { Substrate: donor.address });
		await collection.addAdmin(donor, { Ethereum: signer });
		await collection.addAdmin(donor, {
			Ethereum: helper.address.substrateToEth(donor.address),
		});

		console.log('collection admin(s)): ', await collection.getAdmins());
		console.log('collection owner(s)): ', await collection.getAllowList());

		const collectionEthAddress = helper.ethAddress.fromCollectionId(
			collection.collectionId,
		);

		const collectionEthContract = helper.ethNativeContract.collection(
			collectionEthAddress,
			'nft',
		);

		const receiverEthAddress = helper.address.substrateToEth(myAccount.address);
			
		const contract = await helper.ethContract.deployByCode(
			signer,
			'EvmToSubstrate',
			contract_source,
			CONTRACT_IMPORT,
		);
		console.log(`contract has been deployed\naddres: ${contract.options.address} || ${Uint8Array.from(Buffer.from(contract.options.address.slice(2), 'hex'))}`);

		await helper.eth.transferBalanceFromSubstrate(
			donor,
			contract.options.address,
			100n,
		);

		console.log(`transfer has been completed`);

		await collection.addToAllowList(donor, {
			Ethereum: contract.options.address,
		});
		await collection.addAdmin(donor, { Ethereum: contract.options.address });

		console.log(`setup has been completed`);

		console.log('\t\t\t *** Properties Fees ***\n');

		const propertiesNumber = 20;

		const properties = Array(40)
			.fill(0)
			.map((_, i) => {
				return {
					key: `key_${i}`,
					value: Uint8Array.from(Buffer.from(`value_${i}`)),
				};
			});

		const permissions: ITokenPropertyPermission[] = properties.map((p) => {
			return {
				key: p.key,
				permission: {
					tokenOwner: true,
					collectionAdmin: true,
					mutable: true,
				},
			};
		});

		//    *** ProxyContract Bulk ***

		const token = await collection.mintToken(donor, { Ethereum: signer });

		const mintWithBulkPropProxyContractFee = await helper.arrange.calculcateFee(
			{ Ethereum: signer },
			async () => {
				await contract.methods
					.proxyProperties(
						collectionEthContract.options.address,
						token.tokenId,
						properties.slice(0, propertiesNumber).map((p) => {
							return { field_0: p.key, field_1: p.value };
						}),
					)
					.send({ from: signer });
			},
		);
		console.log(
			`token mint from contract(with bulk prop.) to the Substrate Id: ${mintWithBulkPropProxyContractFee}`,
		);

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
	privateKey: (seed: string) => Promise<IKeyringPair>,
	ethSigner: string,
	proxyContract: string,
	permissions: ITokenPropertyPermission[],
) {
	const donor = await privateKey('//Alice'); // Seed from account with balance on this network

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
		limits: { sponsorTransferTimeout: 0, sponsorApproveTimeout: 0 },
		permissions: { mintMode: true },
	});

	await collection.addToAllowList(donor, {
		Ethereum: helper.address.substrateToEth(donor.address),
	});
	await collection.addToAllowList(donor, { Substrate: donor.address });
	await collection.addAdmin(donor, { Ethereum: ethSigner });
	await collection.addAdmin(donor, {
		Ethereum: helper.address.substrateToEth(donor.address),
	});
	await collection.addToAllowList(donor, { Ethereum: proxyContract });
	await collection.addAdmin(donor, { Ethereum: proxyContract });
	await collection.setTokenPropertyPermissions(donor, permissions);

	return collection;
}
