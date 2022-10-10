import {Pallets, usingPlaygrounds} from './src/util/playgrounds/index';

export async function mochaGlobalSetup() {
  await usingPlaygrounds(async (helper, privateKey) => {
    // Set up App Promotion admin
    const missingPallets = helper.fetchMissingPalletNames([Pallets.AppPromotion]);
    if (missingPallets.length === 0) {
      const superuser = await privateKey('//Alice');
      const palletAddress = helper.arrange.calculatePalleteAddress('appstake');
      const palletAdmin = await privateKey('//PromotionAdmin');
      const api = helper.getApi();
      await helper.signTransaction(superuser, api.tx.sudo.sudo(api.tx.appPromotion.setAdminAddress({Substrate: palletAdmin.address})));
      const nominal = helper.balance.getOneTokenNominal();
      await helper.balance.transferToSubstrate(superuser, palletAdmin.address, 1000n * nominal);
      await helper.balance.transferToSubstrate(superuser, palletAddress, 1000n * nominal);
    }
  });
}
