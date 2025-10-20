import { ethers } from "ethers";
import vestingAbi from './vesting.abi.json'  assert { type: 'json' };
import tokenAbi from './testToken.abi.json'  assert { type: 'json' };
import {readFile} from 'fs/promises';
import { FetchRequest } from "ethers/utils";

const url = "http://127.0.0.1:9944" ; //process.env.RELAY_OPAL_HTTP_URL!;
const request = new FetchRequest(url);
request.timeout = 1000000; // Set timeout to 10 seconds
const provider = new ethers.JsonRpcProvider(request);

async function deployContract(wallet: ethers.Wallet, abi: any, args: any[], bytecode: any) {
    // Create a ContractFactory connected to your signer
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Deploy the contract (pass constructor arguments if required)
    const contract = await factory.deploy(...args);

    // Wait until the deployment transaction is mined
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("Contract deployed at:", address);
    return contract;
}

export function getWallet(provider: ethers.JsonRpcProvider) {
    // Create a wallet (signer) using your private key and connect it to the provider
    const privateKey = "PRIVATE_KEY_HERE";
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
}

export async function deployDistributionContract(wallet: ethers.Wallet, params: any[]) {
    console.log("Deploying distribution contract");
    const contractBin = (await readFile(`../scripts/currencyDistribution/vesting.bin`, "utf8")).toString();
    return (await deployContract(wallet, vestingAbi, params, contractBin).catch(console.error)) as ethers.Contract;
}

export async function deployTestTokenContract(wallet: ethers.Wallet) {
    console.log("Deploying token contract");
    const contractBin = (await readFile(`../scripts/currencyDistribution/testToken.bin`, "utf8")).toString();
    return (await deployContract(wallet, tokenAbi, [], contractBin).catch(console.error)) as ethers.Contract;
}

// const timestampSec: number = Math.floor(Date.now() / 1000);
// const alice = getWallet(provider);
// await deployDistributionContract(alice, [alice.address, timestampSec, timestampSec + 100]);