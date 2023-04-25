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
import {itSub, expect, describeXCM, usingPlaygrounds, usingKaruraPlaygrounds, usingRelayPlaygrounds, usingMoonriverPlaygrounds, usingStateminePlaygrounds, usingShidenPlaygrounds} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';

const QUARTZ_CHAIN = 2095;
const STATEMINE_CHAIN = 1000;
const KARURA_CHAIN = 2000;
const MOONRIVER_CHAIN = 2023;
const SHIDEN_CHAIN = 2007;

const STATEMINE_PALLET_INSTANCE = 50;

const relayUrl = config.relayUrl;
const statemineUrl = config.statemineUrl;
const karuraUrl = config.karuraUrl;
const moonriverUrl = config.moonriverUrl;
const shidenUrl = config.shidenUrl;

const RELAY_DECIMALS = 12;
const STATEMINE_DECIMALS = 12;
const KARURA_DECIMALS = 12;
const SHIDEN_DECIMALS = 18n;
const QTZ_DECIMALS = 18n;

const TRANSFER_AMOUNT = 2000000000000000000000000n;

const FUNDING_AMOUNT = 3_500_000_0000_000_000n;

const TRANSFER_AMOUNT_RELAY = 50_000_000_000_000_000n;

const USDT_ASSET_ID = 100;
const USDT_ASSET_METADATA_DECIMALS = 18;
const USDT_ASSET_METADATA_NAME = 'USDT';
const USDT_ASSET_METADATA_DESCRIPTION = 'USDT';
const USDT_ASSET_METADATA_MINIMAL_BALANCE = 1n;
const USDT_ASSET_AMOUNT = 10_000_000_000_000_000_000_000_000n;

const SAFE_XCM_VERSION = 2;

