import {IKeyringPair} from '@polkadot/types/types';
import {usingEthPlaygrounds, EthUniqueHelper} from './eth/util';

class Fract {
  static ZERO = new Fract(0n);
  constructor(public readonly a: bigint, public readonly b: bigint = 1n) {
    if (b === 0n) throw new Error('division by zero');
    if (b < 0n) throw new Error('missing normalization');
  }

  mul(other: Fract) {
    return new Fract(this.a * other.a, this.b * other.b).optimize();
  }

  div(other: Fract) {
    return this.mul(other.inv());
  }

  plus(other: Fract) {
    if (this.b === other.b) {
      return new Fract(this.a + other.a, this.b);
    }
    return new Fract(this.a * other.b + other.a * this.b, this.b * other.b).optimize();
  }

  minus(other: Fract) {
    return this.plus(other.neg());
  }

  neg() {
    return new Fract(-this.a, this.b);
  }
  inv() {
    if (this.a < 0) {
      return new Fract(-this.b, -this.a);
    } else {
      return new Fract(this.b, this.a);
    }
  }

  optimize() {
    function gcd(x: bigint, y: bigint) {
      if (x < 0n)
        x = -x;
      if (y < 0n)
        y = -y;
      while(y) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x;
    }
    const v = gcd(this.a, this.b);
    return new Fract(this.a / v, this.b / v);
  }

  toBigInt() {
    return this.a / this.b;
  }
  toNumber() {
    const v = this.optimize();
    return Number(v.a) / Number(v.b);
  }
  toString() {
    const v = this.optimize();
    return `${v.a} / ${v.b}`;
  }

  lt(other: Fract) {
    return this.a * other.b < other.a * this.b;
  }
  eq(other: Fract) {
    return this.a * other.b === other.a * this.b;
  }

  sqrt() {
    if (this.a < 0n) {
      throw 'square root of negative numbers is not supported';
    }

    if (this.lt(new Fract(2n))) {
      return this;
    }

    function newtonIteration(n: Fract, x0: Fract): Fract {
      const x1 = rpn(n, x0, '/', x0, '+', new Fract(2n), '/');
      if (x0.eq(x1) || x0.eq(x1.minus(new Fract(1n)))) {
        return x0;
      }
      return newtonIteration(n, x1);
    }

    return newtonIteration(this, new Fract(1n));
  }
}

type Op = Fract | '+' | '-' | '*' | '/' | 'dup' | Op[];
function rpn(...ops: (Op)[]) {
  const stack: Fract[] = [];
  for (const op of ops) {
    if (op instanceof Fract) {
      stack.push(op);
    } else if (op === '+') {
      if (stack.length < 2)
        throw new Error('stack underflow');
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(a.plus(b));
    } else if (op === '*') {
      if (stack.length < 2)
        throw new Error('stack underflow');
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(a.mul(b));
    } else if (op === '-') {
      if (stack.length < 2)
        throw new Error('stack underflow');
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(a.minus(b));
    } else if (op === '/') {
      if (stack.length < 2)
        throw new Error('stack underflow');
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(a.div(b));
    } else if (op === 'dup') {
      if (stack.length < 1)
        throw new Error('stack underflow');
      const a = stack.pop()!;
      stack.push(a);
      stack.push(a);
    } else if (Array.isArray(op)) {
      stack.push(rpn(...op));
    } else {
      throw new Error(`unknown operand: ${op}`);
    }
  }
  if (stack.length != 1)
    throw new Error('one element should be left on stack');
  return stack[0]!;
}

function linearRegression(points: { x: Fract, y: Fract }[]) {
  let sumxy = Fract.ZERO;
  let sumx = Fract.ZERO;
  let sumy = Fract.ZERO;
  let sumx2 = Fract.ZERO;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    sumxy = rpn(p.x, p.y, '*', sumxy, '+');
    sumx = sumx.plus(p.x);
    sumy = sumy.plus(p.y);
    sumx2 = rpn(p.x, p.x, '*', sumx2, '+');
  }

  const nb = new Fract(BigInt(n));

  const a = rpn(
    [nb, sumxy, '*', sumx, sumy, '*', '-'],
    [nb, sumx2, '*', sumx, sumx, '*', '-'],
    '/',
  );
  const b = rpn(
    [sumy, a, sumx, '*', '-'],
    nb,
    '/',
  );

  return {a, b};
}

const hypothesisLinear = (a: Fract, b: Fract) => (x: Fract) => rpn(x, a, '*', b, '+');

function _error(points: { x: Fract, y: Fract }[], hypothesis: (a: Fract) => Fract) {
  return points.map(p => {
    const v = hypothesis(p.x);
    const vv = p.y;

    return rpn(v, vv, '-', 'dup', '*');
  }).reduce((a, b) => a.plus(b), Fract.ZERO).sqrt().div(new Fract(BigInt(points.length)));
}

