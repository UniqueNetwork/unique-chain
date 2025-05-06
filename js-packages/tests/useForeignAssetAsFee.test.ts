import {Metadata} from '@polkadot/types';
import { IKeyringPair } from '@polkadot/types/types';
import {itSub, usingPlaygrounds, expect, requirePalletsOrSkip, Pallets} from '@unique/test-utils/util.js';

describe('Using foreign asset as fee', () => {
  let donor: IKeyringPair;
  let alice: IKeyringPair;
  let bob: IKeyringPair;
  let charlie: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.TestUtils]);
      donor = await privateKey({url: import.meta.url});
      alice = await privateKey('//Alice'); 
      [bob, charlie] = await helper.arrange.createAccounts([50n, 10n], donor);
    });
  });

  itSub('Using foreign asset as fee', async ({helper}) => {
    const api = helper.getApi();

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
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.foreignAssets.forceSetForeignAssetConversionRate', [{V3: assetId}, 100n]);
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.testUtils.enable', []);
    await helper.executeExtrinsic(alice, 'api.tx.testUtils.mintForeignAssets', [collectionId, 1000000n]);

    await expect(helper.executeExtrinsic(bob, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n], true)).to.be.fulfilled;

    let feeAsset = { assetId: {
      interior: 'Here',
      parents: 1
    }};
    await expect(helper.executeExtrinsic(alice, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n], true, feeAsset)).to.be.fulfilled;

    await expect(helper.executeExtrinsic(bob, 'api.tx.balances.transferKeepAlive', [charlie.address, 100n], true, feeAsset)).to.be.rejectedWith('Inability to pay some fees');
  });
});