describeXCM('[XCM] Integration test: Exchanging USDT with Statemine', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let balanceStmnBefore: bigint;
  let balanceStmnAfter: bigint;

  let balanceQuartzBefore: bigint;
  let balanceQuartzAfter: bigint;
  let balanceQuartzFinal: bigint;

  let balanceBobBefore: bigint;
  let balanceBobAfter: bigint;
  let balanceBobFinal: bigint;

  let balanceBobRelayTokenBefore: bigint;
  let balanceBobRelayTokenAfter: bigint;


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob'); // sovereign account on Statemine(t) funds donor

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      // Fund accounts on Statemine(t)
      await helper.xcm.teleportNativeAsset(alice, STATEMINE_CHAIN, alice.addressRaw, FUNDING_AMOUNT);
      await helper.xcm.teleportNativeAsset(alice, STATEMINE_CHAIN, bob.addressRaw, FUNDING_AMOUNT);
    });

    await usingStateminePlaygrounds(statemineUrl, async (helper) => {
      const sovereignFundingAmount = 3_500_000_000n;

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
      await helper.assets.mint(
        alice,
        USDT_ASSET_ID,
        alice.address,
        USDT_ASSET_AMOUNT,
      );

      // funding parachain sovereing account on Statemine(t).
      // The sovereign account should be created before any action
      // (the assets pallet on Statemine(t) check if the sovereign account exists)
      const parachainSovereingAccount = helper.address.paraSiblingSovereignAccount(QUARTZ_CHAIN);
      await helper.balance.transferToSubstrate(bob, parachainSovereingAccount, sovereignFundingAmount);
    });


    await usingPlaygrounds(async (helper) => {
      const location = {
        V2: {
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
        },
      };

      const metadata =
      {
        name: USDT_ASSET_ID,
        symbol: USDT_ASSET_METADATA_NAME,
        decimals: USDT_ASSET_METADATA_DECIMALS,
        minimalBalance: USDT_ASSET_METADATA_MINIMAL_BALANCE,
      };
      await helper.getSudo().foreignAssets.register(alice, alice.address, location, metadata);
      balanceQuartzBefore = await helper.balance.getSubstrate(alice.address);
    });


    // Providing the relay currency to the quartz sender account
    // (fee for USDT XCM are paid in relay tokens)
    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 0,
          interior: {X1: {
            Parachain: QUARTZ_CHAIN,
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
              Fungible: TRANSFER_AMOUNT_RELAY,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      await helper.xcm.limitedReserveTransferAssets(alice, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    });

  });

  itSub('Should connect and send USDT from Statemine to Quartz', async ({helper}) => {
    await usingStateminePlaygrounds(statemineUrl, async (helper) => {
      const dest = {
        V2: {
          parents: 1,
          interior: {X1: {
            Parachain: QUARTZ_CHAIN,
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
        '[Statemine -> Quartz] transaction fees on Statemine: %s WND',
        helper.util.bigIntToDecimals(balanceStmnBefore - balanceStmnAfter, STATEMINE_DECIMALS),
      );
      expect(balanceStmnBefore > balanceStmnAfter).to.be.true;

    });


    // ensure that asset has been delivered
    await helper.wait.newBlocks(3);

    // expext collection id will be with id 1
    const free = await helper.ft.getBalance(1, {Substrate: alice.address});

    balanceQuartzAfter = await helper.balance.getSubstrate(alice.address);

    console.log(
      '[Statemine -> Quartz] transaction fees on Quartz: %s USDT',
      helper.util.bigIntToDecimals(TRANSFER_AMOUNT - free, USDT_ASSET_METADATA_DECIMALS),
    );
    console.log(
      '[Statemine -> Quartz] transaction fees on Quartz: %s QTZ',
      helper.util.bigIntToDecimals(balanceQuartzAfter - balanceQuartzBefore),
    );
    // commission has not paid in USDT token
    expect(free).to.be.equal(TRANSFER_AMOUNT);
    // ... and parachain native token
    expect(balanceQuartzAfter == balanceQuartzBefore).to.be.true;
  });

  itSub('Should connect and send USDT from Quartz to Statemine back', async ({helper}) => {
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

    const relayFee = 400_000_000_000_000n;
    const currencies: [any, bigint][] = [
      [
        {
          ForeignAssetId: 0,
        },
        TRANSFER_AMOUNT,
      ],
      [
        {
          NativeAssetId: 'Parent',
        },
        relayFee,
      ],
    ];

    const feeItem = 1;

    await helper.xTokens.transferMulticurrencies(alice, currencies, feeItem, destination, 'Unlimited');

    // the commission has been paid in parachain native token
    balanceQuartzFinal = await helper.balance.getSubstrate(alice.address);
    console.log('[Quartz -> Statemine] transaction fees on Quartz: %s QTZ', helper.util.bigIntToDecimals(balanceQuartzAfter - balanceQuartzFinal));
    expect(balanceQuartzAfter > balanceQuartzFinal).to.be.true;

    await usingStateminePlaygrounds(statemineUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      // The USDT token never paid fees. Its amount not changed from begin value.
      // Also check that xcm transfer has been succeeded
      expect((await helper.assets.account(USDT_ASSET_ID, alice.address))! == USDT_ASSET_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect and send Relay token to Quartz', async ({helper}) => {
    balanceBobBefore = await helper.balance.getSubstrate(bob.address);
    balanceBobRelayTokenBefore = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 0,
          interior: {X1: {
            Parachain: QUARTZ_CHAIN,
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
    balanceBobRelayTokenAfter = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

    const wndFeeOnQuartz = balanceBobRelayTokenAfter - TRANSFER_AMOUNT_RELAY - balanceBobRelayTokenBefore;
    const wndDiffOnQuartz = balanceBobRelayTokenAfter - balanceBobRelayTokenBefore;
    console.log(
      '[Relay (Westend) -> Quartz] transaction fees: %s QTZ',
      helper.util.bigIntToDecimals(balanceBobAfter - balanceBobBefore),
    );
    console.log(
      '[Relay (Westend) -> Quartz] transaction fees: %s WND',
      helper.util.bigIntToDecimals(wndFeeOnQuartz, STATEMINE_DECIMALS),
    );
    console.log('[Relay (Westend) -> Quartz] actually delivered: %s WND', wndDiffOnQuartz);
    expect(wndFeeOnQuartz == 0n, 'No incoming WND fees should be taken').to.be.true;
    expect(balanceBobBefore == balanceBobAfter, 'No incoming QTZ fees should be taken').to.be.true;
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
        {
          NativeAssetId: 'Parent',
        },
        TRANSFER_AMOUNT_RELAY,
      ],
    ];

    const feeItem = 0;

    await helper.xTokens.transferMulticurrencies(bob, currencies, feeItem, destination, 'Unlimited');

    balanceBobFinal = await helper.balance.getSubstrate(bob.address);
    console.log('[Quartz -> Relay (Westend)] transaction fees: %s QTZ',  helper.util.bigIntToDecimals(balanceBobAfter - balanceBobFinal));

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      await helper.wait.newBlocks(10);
      relayTokenBalanceAfter = await helper.balance.getSubstrate(bob.address);

      const diff = relayTokenBalanceAfter - relayTokenBalanceBefore;
      console.log('[Quartz -> Relay (Westend)] actually delivered: %s WND', helper.util.bigIntToDecimals(diff, RELAY_DECIMALS));
      expect(diff > 0, 'Relay tokens was not delivered back').to.be.true;
    });
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Karura', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let balanceQuartzTokenInit: bigint;
  let balanceQuartzTokenMiddle: bigint;
  let balanceQuartzTokenFinal: bigint;
  let balanceKaruraTokenInit: bigint;
  let balanceKaruraTokenMiddle: bigint;
  let balanceKaruraTokenFinal: bigint;
  let balanceQuartzForeignTokenInit: bigint;
  let balanceQuartzForeignTokenMiddle: bigint;
  let balanceQuartzForeignTokenFinal: bigint;

  // computed by a test transfer from prod Quartz to prod Karura.
  // 2 QTZ sent https://quartz.subscan.io/xcm_message/kusama-f60d821b049f8835a3005ce7102285006f5b61e9
  // 1.919176000000000000 QTZ received (you can check Karura's chain state in the corresponding block)
  const expectedKaruraIncomeFee = 2000000000000000000n - 1919176000000000000n;

  const KARURA_BACKWARD_TRANSFER_AMOUNT = TRANSFER_AMOUNT - expectedKaruraIncomeFee;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      };

      const metadata = {
        name: 'Quartz',
        symbol: 'QTZ',
        decimals: 18,
        minimalBalance: 1000000000000000000n,
      };

      await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
      balanceKaruraTokenInit = await helper.balance.getSubstrate(randomAccount.address);
      balanceQuartzForeignTokenInit = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10n * TRANSFER_AMOUNT);
      balanceQuartzTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send QTZ to Karura', async ({helper}) => {
    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: KARURA_CHAIN,
          },
        },
      },
    };

    const beneficiary = {
      V2: {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              network: 'Any',
              id: randomAccount.addressRaw,
            },
          },
        },
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
            Fungible: TRANSFER_AMOUNT,
          },
        },
      ],
    };

    const feeAssetItem = 0;

    await helper.xcm.limitedReserveTransferAssets(randomAccount, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    balanceQuartzTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    const qtzFees = balanceQuartzTokenInit - balanceQuartzTokenMiddle - TRANSFER_AMOUNT;
    expect(qtzFees > 0n, 'Negative fees QTZ, looks like nothing was transferred').to.be.true;
    console.log('[Quartz -> Karura] transaction fees on Quartz: %s QTZ', helper.util.bigIntToDecimals(qtzFees));

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceQuartzForeignTokenMiddle = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
      balanceKaruraTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

      const karFees = balanceKaruraTokenInit - balanceKaruraTokenMiddle;
      const qtzIncomeTransfer = balanceQuartzForeignTokenMiddle - balanceQuartzForeignTokenInit;
      const karUnqFees = TRANSFER_AMOUNT - qtzIncomeTransfer;

      console.log(
        '[Quartz -> Karura] transaction fees on Karura: %s KAR',
        helper.util.bigIntToDecimals(karFees, KARURA_DECIMALS),
      );
      console.log(
        '[Quartz -> Karura] transaction fees on Karura: %s QTZ',
        helper.util.bigIntToDecimals(karUnqFees),
      );
      console.log('[Quartz -> Karura] income %s QTZ', helper.util.bigIntToDecimals(qtzIncomeTransfer));
      expect(karFees == 0n).to.be.true;
      expect(
        karUnqFees == expectedKaruraIncomeFee,
        'Karura took different income fee, check the Karura foreign asset config',
      ).to.be.true;
    });
  });

  itSub('Should connect to Karura and send QTZ back', async ({helper}) => {
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: QUARTZ_CHAIN},
              {
                AccountId32: {
                  network: 'Any',
                  id: randomAccount.addressRaw,
                },
              },
            ],
          },
        },
      };

      const id = {
        ForeignAsset: 0,
      };

      await helper.xTokens.transfer(randomAccount, id, KARURA_BACKWARD_TRANSFER_AMOUNT, destination, 'Unlimited');
      balanceKaruraTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
      balanceQuartzForeignTokenFinal = await helper.tokens.accounts(randomAccount.address, id);

      const karFees = balanceKaruraTokenMiddle - balanceKaruraTokenFinal;
      const qtzOutcomeTransfer = balanceQuartzForeignTokenMiddle - balanceQuartzForeignTokenFinal;

      console.log(
        '[Karura -> Quartz] transaction fees on Karura: %s KAR',
        helper.util.bigIntToDecimals(karFees, KARURA_DECIMALS),
      );
      console.log('[Karura -> Quartz] outcome %s QTZ', helper.util.bigIntToDecimals(qtzOutcomeTransfer));

      expect(karFees > 0, 'Negative fees KAR, looks like nothing was transferred').to.be.true;
      expect(qtzOutcomeTransfer == KARURA_BACKWARD_TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceQuartzTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
    const actuallyDelivered = balanceQuartzTokenFinal - balanceQuartzTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Karura -> Quartz] actually delivered %s QTZ', helper.util.bigIntToDecimals(actuallyDelivered));

    const qtzFees = KARURA_BACKWARD_TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Karura -> Quartz] transaction fees on Quartz: %s QTZ', helper.util.bigIntToDecimals(qtzFees));
    expect(qtzFees == 0n).to.be.true;
  });

  itSub('Karura can send only up to its balance', async ({helper}) => {
    // set Karura's sovereign account's balance
    const karuraBalance = 10000n * (10n ** QTZ_DECIMALS);
    const karuraSovereignAccount = helper.address.paraSiblingSovereignAccount(KARURA_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, karuraSovereignAccount, karuraBalance);

    const moreThanKaruraHas = karuraBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {Parachain: QUARTZ_CHAIN},
        },
      },
    };

    const maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      moreThanKaruraHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgram);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramSent.messageHash()
        && event.outcome().isFailedToTransactAsset;
    });

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Karura still can send the correct amount
    const validTransferAmount = karuraBalance / 2n;
    const validXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      validTransferAmount,
    );

    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, validXcmProgram);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of QTZ from Karura', async ({helper}) => {
    const testAmount = 10_000n * (10n ** QTZ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {
            Parachain: QUARTZ_CHAIN,
          },
        },
      },
    };

    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 1,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      },
      testAmount,
    );

    const maliciousXcmProgramHereId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      testAmount,
    );

    let maliciousXcmProgramFullIdSent: any;
    let maliciousXcmProgramHereIdSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz using full QTZ identification
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgramFullId);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramFullIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Quartz using shortened QTZ identification
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgramHereId);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramHereIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});

// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCM] Integration test: Quartz rejects non-native tokens', () => {
  let alice: IKeyringPair;
  let alith: IKeyringPair;

  const testAmount = 100_000_000_000n;
  let quartzParachainJunction;
  let quartzAccountJunction;

  let quartzParachainMultilocation: any;
  let quartzAccountMultilocation: any;
  let quartzCombinedMultilocation: any;

  let messageSent: any;

  const maxWaitBlocks = 3;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      quartzParachainJunction = {Parachain: QUARTZ_CHAIN};
      quartzAccountJunction = {
        AccountId32: {
          network: 'Any',
          id: alice.addressRaw,
        },
      };

      quartzParachainMultilocation = {
        V1: {
          parents: 1,
          interior: {
            X1: quartzParachainJunction,
          },
        },
      };

      quartzAccountMultilocation = {
        V1: {
          parents: 0,
          interior: {
            X1: quartzAccountJunction,
          },
        },
      };

      quartzCombinedMultilocation = {
        V1: {
          parents: 1,
          interior: {
            X2: [quartzParachainJunction, quartzAccountJunction],
          },
        },
      };

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    // eslint-disable-next-line require-await
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      alith = helper.account.alithAccount();
    });
  });

  const expectFailedToTransact = async (helper: DevUniqueHelper, messageSent: any) => {
    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == messageSent.messageHash()
        && event.outcome().isFailedToTransactAsset;
    });
  };

  itSub('Quartz rejects KAR tokens from Karura', async ({helper}) => {
    await usingKaruraPlaygrounds(karuraUrl, async (helper) => {
      const id = {
        Token: 'KAR',
      };
      const destination = quartzCombinedMultilocation;
      await helper.xTokens.transfer(alice, id, testAmount, destination, 'Unlimited');

      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });

  itSub('Quartz rejects MOVR tokens from Moonriver', async ({helper}) => {
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const id = 'SelfReserve';
      const destination = quartzCombinedMultilocation;
      await helper.xTokens.transfer(alith, id, testAmount, destination, 'Unlimited');

      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });

  itSub('Quartz rejects SDN tokens from Shiden', async ({helper}) => {
    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      const destinationParachain = quartzParachainMultilocation;
      const beneficiary = quartzAccountMultilocation;
      const assets = {
        V1: [{
          id: {
            Concrete: {
              parents: 0,
              interior: 'Here',
            },
          },
          fun: {
            Fungible: testAmount,
          },
        }],
      };
      const feeAssetItem = 0;

      await helper.executeExtrinsic(alice, 'api.tx.polkadotXcm.reserveWithdrawAssets', [
        destinationParachain,
        beneficiary,
        assets,
        feeAssetItem,
      ]);

      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });
});

