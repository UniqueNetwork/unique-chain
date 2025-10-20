import { expect } from "chai";
import { ethers, FetchRequest } from "ethers";
import {deployDistributionContract, getWallet, deployTestTokenContract} from "./deploy"
  
import { Signer, AddressLike } from "ethers";
import holders from "./holders.json";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

function getProvider(): ethers.JsonRpcProvider {
  const url = "http://127.0.0.1:9944" ; //process.env.RELAY_OPAL_HTTP_URL!;
  const request = new FetchRequest(url);
  request.timeout = 1000000; // Set timeout to 10 seconds
  return new ethers.JsonRpcProvider(request);
}

describe("Distribute tokens", function () {
  let owner: ethers.Wallet;
  let user1: ethers.BaseWallet;
  let user2: ethers.BaseWallet;
  let provider: ethers.JsonRpcProvider;
  
  before(async () => {
    provider = getProvider();
    owner = getWallet(provider);
    user1 = ethers.Wallet.createRandom(provider);
    await fundUser(user1.address);

    user2 = ethers.Wallet.createRandom(provider);
    await fundUser(user2.address);

    holders.push(user1.address);
  });

  async function fundUser(address: string) {
    const tx = await owner.sendTransaction({
      to: address,
      value: ethers.parseEther("10"),
    });
    await tx.wait();
  }

  async function deployTestToken() {
    const testToken = await deployTestTokenContract(owner);

    const tx = await testToken.mint(await owner.getAddress(), holders.length);
    await tx.wait();
    return testToken;
  }

  async function deployDistribution(timestampSec: number) {
    const testToken = await deployTestToken();
    const distributionContract = await deployDistributionContract(owner, [await testToken.getAddress(), timestampSec, 1000]);

    return [testToken, distributionContract];
  }

  it("Send in batches", async function () {
    const timestampSec = Math.floor(Date.now() / 1000);
    const [testToken, distributionContract] = await deployDistribution(timestampSec);

    await testToken.approve(await distributionContract.getAddress(), holders.length);
    const BATCH_SIZE = 100;
    const nonce = await owner.getNonce();
    for (let i = 0; i < holders.length; i += BATCH_SIZE) {
      const length = Math.min(holders.length - i, BATCH_SIZE);
      const amounts = new Array(length).fill(1);
      const tx = await distributionContract.batchAddBenefitiaries(holders.slice(i, i + length), amounts, {nonce: nonce + i });
      await tx.wait();
    }

    expect(await distributionContract.allocatedAmount(owner.address)).to.eq(0n);
    for (let i = 0; i < holders.length; i++) {
      const holder = holders[i];
      expect(await distributionContract.allocatedAmount(holder)).to.eq(1n);
    }

    expect(await distributionContract.vestedAmount(holders[0], timestampSec - 1)).to.eq(0n);
    expect(await distributionContract.vestedAmount(holders[0], timestampSec)).to.eq(1n);
    expect(await distributionContract.vestedAmount(holders[0], timestampSec + 1001)).to.eq(0n);

    let user1_distributionContract = distributionContract.connect(user1) as ethers.Contract;
    await expect(user1_distributionContract.release()).to.be.rejectedWith('not enough is donated');

    let user2_distributionContract = distributionContract.connect(user2) as ethers.Contract;
    await expect(user2_distributionContract.release()).to.be.rejectedWith('nothing to release');

    {
      const tx = await testToken.approve(await distributionContract.getAddress(), holders.length);
      await tx.wait()
    }
    {
      let tx = await distributionContract.donate(holders.length);
      await tx.wait();
    }

    console.log(1);
    await user1_distributionContract.release();

    console.log(2, await testToken.balanceOf(await distributionContract.getAddress()), holders.length - 1);
    {
      let tx = await distributionContract.refundDonation(holders.length - 1);
      await tx.wait();
    }
    
    console.log(3);
  });

//   it("Pull tokens with approve", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const transferWithApprove = await deployTransferWithApprove(await testToken.getAddress());

//     await testToken.approve(await transferWithApprove.getAddress(), holders.length);

//     let ethBefore = await ethers.provider.getBalance(await owner.getAddress());
//     let tokenAddress = await testToken.getAddress();
//     let totalGasPrice = 0n;
//     const signers = (await ethers.getSigners()).slice(1, 6);
//     for (let i = 0; i < holders.length; i++) {
//       const signer = signers[i % 5];
//       const nonce = intToUint8Array(i + 1);
//       let domain = {
//         name: "MyContract",
//         version: "1",
//         chainId: 1,
//         verifyingContract: await transferWithApprove.getAddress()
//       };
//       const signature = await owner.signTypedData(
//         domain,
//         {
//           TransferWithAuthorization: [
//             { name: "from", type: "address" },
//             { name: "to", type: "address" },
//             { name: "value", type: "uint256" },
//             { name: "validAfter", type: "uint256" },
//             { name: "validBefore", type: "uint256" },
//             { name: "nonce", type: "bytes32" },
//           ],
//         },
//         {
//           from: await owner.getAddress(),
//           to: await signer.getAddress(),
//           value: 1n,
//           validAfter: 0n,
//           validBefore: 18446744073709551615n, // Valid for an hour
//           nonce: nonce,
//         }
//       );
//       let { r, s, v } = ethers.Signature.from(signature);
//       let response = await transferWithApprove.connect(signer).transferWithAuthorization(
//         await owner.getAddress(),
//         await signer.getAddress(),
//         1n,
//         0n,
//         18446744073709551615n,
//         nonce,
//         v,
//         r,
//         s
//       );
//       let receipt = await ethers.provider.getTransactionReceipt(response.hash);
//       totalGasPrice += receipt!.gasUsed;
//     }
    
//     console.log("totalGasPrice", totalGasPrice);
//     //303525372
//     let ethAfter = await ethers.provider.getBalance(await owner.getAddress());

//     console.log(`Eth spent ${ethBefore - ethAfter}`);

//     function intToUint8Array(value: number) {
//       const byteArray = new Uint8Array(32);
//       for (let i = byteArray.length - 1; i >= 0; i--) {
//           byteArray[i] = value & 0xff;
//           value = value >> 8;
//       }
//       return byteArray;
//     }
//   });


//   it("Pull tokens with approve 2", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const transferWithApprove = await deployTransferWithApprove2(await testToken.getAddress());

//     await testToken.approve(await transferWithApprove.getAddress(), holders.length);

//     let ethBefore = await ethers.provider.getBalance(await owner.getAddress());
//     let tokenAddress = await testToken.getAddress();
//     let totalGasPrice = 0n;
//     const signers = (await ethers.getSigners()).slice(1, 6);
//     for (let i = 0; i < holders.length; i++) {
//       const signer = signers[i % 5];
//       let domain = {
//         name: "MyContract",
//         version: "1",
//         chainId: 1,
//         verifyingContract: await transferWithApprove.getAddress()
//       };
//       const signature = await owner.signTypedData(
//         domain,
//         {
//           TransferWithAuthorization: [
//             { name: "from", type: "address" },
//             { name: "to", type: "address" },
//             { name: "value", type: "uint256" },
//             { name: "validAfter", type: "uint256" },
//             { name: "validBefore", type: "uint256" },
//             { name: "nonce", type: "uint256" },
//           ],
//         },
//         {
//           from: await owner.getAddress(),
//           to: await signer.getAddress(),
//           value: 1n,
//           validAfter: 0n,
//           validBefore: 18446744073709551615n, // Valid for an hour
//           nonce: BigInt(i),
//         }
//       );
//       let { r, s, v } = ethers.Signature.from(signature);
//       let response = await transferWithApprove.connect(signer).transferWithAuthorization(
//         await owner.getAddress(),
//         await signer.getAddress(),
//         1n,
//         0n,
//         18446744073709551615n,
//         BigInt(i),
//         v,
//         r,
//         s
//       );
//       let receipt = await ethers.provider.getTransactionReceipt(response.hash);
//       totalGasPrice += receipt!.gasUsed;
//     }
    
//     console.log("totalGasPrice", totalGasPrice);
//     //239301132
//     let ethAfter = await ethers.provider.getBalance(await owner.getAddress());

//     console.log(`Eth spent ${ethBefore - ethAfter}`);
//   });

//   it("Pull tokens with approve 3", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const transferWithApprove = await deployTransferWithApprove3(await testToken.getAddress());

//     await testToken.approve(await transferWithApprove.getAddress(), holders.length);

//     let ethBefore = await ethers.provider.getBalance(await owner.getAddress());
//     let tokenAddress = await testToken.getAddress();
//     let totalGasPrice = 0n;
//     const signers = (await ethers.getSigners()).slice(1, 6);
//     for (let i = 0; i < holders.length + Math.floor(holders.length) / 256; i++) {
//       if (i % 256 == 0)
//           i++;
//       const signer = signers[i % 5];
//       let domain = {
//         name: "MyContract",
//         version: "1",
//         chainId: 1,
//         verifyingContract: await transferWithApprove.getAddress()
//       };
//       const signature = await owner.signTypedData(
//         domain,
//         {
//           TransferWithAuthorization: [
//             { name: "from", type: "address" },
//             { name: "to", type: "address" },
//             { name: "value", type: "uint256" },
//             { name: "validAfter", type: "uint256" },
//             { name: "validBefore", type: "uint256" },
//             { name: "nonce", type: "uint256" },
//           ],
//         },
//         {
//           from: await owner.getAddress(),
//           to: await signer.getAddress(),
//           value: 1n,
//           validAfter: 0n,
//           validBefore: 18446744073709551615n, // Valid for an hour
//           nonce: BigInt(i),
//         }
//       );
//       let { r, s, v } = ethers.Signature.from(signature);
//       let response = await transferWithApprove.connect(signer).transferWithAuthorization(
//         await owner.getAddress(),
//         await signer.getAddress(),
//         1n,
//         0n,
//         18446744073709551615n,
//         BigInt(i),
//         v,
//         r,
//         s
//       );
//       let receipt = await ethers.provider.getTransactionReceipt(response.hash);
//       totalGasPrice += receipt!.gasUsed;
//     }
    
//     console.log("totalGasPrice", totalGasPrice);
//     //239301132
//     let ethAfter = await ethers.provider.getBalance(await owner.getAddress());

//     console.log(`Eth spent ${ethBefore - ethAfter}`);
//   });
// })

// describe("ReDeFiAirdropOct2024", function () {
//   const BATCH_SIZE = 50;
//   const ONE_TOKEN = ethers.parseUnits("1", 18);
//   let owner: Signer;
//   let user: Signer;

//   async function deployTestToken() {
//     [owner] = await ethers.getSigners();
//     const TestToken = await ethers.getContractFactory("TestToken", owner);
//     const testToken = await TestToken.deploy();

//     await testToken.mint(await owner.getAddress(), 1000);
//     return testToken;
//   }

//   async function deployVesting(token: AddressLike) {
//     const Vesting = await ethers.getContractFactory("ReDeFiAirdropOct2024", owner);
//     const now = Date.now();
//     const vesting = await Vesting.deploy(token, now, 1);
//     await vesting.waitForDeployment();
//     let receipt = await ethers.provider.getTransactionReceipt( vesting.deploymentTransaction()!.hash);
//     console.log("deploy cost", receipt?.gasUsed);

//     return vesting;
//   }

//   async function initVesting() {
//     [owner, user] = await ethers.getSigners();
//     const TestToken = await ethers.getContractFactory("TestToken", owner);
//     const token = await TestToken.deploy();

//     const Vesting = await ethers.getContractFactory("ReDeFiAirdropOct2024", owner);
//     const now = Date.now();
//     const vesting = await Vesting.deploy(token, Math.floor(now / 1000) + 100, 100);
//     let beneficiaries = holders.concat(await user.getAddress());
//     const totalAmount = BigInt(beneficiaries.length) * ONE_TOKEN;
//     await token.mint(owner, totalAmount);
//     await token.approve(await vesting.getAddress(), totalAmount);
//     for (let i = 0; i < beneficiaries.length; i += BATCH_SIZE) {
//       let length = Math.min(beneficiaries.length - i, BATCH_SIZE);
//       let amounts = new Array(length).fill(ONE_TOKEN);
//       let response = await vesting.batchAddBenefitiaries(beneficiaries.slice(i, i + length), amounts);
//       await response.wait();
//     }
//     return {token, vesting};
//   }

//   async function getTimestamp() {
//     const blockNumber = await ethers.provider.getBlockNumber();
//     return BigInt((await ethers.provider.getBlock(blockNumber))!.timestamp);
//   }

//   it("should deploy", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const vesting = await deployVesting(testToken);
//   });

//   it("should set vesting amounts", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const vesting = await deployVesting(testToken);
//     let totalGasPrice = 0n;
//     const totalAmount = BigInt(holders.length) * ONE_TOKEN;
//     await testToken.mint(owner, totalAmount);
//     await testToken.approve(await vesting.getAddress(), totalAmount);
//     for (let i = 0; i < holders.length; i += BATCH_SIZE) {
//       let length = Math.min(holders.length - i, BATCH_SIZE);
//       let amounts = new Array(length).fill(ONE_TOKEN);
//       let response = await vesting.batchAddBenefitiaries(holders.slice(i, i + length), amounts);
//       let receipt = await ethers.provider.getTransactionReceipt(response.hash);
//       totalGasPrice += receipt!.gasUsed;
//     }
//     console.log("totalGasPrice", totalGasPrice);
//   });

//   it("should not set vesting amounts with not enough tokens", async function () {
//     const testToken = await loadFixture(deployTestToken);
//     const vesting = await deployVesting(testToken);
//     let length = Math.min(holders.length, BATCH_SIZE);
//     let amounts = new Array(length).fill(ONE_TOKEN);
//     await expect(vesting.batchAddBenefitiaries(holders.slice(0, length), amounts)).to.be.rejectedWith("vested more then tokens available");
//   });

//   it("should release tokens", async function () {
//     const { token, vesting } = await loadFixture(initVesting);
//     const vestingStart = await vesting.start();
//     const vestingDuration = await vesting.duration();
//     expect(await vesting.connect(user).releasable(holders[0])).to.eq(0n);
//     await mine(100);
//     const timestamp = await getTimestamp();
//     const releasable = await vesting.connect(user).releasable(holders[0]);
//     const expected = ONE_TOKEN * (timestamp - vestingStart) / vestingDuration;
//     expect(releasable).to.be.eq(expected);
//     await mine(100);
//     expect(await vesting.connect(user).releasable(holders[0])).to.be.eq(ethers.parseUnits("1", 18));
//     const tx = await vesting.connect(user).release();
//     const receipt = await tx.wait();
//     console.log("release cost", receipt!.gasUsed);
//     expect(await token.balanceOf(user)).to.eq(ONE_TOKEN);
//   });
});