//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { ApiPromise } from '@polkadot/api';
import { expect } from 'chai';
import usingApi from './substrate/substrate-api';

function getModuleNames(api: ApiPromise): string[] {
  return api.runtimeMetadata.asLatest.modules.map(m => m.name.toString().toLowerCase());
}

// Pallets that must always be present
const requiredPallets = [
  'balances',
  'randomnesscollectiveflip',
  'timestamp',
  'transactionpayment',
  'treasury',
  'system',
  'vesting',
  'parachainsystem',
  'parachaininfo',
  'evm',
  'evmcodersubstrate',
  'evmcontracthelpers',
  'evmtransactionpayment',
  'ethereum',
  'xcmpqueue',
  'polkadotxcm',
  'cumulusxcm',
  'dmpqueue',
  'inflation',
  'nft',
  'scheduler',
  'nftpayment',
  'charging',
];

// Pallets that depend on consensus and governance configuration
const consensusPallets = [
  'sudo',
  'aura',
  'auraext',
];

describe('Pallet presence', () => {
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
