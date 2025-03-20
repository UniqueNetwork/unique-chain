import type {IKeyringPair} from '@polkadot/types/types';
import {expect, usingAcalaPlaygrounds, usingAstarPlaygrounds, usingHydraDxPlaygrounds, usingKaruraPlaygrounds, usingKusamaAssetHubPlaygrounds, usingMoonbeamPlaygrounds, usingMoonriverPlaygrounds, usingPlaygrounds, usingPolkadotAssetHubPlaygrounds, usingRelayPlaygrounds, usingShidenPlaygrounds} from '@unique/test-utils/util.js';
import {DevUniqueHelper, Event} from '@unique/test-utils';
import {AcalaHelper, AstarHelper} from '@unique/test-utils/xcm/index.js';
import {IEvent, ITransactionResult} from '@unique-nft/playgrounds/types.js';
import {ChainHelperBase} from '@unique-nft/playgrounds';

export const UNIQUE_CHAIN = +(process.env.RELAY_UNIQUE_ID || 2037);
export const POLKADOT_ASSETHUB_CHAIN = +(process.env.RELAY_ASSETHUB_ID || 1000);
export const ACALA_CHAIN = +(process.env.RELAY_ACALA_ID || 2000);
export const MOONBEAM_CHAIN = +(process.env.RELAY_MOONBEAM_ID || 2004);
export const ASTAR_CHAIN = +(process.env.RELAY_ASTAR_ID || 2006);
export const HYDRADX_CHAIN = +(process.env.RELAY_HYDRADX_ID || 2034);

export const QUARTZ_CHAIN = +(process.env.RELAY_QUARTZ_ID || 2095);
export const KUSAMA_ASSETHUB_CHAIN = +(process.env.RELAY_ASSETHUB_URL || 1000);
export const KARURA_CHAIN = +(process.env.RELAY_KARURA_ID || 2000);
export const MOONRIVER_CHAIN = +(process.env.RELAY_MOONRIVER_ID || 2023);
export const SHIDEN_CHAIN = +(process.env.RELAY_SHIDEN_ID || 2007);

export const SAFE_XCM_VERSION = 4;

export const RELAY_DECIMALS = 12;
export const KUSAMA_ASSETHUB_DECIMALS = 12;
export const KARURA_DECIMALS = 12;
export const SHIDEN_DECIMALS = 18n;

export const ASTAR_DECIMALS = 18;
export const UNQ_DECIMALS = 18;

export const maxWaitBlocks = 80;

export const expectDownwardXcmNoPermission = async (helper: DevUniqueHelper) => {
  // The correct messageHash for downward messages can't be reliably obtained
  await helper.wait.expectEvent(maxWaitBlocks, Event.DmpQueue.ExecutedDownward, event => event.outcome.asIncomplete[1].isNoPermission);
};

export const expectDownwardXcmComplete = async (helper: DevUniqueHelper) => {
  // The correct messageHash for downward messages can't be reliably obtained
  await helper.wait.expectEvent(maxWaitBlocks, Event.DmpQueue.ExecutedDownward, event => event.outcome.isComplete);
};

export const NETWORKS = {
  unique: usingPlaygrounds,
  quartz: usingPlaygrounds,
  relay: usingRelayPlaygrounds,
  kusamaAssetHub: usingKusamaAssetHubPlaygrounds,
  polkadotAssetHub: usingPolkadotAssetHubPlaygrounds,
  acala: usingAcalaPlaygrounds,
  astar: usingAstarPlaygrounds,
  moonbeam: usingMoonbeamPlaygrounds,
  moonriver: usingMoonriverPlaygrounds,
  karura: usingKaruraPlaygrounds,
  shiden: usingShidenPlaygrounds,
  hydraDx: usingHydraDxPlaygrounds,
} as const;
type NetworkNames = keyof typeof NETWORKS;

type UniqueChain = 'quartz' | 'unique';

