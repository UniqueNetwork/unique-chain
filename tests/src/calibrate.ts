import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import Web3 from 'web3';
import {collectionIdToAddress, createEthAccount, createEthAccountWithBalance, GAS_ARGS, recordEthFee, usingWeb3} from './eth/util/helpers';
import usingApi, {executeTransaction} from './substrate/substrate-api';
import {createCollectionExpectSuccess, createItemExpectSuccess, transferExpectSuccess, UNIQUE, waitNewBlocks} from './util/helpers';
import nonFungibleAbi from './eth/nonFungibleAbi.json';

function linearRegression(points: { x: bigint, y: bigint }[]) {
  let sumxy = 0n;
  let sumx = 0n;
  let sumy = 0n;
  let sumx2 = 0n;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    sumxy += p.x * p.y;
    sumx += p.x;
    sumy += p.y;
    sumx2 += p.x * p.x;
  }

  const nb = BigInt(n);

  const a = (nb * sumxy - sumx * sumy) / (nb * sumx2 - sumx * sumx);
  const b = (sumy - a * sumx) / nb;

  return {a, b};
}

// JS has no builtin function to calculate sqrt of bigint
// https://stackoverflow.com/a/53684036/6190169
function sqrt(value: bigint) {
  if (value < 0n) {
    throw 'square root of negative numbers is not supported';
  }

  if (value < 2n) {
    return value;
  }

  function newtonIteration(n: bigint, x0: bigint): bigint {
    const x1 = ((n / x0) + x0) >> 1n;
    if (x0 === x1 || x0 === (x1 - 1n)) {
      return x0;
    }
    return newtonIteration(n, x1);
  }

  return newtonIteration(value, 1n);
}

function _error(points: { x: bigint, y: bigint }[], hypothesis: (a: bigint) => bigint) {
  return sqrt(points.map(p => {
    const v = hypothesis(p.x);
    const vv = p.y;

    return (v - vv) ** 2n;
  }).reduce((a, b) => a + b, 0n) / BigInt(points.length));
}

async function calibrateWeightToFee(api: ApiPromise, privateKey: (account: string) => IKeyringPair) {
  const alice = privateKey('//Alice');
  const bob = privateKey('//Bob');
  const dataPoints = [];

  {
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    const aliceBalanceBefore = (await api.query.system.account(alice.address)).data.free.toBigInt();
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 1, 'NFT');
    const aliceBalanceAfter = (await api.query.system.account(alice.address)).data.free.toBigInt();

    console.log(`Original price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(UNIQUE)} UNQ`);
  }

  const defaultCoeff = (api.consts.configuration.defaultWeightToFeeCoefficient as any).toBigInt();
  for (let i = -5; i < 5; i++) {
    await executeTransaction(api, alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(defaultCoeff + defaultCoeff / 1000n * BigInt(i))));

    const coefficient = (await api.query.configuration.weightToFeeCoefficientOverride() as any).toBigInt();
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');

    const aliceBalanceBefore = (await api.query.system.account(alice.address)).data.free.toBigInt();
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 1, 'NFT');
    const aliceBalanceAfter = (await api.query.system.account(alice.address)).data.free.toBigInt();

    const transferPrice = aliceBalanceBefore - aliceBalanceAfter;

    dataPoints.push({x: transferPrice, y: coefficient});
  }
  const {a, b} = linearRegression(dataPoints);

  // console.log(`Error: ${error(dataPoints, x => a*x+b)}`);

  const perfectValue = a * UNIQUE / 10n + b;
  await executeTransaction(api, alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(perfectValue.toString())));

  {
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT');
    const aliceBalanceBefore = (await api.query.system.account(alice.address)).data.free.toBigInt();
    await transferExpectSuccess(collectionId, tokenId, alice, bob, 1, 'NFT');
    const aliceBalanceAfter = (await api.query.system.account(alice.address)).data.free.toBigInt();

    console.log(`Calibrated price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(UNIQUE)} UNQ`);
  }
}

async function calibrateMinGasPrice(api: ApiPromise, web3: Web3, privateKey: (account: string) => IKeyringPair) {
  const alice = privateKey('//Alice');
  const caller = await createEthAccountWithBalance(api, web3, privateKey);
  const receiver = createEthAccount(web3);
  const dataPoints = [];

  {
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collectionId);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const cost = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, tokenId).send(caller));

    console.log(`Original price: ${Number(cost) / Number(UNIQUE)} UNQ`);
  }

  const defaultCoeff = (api.consts.configuration.defaultMinGasPrice as any).toBigInt();
  for (let i = -8; i < 8; i++) {
    const gasPrice = defaultCoeff + defaultCoeff / 100000n * BigInt(i);
    const gasPriceStr = '0x' + gasPrice.toString(16);
    await executeTransaction(api, alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(gasPrice)));

    const coefficient = (await api.query.configuration.minGasPriceOverride() as any).toBigInt();
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collectionId);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, gasPrice: gasPriceStr, ...GAS_ARGS});

    const transferPrice = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, tokenId).send(caller));

    dataPoints.push({x: transferPrice, y: coefficient});
  }

  const {a, b} = linearRegression(dataPoints);

  // console.log(`Error: ${error(dataPoints, x => a*x+b)}`);

  // * 0.15 = * 10000 / 66666
  const perfectValue = a * UNIQUE * 1000000n / 6666666n + b;
  await executeTransaction(api, alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(perfectValue.toString())));

  {
    const collectionId = await createCollectionExpectSuccess();
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', {Ethereum: caller});

    const address = collectionIdToAddress(collectionId);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, address, {from: caller, ...GAS_ARGS});

    const cost = await recordEthFee(api, caller, () => contract.methods.transfer(receiver, tokenId).send(caller));

    console.log(`Calibrated price: ${Number(cost) / Number(UNIQUE)} UNQ`);
  }
}

(async () => {
  await usingApi(async (api, privateKey) => {
    // Second run slightly reduces error sometimes, as price line is not actually straight, this is a curve

    await calibrateWeightToFee(api, privateKey);
    await calibrateWeightToFee(api, privateKey);

    await usingWeb3(async web3 => {
      await calibrateMinGasPrice(api, web3, privateKey);
      await calibrateMinGasPrice(api, web3, privateKey);
    });

    await api.disconnect();
  });
})();
