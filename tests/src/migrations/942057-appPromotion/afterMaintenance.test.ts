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

import {IKeyringPair} from '@polkadot/types/types';
import {ApiPromise} from '@polkadot/api';
import {expect, itSub, Pallets, requirePalletsOrSkip, usingPlaygrounds} from '../../util';
import {main as testedScript} from './correctStateAfterMaintenance';

async function maintenanceEnabled(api: ApiPromise): Promise<boolean> {
  return (await api.query.maintenance.enabled()).toJSON() as boolean;
}



describe('Integration Test: Maintenance mode & App Promo', () => {
  let superuser: IKeyringPair;

  before(async function() {
    await usingPlaygrounds(async (helper, privateKey) => {
      requirePalletsOrSkip(this, helper, [Pallets.Maintenance]);
      superuser = await privateKey('//Alice');
    });
  });

  describe('Test AppPromo script for check state after Maintenance mode', () => {
    before(async function () {
      await usingPlaygrounds(async (helper) => {
        if(await maintenanceEnabled(helper.getApi())) {
          console.warn('\tMaintenance mode was left enabled BEFORE the test suite! Disabling it now.');
          await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', [])).to.be.fulfilled;
        }
      });
    });
    itSub('Can find and fix inconsistent state', async({helper}) => {
      const api = helper.getApi();

      await helper.executeExtrinsic(superuser, 'api.tx.sudo.sudo', [api.tx.system.setStorage([
        ['0x42b67acb8bd223c60d0c8f621ffefc0ae280fa2db99bd3827aac976de75af95f5153cb1f00942ff401000000',
          '0x04d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000010632d5ec76b0500000000000000'],
        ['0x42b67acb8bd223c60d0c8f621ffefc0ae280fa2db99bd3827aac976de75af95f9eb2dcce60f37a2702000000',
          '0x04d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d000010632d5ec76b0500000000000000'],
        ['0xc2261276cc9d1f8598ea4b6a74b15c2fb1c0eb12e038e5c7f91e120ed4b7ebf1de1e86a9a8c739864cf3cc5ec2bea59fd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
          '0x046170707374616b656170707374616b65000020c65abc8ed70a00000000000000'],
      ])]);

      // const pendingUnstaked = await helper.staking.getPendingUnstakePerBlock()
      expect((await api.query.appPromotion.pendingUnstake(1)).toJSON()).to.be.deep.equal([[helper.address.normalizeSubstrateToChainFormat('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'), '0x00000000000000056bc75e2d63100000']]);
      expect((await api.query.appPromotion.pendingUnstake(2)).toJSON()).to.be.deep.equal([[helper.address.normalizeSubstrateToChainFormat('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'), '0x00000000000000056bc75e2d63100000']]);
      await testedScript();

      expect((await api.query.appPromotion.pendingUnstake(1)).toJSON()).to.be.deep.equal([]);
      expect((await api.query.appPromotion.pendingUnstake(2)).toJSON()).to.be.deep.equal([]);

    });

    itSub('(!negative test!) Only works when Maintenance mode is disabled', async({helper}) => {
      await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.enable', [])).to.be.fulfilled;
      await expect(testedScript()).to.be.rejectedWith('The network is still in maintenance mode');
      await expect(helper.getSudo().executeExtrinsic(superuser, 'api.tx.maintenance.disable', [])).to.be.fulfilled;
    });
  });
});
