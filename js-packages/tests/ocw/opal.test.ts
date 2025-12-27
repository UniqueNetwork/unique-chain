import {ApiPromise, WsProvider} from '@polkadot/api';
import {stringify} from '@polkadot/util';
import type {IKeyringPair} from '@polkadot/types/types';

import { before, describe, expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds } from "../../test-utils/util.ts";

import process from "node:process";

export const ALICE_ORCL_KEY = process.env.RELAY_UNIQUE_NODE_ALICE_ORCL_KEY;
export const BOB_ORCL_KEY = process.env.RELAY_UNIUE_NODE_BOB_ORCL_KEY;
export const CHARLIE_ORCL_KEY = process.env.RELAY_UNIQUE_NODE_CHARLIE_ORCL_KEY;

function absBigInt(bn: bigint): bigint {
  if (bn < 0n)
    return -bn;
  else
    return bn;
}

function bigIntApproxEq(a: bigint, b: bigint, eps: bigint) {
  const diff = absBigInt(a - b);
  return diff < eps;
}

describe.ifRunOcw('Paying fee with DOTs', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let dave: IKeyringPair;
  let charlie: IKeyringPair;

  let testsStartTimestamp: number;

  const assetId = {
    parents: 1,
    interior: 'here',
  };
  let collectionId;

  const fixedU128Decimals = 18;
  const dotDecimals = 10;
  const unqDecimals = 18;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(helper, [Pallets.TestUtils]);
      donor = await privateKey({url: import.meta.url});
      alice = await privateKey('//Alice'); 
      [bob, charlie, dave] = await helper.arrange.createAccounts([300n, 300n, 300n], donor);
      const keys = [ALICE_ORCL_KEY, BOB_ORCL_KEY, CHARLIE_ORCL_KEY];

      const tokenNominal = helper.balance.getOneTokenNominal();

      testsStartTimestamp = Date.now();

      // creating foreign asset to use as fee
      collectionId = await helper.callRpc('api.query.foreignAssets.foreignAssetToCollection', [assetId]).then(c => c.toJSON());
      if (!collectionId) {
        const result = await helper.getSudo().executeExtrinsic(
          alice,
          'api.tx.foreignAssets.forceRegisterForeignAsset',
          [
            {V5: assetId},
            helper.util.str2vec('Polkadot'),
            'DOT',
            {Fungible: dotDecimals},
          ],
        );
        const events = helper.eventHelper.extractEvents(result.result.events);
        const foreignAssetRegisteredEvent = events.find((event) => event.method === 'ForeignAssetRegistered');
        [collectionId] = foreignAssetRegisteredEvent?.data || [];
      }

      await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.setExchangeRateUpdateInterval', [15]);

      // add oracles
      const withBalance = 10n;
      const oraclesSetupTxs = keys.map(key => {
        const oracleAddr = key!;
        
        return [
          helper.constructApiCall('api.tx.foreignAssets.addOracleMember', [oracleAddr]),
          helper.constructApiCall('api.tx.balances.forceSetBalance', [oracleAddr, withBalance * tokenNominal]),
        ];
      }).flat();

      await helper.getSudo().executeExtrinsic(alice, 'api.tx.utility.batchAll', [ oraclesSetupTxs ]);

      // wait for the oracles to feed the DOT xchg rate
      const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'oracle', names: ['NewFeedData']}]);
      let totalWaitTime = 0;
      while (subEvents.length == 0 && totalWaitTime < 220) {
        const waitInterval = 5;
        await helper.wait.newBlocks(waitInterval);
        totalWaitTime += waitInterval;
        console.log(`Waiting for oracle events. ${totalWaitTime} blocks passed.`)
      }
      console.log('The oracles have set the DOT exchange rate');
      unsubscribe();

      // remove the oracles to prevent DOT rate change during the tests
      const oraclesTeardownTxs = keys.map(key => helper.constructApiCall('api.tx.foreignAssets.removeOracleMember', [ key! ]));
      await helper.getSudo().executeExtrinsic(alice, 'api.tx.utility.batchAll', [ oraclesTeardownTxs ]);
    });
  });

  itSub('Storing the correct DOT exchange rate', async ({helper}) => {
    const api = helper.getApi();
    const oracleDotInfo = (await api.query.oracle.values('DOT')).toJSON();
    const oracleWrongInfo = (await api.query.oracle.values('WRONG')).toJSON();
    expect(oracleDotInfo).to.be.not.undefined;
    expect(oracleWrongInfo).to.be.null;

    const dotRate = BigInt(oracleDotInfo!['value']);
    const dotRateTimestamp = oracleDotInfo!['timestamp'];

    // The oracles should have set the values after the current test run has been started
    expect(dotRateTimestamp).to.be.greaterThan(testsStartTimestamp);

    const hydrationApi = await ApiPromise.create({
      provider: new WsProvider("wss://rpc.hydradx.cloud"),
      types: {
        TokensAccountData: {
          free: 'u128',
          reserved: 'u128',
          frozen: 'u128',
        }
      },
    });

    const hydrationDotId = await hydrationApi.query.assetRegistry.locationAssets({parents: 1, interior: 'here'}).then(id => id.toJSON());
    const hydrationUnqId = await hydrationApi.query.assetRegistry.locationAssets({parents: 1, interior: {X1: { parachain: 2037 }}}).then(id => id.toJSON());

    const hydrationUnqDotPoolAccountList = (await hydrationApi.query.xyk.poolAssets.entries())
      .filter(([_args, value]) => {
        const valueJson = value.toJSON()!;
        const assetA = valueJson[0];
        const assetB = valueJson[1];
        const isDotUnq = assetA == hydrationDotId && assetB == hydrationUnqId;
        const isUnqDot = assetA == hydrationUnqId && assetB == hydrationDotId;

        return isDotUnq || isUnqDot;
      })
      .map(([{ args: [poolAccount] }, _assetPair]) => poolAccount);

    // Our oracles query exactly one account. The tests should alert us if something changes on Hydration.
    expect(hydrationUnqDotPoolAccountList.length).to.be.equal(1);

    const hydrationUnqDotPoolAccount = hydrationUnqDotPoolAccountList[0];

    const queryHydrationTokenBalance = tokenId =>
      hydrationApi.query.tokens.accounts(hydrationUnqDotPoolAccount, tokenId)
        .then(data => {
          const tokenData = data.toJSON() as any;
          const free = BigInt(tokenData.free);
          const frozen = BigInt(tokenData.frozen);
          const balance = free - frozen;

          // Check that the state is consistent
          expect(balance > 0n).to.be.true;

          return balance;
        });

    const poolAccountBalances = {
      dot: await queryHydrationTokenBalance(hydrationDotId),
      unq: await queryHydrationTokenBalance(hydrationUnqId),
    };

    await hydrationApi.disconnect();

    // rate = (dot / 10^dotDecimals) / (unq / 10^unqDecimals) * 10^fixedU128Decimals
    //
    // To mitigate rounding error (or even just avoid getting 0), let's reformulate
    //
    // rate = (dot / 10^dotDecimals) * (10^unqDecimals / unq) * 10^fixedU128Decimals
    // rate = (dot / 10^dotDecimals) * (10^[unqDecimals + fixedU128Decimals] / unq)
    // rate = dot * 10^[unqDecimals + fixedU128Decimals - dotDecimals] / unq

    console.log('DOT:', poolAccountBalances.dot);
    console.log('UNQ:', poolAccountBalances.unq);
    const expectedRate = poolAccountBalances.dot * 10n ** BigInt(unqDecimals + fixedU128Decimals - dotDecimals) / poolAccountBalances.unq;

    console.log('Stored DOT rate:', dotRate);
    console.log('Expect DOT rate:', expectedRate);

    // We are dealing with raw fixedU128, so we keep in mind that the actual value of eps is RAW_VALUE / 10^18.
    // So, eps = 10 means the accuracy is 10^(-17)
    const eps = 10n;
    expect(bigIntApproxEq(expectedRate, dotRate, eps)).to.be.true;
  });

  itSub('Using DOT as fee with a set coefficient', async ({helper}) => {
    const api = helper.getApi();
    const tokenNominal = helper.balance.getOneTokenNominal();

    await helper.getSudo().executeExtrinsic(alice, 'api.tx.testUtils.enable', []);

    const dotCollectionOwner = await helper.ft.getData(collectionId).then(data => data!.normalizedOwner);

    const sendTxDotFee = async (sender, initBalance, weight, actualWeight, tip = 0n) => {
      const senderBeforeInitDotBalance = await helper.ft.getBalance(collectionId, { Substrate: sender.address });
      if (senderBeforeInitDotBalance != 0n) {
        await helper.ft.burnTokens(sender, collectionId, senderBeforeInitDotBalance);
      }

      await helper.getSudo().utility.dispatchAs(
        alice,
        { system: { Signed: dotCollectionOwner } },
        helper.constructApiCall('api.tx.unique.createItem', [collectionId, {Substrate: sender.address}, {Fungible: {value: initBalance}}]),
      );

      const treasuryAddress = helper.getApi().consts.treasury.potAccount.toString();
      const treasuryDotBalanceBefore = await helper.ft.getBalance(collectionId, { Substrate: treasuryAddress });

      const senderDotBalanceBefore = await helper.ft.getBalance(collectionId, { Substrate: sender.address });
      expect(senderDotBalanceBefore == initBalance).to.be.true;

      const signerOptions = tip == 0n ? { assetId } : { assetId, tip };
      console.log('signerOptions:', stringify(signerOptions));
      await helper.executeExtrinsic(sender, 'api.tx.testUtils.useWeight', [weight, actualWeight], true, signerOptions);

      const senderDotBalanceAfter = await helper.ft.getBalance(collectionId, { Substrate: sender.address });
      expect(senderDotBalanceAfter < senderDotBalanceBefore).to.be.true;
      const senderDotDiff = senderDotBalanceBefore - senderDotBalanceAfter;

      const treasuryDotBalanceAfter = await helper.ft.getBalance(collectionId, { Substrate: treasuryAddress });
      expect(treasuryDotBalanceAfter > treasuryDotBalanceBefore).to.be.true;
      const treasuryDotDiff = treasuryDotBalanceAfter - treasuryDotBalanceBefore;

      console.log('sender   DOT diff:', senderDotDiff);
      console.log('treasury DOT diff:', treasuryDotDiff);

      expect(senderDotDiff == treasuryDotDiff).to.be.true;

      const usedWeight = actualWeight ?? weight;
      const expectedUsedWeightPrice = await helper.getApi().call.xcmPaymentApi.queryWeightToAssetFee(usedWeight, {V5: assetId})
        .then(p => p.asOk.toBigInt());

      console.log('expected used weight price:', expectedUsedWeightPrice);

      // `>=` because the actual extrinsic will also take len fee, an extrinsic base fee, and optionally the tips.
      expect(senderDotDiff >= expectedUsedWeightPrice).to.be.true;

      return senderDotDiff;
    };

    // set the default coeff
    const defaultCoeff = helper.getApi().consts.foreignAssets.foreignAssetConversionCoefficientDefault.toBigInt();
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.forceSetForeignAssetConversionCoefficient', [{V5: assetId}, defaultCoeff]);

    const weight = { refTime: 100_000_000n, proofSize: 7000n };
    const halfWeight = { refTime: weight.refTime / 2n, proofSize: weight.proofSize / 2n };
    const doubledWeight = { refTime: weight.refTime * 2n, proofSize: weight.proofSize * 2n };

    const senderInitDotBalance = 10000000n; // 0.001 DOT
    const originalCoeffFees = {
      weightTx: await sendTxDotFee(bob, senderInitDotBalance, weight, null),
      smallWeightTx: await sendTxDotFee(charlie, senderInitDotBalance, weight, halfWeight),
      tooBigActualWeightTx: await sendTxDotFee(dave, senderInitDotBalance, weight, doubledWeight),
    };

    console.log('original coeff fees:', stringify(originalCoeffFees));

    expect(originalCoeffFees.smallWeightTx < originalCoeffFees.weightTx).to.be.true;
    expect(originalCoeffFees.weightTx < originalCoeffFees.tooBigActualWeightTx).to.be.true;

    const factor = 2n;
    const newCoeff = factor * defaultCoeff;
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.forceSetForeignAssetConversionCoefficient', [{V5: assetId}, newCoeff]);

    const newCoeffFees = {
      weightTx: await sendTxDotFee(bob, senderInitDotBalance, weight, null),
      smallWeightTx: await sendTxDotFee(charlie, senderInitDotBalance, weight, halfWeight),
      tooBigActualWeightTx: await sendTxDotFee(dave, senderInitDotBalance, weight, doubledWeight),
    };

    console.log('new coeff fees:', stringify(newCoeffFees));

    expect(newCoeffFees.smallWeightTx < newCoeffFees.weightTx).to.be.true;
    expect(newCoeffFees.weightTx < newCoeffFees.tooBigActualWeightTx).to.be.true;

    const eps = 2n;
    expect(bigIntApproxEq(originalCoeffFees.weightTx * factor, newCoeffFees.weightTx, eps)).to.be.true;
    expect(bigIntApproxEq(originalCoeffFees.smallWeightTx * factor, newCoeffFees.smallWeightTx, eps)).to.be.true;
    expect(bigIntApproxEq(originalCoeffFees.tooBigActualWeightTx * factor, newCoeffFees.tooBigActualWeightTx, eps)).to.be.true;

    const senderSmallInitDotBalance = 100000n; // 0.00001 DOT
    await expect(sendTxDotFee(bob, senderSmallInitDotBalance, weight, null)).to.be.rejectedWith(/Inability to pay some fees/);

    // TODO execute a regular extrinsic with tips
    // FIXME CreateItem with 0

    let tip = 100n; // 0.0000001 DOT
    const weightTxWithTip = await sendTxDotFee(bob, senderInitDotBalance, weight, null, tip);
    expect(weightTxWithTip - tip == newCoeffFees.weightTx).to.be.true;
  });

  itSub('should check permissions for adding and removing oracle account', async ({helper}) => {
    const account = helper.arrange.createEmptyAccount();
    await expect(helper.executeExtrinsic(bob, 'api.tx.foreignAssets.addOracleMember', [account.address])).to.be.rejectedWith("BadOrigin");
    await expect(helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.addOracleMember', [account.address])).to.be.fulfilled;
    await expect(helper.executeExtrinsic(bob, 'api.tx.foreignAssets.removeOracleMember', [account.address])).to.be.rejectedWith("BadOrigin");
    await expect(helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.removeOracleMember', [account.address])).to.be.fulfilled;
  });

  itSub('should check permissions for feeding values to oracle', async ({helper}) => {
    await expect(helper.executeExtrinsic(alice, 'api.tx.oracle.feedValues', [[["DOT", 1000000000n]]])).to.be.rejectedWith("NoPermission");
  });

  itSub('should check permissions for setting conversion coefficient', async ({helper}) => {
    const api = helper.getApi();
    const tokenNominal = helper.balance.getOneTokenNominal();
    const assetId = {
      parents: 1,
      interior: 'here',
    };
    const coefficient = 2n * tokenNominal;
    await expect(helper.executeExtrinsic(alice, 'api.tx.foreignAssets.forceSetForeignAssetConversionCoefficient', [{V5: assetId}, coefficient])).to.be.rejectedWith("BadOrigin");
  });
});
