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

import type {IKeyringPair} from '@polkadot/types/types';
import config from '../config.js';
import {itSub, expect, describeXCM, usingPlaygrounds, usingWestmintPlaygrounds, usingRelayPlaygrounds} from '@unique/test-utils/util.js';
import {XcmTestHelper} from './xcm.types.js';

const STATEMINE_CHAIN = +(process.env.RELAY_WESTMINT_ID || 1000);
const UNIQUE_CHAIN = +(process.env.RELAY_OPAL_ID || 2095);

const relayUrl = config.relayUrl;
const westmintUrl = config.westmintUrl;

const STATEMINE_PALLET_INSTANCE = 50;
const USDT_ASSET_ID = 100;
const USDT_ASSET_METADATA_DECIMALS = 18;
const USDT_ASSET_METADATA_NAME = 'USDT';
const USDT_ASSET_METADATA_DESCRIPTION = 'USDT';
const USDT_ASSET_METADATA_MINIMAL_BALANCE = 1n;

const RELAY_DECIMALS = 12;
const WESTMINT_DECIMALS = 12;

const TRANSFER_AMOUNT = 1_000_000_000_000_000_000n;

// 10,000.00 (ten thousands) USDT
const USDT_ASSET_AMOUNT = 1_000_000_000_000_000_000_000n;

const testHelper = new XcmTestHelper('opal');