async function calibrateWeightToFee(helper: EthUniqueHelper, privateKey: (account: string) => Promise<IKeyringPair>) {
  const alice = await privateKey('//Alice');
  const bob = await privateKey('//Bob');
  const dataPoints = [];

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    console.log(`\t[NFT transfer] Original price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }

  const api = helper.getApi();
  const base = (await api.query.configuration.weightToFeeCoefficientOverride() as any).toBigInt();
  for (let i = -5; i < 5; i++) {
    await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(base + base / 1000n * BigInt(i))));

    const coefficient = new Fract((await api.query.configuration.weightToFeeCoefficientOverride() as any).toBigInt());
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});

    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    const transferPrice = new Fract(aliceBalanceBefore - aliceBalanceAfter);

    dataPoints.push({x: transferPrice, y: coefficient});
  }
  const {a, b} = linearRegression(dataPoints);

  const hyp = hypothesisLinear(a, b);
  // console.log(`\t[NFT transfer] Error: ${_error(dataPoints, hyp).toNumber()}`);

  // 0.1 UNQ
  const perfectValue = hyp(rpn(new Fract(helper.balance.getOneTokenNominal()), new Fract(1n, 10n), '*'));
  await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setWeightToFeeCoefficientOverride(perfectValue.toBigInt())));

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Substrate: alice.address});
    const aliceBalanceBefore = await helper.balance.getSubstrate(alice.address);
    await token.transfer(alice, {Substrate: bob.address});
    const aliceBalanceAfter = await helper.balance.getSubstrate(alice.address);

    console.log(`\t[NFT transfer] Calibrated price: ${Number(aliceBalanceBefore - aliceBalanceAfter) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }
}

async function calibrateMinGasPrice(helper: EthUniqueHelper, privateKey: (account: string) => Promise<IKeyringPair>) {
  const alice = await privateKey('//Alice');
  const caller = await helper.eth.createAccountWithBalance(alice);
  const receiver = helper.eth.createAccount();
  const dataPoints = [];

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const cost = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gas: helper.eth.DEFAULT_GAS}));

    console.log(`\t[ETH NFT transfer] Original price: ${Number(cost) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }

  const api = helper.getApi();
  // const defaultCoeff = (api.consts.configuration.defaultMinGasPrice as any).toBigInt();
  const base = (await api.query.configuration.minGasPriceOverride() as any).toBigInt();
  for (let i = -8; i < 8; i++) {
    const gasPrice = base + base / 100000n * BigInt(i);
    const gasPriceStr = '0x' + gasPrice.toString(16);
    await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(gasPrice)));

    const coefficient = new Fract((await api.query.configuration.minGasPriceOverride() as any).toBigInt());
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const transferPrice = new Fract(await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gasPrice: gasPriceStr, gas: helper.eth.DEFAULT_GAS})));

    dataPoints.push({x: transferPrice, y: coefficient});
  }

  const {a, b} = linearRegression(dataPoints);

  const hyp = hypothesisLinear(a, b);
  // console.log(`\t[ETH NFT transfer] Error: ${_error(dataPoints, hyp).toNumber()}`);

  // 0.15 UNQ
  const perfectValue = hyp(rpn(new Fract(helper.balance.getOneTokenNominal()), new Fract(15n, 100n), '*'));
  await helper.signTransaction(alice, api.tx.sudo.sudo(api.tx.configuration.setMinGasPriceOverride(perfectValue.toBigInt())));

  {
    const collection = await helper.nft.mintCollection(alice, {name: 'New', description: 'New collection', tokenPrefix: 'NEW'});
    const token = await collection.mintToken(alice, {Ethereum: caller});

    const address = helper.ethAddress.fromCollectionId(collection.collectionId);
    const contract = helper.ethNativeContract.collection(address, 'nft', caller);

    const cost = await helper.eth.calculateFee({Ethereum: caller}, () => contract.methods.transfer(receiver, token.tokenId).send({from: caller, gas: helper.eth.DEFAULT_GAS}));

    console.log(`\t[ETH NFT transfer] Calibrated price: ${Number(cost) / Number(helper.balance.getOneTokenNominal())} UNQ`);
  }
}

(async () => {
  await usingEthPlaygrounds(async (helper: EthUniqueHelper, privateKey) => {
    // Subsequent runs reduce error, as price line is not actually straight, this is a curve

    const iterations = 3;

    console.log('[Calibrate WeightToFee]');
    for (let i = 0; i < iterations; i++) {
      await calibrateWeightToFee(helper, privateKey);
    }

    console.log();

    console.log('[Calibrate MinGasPrice]');
    for (let i = 0; i < iterations; i++) {
      await calibrateMinGasPrice(helper, privateKey);
    }
  });
})();
