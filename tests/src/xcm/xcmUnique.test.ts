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
import {itSub, expect, describeXCM, usingPlaygrounds, usingAcalaPlaygrounds, usingRelayPlaygrounds, usingMoonbeamPlaygrounds, usingStatemintPlaygrounds, usingAstarPlaygrounds, usingPolkadexPlaygrounds} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import {nToBigInt} from '@polkadot/util';

const UNIQUE_CHAIN = +(process.env.RELAY_UNIQUE_ID || 2037);
const STATEMINT_CHAIN = +(process.env.RELAY_STATEMINT_ID || 1000);
const ACALA_CHAIN = +(process.env.RELAY_ACALA_ID || 2000);
const MOONBEAM_CHAIN = +(process.env.RELAY_MOONBEAM_ID || 2004);
const ASTAR_CHAIN = +(process.env.RELAY_ASTAR_ID || 2006);
const POLKADEX_CHAIN = +(process.env.RELAY_POLKADEX_ID || 2040);

const STATEMINT_PALLET_INSTANCE = 50;

const relayUrl = config.relayUrl;
const statemintUrl = config.statemintUrl;
const acalaUrl = config.acalaUrl;
const moonbeamUrl = config.moonbeamUrl;
const astarUrl = config.astarUrl;
const polkadexUrl = config.polkadexUrl;

