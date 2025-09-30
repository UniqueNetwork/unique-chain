import type {IKeyringPair} from '@polkadot/types/types';

import { before, describe, expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds } from "../../test-utils/util.ts";

import process from "node:process";

export const ALICE_ORCL_KEY = process.env.RELAY_QUARTZ_NODE_ALICE_ORCL_KEY;
export const BOB_ORCL_KEY = process.env.RELAY_QUARTZ_NODE_BOB_ORCL_KEY;
export const CHARLIE_ORCL_KEY = process.env.RELAY_QUARTZ_NODE_CHARLIE_ORCL_KEY;

function absBigInt(bn: bigint): bigint {
  if (bn < 0n)
    return -bn;
  else
    return bn;
}

describe.ifRunOcw('Paying fee with DOTs', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(helper, [Pallets.TestUtils]);
      donor = await privateKey({url: import.meta.url});
      alice = await privateKey('//Alice'); 
      [bob, charlie] = await helper.arrange.createAccounts([300n, 10n], donor);
      const keys = [ALICE_ORCL_KEY, BOB_ORCL_KEY, CHARLIE_ORCL_KEY];

      const tokenNominal = helper.balance.getOneTokenNominal();
      const withBalance = 10n;
      for (const key of keys) {
        await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.addOracleMember', [key!]);
        const tx = await helper.constructApiCall('api.tx.balances.transferKeepAlive', [{Id: key!}, withBalance * tokenNominal]);
        await helper.signTransaction(donor, tx, null, 'fund oracles');
      }

      const {unsubscribe, collectedEvents: subEvents} = await helper.subscribeEvents([{section: 'oracle', names: ['NewFeedData']}]);
      let totalWaitTime = 0;
      while (subEvents.length == 0 && totalWaitTime < 220) {
        const waitInterval = 10;
        await helper.wait.newBlocks(waitInterval);
        totalWaitTime += waitInterval;
        console.log(`Waiting for oracle events. ${totalWaitTime} blocks passed.`)
      }
      unsubscribe();
    });
  });

  itSub('should have exchange rate for DOT stored', async ({helper}) => {
    const api = helper.getApi();
    const dotRate = (await api.query.oracle.values('DOT')).toJSON();
    const wrongRate = (await api.query.oracle.values('WRONG')).toJSON();
    expect(dotRate).to.be.not.undefined;
    expect(wrongRate).to.be.null;
    expect(dotRate!['value']).to.be.greaterThan(1_000_000_000_000).and.lessThan(1_000_000_000_000_000_000);
    const timestampMillis: number = Date.now();
    const minutes20 = 20 * 60 * 1000;
    expect(dotRate!['timestamp']).to.be.lessThanOrEqual(timestampMillis).and.greaterThan(timestampMillis - minutes20);
  });

  itSub('Using foreign asset as fee', async ({helper}) => {
    const api = helper.getApi();
    const tokenNominal = helper.balance.getOneTokenNominal();

    //creating foreign asset to use as fee
    const assetId = {
      Concrete: {
        parents: 1,
        interior: 'here',
      }
    };
    
    let collectionId = Number((await api.query.foreignAssets.foreignAssetToCollection({
      parents: 1,
      interior: 'here',
    })).toJSON());

    if (!collectionId) {
      const result = await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.forceRegisterForeignAsset', [{V3: assetId}, helper.util.str2vec('New Asset'), 'NEW', {Fungible: 12}]);
      const events = helper.eventHelper.extractEvents(result.result.events);
      const foreignAssetRegisteredEvent = events.find((event) => event.method === 'ForeignAssetRegistered');
      [collectionId] = foreignAssetRegisteredEvent?.data || [];
    }
    const coefficient = 2n * tokenNominal;
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.forceSetForeignAssetConversionCoefficient', [coefficient]);
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.testUtils.enable', []);
    await helper.executeExtrinsic(alice, 'api.tx.testUtils.mintForeignAssets', [collectionId, 1_000_000_000_000n]);

    await expect(helper.executeExtrinsic(bob, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n * tokenNominal], true)).to.be.fulfilled;
    const fee = (await helper.executeExtrinsic(alice, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n * tokenNominal], true)).fee;
    const dotRate = (await api.query.oracle.values('DOT')).unwrap().value.toBigInt();
    const dotNominal = 1_000_000_000_000n;
    //dot fee in native accuracy
    let expectedDotFee = (((coefficient * fee) / tokenNominal) * dotRate) / tokenNominal;
    //convert dot fee to dot accuracy
    expectedDotFee = expectedDotFee * dotNominal / tokenNominal;

    const feeAsset = { assetId: {
      interior: 'Here',
      parents: 1
    }};
    const dotFee = (await helper.executeExtrinsic(alice, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n * tokenNominal], true, feeAsset));
    
    expect(Number(expectedDotFee / absBigInt(dotFee.fee - expectedDotFee))).to.be.greaterThan(100);

    await expect(helper.executeExtrinsic(bob, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n * tokenNominal], true, feeAsset)).to.be.rejectedWith('Inability to pay some fees');
  });

  itSub('should check permissions for adding and removing oracle account', async ({helper}) => {
    const account = helper.arrange.createEmptyAccount();
    await expect(helper.executeExtrinsic(bob, 'api.tx.foreignAssets.addOracleMember', [account.address]), "add oracle").to.be.rejectedWith("BadOrigin");
    await expect(helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.addOracleMember', [account.address]), "add oracle").to.be.fulfilled;
    await expect(helper.executeExtrinsic(bob, 'api.tx.foreignAssets.removeOracleMember', [account.address]), "remove oracle").to.be.rejectedWith("BadOrigin");
    await expect(helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.removeOracleMember', [account.address]), "remove oracle").to.be.fulfilled;
  });

  itSub('should check permissions for feeding values to oracle', async ({helper}) => {
    const api = helper.getApi();
    await expect(helper.signTransaction(alice, api.tx.oracle.feedValues([["DOT", 1000000000n]]))).to.be.rejected;
  });

  itSub('should check permissions for setting conversion coefficien', async ({helper}) => {
    const api = helper.getApi();
    const tokenNominal = helper.balance.getOneTokenNominal();
    const coefficient = 2n * tokenNominal;
    await expect(helper.signTransaction(alice, api.tx.foreignAssets.forceSetForeignAssetConversionCoefficient(coefficient))).to.be.rejected;
  });
});