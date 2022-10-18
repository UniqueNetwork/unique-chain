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
import config from '../config';
import {itSub, expect, describeXCM, usingPlaygrounds, usingWestmintPlaygrounds, usingRelayPlaygrounds} from '../util';

const STATEMINE_CHAIN = 1000;
const UNIQUE_CHAIN = 2095;

const relayUrl = config.relayUrl;
const westmintUrl = config.westmintUrl;

const STATEMINE_PALLET_INSTANCE = 50;
const ASSET_ID = 100;
const ASSET_METADATA_DECIMALS = 18;
const ASSET_METADATA_NAME = 'USDT';
const ASSET_METADATA_DESCRIPTION = 'USDT';
const ASSET_METADATA_MINIMAL_BALANCE = 1n;

const WESTMINT_DECIMALS = 12;

const TRANSFER_AMOUNT = 1_000_000_000_000_000_000n;

// 10,000.00 (ten thousands) USDT
const ASSET_AMOUNT = 1_000_000_000_000_000_000_000n; 

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


  before(async () => {
    await usingPlaygrounds(async (_helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob'); // funds donor
    });

    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      // 350.00 (three hundred fifty) DOT
      const fundingAmount = 3_500_000_000_000n; 

      await helper.assets.create(alice, ASSET_ID, alice.address, ASSET_METADATA_MINIMAL_BALANCE);
      await helper.assets.setMetadata(alice, ASSET_ID, ASSET_METADATA_NAME, ASSET_METADATA_DESCRIPTION, ASSET_METADATA_DECIMALS);
      await helper.assets.mint(alice, ASSET_ID, alice.address, ASSET_AMOUNT);

      // funding parachain sovereing account (Parachain: 2095)
      const parachainSovereingAccount = helper.address.paraSiblingSovereignAccount(UNIQUE_CHAIN);
      await helper.balance.transferToSubstrate(bob, parachainSovereingAccount, fundingAmount);
    });


    await usingPlaygrounds(async (helper) => {
      const location = {
        V1: {
          parents: 1,
          interior: {X3: [
            {
              Parachain: STATEMINE_CHAIN,
            },
            {
              PalletInstance: STATEMINE_PALLET_INSTANCE,
            },
            {
              GeneralIndex: ASSET_ID,
            },
          ]},
        },
      };

      const metadata =
      {
        name: ASSET_ID,
        symbol: ASSET_METADATA_NAME,
        decimals: ASSET_METADATA_DECIMALS,
        minimalBalance: ASSET_METADATA_MINIMAL_BALANCE,
      };
      await helper.getSudo().foreignAssets.register(alice, alice.address, location, metadata);
      balanceOpalBefore = await helper.balance.getSubstrate(alice.address);
    });


    // Providing the relay currency to the unique sender account
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 0,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V1: {
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
        V1: [
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
      const weightLimit = 5_000_000_000;

      await helper.xcm.limitedReserveTransferAssets(alice, destination, beneficiary, assets, feeAssetItem, weightLimit);
    });
  
  });

  itSub('Should connect and send USDT from Westmint to Opal', async ({helper}) => {
    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      const dest = {
        V1: {
          parents: 1,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V1: {
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
        V1: [
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
                      GeneralIndex: ASSET_ID,
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
      const weightLimit = 5000000000;

      balanceStmnBefore = await helper.balance.getSubstrate(alice.address);
      await helper.xcm.limitedReserveTransferAssets(alice, dest, beneficiary, assets, feeAssetItem, weightLimit);

      balanceStmnAfter = await helper.balance.getSubstrate(alice.address);

      // common good parachain take commission in it native token
      console.log(
        'Opal to Westmint transaction fees on Westmint: %s WND',
        helper.util.bigIntToDecimals(balanceStmnBefore - balanceStmnAfter, WESTMINT_DECIMALS),
      );
      expect(balanceStmnBefore > balanceStmnAfter).to.be.true;

    });


    // ensure that asset has been delivered
    await helper.wait.newBlocks(3);

    // expext collection id will be with id 1
    const free = await helper.ft.getBalance(1, {Substrate: alice.address});

    balanceOpalAfter = await helper.balance.getSubstrate(alice.address);

    // commission has not paid in USDT token
    expect(free == TRANSFER_AMOUNT).to.be.true;
    console.log(
      'Opal to Westmint transaction fees on Opal: %s USDT',
      helper.util.bigIntToDecimals(TRANSFER_AMOUNT - free),
    );
    // ... and parachain native token
    expect(balanceOpalAfter == balanceOpalBefore).to.be.true;
    console.log(
      'Opal to Westmint transaction fees on Opal: %s WND',
      helper.util.bigIntToDecimals(balanceOpalAfter - balanceOpalBefore, WESTMINT_DECIMALS),
    );    
  });

  itSub('Should connect and send USDT from Unique to Statemine back', async ({helper}) => {
    const destination = {
      V1: {
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
        {
          ForeignAssetId: 0,
        },
        //10_000_000_000_000_000n,
        TRANSFER_AMOUNT,
      ], 
      [
        {
          NativeAssetId: 'Parent',
        },
        400_000_000_000_000n,
      ],
    ];

    const feeItem = 1;
    const destWeight = 500000000000;

    await helper.xTokens.transferMulticurrencies(alice, currencies, feeItem, destination, destWeight);
    
    // the commission has been paid in parachain native token
    balanceOpalFinal = await helper.balance.getSubstrate(alice.address);
    expect(balanceOpalAfter > balanceOpalFinal).to.be.true;

    await usingWestmintPlaygrounds(westmintUrl, async (helper) => {
      await helper.wait.newBlocks(3);
      
      // The USDT token never paid fees. Its amount not changed from begin value.
      // Also check that xcm transfer has been succeeded 
      expect((await helper.assets.account(ASSET_ID, alice.address))! == ASSET_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect and send Relay token to Unique', async ({helper}) => {
    const TRANSFER_AMOUNT_RELAY = 50_000_000_000_000_000n;

    balanceBobBefore = await helper.balance.getSubstrate(bob.address);
    balanceBobRelayTokenBefore = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

    // Providing the relay currency to the unique sender account
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 0,
          interior: {X1: {
            Parachain: UNIQUE_CHAIN,
          },
          },
        }};

      const beneficiary = {
        V1: {
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
        V1: [
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
      const weightLimit = 5_000_000_000;

      await helper.xcm.limitedReserveTransferAssets(bob, destination, beneficiary, assets, feeAssetItem, weightLimit);
    });
  
    await helper.wait.newBlocks(3);

    balanceBobAfter = await helper.balance.getSubstrate(bob.address);  
    balanceBobRelayTokenAfter = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

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
    const destination = {
      V1: {
        parents: 1,
        interior: {X2: [
          {
            Parachain: STATEMINE_CHAIN,
          },
          {
            AccountId32: {
              network: 'Any',
              id: bob.addressRaw,
            },
          },
        ]},
      },
    };

    const currencies: any = [
      [
        {
          NativeAssetId: 'Parent',
        },
        50_000_000_000_000_000n,
      ],
    ];

    const feeItem = 0;
    const destWeight = 500000000000;

    await helper.xTokens.transferMulticurrencies(bob, currencies, feeItem, destination, destWeight);

    balanceBobFinal = await helper.balance.getSubstrate(bob.address);
    console.log('Relay (Westend) to Opal transaction fees: %s OPL', balanceBobAfter - balanceBobFinal);
  });
});