const RELAY_DECIMALS = 12;
const STATEMINT_DECIMALS = 12;
const ACALA_DECIMALS = 12;
const ASTAR_DECIMALS = 18n;
const UNQ_DECIMALS = 18n;

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
const maxWaitBlocks = 6;
const expectFailedToTransact = async (helper: DevUniqueHelper, messageSent: any) => {
  await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash
        && event.outcome.isFailedToTransactAsset);
};
const expectUntrustedReserveLocationFail = async (helper: DevUniqueHelper, messageSent: any) => {
  await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash
         && event.outcome.isUntrustedReserveLocation);
};
describeXCM('[XCM] Integration test: Exchanging USDT with Statemint', () => {
  let alice: IKeyringPair;
  let bob: IKeyringPair;

  let balanceStmnBefore: bigint;
  let balanceStmnAfter: bigint;

  let balanceUniqueBefore: bigint;
  let balanceUniqueAfter: bigint;
  let balanceUniqueFinal: bigint;

  let balanceBobBefore: bigint;
  let balanceBobAfter: bigint;
  let balanceBobFinal: bigint;

  let balanceBobRelayTokenBefore: bigint;
  let balanceBobRelayTokenAfter: bigint;


  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      bob = await privateKey('//Bob'); // sovereign account on Statemint funds donor

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      // Fund accounts on Statemint
      await helper.xcm.teleportNativeAsset(alice, STATEMINT_CHAIN, alice.addressRaw, FUNDING_AMOUNT);
      await helper.xcm.teleportNativeAsset(alice, STATEMINT_CHAIN, bob.addressRaw, FUNDING_AMOUNT);
    });

    await usingStatemintPlaygrounds(statemintUrl, async (helper) => {
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

      // funding parachain sovereing account on Statemint.
      // The sovereign account should be created before any action
      // (the assets pallet on Statemint check if the sovereign account exists)
      const parachainSovereingAccount = helper.address.paraSiblingSovereignAccount(UNIQUE_CHAIN);
      await helper.balance.transferToSubstrate(bob, parachainSovereingAccount, sovereignFundingAmount);
    });


    await usingPlaygrounds(async (helper) => {
      const location = {
        V2: {
          parents: 1,
          interior: {X3: [
            {
              Parachain: STATEMINT_CHAIN,
            },
            {
              PalletInstance: STATEMINT_PALLET_INSTANCE,
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
      balanceUniqueBefore = await helper.balance.getSubstrate(alice.address);
    });


    // Providing the relay currency to the unique sender account
    // (fee for USDT XCM are paid in relay tokens)
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
              Fungible: TRANSFER_AMOUNT_RELAY,
            },
          },
        ],
      };

      const feeAssetItem = 0;

      await helper.xcm.limitedReserveTransferAssets(alice, destination, beneficiary, assets, feeAssetItem, 'Unlimited');
    });

  });

  itSub('Should connect and send USDT from Statemint to Unique', async ({helper}) => {
    await usingStatemintPlaygrounds(statemintUrl, async (helper) => {
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
                      PalletInstance: STATEMINT_PALLET_INSTANCE,
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
        '[Statemint -> Unique] transaction fees on Statemint: %s WND',
        helper.util.bigIntToDecimals(balanceStmnBefore - balanceStmnAfter, STATEMINT_DECIMALS),
      );
      expect(balanceStmnBefore > balanceStmnAfter).to.be.true;

    });


    // ensure that asset has been delivered
    await helper.wait.newBlocks(3);

    // expext collection id will be with id 1
    const free = await helper.ft.getBalance(1, {Substrate: alice.address});

    balanceUniqueAfter = await helper.balance.getSubstrate(alice.address);

    console.log(
      '[Statemint -> Unique] transaction fees on Unique: %s USDT',
      helper.util.bigIntToDecimals(TRANSFER_AMOUNT - free, USDT_ASSET_METADATA_DECIMALS),
    );
    console.log(
      '[Statemint -> Unique] transaction fees on Unique: %s UNQ',
      helper.util.bigIntToDecimals(balanceUniqueAfter - balanceUniqueBefore),
    );
    // commission has not paid in USDT token
    expect(free).to.be.equal(TRANSFER_AMOUNT);
    // ... and parachain native token
    expect(balanceUniqueAfter == balanceUniqueBefore).to.be.true;
  });

  itSub('Should connect and send USDT from Unique to Statemint back', async ({helper}) => {
    const destination = {
      V2: {
        parents: 1,
        interior: {X2: [
          {
            Parachain: STATEMINT_CHAIN,
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
    balanceUniqueFinal = await helper.balance.getSubstrate(alice.address);
    console.log('[Unique -> Statemint] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(balanceUniqueAfter - balanceUniqueFinal));
    expect(balanceUniqueAfter > balanceUniqueFinal).to.be.true;

    await usingStatemintPlaygrounds(statemintUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      // The USDT token never paid fees. Its amount not changed from begin value.
      // Also check that xcm transfer has been succeeded
      expect((await helper.assets.account(USDT_ASSET_ID, alice.address))! == USDT_ASSET_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect and send Relay token to Unique', async ({helper}) => {
    balanceBobBefore = await helper.balance.getSubstrate(bob.address);
    balanceBobRelayTokenBefore = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

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
    balanceBobRelayTokenAfter = await helper.tokens.accounts(bob.address, {NativeAssetId: 'Parent'});

    const wndFeeOnUnique = balanceBobRelayTokenAfter - TRANSFER_AMOUNT_RELAY - balanceBobRelayTokenBefore;
    const wndDiffOnUnique = balanceBobRelayTokenAfter - balanceBobRelayTokenBefore;
    console.log(
      '[Relay (Westend) -> Unique] transaction fees: %s UNQ',
      helper.util.bigIntToDecimals(balanceBobAfter - balanceBobBefore),
    );
    console.log(
      '[Relay (Westend) -> Unique] transaction fees: %s WND',
      helper.util.bigIntToDecimals(wndFeeOnUnique, STATEMINT_DECIMALS),
    );
    console.log('[Relay (Westend) -> Unique] actually delivered: %s WND', wndDiffOnUnique);
    expect(wndFeeOnUnique == 0n, 'No incoming WND fees should be taken').to.be.true;
    expect(balanceBobBefore == balanceBobAfter, 'No incoming UNQ fees should be taken').to.be.true;
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
    console.log('[Unique -> Relay (Westend)] transaction fees: %s UNQ',  helper.util.bigIntToDecimals(balanceBobAfter - balanceBobFinal));

    await usingRelayPlaygrounds(relayUrl, async (helper) => {
      await helper.wait.newBlocks(10);
      relayTokenBalanceAfter = await helper.balance.getSubstrate(bob.address);

      const diff = relayTokenBalanceAfter - relayTokenBalanceBefore;
      console.log('[Unique -> Relay (Westend)] actually delivered: %s WND', helper.util.bigIntToDecimals(diff, RELAY_DECIMALS));
      expect(diff > 0, 'Relay tokens was not delivered back').to.be.true;
    });
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Acala', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  let balanceUniqueTokenInit: bigint;
  let balanceUniqueTokenMiddle: bigint;
  let balanceUniqueTokenFinal: bigint;
  let balanceAcalaTokenInit: bigint;
  let balanceAcalaTokenMiddle: bigint;
  let balanceAcalaTokenFinal: bigint;
  let balanceUniqueForeignTokenInit: bigint;
  let balanceUniqueForeignTokenMiddle: bigint;
  let balanceUniqueForeignTokenFinal: bigint;

  // computed by a test transfer from prod Unique to prod Acala.
  // 2 UNQ sent https://unique.subscan.io/xcm_message/polkadot-bad0b68847e2398af25d482e9ee6f9c1f9ec2a48
  // 1.898970000000000000 UNQ received (you can check Acala's chain state in the corresponding block)
  const expectedAcalaIncomeFee = 2000000000000000000n - 1898970000000000000n;
  const acalaEps = 8n * 10n ** 16n;

  let acalaBackwardTransferAmount: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X1: {
              Parachain: UNIQUE_CHAIN,
            },
          },
        },
      };

      const metadata = {
        name: 'Unique Network',
        symbol: 'UNQ',
        decimals: 18,
        minimalBalance: 1250000000000000000n,
      };

      await helper.getSudo().assetRegistry.registerForeignAsset(alice, destination, metadata);
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
      balanceAcalaTokenInit = await helper.balance.getSubstrate(randomAccount.address);
      balanceUniqueForeignTokenInit = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10n * TRANSFER_AMOUNT);
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send UNQ to Acala', async ({helper}) => {

    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: ACALA_CHAIN,
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
    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    const unqFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> Acala] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees > 0n, 'Negative fees UNQ, looks like nothing was transferred').to.be.true;

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceUniqueForeignTokenMiddle = await helper.tokens.accounts(randomAccount.address, {ForeignAsset: 0});
      balanceAcalaTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

      const acaFees = balanceAcalaTokenInit - balanceAcalaTokenMiddle;
      const unqIncomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenInit;
      acalaBackwardTransferAmount = unqIncomeTransfer;

      const acaUnqFees = TRANSFER_AMOUNT - unqIncomeTransfer;

      console.log(
        '[Unique -> Acala] transaction fees on Acala: %s ACA',
        helper.util.bigIntToDecimals(acaFees, ACALA_DECIMALS),
      );
      console.log(
        '[Unique -> Acala] transaction fees on Acala: %s UNQ',
        helper.util.bigIntToDecimals(acaUnqFees),
      );
      console.log('[Unique -> Acala] income %s UNQ', helper.util.bigIntToDecimals(unqIncomeTransfer));
      expect(acaFees == 0n).to.be.true;

      const bigintAbs = (n: bigint) => (n < 0n) ? -n : n;

      expect(
        bigintAbs(acaUnqFees - expectedAcalaIncomeFee) < acalaEps,
        'Acala took different income fee, check the Acala foreign asset config',
      ).to.be.true;
    });
  });

  itSub('Should connect to Acala and send UNQ back', async ({helper}) => {
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: UNIQUE_CHAIN},
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

      await helper.xTokens.transfer(randomAccount, id, acalaBackwardTransferAmount, destination, 'Unlimited');
      balanceAcalaTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
      balanceUniqueForeignTokenFinal = await helper.tokens.accounts(randomAccount.address, id);

      const acaFees = balanceAcalaTokenMiddle - balanceAcalaTokenFinal;
      const unqOutcomeTransfer = balanceUniqueForeignTokenMiddle - balanceUniqueForeignTokenFinal;

      console.log(
        '[Acala -> Unique] transaction fees on Acala: %s ACA',
        helper.util.bigIntToDecimals(acaFees, ACALA_DECIMALS),
      );
      console.log('[Acala -> Unique] outcome %s UNQ', helper.util.bigIntToDecimals(unqOutcomeTransfer));

      expect(acaFees > 0, 'Negative fees ACA, looks like nothing was transferred').to.be.true;
      expect(unqOutcomeTransfer == acalaBackwardTransferAmount).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccount.address);
    const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Acala -> Unique] actually delivered %s UNQ', helper.util.bigIntToDecimals(actuallyDelivered));

    const unqFees = acalaBackwardTransferAmount - actuallyDelivered;
    console.log('[Acala -> Unique] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees == 0n).to.be.true;
  });

  itSub('Acala can send only up to its balance', async ({helper}) => {
    // set Acala's sovereign account's balance
    const acalaBalance = 10000n * (10n ** UNQ_DECIMALS);
    const acalaSovereignAccount = helper.address.paraSiblingSovereignAccount(ACALA_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, acalaSovereignAccount, acalaBalance);

    const moreThanAcalaHas = acalaBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {Parachain: UNIQUE_CHAIN},
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
      moreThanAcalaHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Unique
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgram);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramSent.messageHash
        && event.outcome.isFailedToTransactAsset);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Acala still can send the correct amount
    const validTransferAmount = acalaBalance / 2n;
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

    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, validXcmProgram);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of UNQ from Acala', async ({helper}) => {
    const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: UNIQUE_CHAIN,
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
              Parachain: UNIQUE_CHAIN,
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

    // Try to trick Unique using full UNQ identification
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramFullId);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramFullIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Unique using shortened UNQ identification
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramHereId);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramHereIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Polkadex', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;
  let unqFees: bigint;
  let balanceUniqueTokenInit: bigint;
  let balanceUniqueTokenMiddle: bigint;
  let balanceUniqueTokenFinal: bigint;
  const maxWaitBlocks = 6;

  const uniqueAssetId = {
    Concrete: {
      parents: 1,
      interior: {
        X1: {
          Parachain: UNIQUE_CHAIN,
        },
      },
    },
  };

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([0n], alice);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      const isWhitelisted = ((await helper.callRpc('api.query.xcmHelper.whitelistedTokens', []))
        .toJSON() as [])
        .map(nToBigInt).length != 0;
      /*
      Check whether the Unique token has been added
      to the whitelist, since an error will occur
      if it is added again. Needed for debugging
      when this test is run multiple times.
      */
      if(!isWhitelisted) {
        await helper.getSudo().xcmHelper.whitelistToken(alice, uniqueAssetId);
      }

      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10000000000000n);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccount.address, 10n * TRANSFER_AMOUNT);
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
    });
  });

  itSub('Should connect and send UNQ to Polkadex', async ({helper}) => {

    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: POLKADEX_CHAIN,
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
    const messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

    unqFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> Polkadex] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees > 0n, 'Negative fees UNQ, looks like nothing was transferred').to.be.true;

    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      /*
        Since only the parachain part of the Polkadex
        infrastructure is launched (without their
        solochain validators), processing incoming
        assets will lead to an error.
        This error indicates that the Polkadex chain
        received a message from the Unique network,
        since the hash is being checked to ensure
        it matches what was sent.
      */
      await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash);
    });
  });


  itSub('Should connect to Polkadex and send UNQ back', async ({helper}) => {

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {Parachain: UNIQUE_CHAIN},
        },
      },
    };

    const xcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
      randomAccount.addressRaw,
      {
        Concrete: {
          parents: 1,
          interior: {
            X1: {Parachain: UNIQUE_CHAIN},
          },
        },
      },
      TRANSFER_AMOUNT,
    );

    let xcmProgramSent: any;


    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, xcmProgram);

      xcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Success, event => event.messageHash == xcmProgramSent.messageHash);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccount.address);

    expect(balanceUniqueTokenFinal).to.be.equal(balanceUniqueTokenInit - unqFees);
  });

  itSub('Polkadex can send only up to its balance', async ({helper}) => {
    const polkadexBalance = 10000n * (10n ** UNQ_DECIMALS);
    const polkadexSovereignAccount = helper.address.paraSiblingSovereignAccount(POLKADEX_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, polkadexSovereignAccount, polkadexBalance);
    const moreThanPolkadexHas = 2n * polkadexBalance;

    const targetAccount = helper.arrange.createEmptyAccount();

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {Parachain: UNIQUE_CHAIN},
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
      moreThanPolkadexHas,
    );

    let maliciousXcmProgramSent: any;


    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgram);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, maliciousXcmProgramSent);

    const targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);
  });

  itSub('Should not accept reserve transfer of UNQ from Acala', async ({helper}) => {
    const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
    const targetAccount = helper.arrange.createEmptyAccount();

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: UNIQUE_CHAIN,
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
              Parachain: UNIQUE_CHAIN,
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

    // Try to trick Unique using full UNQ identification
    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramFullId);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramFullIdSent);

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Unique using shortened UNQ identification
    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramHereId);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramHereIdSent);

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});

