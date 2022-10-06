import {IKeyringPair} from '@polkadot/types/types';

import {usingEthPlaygrounds, EthUniqueHelper} from './eth/util/playgrounds';


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

async function calibrateWeightToFee(helper: EthUniqueHelper, privateKey: (account: string) => IKeyringPair) {
  const alice = privateKey('//Alice');
  const bob = privateKey('//Bob');
  const dataPoints = [];

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    console.log(`Original price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }

  const api = helper.getApi();
  const defaultCoeff = (api.consts.configuration.defaultWeightToFeeCoefficient as any).toBigInt();
  for (let i = -5; i < 5; i++) {
    await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(defaultCoeff + defaultCoeff / 1000n * BigInt(i))));

    const coefficient = (await api.query.configuration.weightToFeeCoefficientOverride() as any).toBigInt();
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});

    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    const transferPrice = aliceBalanceBefore - aliceBalanceAfter;

    dataPoints.push({x: transferPrice, y: coefficient});
  }
  const {a, b} = linearRegression(dataPoints);

  // console.log(`Error: ${error(dataPoints, x => a*x+b)}`);

  const perfectValue = a * helper.balance.getOneTokenNominal() / 10n + b;
  await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(perfectValue.toString())));

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    console.log(`Calibrated price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }
}

async function calibrateMinGasPrice(helper: EthUniqueHelper, privateKey: (account: string) => IKeyringPair) {
  const alice = privateKey('//Alice');
  const caller = await helper.eth.createAccountWithBalance(alice);
  const receiver = helper.eth.createAccount();
  const dataPoints = [];

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const cost = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gas: helper.eth.DEFAULT_GAS}));

    console.log(`Original price: ${Number(cost) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }

  const api = helper.getApi();
  const defaultCoeff = (api.consts.configuration.defaultMinGasPrice as any).toBigInt();
  for (let i = -8; i < 8; i++) {
    const gasPrice = defaultCoeff + defaultCoeff / 100000n * BigInt(i);
    const gasPriceStr = '0x' + gasPrice.toString(16);
    await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(gasPrice)));

    const coefficient = (await api.query.configuration.minGasPriceOverride() as any).toBigInt();
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const transferPrice = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gasPrice: gasPriceStr, gas: helper.eth.DEFAULT_GAS}));

    dataPoints.push({x: transferPrice, y: coefficient});
  }

  const {a, b} = linearRegression(dataPoints);

  // console.log(`Error: ${error(dataPoints, x => a*x+b)}`);

  // * 0.15 = * 10000 / 66666
  const perfectValue = a * helper.balance.getOneTokenNominal() * 1000000n / 6666666n + b;
  await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(perfectValue.toString())));

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const cost = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gas: helper.eth.DEFAULT_GAS}));

    console.log(`Calibrated price: ${Number(cost) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }
}

(async () => {
  await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
    // Second run slightly reduces error sometimes, as price line is not actually straight, this is a curve

    await calibrateWeightToFee(helper, privateKey);
    await calibrateWeightToFee(helper, privateKey);

    await calibrateMinGasPrice(helper, privateKey);
    await calibrateMinGasPrice(helper, privateKey);
  });
})();