export function mapToChainId(networkName: keyof typeof NETWORKS): number {
  switch (networkName) {
    case 'unique':
      return UNIQUE_CHAIN;
    case 'quartz':
      return QUARTZ_CHAIN;
    case 'relay':
      throw new Error('Relay chain has no para ID');
    case 'kusamaAssetHub':
    case 'polkadotAssetHub':
      return POLKADOT_ASSETHUB_CHAIN;
    case 'acala':
      return ACALA_CHAIN;
    case 'astar':
      return ASTAR_CHAIN;
    case 'moonbeam':
      return MOONBEAM_CHAIN;
    case 'moonriver':
      return MOONRIVER_CHAIN;
    case 'karura':
      return KARURA_CHAIN;
    case 'shiden':
      return SHIDEN_CHAIN;
    case 'hydraDx':
      return HYDRADX_CHAIN;
  }
}

export function mapToChainLocation(networkName: keyof typeof NETWORKS) {
  return {
    parents: 1,
    interior: networkName === 'relay'
      ? 'here'
      : {X1: [{Parachain: mapToChainId(networkName)}]},
  };
}

export const USDT_ASSET_ID = 1984;
export const USDT_DECIMALS = 6;
export const ASSET_HUB_PALLET_ASSETS = 50;

export function mapToUsdtLocation(networkName: keyof typeof NETWORKS) {
  const basicInteriors = [
    {
      PalletInstance: ASSET_HUB_PALLET_ASSETS,
    },
    {
      GeneralIndex: USDT_ASSET_ID,
    },
  ];

  if(networkName === 'kusamaAssetHub' || networkName === 'polkadotAssetHub') {
    return {
      parents: 0,
      interior: {
        X2: basicInteriors,
      },
    };
  } else {
    return {
      parents: 1,
      interior: {
        X3: [
          {
            Parachain: POLKADOT_ASSETHUB_CHAIN,
          },
          ...basicInteriors,
        ],
      },
    };
  }
}

export function getDevPlayground(name: NetworkNames) {
  return NETWORKS[name];
}

export const TRANSFER_AMOUNT = 2000000n * 10n ** BigInt(UNQ_DECIMALS);
export const SENDER_BUDGET = 2n * TRANSFER_AMOUNT;
export const SENDTO_AMOUNT = TRANSFER_AMOUNT;
export const SENDBACK_AMOUNT = TRANSFER_AMOUNT / 2n;
export const STAYED_ON_TARGET_CHAIN = TRANSFER_AMOUNT - SENDBACK_AMOUNT;
export const OTHER_CHAIN_TOKEN_TRANSFER_AMOUNT = 100_000_000_000n;

export class XcmTestHelper {
  private _isAddress20FormatFor(network: NetworkNames) {
    switch (network) {
      case 'moonbeam':
      case 'moonriver':
        return true;
      default:
        return false;
    }
  }

