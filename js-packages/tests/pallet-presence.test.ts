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

import {itSub, usingPlaygrounds, expect} from './util/index.js';

// Pallets that must always be present
const requiredPallets = [
  'balances',
  'balancesadapter',
  'common',
  'timestamp',
  'transactionpayment',
  'treasury',
  'statetriemigration',
  'structure',
  'system',
  'utility',
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
  'xtokens',
  'maintenance',
];

// Pallets that depend on consensus and governance configuration
const consensusPallets = [
  'sudo',
  'aura',
  'auraext',
];

describe('Pallet presence', () => {
  before(async () => {
    await usingPlaygrounds(async helper => {
      const runtimeVersion = await helper.callRpc('api.rpc.state.getRuntimeVersion', []);
      const chain = runtimeVersion.specName;

      const refungible = 'refungible';
      const foreignAssets = 'foreignassets';
      const appPromotion = 'apppromotion';
      const collatorSelection = ['authorship', 'session', 'collatorselection'];
      const preimage = ['preimage'];
      const governance = [
        'council',
        'councilmembership',
        'democracy',
        'fellowshipcollective',
        'fellowshipreferenda',
        'origins',
        'scheduler',
        'technicalcommittee',
        'technicalcommitteemembership',
        'identity',
      ];
      const testUtils = 'testutils';

      if(chain.eq('opal')) {
        requiredPallets.push(
          refungible,
          foreignAssets,
          appPromotion,
          testUtils,
          ...collatorSelection,
          ...preimage,
          ...governance,
        );
      } else if(chain.eq('quartz') || chain.eq('sapphire')) {
        requiredPallets.push(
          refungible,
          appPromotion,
          foreignAssets,
          ...collatorSelection,
          ...preimage,
          ...governance,
        );
      } else if(chain.eq('unique')) {
        // Insert Unique additional pallets here
        requiredPallets.push(
          refungible,
          foreignAssets,
          appPromotion,
          ...preimage,
          ...governance,
        );
      }
    });
  });

  itSub('Required pallets are present', ({helper}) => {
    expect(helper.fetchAllPalletNames()).to.contain.members([...requiredPallets].sort());
  });

  itSub('Governance and consensus pallets are present', ({helper}) => {
    expect(helper.fetchAllPalletNames()).to.contain.members([...consensusPallets].sort());
  });

  itSub('No extra pallets are included', ({helper}) => {
    expect(helper.fetchAllPalletNames().sort()).to.be.deep.equal([...requiredPallets, ...consensusPallets].sort());
  });
});
