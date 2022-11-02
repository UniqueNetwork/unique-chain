// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync} from './substrate/substrate-api';
import {createCollection, createItemExpectSuccess, createItemExpectFailure, createCollectionWithPropsExpectSuccess} from './util/helpers';
import {createEthAccount, createEthAccountWithBalance, evmCollection, evmCollectionHelpers, getCollectionAddressFromResult, itWeb3} from './eth/util/helpers';
import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';

chai.use(chaiAsPromised);
const expect = chai.expect;

// TODO:maintenance make it into seqtest

async function maintenanceEnabled(api: ApiPromise): Promise<boolean> {
  return (await api.query.maintenance.enabled()).toJSON();
}

describe('Integration Test: Maintenance Mode', () => {
  let superuser: IKeyringPair;
  let bob: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKey) => {
      superuser =  privateKey('//Alice');
      bob =  privateKey('//Bob');

      if (await maintenanceEnabled(api)) {
        console.warn('\tMaintenance mode was left enabled BEFORE the test suite! Disabling it now.');
        const sudoTx = api.tx.sudo.sudo(api.tx.maintenance.disable() as any);
        await submitTransactionAsync(superuser, sudoTx);
      }
    });
  });

  it('Allows superuser to enable and disable maintenance mode - and disallows anyone else', async () => {
    await usingApi(async api => {
      // Make sure non-sudo can't enable maintenance mode
      const txEnable = api.tx.maintenance.enable();
      await expect(submitTransactionExpectFailAsync(bob, txEnable), 'on commoner enabling MM').to.be.rejected; //With(/NoPermission/);

      // Set maintenance mode
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txEnable as any));
      expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

      // Make sure non-sudo can't disable maintenance mode
      const txDisable = api.tx.maintenance.disable();
      await expect(submitTransactionExpectFailAsync(bob, txDisable), 'on commoner disabling MM').to.be.rejected; //With(/NoPermission/);

      // Disable maintenance mode
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txDisable as any));
      expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;
    });
  });

  it('MM blocks unique pallet calls', async () => {
    await usingApi(async api => {
      // Can create an NFT collection before enabling the MM
      const nftCollectionId = await expect(createCollectionWithPropsExpectSuccess({
        mode: {type: 'NFT'},
        propPerm: [
          {
            key: 'test',
            permission: {
              collectionAdmin: true,
              tokenOwner: true,
              mutable: true, 
            },
          },
        ],
      })).to.be.fulfilled;

      // Can mint an NFT before enabling the MM
      const nftId = await createItemExpectSuccess(superuser, nftCollectionId, 'NFT');

      // Can create an FT collection before enabling the MM
      const ftCollectionResult = await expect(createCollection(api, superuser, {mode: {type: 'Fungible', decimalPoints: 18}})).to.be.fulfilled;
      const ftCollectionId = ftCollectionResult.collectionId;

      // Can mint an FT before enabling the MM
      await createItemExpectSuccess(superuser, ftCollectionId, 'Fungible');

      // Can create an RFT collection before enabling the MM
      const rftCollectionResult = await expect(createCollection(api, superuser, {mode: {type: 'ReFungible'}})).to.be.fulfilled;
      const rftCollectionId = rftCollectionResult.collectionId;

      // Can mint an RFT before enabling the MM
      await createItemExpectSuccess(superuser, rftCollectionId, 'ReFungible');

      const txEnable = api.tx.maintenance.enable();
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txEnable as any));
      expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

      // Unable to create a collection when the MM is enabled
      await expect(createCollection(api, superuser), 'cudo forbidden stuff').to.be.rejected;

      // Unable to set token properties when the MM is enabled
      await expect(submitTransactionExpectFailAsync(
        superuser,
        api.tx.unique.setTokenProperties(nftCollectionId, nftId, [{key: 'test', value: 'test-val'}]),
      )).to.be.rejected;

      // Unable to mint an NFT when the MM is enabled
      await expect(createItemExpectFailure(superuser, nftCollectionId, 'NFT')).to.be.rejected;

      // Unable to mint an FT when the MM is enabled
      await expect(createItemExpectFailure(superuser, ftCollectionId, 'Fungible')).to.be.rejected;

      // Unable to mint an RFT when the MM is enabled
      await expect(createItemExpectFailure(superuser, rftCollectionId, 'ReFungible')).to.be.rejected;

      const txDisable = api.tx.maintenance.disable();
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txDisable as any));
      expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;

      // Can create a collection after disabling the MM
      await expect(createCollection(api, superuser), 'MM is disabled, the collection should be created').to.be.fulfilled;

      // Can set token properties after disabling the MM
      await submitTransactionAsync(
        superuser,
        api.tx.unique.setTokenProperties(nftCollectionId, nftId, [{key: 'test', value: 'test-val'}]),
      );

      // Can mint an NFT after disabling the MM
      await createItemExpectSuccess(superuser, nftCollectionId, 'NFT');

      // Can mint an FT after disabling the MM
      await createItemExpectSuccess(superuser, ftCollectionId, 'Fungible');

      // Can mint an RFT after disabling the MM
      await createItemExpectSuccess(superuser, rftCollectionId, 'ReFungible');
    });
  });

  it('MM allows native token transfers and RPC calls', async () => {
    await usingApi(async api => {
      // We can use RPC before the MM is enabled
      const stats = (await api.rpc.unique.collectionStats()).toJSON();

      // We can transfer funds before the MM is enabled
      await expect(submitTransactionAsync(
        superuser, 
        api.tx.balances.transfer(bob.address, 1n),
      )).to.be.fulfilled;

      const txEnable = api.tx.maintenance.enable();
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txEnable as any));
      expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

      // RPCs work while in maintenance
      expect((await api.rpc.unique.collectionStats()).toJSON()).to.be.deep.equal(stats);

      // We still able to transfer funds
      await expect(submitTransactionAsync(
        superuser, 
        api.tx.balances.transfer(bob.address, 1n),
      )).to.be.fulfilled;

      const txDisable = api.tx.maintenance.disable();
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txDisable as any));
      expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;

      // RPCs work after maintenance
      expect((await api.rpc.unique.collectionStats()).toJSON()).to.be.deep.equal(stats);

      // Transfers work after maintenance
      await expect(submitTransactionAsync(
        superuser, 
        api.tx.balances.transfer(bob.address, 1n),
      )).to.be.fulfilled;
    });
  });

  itWeb3('Disallows Ethereum transactions to execute while in maintenance', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const receiver = createEthAccount(web3);
    const collectionHelper = evmCollectionHelpers(web3, owner);
        
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, await collectionHelper.methods
      .createNonfungibleCollection('A', 'B', 'C')
      .send());
    
    // Set maintenance mode
    await submitTransactionAsync(superuser, api.tx.sudo.sudo(api.tx.maintenance.enable()));
    expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

    const contract = evmCollection(web3, owner, collectionIdAddress);
    const tokenId = await contract.methods.nextTokenId().call();
    expect(tokenId).to.be.equal('1');

    await expect(contract.methods.mintWithTokenURI(
      receiver,
      tokenId,
      'Test URI',
    ).call({from: owner}));

    await expect(contract.methods.ownerOf(tokenId).call()).rejectedWith(/token not found/);

    // Disable maintenance mode
    await submitTransactionAsync(superuser, api.tx.sudo.sudo(api.tx.maintenance.disable()));
    expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;
  });

  it('Allows to enable and disable MM repeatedly', async () => {
    await usingApi(async api => {
      // Set maintenance mode
      const sudoEnalbeTx = api.tx.sudo.sudo(api.tx.maintenance.enable());

      await submitTransactionAsync(superuser, sudoEnalbeTx);
      await submitTransactionAsync(superuser, sudoEnalbeTx);

      expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

      // Disable maintenance mode
      const sudoDisableTx = api.tx.sudo.sudo(api.tx.maintenance.disable());
      await submitTransactionAsync(superuser, sudoDisableTx);
      await submitTransactionAsync(superuser, sudoDisableTx);
      expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;
    });
  });

  // TODO:maintenance test scheduler?

  afterEach(async () => {
    await usingApi(async api => {
      if (await maintenanceEnabled(api)) {
        console.warn('\tMaintenance mode was left enabled AFTER a test has finished! Be careful. Disabling it now.');
        await submitTransactionAsync(superuser, api.tx.sudo.sudo(api.tx.maintenance.disable()));
      }
      expect(await maintenanceEnabled(api), 'Disastrous! Exited the test suite with maintenance mode on.').to.be.false;
    });
  });
});
