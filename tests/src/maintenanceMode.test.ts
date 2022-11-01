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
import {createCollection} from './util/helpers';
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
      const stats = (await api.rpc.unique.collectionStats()).toJSON();

      // Make sure non-sudo can't enable maintenance mode
      const txEnable = api.tx.maintenance.enable();
      await expect(submitTransactionExpectFailAsync(bob, txEnable), 'on commoner enabling MM').to.be.rejected; //With(/NoPermission/);

      // Set maintenance mode
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txEnable as any));
      expect(await maintenanceEnabled(api), 'MM is OFF when it should be ON').to.be.true;

      // An ordinary user or a superuser without sudo can't do anything while maintenance mode is enabled
      await expect(createCollection(api, bob), 'cudo forbidden stuff').to.be.rejected; //With(/NoPermission/);
      await expect(submitTransactionExpectFailAsync(
        superuser,
        api.tx.unique.setTokenProperties(999999, 999999, []),
      ), 'cudo forbidden stuff #2').to.be.rejectedWith('');
      await expect(submitTransactionExpectFailAsync(
        superuser, 
        api.tx.balances.transfer(bob.address, 1n),
      ), 'cudo forbidden stuff #3').to.be.rejectedWith('');

      // A superuser with sudo can do anything
      await expect(submitTransactionAsync(
        superuser, 
        api.tx.sudo.sudo(api.tx.balances.transfer(bob.address, 1n)),
      ), 'sudo stuff').to.be.fulfilled;

      // RPCs work while in maintenance
      expect((await api.rpc.unique.collectionStats()).toJSON()).to.be.deep.equal(stats);

      // Make sure non-sudo can't disable maintenance mode
      const txDisable = api.tx.maintenance.disable();
      await expect(submitTransactionExpectFailAsync(bob, txDisable), 'on commoner disabling MM').to.be.rejected; //With(/NoPermission/);

      // Disable maintenance mode
      await submitTransactionAsync(superuser, api.tx.sudo.sudo(txDisable as any));
      expect(await maintenanceEnabled(api), 'MM is ON when it should be OFF').to.be.false;
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