describeXCM('[XCM] Integration test: Exchanging USDT with Westmint', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let balanceStmnBefore: bigint;
  let balanceStmnAfter: bigint;

  let balanceOpalBefore: bigint;
  let balanceOpalAfter: bigint;
  let balanceOpalFinal: bigint;

  let balanceBobBefore: bigint;
  let balanceBobAfter: bigint;
  let balanceBobFinal: bigint;

  let balanceBobRelayTokenBefore: bigint;
  let balanceBobRelayTokenAfter: bigint;

  let usdtCollectionId: number;
  let relayCollectionId: number;

  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob'); // funds donor

      relayCollectionId = await testHelper.registerRelayNativeTokenOnUnique(alice);
    });

    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      const assetInfo = await helper.assets.assetInfo(USDT_ASSET_ID);
      if(assetInfo == null) {
        await helper.assets.create(
          alice,
          USDT_ASSET_ID,
          alice.address,
          USDT_ASSET_METADATA_MINIMAL_BALANCE,
        );
        await helper.assets.setMetadata(
          alice,
          USDT_ASSET_ID,
          USDT_ASSET_METADATA_NAME,
          USDT_ASSET_METADATA_DESCRIPTION,
          USDT_ASSET_METADATA_DECIMALS,
        );
      } else {
        console.log('The USDT asset is already registered on AssetHub');
      }

      await helper.assets.mint(
        alice,
        USDT_ASSET_ID,
        alice.address,
        USDT_ASSET_AMOUNT,
      );

      const sovereignFundingAmount = 3_500_000_000n;

      // funding parachain sovereing account (Parachain: 2095)
      const parachainSovereingAccount = helper.address.paraSiblingSovereignAccount(UNIQUE_CHAIN);
      await helper.balance.transferToSubstrate(bob, parachainSovereingAccount, sovereignFundingAmount);
    });

    await usingPlaygrounds(async (helper) => {
      const location = {
        parents: 1,
        interior: {X3: [
          {
            Parachain: STATEMINE_CHAIN,
          },
          {
            PalletInstance: STATEMINE_PALLET_INSTANCE,
          },
          {
            GeneralIndex: USDT_ASSET_ID,
          },
        ]},
      };
      const assetId = {Concrete: location};

      if(await helper.xfun.foreignCollectionId(assetId) == null) {
        const tokenPrefix = USDT_ASSET_METADATA_NAME;
        await helper.getSudo().xfun.register(
          alice,
          assetId,
          USDT_ASSET_METADATA_NAME,
          tokenPrefix,
          USDT_ASSET_METADATA_DECIMALS,
        );
      } else {
        console.log('Foreign collection is already registered on Opal');
      }

      balanceOpalBefore = await helper.balance.getSubstrate(alice.address);
      usdtCollectionId = await helper.xfun.foreignCollectionId(assetId);
    });

    // Providing the relay currency to the unique sender account
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 0,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V2: {
          parents: 0,
          interior: {X1: {
            AccountId32: {
              network: 'Any',
              id: alice.addressRaw,
            },
          }},
        },
      };

      const assets = {
        V2: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: 'Here',
              },
            },
            fun: {
              Fungible: 50_000_000_000_000_000n,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      await helper.xcm.limitedReserveTransferAssets(alice, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    });

  });

  itSub('Should connect and send USDT from Westmint to Opal', async ({helper}) => {
    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      const dest = {
        V2: {
          parents: 1,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V2: {
          parents: 0,
          interior: {X1: {
            AccountId32: {
              network: 'Any',
              id: alice.addressRaw,
            },
          }},
        },
      };

      const assets = {
        V2: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: {
                  X2: [
                    {
                      PalletInstance: STATEMINE_PALLET_INSTANCE,
                    },
                    {
                      GeneralIndex: USDT_ASSET_ID,
                    },
                  ]},
              },
            },
            fun: {
              Fungible: TRANSFER_AMOUNT,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      balanceStmnBefore = await helper.balance.getSubstrate(alice.address);
      await helper.xcm.limitedReserveTransferAssets(alice, dest, beneficiary, assets, feeAssetItem, 'Unlimited');

      balanceStmnAfter = await helper.balance.getSubstrate(alice.address);

      // common good parachain take commission in it native token
      console.log(
        '[Westmint -> Opal] transaction fees on Westmint: %s WND',
        helper.util.bigIntToDecimals(balanceStmnBefore - balanceStmnAfter, WESTMINT_DECIMALS),
      );
      expect(balanceStmnBefore > balanceStmnAfter).to.be.true;

    });

    // ensure that asset has been delivered
    await helper.wait.newBlocks(3);

    const free = await helper.ft.getBalance(usdtCollectionId, {Substrate: alice.address});

    balanceOpalAfter = await helper.balance.getSubstrate(alice.address);

    console.log(
      '[Westmint -> Opal] transaction fees on Opal: %s USDT',
      helper.util.bigIntToDecimals(TRANSFER_AMOUNT - free, USDT_ASSET_METADATA_DECIMALS),
    );
    console.log(
      '[Westmint -> Opal] transaction fees on Opal: %s OPL',
      helper.util.bigIntToDecimals(balanceOpalAfter - balanceOpalBefore),
    );

    // commission has not paid in USDT token
    expect(free == TRANSFER_AMOUNT).to.be.true;
    // ... and parachain native token
    expect(balanceOpalAfter == balanceOpalBefore).to.be.true;
  });

  itSub('Should connect and send USDT from Unique to Statemine back', async ({helper}) => {
    const destination = {
      V2: {
        parents: 1,
        interior: {X2: [
          {
            Parachain: STATEMINE_CHAIN,
          },
          {
            AccountId32: {
              network: 'Any',
              id: alice.addressRaw,
            },
          },
        ]},
      },
    };

    const currencies: [any, bigint][] = [
      [
        usdtCollectionId,
        TRANSFER_AMOUNT,
      ],
      [
        relayCollectionId,
        400_000_000_000_000n,
      ],
    ];

    const feeItem = 1;

    await helper.xTokens.transferMulticurrencies(alice, currencies, feeItem, destination, 'Unlimited');

    // the commission has been paid in parachain native token
    balanceOpalFinal = await helper.balance.getSubstrate(alice.address);
    expect(balanceOpalAfter > balanceOpalFinal).to.be.true;

    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      // The USDT token never paid fees. Its amount not changed from begin value.
      // Also check that xcm transfer has been succeeded
      expect((await helper.assets.account(USDT_ASSET_ID, alice.address))! == USDT_ASSET_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect and send Relay token to Unique', async ({helper}) => {
    const TRANSFER_AMOUNT_RELAY = 50_000_000_000_000_000n;

    balanceBobBefore = await helper.balance.getSubstrate(bob.address);
    balanceBobRelayTokenBefore = await helper.ft.getBalance(relayCollectionId, {Substrate: bob.address});

    // Providing the relay currency to the unique sender account
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 0,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V2: {
          parents: 0,
          interior: {X1: {
            AccountId32: {
              network: 'Any',
              id: bob.addressRaw,
            },
          }},
        },
      };

      const assets = {
        V2: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: 'Here',
              },
            },
            fun: {
              Fungible: TRANSFER_AMOUNT_RELAY,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      await helper.xcm.limitedReserveTransferAssets(bob, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    });

    await helper.wait.newBlocks(3);

    balanceBobAfter = await helper.balance.getSubstrate(bob.address);
    balanceBobRelayTokenAfter = await helper.ft.getBalance(relayCollectionId, {Substrate: bob.address});

    const wndFee = balanceBobRelayTokenAfter - TRANSFER_AMOUNT_RELAY - balanceBobRelayTokenBefore;
    console.log(
      'Relay (Westend) to Opal transaction fees: %s OPL',
      helper.util.bigIntToDecimals(balanceBobAfter - balanceBobBefore),
    );
    console.log(
      'Relay (Westend) to Opal transaction fees: %s WND',
      helper.util.bigIntToDecimals(wndFee, WESTMINT_DECIMALS),
    );
    expect(balanceBobBefore == balanceBobAfter).to.be.true;
    expect(balanceBobRelayTokenBefore < balanceBobRelayTokenAfter).to.be.true;
  });

  itSub('Should connect and send Relay token back', async ({helper}) => {
    let relayTokenBalanceBefore: bigint;
    let relayTokenBalanceAfter: bigint;
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      relayTokenBalanceBefore = await helper.balance.getSubstrate(bob.address);
    });

    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1:{
            AccountId32: {
              network: 'Any',
              id: bob.addressRaw,
            },
          },
        },
      },
    };

    const currencies: any = [
      [
        relayCollectionId,
        50_000_000_000_000_000n,
      ],
    ];

    const feeItem = 0;

    await helper.xTokens.transferMulticurrencies(bob, currencies, feeItem, destination, 'Unlimited');

    balanceBobFinal = await helper.balance.getSubstrate(bob.address);
    console.log('[Opal -> Relay (Westend)] transaction fees: %s OPL',  helper.util.bigIntToDecimals(balanceBobAfter - balanceBobFinal));

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      await helper.wait.newBlocks(10);
      relayTokenBalanceAfter = await helper.balance.getSubstrate(bob.address);

      const diff = relayTokenBalanceAfter - relayTokenBalanceBefore;
      console.log('[Opal -> Relay (Westend)] actually delivered: %s WND', helper.util.bigIntToDecimals(diff, RELAY_DECIMALS));
      expect(diff > 0, 'Relay tokens was not delivered back').to.be.true;
    });
  });
});