  async #collectProcessedMsgsEvents(
    helper: any,
    whileCondition: () => boolean,
  ) {
    const {unsubscribe, collectedEvents} = await helper.subscribeEvents([
      {
        section: Event.MessageQueue.Processed.section(),
        names: [Event.MessageQueue.Processed.method()],
      },
    ]);

    let blocksSkipped = 0;

    while(whileCondition()) {
      await helper.wait.newBlocks(1);

      blocksSkipped += 1;

      if(blocksSkipped >= maxWaitBlocks) {
        throw new Error(`max number of blocks (${maxWaitBlocks}) were skipped while waiting for the message hash to find`);
      }
    }

    // After the block with XCM transfer from the `from` network
    // is finalized, we will receive the XCM message on the `to` network
    // in some near block via the `setValidationData`.
    //
    // When we see that `messageHash` isn't null, we need to wait several more blocks
    // to make sure we didn't skip the one where the XCM message arrived.
    //
    // Yet, it could also arrive immediately, that is why we are collecting events.
    await helper.wait.newBlocks(10);

    unsubscribe();
    return (collectedEvents as IEvent[]).map(e => e.data);
  }

  async #sendXcmProgram(
    sudoer: IKeyringPair,
    sendFrom: keyof typeof NETWORKS,
    sendTo: UniqueChain,
    program: any,
  ) {
    const otherChainPlayground = getDevPlayground(sendFrom);

    return await otherChainPlayground(async (helper) => {
      const destination =  sendFrom === 'relay'
        ? {
          V4: {
            parents: 0,
            interior: {X1: [{Parachain: mapToChainId(sendTo)}]},
          },
        }
        : {V4: mapToChainLocation(sendTo)};
      const xcmSend = helper.constructApiCall(`api.tx.${helper.xcm.palletName}.send`, [destination, program]);

      if('getSudo' in helper) {
        // can't use `getSudo` here because of types issues.
        // The `helper` has a union type,
        // the signatures of `getSudo` aren't compatible with each other.
        //
        // But we do know here that the chain has the `sudo` pallet.
        const sendResult = await helper.executeExtrinsic(
          sudoer,
          'api.tx.sudo.sudo',
          [xcmSend],
        );
        const messageSent = await this.#expectSentEvent(helper, sendFrom, sendTo, sendResult);
        return messageSent.messageHash;
      } else if('fastDemocracy' in helper) {
        // Needed to bypass the call filter.
        const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);

        const [, messageSent] = await Promise.all([
          helper.fastDemocracy.executeProposal(`sending ${sendFrom} -> ${sendTo} via XCM program`, batchCall),
          helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent),
        ]);

        return messageSent.messageHash;
      } else {
        throw new Error(`unknown governance in ${sendFrom}`);
      }
    });
  }

  async #awaitMaliciousProgramRejection(getMessageHash: () => any) {
    await usingPlaygrounds(async (helper) => {
      const collectedEventData = await this.#collectProcessedMsgsEvents(
        helper,
        () => getMessageHash() === null,
      );

      const processedMsgEvent = collectedEventData.find(data => {
        const processedMessageHash = data[0];
        return processedMessageHash === getMessageHash();
      });

      expect(processedMsgEvent).to.be.not.undefined;

      const msgProcResult = processedMsgEvent![3];
      expect(msgProcResult).to.be.false;
    });
  }

  async #expectSentEvent(
    fromHelper: ChainHelperBase,
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    txResult: ITransactionResult,
  ) {
    // FIXME
    // WORKAROUND: sometimes a part of the events collected directly from the extrinsic
    // is lost somehow. Let's query all of them from the block.
    const events = await fromHelper.fetchPhasicEventsFromBlock(txResult.blockHash);

    if(from === 'relay') {
      return Event.XcmPallet.Sent.expect(events);
    } else if(to === 'relay' || from === 'kusamaAssetHub' || from === 'polkadotAssetHub') {
      return Event.PolkadotXcm.Sent.expect(events);
    } else {
      return Event.XcmpQueue.XcmpMessageSent.expect(events);
    }
  }

  async #sendTokens({
    from,
    to,
    fromAccount,
    toAccount,
    assetId,
    amount,
    decimals,
    getAssetBalanceOnUnique,
    setMessageHash,
  }: {
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    fromAccount: IKeyringPair,
    toAccount: IKeyringPair,
    assetId: any,
    amount: bigint,
    decimals: number,
    getAssetBalanceOnUnique: (helper: DevUniqueHelper) => Promise<bigint>,
    setMessageHash: (messageHash: any) => void,
  }) {
    const isFromUnique = from === 'unique' || from === 'quartz';

    const fromPlayground = getDevPlayground(from);

    await fromPlayground(async (helper) => {
      const getRandomAccountBalance = async (): Promise<bigint> => {
        if(!isFromUnique) {
          return 0n;
        }

        return await getAssetBalanceOnUnique(helper as DevUniqueHelper);
      };

      const balanceBefore = await getRandomAccountBalance();

      let beneficiaryAccount: any;
      if(this._isAddress20FormatFor(to)) {
        beneficiaryAccount = {
          AccountKey20: {
            key: toAccount.address,
          },
        };
      } else {
        beneficiaryAccount = {
          AccountId32: {
            id: toAccount.addressRaw,
          },
        };
      }

      const assets = {
        V4: [
          {
            id: assetId,
            fun: {
              Fungible: amount,
            },
          },
        ],
      };
      const feeAssetItem = 0;

      let transferResult: any;

      if(
        from === 'acala' || from === 'karura'
        || from === 'astar' || from === 'shiden'
      ) {
        // `polkadotXcm.transferAssets` is filtered on Acala chains.
        // Astar chains have prohibitive weights for it.
        // using xTokens instead

        const acalaHelper = helper as AcalaHelper | AstarHelper;

        const destination = {
          V4: {
            parents: 1,
            interior: {
              X2: [
                {
                  Parachain: mapToChainId(to),
                },
                beneficiaryAccount,
              ],
            },
          },
        };

        transferResult = await acalaHelper.xTokens.transferMultiassets(
          fromAccount,
          assets,
          feeAssetItem,
          destination,
          'Unlimited',
        );
      } else {
        const destination = from === 'relay'
          ? {V4: {parents: 0, interior: {X1: [{Parachain: mapToChainId(to)}]}}}
          : {V4: mapToChainLocation(to)};

        const beneficiary = {
          V4: {
            parents: 0,
            interior: {
              X1: [beneficiaryAccount],
            },
          },
        };

        transferResult = await helper.xcm.transferAssets(
          fromAccount,
          destination,
          beneficiary,
          assets,
          feeAssetItem,
          'Unlimited',
        );
      }

      const messageSent = await this.#expectSentEvent(helper, from, to, transferResult);

      const balanceAfter = await getRandomAccountBalance();
      if(isFromUnique) {
        const balanceDiff = balanceBefore - balanceAfter;
        const fees = balanceDiff - amount;
        const minFees = 0n;
        const maxFees = 2n * 10n ** BigInt(decimals);

        console.log('[%s -> %s] transaction fees: %s asset tokens', from, to, helper.util.bigIntToDecimals(fees, decimals));

        expect(
          minFees <= fees && fees <= maxFees,
          `invalid asset fees when transferring from ${from}: ${fees}`,
        ).to.be.true;
      }

      setMessageHash(messageSent.messageHash);
    });
  }

  async #awaitTokens({
    from,
    to,
    amount,
    decimals,
    getAssetBalanceOnUnique,
    getMessageHash,
  }: {
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    amount: bigint,
    decimals: number,
    getAssetBalanceOnUnique: (helper: DevUniqueHelper) => Promise<bigint>,
    getMessageHash: () => any,
  }) {
    const toPlayground = getDevPlayground(to);
    const isToUnique = to === 'unique' || to === 'quartz';

    await toPlayground(async (helper) => {
      const getRandomAccountBalance = async (): Promise<bigint> => {
        if(!isToUnique) {
          return 0n;
        }

        return await getAssetBalanceOnUnique(helper as DevUniqueHelper);
      };

      const balanceBefore = await getRandomAccountBalance();

      const collectedEventData = await this.#collectProcessedMsgsEvents(
        helper,
        () => getMessageHash() === null,
      );

      const validEventIndex = collectedEventData.findIndex(data => {
        const processedMessageHash = data[0];
        return processedMessageHash === getMessageHash();
      });

      expect(
        validEventIndex >= 0,
        `no 'MessageQueue.Processed' event was found on ${to}`,
      ).to.be.true;

      const balanceAfter = await getRandomAccountBalance();

      if(isToUnique) {
        const balanceDiff = balanceAfter - balanceBefore;
        const fees = balanceDiff - amount;

        console.log('[%s -> %s] transaction fees: %s asset tokens', from, to, helper.util.bigIntToDecimals(fees, decimals));

        expect(
          fees === 0n,
          `invalid asset fees when receiving to ${to}: ${fees}`,
        ).to.be.true;
      }
    });
  }

  async sendDotFromTo(
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    randomAccountOnFrom: IKeyringPair,
    randomAccountOnTo: IKeyringPair,
    amount: bigint,
    dotDerivativeCollectionId: number,
  ) {
    let messageHash: any = null;

    const isFromUnique = from === 'unique' || from === 'quartz';

    let assetId: any;
    if(isFromUnique) {
      assetId = {
        parents: 1,
        interior: 'here',
      };
    } else {
      assetId = {
        parents: 0,
        interior: 'here',
      };
    }

    await Promise.all([
      this.#sendTokens({
        from,
        to,
        fromAccount: randomAccountOnFrom,
        toAccount: randomAccountOnTo,
        assetId,
        amount,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.ft.getBalance(
          dotDerivativeCollectionId,
          {Substrate: randomAccountOnFrom.address},
        ),
        setMessageHash: (hash) => messageHash = hash,
      }),
      this.#awaitTokens({
        from,
        to,
        amount,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.ft.getBalance(
          dotDerivativeCollectionId,
          {Substrate: randomAccountOnTo.address},
        ),
        getMessageHash: () => messageHash,
      }),
    ]);
  }

  async sendUsdtFromTo(
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    randomAccountOnFrom: IKeyringPair,
    randomAccountOnTo: IKeyringPair,
    amount: bigint,
    usdtDerivativeCollectionId: number,
  ) {
    let messageHash: any = null;
    const assetId = mapToUsdtLocation(from);

    await Promise.all([
      this.#sendTokens({
        from,
        to,
        fromAccount: randomAccountOnFrom,
        toAccount: randomAccountOnTo,
        assetId,
        amount,
        decimals: USDT_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.ft.getBalance(
          usdtDerivativeCollectionId,
          {Substrate: randomAccountOnFrom.address},
        ),
        setMessageHash: (hash) => messageHash = hash,
      }),
      this.#awaitTokens({
        from,
        to,
        amount,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.ft.getBalance(
          usdtDerivativeCollectionId,
          {Substrate: randomAccountOnTo.address},
        ),
        getMessageHash: () => messageHash,
      }),
    ]);
  }

  async sendUnqFromTo(
    from: keyof typeof NETWORKS,
    to: keyof typeof NETWORKS,
    randomAccountOnFrom: IKeyringPair,
    randomAccountOnTo: IKeyringPair,
    amount: bigint,
  ) {
    let messageHash: any = null;

    const isFromUnique = from === 'unique' || from === 'quartz';

    let assetId: any;
    if(isFromUnique) {
      assetId = {
        parents: 0,
        interior: 'here',
      };
    } else {
      assetId = mapToChainLocation(to);
    }

    await Promise.all([
      this.#sendTokens({
        from,
        to,
        fromAccount: randomAccountOnFrom,
        toAccount: randomAccountOnTo,
        assetId,
        amount,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.balance.getSubstrate(randomAccountOnFrom.address),
        setMessageHash: (hash) => messageHash = hash,
      }),
      this.#awaitTokens({
        from,
        to,
        amount,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper: DevUniqueHelper) => await helper.balance.getSubstrate(randomAccountOnTo.address),
        getMessageHash: () => messageHash,
      }),
    ]);
  }

  async sendOnlyOwnedBalance(
    sudoer: IKeyringPair,
    otherChain: keyof typeof NETWORKS,
    uniqueChain: UniqueChain,
  ) {
    const otherChainBalance = 10000n * 10n ** BigInt(UNQ_DECIMALS);

    let randomAccount: IKeyringPair;
    let maliciousXcmProgram: any;
    let messageHash: any = null;

    await usingPlaygrounds(async (helper) => {
      const otherChainSovereignAccount = helper.address.paraSiblingSovereignAccount(mapToChainId(otherChain));
      await helper.getSudo().balance.setBalanceSubstrate(sudoer, otherChainSovereignAccount, otherChainBalance);

      randomAccount = helper.arrange.createEmptyAccount();
    });

    const sendMaliciousProgram = async () => {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async (helper) => {
        const moreThanOtherChainHas = 2n * otherChainBalance;

        maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
          randomAccount.addressRaw,
          {
            parents: 0,
            interior: 'Here',
          },
          moreThanOtherChainHas,
        );
      });

      messageHash = await this.#sendXcmProgram(
        sudoer,
        otherChain,
        uniqueChain,
        maliciousXcmProgram,
      );
    };

    await Promise.all([
      sendMaliciousProgram(),
      this.#awaitMaliciousProgramRejection(() => messageHash),
    ]);

    await usingPlaygrounds(async (helper) => {
      const randomAccountBalance = await helper.balance.getSubstrate(randomAccount.address);
      expect(randomAccountBalance).to.be.equal(0n);
    });

    messageHash = null;
    const sendGoodProgram = async () => {
      // eslint-disable-next-line require-await
      await usingPlaygrounds(async (helper) => {

        maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
          randomAccount.addressRaw,
          {
            parents: 0,
            interior: 'Here',
          },
          otherChainBalance,
        );
      });

      messageHash = await this.#sendXcmProgram(
        sudoer,
        otherChain,
        uniqueChain,
        maliciousXcmProgram,
      );
    };

    await Promise.all([
      sendGoodProgram(),
      this.#awaitTokens({
        from: otherChain,
        to: uniqueChain,
        amount: otherChainBalance,
        decimals: UNQ_DECIMALS,
        getAssetBalanceOnUnique: async (helper) => await helper.balance.getSubstrate(randomAccount!.address),
        getMessageHash: () => messageHash,
      }),
    ]);

    await usingPlaygrounds(async (helper) => {
      const randomAccountBalance = await helper.balance.getSubstrate(randomAccount.address);
      expect(randomAccountBalance).to.be.equal(otherChainBalance);
    });
  }

  async rejectReserveTransferUNQfrom(
    sudoer: IKeyringPair,
    otherChain: keyof typeof NETWORKS,
    uniqueChain: UniqueChain,
  ) {
    const testAmount = 10_000n * 10n ** BigInt(UNQ_DECIMALS);

    let randomAccount: IKeyringPair;
    let messageHash: any = null;

    const sendMaliciousXcmProgramFullId = async () => {
      await usingPlaygrounds(async (helper) => {
        randomAccount = helper.arrange.createEmptyAccount();

        const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
          randomAccount.addressRaw,
          mapToChainLocation(uniqueChain),
          testAmount,
        );

        // Try to trick Unique using full UNQ identification
        messageHash = await this.#sendXcmProgram(
          sudoer,
          otherChain,
          uniqueChain,
          maliciousXcmProgramFullId,
        );
      });
    };

    await Promise.all([
      sendMaliciousXcmProgramFullId(),
      this.#awaitMaliciousProgramRejection(() => messageHash),
    ]);

    messageHash = null;
    const sendMaliciousXcmProgramHereId = async () => {
      await usingPlaygrounds(async (helper) => {
        const maliciousXcmProgramHereId = helper.arrange.makeXcmProgramReserveAssetDeposited(
          randomAccount.addressRaw,
          {
            parents: 0,
            interior: 'Here',
          },
          testAmount,
        );

        // Try to trick Unique using shortened UNQ identification
        messageHash = await this.#sendXcmProgram(
          sudoer,
          otherChain,
          uniqueChain,
          maliciousXcmProgramHereId,
        );
      });
    };

    await Promise.all([
      sendMaliciousXcmProgramHereId(),
      this.#awaitMaliciousProgramRejection(() => messageHash),
    ]);

    await usingPlaygrounds(async (helper) => {
      const randomAccountBalance = await helper.balance.getSubstrate(randomAccount.address);
      expect(randomAccountBalance).to.be.equal(0n);
    });
  }

  async rejectNativeTokensFrom(
    sudoer: IKeyringPair,
    otherChain: keyof typeof NETWORKS,
    uniqueChain: UniqueChain,
  ) {
    let messageHash: any = null;

    const sendMaliciousProgram = async () => {
      await usingPlaygrounds(async (helper) => {
        const maliciousXcmProgram = helper.arrange.makeXcmProgramReserveAssetDeposited(
          helper.arrange.createEmptyAccount().addressRaw,
          mapToChainLocation(otherChain),
          OTHER_CHAIN_TOKEN_TRANSFER_AMOUNT,
        );

        messageHash = await this.#sendXcmProgram(
          sudoer,
          otherChain,
          uniqueChain,
          maliciousXcmProgram,
        );
      });
    };

    await Promise.all([
      sendMaliciousProgram(),
      this.#awaitMaliciousProgramRejection(() => messageHash),
    ]);
  }
}
