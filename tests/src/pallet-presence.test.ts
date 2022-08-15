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

import {ApiPromise} from '@polkadot/api';
import {expect} from 'chai';
import usingApi from './substrate/substrate-api';

function getModuleNames(api: ApiPromise): string[] {
  return api.runtimeMetadata.asLatest.pallets.map(m => m.name.toString().toLowerCase());
}

// Pallets that must always be present
const requiredPallets = [
  'balances',
  'common',
  'randomnesscollectiveflip',
  'timestamp',
  'transactionpayment',
  'treasury',
  'structure',
  'system',
  'vesting',
  'parachainsystem',
  'parachaininfo',
  'evm',
  'evmcodersubstrate',
  'evmcontracthelpers',
  'evmmigration',
  'evmtransactionpayment',
  'ethereum',
  'fungible',
  'xcmpqueue',
  'polkadotxcm',
  'cumulusxcm',
  'dmpqueue',
  'inflation',
  'unique',
  'nonfungible',
  'charging',
  'configuration',
];

// Pallets that depend on consensus and governance configuration
const consensusPallets = [
  'sudo',
  'aura',
  'auraext',
];

describe('Pallet presence', () => {
  before(async () => {
    await usingApi(async api => {
      const chain = await api.rpc.system.chain();

      const refungible = 'refungible';
      const scheduler = 'scheduler';
      const rmrkPallets = ['rmrkcore', 'rmrkequip'];

      if (chain.eq('OPAL by UNIQUE')) {
        requiredPallets.push(refungible, scheduler, ...rmrkPallets);
      } else if (chain.eq('QUARTZ by UNIQUE')) {
        // Insert Quartz additional pallets here
      } else if (chain.eq('UNIQUE')) {
        // Insert Unique additional pallets here
      }
    });
  });

  it('Required pallets are present', async () => {
    await usingApi(async api => {
      for (let i=0; i<requiredPallets.length; i++) {
        expect(getModuleNames(api)).to.include(requiredPallets[i]);
      }
    });
  });
  it('Governance and consensus pallets are present', async () => {
    await usingApi(async api => {
      for (let i=0; i<consensusPallets.length; i++) {
        expect(getModuleNames(api)).to.include(consensusPallets[i]);
      }
    });
  });
  it('No extra pallets are included', async () => {
    await usingApi(async api => {
      expect(getModuleNames(api).sort()).to.be.deep.equal([...requiredPallets, ...consensusPallets].sort());
    });
  });
});