// These tests are relevant only when
// the the corresponding foreign assets are not registered
describeXCM('[XCM] Integration test: Unique rejects non-native tokens', () => {
  let alice: IKeyringPair;
  let alith: IKeyringPair;

  const testAmount = 100_000_000_000n;
  let uniqueParachainJunction;
  let uniqueAccountJunction;

  let uniqueParachainMultilocation: any;
  let uniqueAccountMultilocation: any;
  let uniqueCombinedMultilocation: any;
  let uniqueCombinedMultilocationAcala: any; // TODO remove when Acala goes V2

  let messageSent: any;

  const maxWaitBlocks = 3;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');

      uniqueParachainJunction = {Parachain: UNIQUE_CHAIN};
      uniqueAccountJunction = {
        AccountId32: {
          network: 'Any',
          id: alice.addressRaw,
        },
      };

      uniqueParachainMultilocation = {
        V2: {
          parents: 1,
          interior: {
            X1: uniqueParachainJunction,
          },
        },
      };

      uniqueAccountMultilocation = {
        V2: {
          parents: 0,
          interior: {
            X1: uniqueAccountJunction,
          },
        },
      };

      uniqueCombinedMultilocation = {
        V2: {
          parents: 1,
          interior: {
            X2: [uniqueParachainJunction, uniqueAccountJunction],
          },
        },
      };

      uniqueCombinedMultilocationAcala = {
        V2: {
          parents: 1,
          interior: {
            X2: [uniqueParachainJunction, uniqueAccountJunction],
          },
        },
      };

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    // eslint-disable-next-line require-await
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      alith = helper.account.alithAccount();
    });
  });



  itSub('Unique rejects ACA tokens from Acala', async ({helper}) => {
    await usingAcalaPlaygrounds(acalaUrl, async (helper) => {
      const id = {
        Token: 'ACA',
      };
      const destination = uniqueCombinedMultilocationAcala;
      await helper.xTokens.transfer(alice, id, testAmount, destination, 'Unlimited');

      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });

  itSub('Unique rejects GLMR tokens from Moonbeam', async ({helper}) => {
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const id = 'SelfReserve';
      const destination = uniqueCombinedMultilocation;
      await helper.xTokens.transfer(alith, id, testAmount, destination, 'Unlimited');

      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });

  itSub('Unique rejects ASTR tokens from Astar', async ({helper}) => {
    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      const destinationParachain = uniqueParachainMultilocation;
      const beneficiary = uniqueAccountMultilocation;
      const assets = {
        V2: [{
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

  itSub('Unique rejects PDX tokens from Polkadex', async ({helper}) => {

    const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
      helper.arrange.createEmptyAccount().addressRaw,
      {
        Concrete: {
          parents: 1,
          interior: {
            X1: {
              Parachain: POLKADEX_CHAIN,
            },
          },
        },
      },
      testAmount,
    );

    await usingPolkadexPlaygrounds(polkadexUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueParachainMultilocation, maliciousXcmProgramFullId);
      messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await expectFailedToTransact(helper, messageSent);
  });
});

describeXCM('[XCM] Integration test: Exchanging UNQ with Moonbeam', () => {
  // Unique constants
  let alice: IKeyringPair;
  let uniqueAssetLocation;

  let randomAccountUnique: IKeyringPair;
  let randomAccountMoonbeam: IKeyringPair;

  // Moonbeam constants
  let assetId: string;

  const uniqueAssetMetadata = {
    name: 'xcUnique',
    symbol: 'xcUNQ',
    decimals: 18,
    isFrozen: false,
    minimalBalance: 1n,
  };

  let balanceUniqueTokenInit: bigint;
  let balanceUniqueTokenMiddle: bigint;
  let balanceUniqueTokenFinal: bigint;
  let balanceForeignUnqTokenInit: bigint;
  let balanceForeignUnqTokenMiddle: bigint;
  let balanceForeignUnqTokenFinal: bigint;
  let balanceGlmrTokenInit: bigint;
  let balanceGlmrTokenMiddle: bigint;
  let balanceGlmrTokenFinal: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccountUnique] = await helper.arrange.createAccounts([0n], alice);

      balanceForeignUnqTokenInit = 0n;

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const alithAccount = helper.account.alithAccount();
      const baltatharAccount = helper.account.baltatharAccount();
      const dorothyAccount = helper.account.dorothyAccount();

      randomAccountMoonbeam = helper.account.create();

      // >>> Sponsoring Dorothy >>>
      console.log('Sponsoring Dorothy.......');
      await helper.balance.transferToEthereum(alithAccount, dorothyAccount.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring Dorothy.......DONE');
      // <<< Sponsoring Dorothy <<<

      uniqueAssetLocation = {
        XCM: {
          parents: 1,
          interior: {X1: {Parachain: UNIQUE_CHAIN}},
        },
      };
      const existentialDeposit = 1n;
      const isSufficient = true;
      const unitsPerSecond = 1n;
      const numAssetsWeightHint = 0;

      const encodedProposal = helper.assetManager.makeRegisterForeignAssetProposal({
        location: uniqueAssetLocation,
        metadata: uniqueAssetMetadata,
        existentialDeposit,
        isSufficient,
        unitsPerSecond,
        numAssetsWeightHint,
      });

      console.log('Encoded proposal for registerForeignAsset & setAssetUnitsPerSecond is %s', encodedProposal);

      await helper.fastDemocracy.executeProposal('register UNQ foreign asset', encodedProposal);

      // >>> Acquire Unique AssetId Info on Moonbeam >>>
      console.log('Acquire Unique AssetId Info on Moonbeam.......');

      assetId = (await helper.assetManager.assetTypeId(uniqueAssetLocation)).toString();

      console.log('UNQ asset ID is %s', assetId);
      console.log('Acquire Unique AssetId Info on Moonbeam.......DONE');
      // >>> Acquire Unique AssetId Info on Moonbeam >>>

      // >>> Sponsoring random Account >>>
      console.log('Sponsoring random Account.......');
      await helper.balance.transferToEthereum(baltatharAccount, randomAccountMoonbeam.address, 11_000_000_000_000_000_000n);
      console.log('Sponsoring random Account.......DONE');
      // <<< Sponsoring random Account <<<

      balanceGlmrTokenInit = await helper.balance.getEthereum(randomAccountMoonbeam.address);
    });

    await usingPlaygrounds(async (helper) => {
      await helper.balance.transferToSubstrate(alice, randomAccountUnique.address, 10n * TRANSFER_AMOUNT);
      balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccountUnique.address);
    });
  });

  itSub('Should connect and send UNQ to Moonbeam', async ({helper}) => {
    const currencyId = {
      NativeAssetId: 'Here',
    };
    const dest = {
      V2: {
        parents: 1,
        interior: {
          X2: [
            {Parachain: MOONBEAM_CHAIN},
            {AccountKey20: {network: 'Any', key: randomAccountMoonbeam.address}},
          ],
        },
      },
    };
    const amount = TRANSFER_AMOUNT;

    await helper.xTokens.transfer(randomAccountUnique, currencyId, amount, dest, 'Unlimited');

    balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccountUnique.address);
    expect(balanceUniqueTokenMiddle < balanceUniqueTokenInit).to.be.true;

    const transactionFees = balanceUniqueTokenInit - balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
    console.log('[Unique -> Moonbeam] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(transactionFees));
    expect(transactionFees > 0, 'Negative fees UNQ, looks like nothing was transferred').to.be.true;

    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      await helper.wait.newBlocks(3);

      balanceGlmrTokenMiddle = await helper.balance.getEthereum(randomAccountMoonbeam.address);

      const glmrFees = balanceGlmrTokenInit - balanceGlmrTokenMiddle;
      console.log('[Unique -> Moonbeam] transaction fees on Moonbeam: %s GLMR', helper.util.bigIntToDecimals(glmrFees));
      expect(glmrFees == 0n).to.be.true;

      balanceForeignUnqTokenMiddle = (await helper.assets.account(assetId, randomAccountMoonbeam.address))!;

      const unqIncomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenInit;
      console.log('[Unique -> Moonbeam] income %s UNQ', helper.util.bigIntToDecimals(unqIncomeTransfer));
      expect(unqIncomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });
  });

  itSub('Should connect to Moonbeam and send UNQ back', async ({helper}) => {
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const asset = {
        V2: {
          id: {
            Concrete: {
              parents: 1,
              interior: {
                X1: {Parachain: UNIQUE_CHAIN},
              },
            },
          },
          fun: {
            Fungible: TRANSFER_AMOUNT,
          },
        },
      };
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X2: [
              {Parachain: UNIQUE_CHAIN},
              {AccountId32: {network: 'Any', id: randomAccountUnique.addressRaw}},
            ],
          },
        },
      };

      await helper.xTokens.transferMultiasset(randomAccountMoonbeam, asset, destination, 'Unlimited');

      balanceGlmrTokenFinal = await helper.balance.getEthereum(randomAccountMoonbeam.address);

      const glmrFees = balanceGlmrTokenMiddle - balanceGlmrTokenFinal;
      console.log('[Moonbeam -> Unique] transaction fees on Moonbeam: %s GLMR', helper.util.bigIntToDecimals(glmrFees));
      expect(glmrFees > 0, 'Negative fees GLMR, looks like nothing was transferred').to.be.true;

      const unqRandomAccountAsset = await helper.assets.account(assetId, randomAccountMoonbeam.address);

      expect(unqRandomAccountAsset).to.be.null;

      balanceForeignUnqTokenFinal = 0n;

      const unqOutcomeTransfer = balanceForeignUnqTokenMiddle - balanceForeignUnqTokenFinal;
      console.log('[Unique -> Moonbeam] outcome %s UNQ', helper.util.bigIntToDecimals(unqOutcomeTransfer));
      expect(unqOutcomeTransfer == TRANSFER_AMOUNT).to.be.true;
    });

    await helper.wait.newBlocks(3);

    balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccountUnique.address);
    const actuallyDelivered = balanceUniqueTokenFinal - balanceUniqueTokenMiddle;
    expect(actuallyDelivered > 0).to.be.true;

    console.log('[Moonbeam -> Unique] actually delivered %s UNQ', helper.util.bigIntToDecimals(actuallyDelivered));

    const unqFees = TRANSFER_AMOUNT - actuallyDelivered;
    console.log('[Moonbeam -> Unique] transaction fees on Unique: %s UNQ', helper.util.bigIntToDecimals(unqFees));
    expect(unqFees == 0n).to.be.true;
  });

  itSub('Moonbeam can send only up to its balance', async ({helper}) => {
    // set Moonbeam's sovereign account's balance
    const moonbeamBalance = 10000n * (10n ** UNQ_DECIMALS);
    const moonbeamSovereignAccount = helper.address.paraSiblingSovereignAccount(MOONBEAM_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, moonbeamSovereignAccount, moonbeamBalance);

    const moreThanMoonbeamHas = moonbeamBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {Parachain: UNIQUE_CHAIN},
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
      moreThanMoonbeamHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Unique
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueMultilocation, maliciousXcmProgram]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to spend more UNQ than Moonbeam has', batchCall);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramSent.messageHash
        && event.outcome.isFailedToTransactAsset);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Moonbeam still can send the correct amount
    const validTransferAmount = moonbeamBalance / 2n;
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

    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueMultilocation, validXcmProgram]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('Spend the correct amount of UNQ', batchCall);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of UNQ from Moonbeam', async ({helper}) => {
    const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: UNIQUE_CHAIN,
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
              Parachain: UNIQUE_CHAIN,
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

    // Try to trick Unique using full UNQ identification
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueMultilocation, maliciousXcmProgramFullId]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to act like a reserve location for UNQ using path asset identification', batchCall);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramFullIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Unique using shortened UNQ identification
    await usingMoonbeamPlaygrounds(moonbeamUrl, async (helper) => {
      const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [uniqueMultilocation, maliciousXcmProgramHereId]);

      // Needed to bypass the call filter.
      const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
      await helper.fastDemocracy.executeProposal('try to act like a reserve location for UNQ using "here" asset identification', batchCall);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramHereIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});