describeXCM('[XCM] Integration test: Exchanging QTZ with Moonriver', () => {
  // Quartz constants
  let alice: IKeyringPair;
  let quartzAssetLocation;

  let randomAccountQuartz: IKeyringPair;
  let randomAccountMoonriver: IKeyringPair;

  // Moonriver constants
  let assetId: string;

  const quartzAssetMetadata = {
    name: 'xcQuartz',
    symbol: 'xcQTZ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1n,
  };

  let balanceQuartzTokenInit: bigint;
  let balanceQuartzTokenMiddle: bigint;
  let balanceQuartzTokenFinal: bigint;
  let balanceForeignQtzTokenInit: bigint;
  let balanceForeignQtzTokenMiddle: bigint;
  let balanceForeignQtzTokenFinal: bigint;
  let balanceMovrTokenInit: bigint;
  let balanceMovrTokenMiddle: bigint;
  let balanceMovrTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccountQuartz] = await helper.arrange.createAccounts([0n], alice);

      balanceForeignQtzTokenInit = 0n;

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const alithAccount = helper.account.alithAccount();
      const baltatharAccount = helper.account.baltatharAccount();
      const dorothyAccount = helper.account.dorothyAccount();

      randomAccountMoonriver = helper.account.create();

      // >>> Sponsoring Dorothy >>>
      console.log('Sponsoring Dorothy.......');
      await helper.balance.transferToEthereum(alithAccount, dorothyAccount.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring Dorothy.......DONE');
      // <<< Sponsoring Dorothy <<<

      quartzAssetLocation = {
        XCM: {
          parents: 1,
          interior: {X1: {Parachain: QUARTZ_CHAIN}},
        },
      };
      const existentialDeposit = 1n;
      const isSufficient = true;
      const unitsPerSecond = 1n;
      const numAssetsWeightHint = 0;

      const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
        location: quartzAssetLocation,
        metadata: quartzAssetMetadata,
        existentialDeposit,
        isSufficient,
        unitsPerSecond,
        numAssetsWeightHint,
      });

      console.log('Encoded proposal for registerForeignAsset & setAssetUnitsPerSecond is %s', encodedProposal);

      await helper.fastDemocracy.executeProposal('register QTZ foreign asset', encodedProposal);

      // >>> Acquire Quartz AssetId Info on Moonriver >>>
      console.log('Acquire Quartz AssetId Info on Moonriver.......');

      assetId = (await helper.assetManager.assetTypeId(quartzAssetLocation)).toString();

      console.log('QTZ asset ID is %s', assetId);
      console.log('Acquire Quartz AssetId Info on Moonriver.......DONE');
      // >>> Acquire Quartz AssetId Info on Moonriver >>>

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonriver.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<

      balanceMovrTokenInit = await helper.balance.getEthereum(randomAccountMoonriver.address);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccountQuartz.address, 10n * TRANSFER_AMOUNT);
      balanceQuartzTokenInit = await helper.balance.getSubstrate(randomAccountQuartz.address);
    });
  });

  itSub('Should connect and send QTZ to Moonriver', async ({helper}) => {
    const currencyId = {
      NativeAssetId: 'Here',
    };
    const dest = {
      V2: {
        parents: 1,
        interior: {
          X2: [
            {Parachain: MOONRIVER_CHAIN},
            {AccountKey20: {network: 'Any', key: randomAccountMoonriver.address}},
          ],
        },
      },
    };
    const amount = TRANSFER_AMOUNT;

    await helper.xTokens.transfer(randomAccountQuartz, currencyId, amount, dest, 'Unlimited');

    balanceQuartzTokenMiddle = await helper.balance.getSubstrate(randomAccountQuartz.address);
    expect(balanceQuartzTokenMiddle < balanceQuartzTokenInit).to.be.true;

    const transactionFees = balanceQuartzTokenInit - balanceQuartzTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Quartz -> Moonriver] transaction fees on Quartz: %s QTZ', helper.util.bigIntToDecimals(transactionFees));
    expect(transactionFees > 0, 'Negative fees QTZ, looks like nothing was transferred').to.be.true;

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceMovrTokenMiddle = await helper.balance.getEthereum(randomAccountMoonriver.address);

      const movrFees = balanceMovrTokenInit - balanceMovrTokenMiddle;
      console.log('[Quartz -> Moonriver] transaction fees on Moonriver: %s MOVR',helper.util.bigIntToDecimals(movrFees));
      expect(movrFees == 0n).to.be.true;

      balanceForeignQtzTokenMiddle = (await helper.assets.account(assetId, randomAccountMoonriver.address))!; // BigInt(qtzRandomAccountAsset['balance']);
      const qtzIncomeTransfer = balanceForeignQtzTokenMiddle - balanceForeignQtzTokenInit;
      console.log('[Quartz -> Moonriver] income %s QTZ', helper.util.bigIntToDecimals(qtzIncomeTransfer));
      expect(qtzIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Moonriver and send QTZ back', async ({helper}) => {
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const asset = {
        V1: {
          id: {
            Concrete: {
              parents: 1,
              interior: {
                X1: {Parachain: QUARTZ_CHAIN},
              },
            },
          },
          fun: {
            Fungible: TRANSFER_AMOUNT,
          },
        },
      };
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: QUARTZ_CHAIN},
              {AccountId32: {network: 'Any', id: randomAccountQuartz.addressRaw}},
            ],
          },
        },
      };

      await helper.xTokens.transferMultiasset(randomAccountMoonriver, asset, destination, 'Unlimited');

      balanceMovrTokenFinal = await helper.balance.getEthereum(randomAccountMoonriver.address);

      const movrFees = balanceMovrTokenMiddle - balanceMovrTokenFinal;
      console.log('[Moonriver -> Quartz] transaction fees on Moonriver: %s MOVR', helper.util.bigIntToDecimals(movrFees));
      expect(movrFees > 0, 'Negative fees MOVR, looks like nothing was transferred').to.be.true;

      const qtzRandomAccountAsset = await helper.assets.account(assetId, randomAccountMoonriver.address);

      expect(qtzRandomAccountAsset).to.be.null;

      balanceForeignQtzTokenFinal = 0n;

      const qtzOutcomeTransfer = balanceForeignQtzTokenMiddle - balanceForeignQtzTokenFinal;
      console.log('[Quartz -> Moonriver] outcome %s QTZ', helper.util.bigIntToDecimals(qtzOutcomeTransfer));
      expect(qtzOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceQuartzTokenFinal = await helper.balance.getSubstrate(randomAccountQuartz.address);
    const actuallyDelivered = balanceQuartzTokenFinal - balanceQuartzTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Moonriver -> Quartz] actually delivered %s QTZ', helper.util.bigIntToDecimals(actuallyDelivered));

    const qtzFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Moonriver -> Quartz] transaction fees on Quartz: %s QTZ', helper.util.bigIntToDecimals(qtzFees));
    expect(qtzFees == 0n).to.be.true;
  });

  itSub('Moonriver can send only up to its balance', async ({helper}) => {
    // set Moonriver's sovereign account's balance
    const moonriverBalance = 10000n * (10n ** QTZ_DECIMALS);
    const moonriverSovereignAccount = helper.address.paraSiblingSovereignAccount(MOONRIVER_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, moonriverSovereignAccount, moonriverBalance);

    const moreThanMoonriverHas = moonriverBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {Parachain: QUARTZ_CHAIN},
        },
      },
    };

    const maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      moreThanMoonriverHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [quartzMultilocation, maliciousXcmProgram]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to spend more QTZ than Moonriver has', batchCall);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramSent.messageHash()
        && event.outcome().isFailedToTransactAsset;
    });

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Moonriver still can send the correct amount
    const validTransferAmount = moonriverBalance / 2n;
    const validXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      validTransferAmount,
    );

    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [quartzMultilocation, validXcmProgram]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('Spend the correct amount of QTZ', batchCall);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of QTZ from Moonriver', async ({helper}) => {
    const testAmount = 10_000n * (10n ** QTZ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {
            Parachain: QUARTZ_CHAIN,
          },
        },
      },
    };

    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      },
      testAmount,
    );

    const maliciousXcmProgramHereId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      testAmount,
    );

    let maliciousXcmProgramFullIdSent: any;
    let maliciousXcmProgramHereIdSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz using full QTZ identification
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [quartzMultilocation, maliciousXcmProgramFullId]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to act like a reserve location for QTZ using path asset identification', batchCall);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramFullIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Quartz using shortened QTZ identification
    await usingMoonriverPlaygrounds(moonriverUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [quartzMultilocation, maliciousXcmProgramHereId]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to act like a reserve location for QTZ using "here" asset identification', batchCall);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramHereIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Shiden', () => {
  let alice: IKeyringPair;
  let sender: IKeyringPair;

  const QTZ_ASSET_ID_ON_SHIDEN = 1;
  const QTZ_MINIMAL_BALANCE_ON_SHIDEN = 1n;

  // Quartz -> Shiden
  const shidenInitialBalance = 1n * (10n ** SHIDEN_DECIMALS); // 1 SHD, existential deposit required to actually create the account on Shiden
  const unitsPerSecond = 228_000_000_000n; // This is Phala's value. What will be ours?
  const qtzToShidenTransferred = 10n * (10n ** QTZ_DECIMALS); // 10 QTZ
  const qtzToShidenArrived = 9_999_999_999_088_000_000n; // 9.999 ... QTZ, Shiden takes a commision in foreign tokens

  // Shiden -> Quartz
  const qtzFromShidenTransfered = 5n * (10n ** QTZ_DECIMALS); // 5 QTZ
  const qtzOnShidenLeft = qtzToShidenArrived - qtzFromShidenTransfered; // 4.999_999_999_088_000_000n QTZ

  let balanceAfterQuartzToShidenXCM: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [sender] = await helper.arrange.createAccounts([100n], alice);
      console.log('sender', sender.address);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      console.log('1. Create foreign asset and metadata');
      // TODO update metadata with values from production
      await helper.assets.create(
        alice,
        QTZ_ASSET_ID_ON_SHIDEN,
        alice.address,
        QTZ_MINIMAL_BALANCE_ON_SHIDEN,
      );

      await helper.assets.setMetadata(
        alice,
        QTZ_ASSET_ID_ON_SHIDEN,
        'Cross chain QTZ',
        'xcQTZ',
        Number(QTZ_DECIMALS),
      );

      console.log('2. Register asset location on Shiden');
      const assetLocation = {
        V1: {
          parents: 1,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      };

      await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.registerAssetLocation', [assetLocation, QTZ_ASSET_ID_ON_SHIDEN]);

      console.log('3. Set QTZ payment for XCM execution on Shiden');
      await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.setAssetUnitsPerSecond', [assetLocation, unitsPerSecond]);

      console.log('4. Transfer 1 SDN to recipient to create the account (needed due to existential balance)');
      await helper.balance.transferToSubstrate(alice, sender.address, shidenInitialBalance);
    });
  });

  itSub('Should connect and send QTZ to Shiden', async ({helper}) => {
    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: SHIDEN_CHAIN,
          },
        },
      },
    };

    const beneficiary = {
      V2: {
        parents: 0,
        interior: {
          X1: {
            AccountId32: {
              network: 'Any',
              id: sender.addressRaw,
            },
          },
        },
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
            Fungible: qtzToShidenTransferred,
          },
        },
      ],
    };

    // Initial balance is 100 QTZ
    const balanceBefore = await helper.balance.getSubstrate(sender.address);
    console.log(`Initial balance is: ${balanceBefore}`);

    const feeAssetItem = 0;
    await helper.xcm.limitedReserveTransferAssets(sender, destination, beneficiary, assets, feeAssetItem, 'Unlimited');

    // Balance after reserve transfer is less than 90
    balanceAfterQuartzToShidenXCM = await helper.balance.getSubstrate(sender.address);
    console.log(`QTZ Balance on Quartz after XCM is: ${balanceAfterQuartzToShidenXCM}`);
    console.log(`Quartz's QTZ commission is: ${balanceBefore - balanceAfterQuartzToShidenXCM}`);
    expect(balanceBefore - balanceAfterQuartzToShidenXCM > 0).to.be.true;

    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      await helper.wait.newBlocks(3);
      const xcQTZbalance = await helper.assets.account(QTZ_ASSET_ID_ON_SHIDEN, sender.address);
      const shidenBalance = await helper.balance.getSubstrate(sender.address);

      console.log(`xcQTZ balance on Shiden after XCM is: ${xcQTZbalance}`);
      console.log(`Shiden's QTZ commission is: ${qtzToShidenTransferred - xcQTZbalance!}`);

      expect(xcQTZbalance).to.eq(qtzToShidenArrived);
      // SHD balance does not changed:
      expect(shidenBalance).to.eq(shidenInitialBalance);
    });
  });

  itSub('Should connect to Shiden and send QTZ back', async ({helper}) => {
    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      const destination = {
        V1: {
          parents: 1,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      };

      const beneficiary = {
        V1: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                network: 'Any',
                id: sender.addressRaw,
              },
            },
          },
        },
      };

      const assets = {
        V1: [
          {
            id: {
              Concrete: {
                parents: 1,
                interior: {
                  X1: {
                    Parachain: QUARTZ_CHAIN,
                  },
                },
              },
            },
            fun: {
              Fungible: qtzFromShidenTransfered,
            },
          },
        ],
      };

      // Initial balance is 1 SDN
      const balanceSDNbefore = await helper.balance.getSubstrate(sender.address);
      console.log(`SDN balance is: ${balanceSDNbefore}, it does not changed`);
      expect(balanceSDNbefore).to.eq(shidenInitialBalance);

      const feeAssetItem = 0;
      // this is non-standard polkadotXcm extension for Astar only. It calls InitiateReserveWithdraw
      await helper.executeExtrinsic(sender, 'api.tx.polkadotXcm.reserveWithdrawAssets', [destination, beneficiary, assets, feeAssetItem]);

      // Balance after reserve transfer is less than 1 SDN
      const xcQTZbalance = await helper.assets.account(QTZ_ASSET_ID_ON_SHIDEN, sender.address);
      const balanceSDN = await helper.balance.getSubstrate(sender.address);
      console.log(`xcQTZ balance on Shiden after XCM is: ${xcQTZbalance}`);

      // Assert: xcQTZ balance correctly decreased
      expect(xcQTZbalance).to.eq(qtzOnShidenLeft);
      // Assert: SDN balance is 0.996...
      expect(balanceSDN / (10n ** (SHIDEN_DECIMALS - 3n))).to.eq(996n);
    });

    await helper.wait.newBlocks(3);
    const balanceQTZ = await helper.balance.getSubstrate(sender.address);
    console.log(`QTZ Balance on Quartz after XCM is: ${balanceQTZ}`);
    expect(balanceQTZ).to.eq(balanceAfterQuartzToShidenXCM + qtzFromShidenTransfered);
  });

  itSub('Shiden can send only up to its balance', async ({helper}) => {
    // set Shiden's sovereign account's balance
    const shidenBalance = 10000n * (10n ** QTZ_DECIMALS);
    const shidenSovereignAccount = helper.address.paraSiblingSovereignAccount(SHIDEN_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, shidenSovereignAccount, shidenBalance);

    const moreThanShidenHas = shidenBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {Parachain: QUARTZ_CHAIN},
        },
      },
    };

    const maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      moreThanShidenHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz
    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgram);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramSent.messageHash()
        && event.outcome().isFailedToTransactAsset;
    });

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Shiden still can send the correct amount
    const validTransferAmount = shidenBalance / 2n;
    const validXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      validTransferAmount,
    );

    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, validXcmProgram);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of QTZ from Shiden', async ({helper}) => {
    const testAmount = 10_000n * (10n ** QTZ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const quartzMultilocation = {
      V1: {
        parents: 1,
        interior: {
          X1: {
            Parachain: QUARTZ_CHAIN,
          },
        },
      },
    };

    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 1,
          interior: {
            X1: {
              Parachain: QUARTZ_CHAIN,
            },
          },
        },
      },
      testAmount,
    );

    const maliciousXcmProgramHereId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      targetAccount.addressRaw,
      {
        Concrete: {
          parents: 0,
          interior: 'Here',
        },
      },
      testAmount,
    );

    let maliciousXcmProgramFullIdSent: any;
    let maliciousXcmProgramHereIdSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Quartz using full QTZ identification
    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgramFullId);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramFullIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Quartz using shortened QTZ identification
    await usingShidenPlaygrounds(shidenUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, quartzMultilocation, maliciousXcmProgramHereId);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => {
      return event.messageHash() == maliciousXcmProgramHereIdSent.messageHash()
        && event.outcome().isUntrustedReserveLocation;
    });

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});