describeXCM('[XCM] Integration test: Exchanging tokens with Astar', () => {
  let alice: IKeyringPair;
  let randomAccount: IKeyringPair;

  const UNQ_ASSET_ID_ON_ASTAR = 1;
  const UNQ_MINIMAL_BALANCE_ON_ASTAR = 1n;

  // Unique -> Astar
  const astarInitialBalance = 1n * (10n ** ASTAR_DECIMALS); // 1 ASTR, existential deposit required to actually create the account on Astar.
  const unitsPerSecond = 228_000_000_000n; // This is Phala's value. What will be ours?
  const unqToAstarTransferred = 10n * (10n ** UNQ_DECIMALS); // 10 UNQ
  const unqToAstarArrived = 9_999_999_999_088_000_000n; // 9.999 ... UNQ, Astar takes a commision in foreign tokens

  // Astar -> Unique
  const unqFromAstarTransfered = 5n * (10n ** UNQ_DECIMALS); // 5 UNQ
  const unqOnAstarLeft = unqToAstarArrived - unqFromAstarTransfered; // 4.999_999_999_088_000_000n UNQ

  let balanceAfterUniqueToAstarXCM: bigint;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      alice = await privateKey('//Alice');
      [randomAccount] = await helper.arrange.createAccounts([100n], alice);
      console.log('randomAccount', randomAccount.address);

      // Set the default version to wrap the first message to other chains.
      await helper.getSudo().xcm.setSafeXcmVersion(alice, SAFE_XCM_VERSION);
    });

    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      console.log('1. Create foreign asset and metadata');
      // TODO update metadata with values from production
      await helper.assets.create(
        alice,
        UNQ_ASSET_ID_ON_ASTAR,
        alice.address,
        UNQ_MINIMAL_BALANCE_ON_ASTAR,
      );

      await helper.assets.setMetadata(
        alice,
        UNQ_ASSET_ID_ON_ASTAR,
        'Cross chain UNQ',
        'xcUNQ',
        Number(UNQ_DECIMALS),
      );

      console.log('2. Register asset location on Astar');
      const assetLocation = {
        V2: {
          parents: 1,
          interior: {
            X1: {
              Parachain: UNIQUE_CHAIN,
            },
          },
        },
      };

      await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.registerAssetLocation', [assetLocation, UNQ_ASSET_ID_ON_ASTAR]);

      console.log('3. Set UNQ payment for XCM execution on Astar');
      await helper.getSudo().executeExtrinsic(alice, 'api.tx.xcAssetConfig.setAssetUnitsPerSecond', [assetLocation, unitsPerSecond]);

      console.log('4. Transfer 1 ASTR to recipient to create the account (needed due to existential balance)');
      await helper.balance.transferToSubstrate(alice, randomAccount.address, astarInitialBalance);
    });
  });

  itSub('Should connect and send UNQ to Astar', async ({helper}) => {
    const destination = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: ASTAR_CHAIN,
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
            Fungible: unqToAstarTransferred,
          },
        },
      ],
    };

    // Initial balance is 100 UNQ
    const balanceBefore = await helper.balance.getSubstrate(randomAccount.address);
    console.log(`Initial balance is: ${balanceBefore}`);

    const feeAssetItem = 0;
    await helper.xcm.limitedReserveTransferAssets(randomAccount, destination, beneficiary, assets, feeAssetItem, 'Unlimited');

    // Balance after reserve transfer is less than 90
    balanceAfterUniqueToAstarXCM = await helper.balance.getSubstrate(randomAccount.address);
    console.log(`UNQ Balance on Unique after XCM is: ${balanceAfterUniqueToAstarXCM}`);
    console.log(`Unique's UNQ commission is: ${balanceBefore - balanceAfterUniqueToAstarXCM}`);
    expect(balanceBefore - balanceAfterUniqueToAstarXCM > 0).to.be.true;

    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      await helper.wait.newBlocks(3);
      const xcUNQbalance = await helper.assets.account(UNQ_ASSET_ID_ON_ASTAR, randomAccount.address);
      const astarBalance = await helper.balance.getSubstrate(randomAccount.address);

      console.log(`xcUNQ balance on Astar after XCM is: ${xcUNQbalance}`);
      console.log(`Astar's UNQ commission is: ${unqToAstarTransferred - xcUNQbalance!}`);

      expect(xcUNQbalance).to.eq(unqToAstarArrived);
      // Astar balance does not changed
      expect(astarBalance).to.eq(astarInitialBalance);
    });
  });

  itSub('Should connect to Astar and send UNQ back', async ({helper}) => {
    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X1: {
              Parachain: UNIQUE_CHAIN,
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
                parents: 1,
                interior: {
                  X1: {
                    Parachain: UNIQUE_CHAIN,
                  },
                },
              },
            },
            fun: {
              Fungible: unqFromAstarTransfered,
            },
          },
        ],
      };

      // Initial balance is 1 ASTR
      const balanceASTRbefore = await helper.balance.getSubstrate(randomAccount.address);
      console.log(`ASTR balance is: ${balanceASTRbefore}, it does not changed`);
      expect(balanceASTRbefore).to.eq(astarInitialBalance);

      const feeAssetItem = 0;
      // this is non-standard polkadotXcm extension for Astar only. It calls InitiateReserveWithdraw
      await helper.executeExtrinsic(randomAccount, 'api.tx.polkadotXcm.reserveWithdrawAssets', [destination, beneficiary, assets, feeAssetItem]);

      const xcUNQbalance = await helper.assets.account(UNQ_ASSET_ID_ON_ASTAR, randomAccount.address);
      const balanceAstar = await helper.balance.getSubstrate(randomAccount.address);
      console.log(`xcUNQ balance on Astar after XCM is: ${xcUNQbalance}`);

      // Assert: xcUNQ balance correctly decreased
      expect(xcUNQbalance).to.eq(unqOnAstarLeft);
      // Assert: ASTR balance is 0.996...
      expect(balanceAstar / (10n ** (ASTAR_DECIMALS - 3n))).to.eq(996n);
    });

    await helper.wait.newBlocks(3);
    const balanceUNQ = await helper.balance.getSubstrate(randomAccount.address);
    console.log(`UNQ Balance on Unique after XCM is: ${balanceUNQ}`);
    expect(balanceUNQ).to.eq(balanceAfterUniqueToAstarXCM + unqFromAstarTransfered);
  });

  itSub('Astar can send only up to its balance', async ({helper}) => {
    // set Astar's sovereign account's balance
    const astarBalance = 10000n * (10n ** UNQ_DECIMALS);
    const astarSovereignAccount = helper.address.paraSiblingSovereignAccount(ASTAR_CHAIN);
    await helper.getSudo().balance.setBalanceSubstrate(alice, astarSovereignAccount, astarBalance);

    const moreThanAstarHas = astarBalance * 2n;

    let targetAccountBalance = 0n;
    const [targetAccount] = await helper.arrange.createAccounts([targetAccountBalance], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {Parachain: UNIQUE_CHAIN},
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
      moreThanAstarHas,
    );

    let maliciousXcmProgramSent: any;
    const maxWaitBlocks = 3;

    // Try to trick Unique
    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgram);

      maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramSent.messageHash
        && event.outcome.isFailedToTransactAsset);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(0n);

    // But Astar still can send the correct amount
    const validTransferAmount = astarBalance / 2n;
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

    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, validXcmProgram);
    });

    await helper.wait.newBlocks(maxWaitBlocks);

    targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(targetAccountBalance).to.be.equal(validTransferAmount);
  });

  itSub('Should not accept reserve transfer of UNQ from Astar', async ({helper}) => {
    const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
    const [targetAccount] = await helper.arrange.createAccounts([0n], alice);

    const uniqueMultilocation = {
      V2: {
        parents: 1,
        interior: {
          X1: {
            Parachain: UNIQUE_CHAIN,
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
              Parachain: UNIQUE_CHAIN,
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

    // Try to trick Unique using full UNQ identification
    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramFullId);

      maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramFullIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);

    // Try to trick Unique using shortened UNQ identification
    await usingAstarPlaygrounds(astarUrl, async (helper) => {
      await helper.getSudo().xcm.send(alice, uniqueMultilocation, maliciousXcmProgramHereId);

      maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
    });

    await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == maliciousXcmProgramHereIdSent.messageHash
        && event.outcome.isUntrustedReserveLocation);

    accountBalance = await helper.balance.getSubstrate(targetAccount.address);
    expect(accountBalance).to.be.equal(0n);
  });
});
