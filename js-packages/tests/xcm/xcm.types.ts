import type {IKeyringPair} from '@polkadot/types/types';
import {hexToString} from '@polkadot/util';
import {expect, usingAcalaPlaygrounds, usingAstarPlaygrounds, usingHydraDxPlaygrounds, usingKaruraPlaygrounds, usingMoonbeamPlaygrounds, usingMoonriverPlaygrounds, usingPlaygrounds, usingPolkadexPlaygrounds, usingRelayPlaygrounds, usingShidenPlaygrounds} from '../util/index.js';
import {DevUniqueHelper, Event} from '@unique/playgrounds/unique.dev.js';
import config from '../config.js';

export const UNIQUE_CHAIN = +(process.env.RELAY_UNIQUE_ID || 2037);
export const STATEMINT_CHAIN = +(process.env.RELAY_STATEMINT_ID || 1000);
export const ACALA_CHAIN = +(process.env.RELAY_ACALA_ID || 2000);
export const MOONBEAM_CHAIN = +(process.env.RELAY_MOONBEAM_ID || 2004);
export const ASTAR_CHAIN = +(process.env.RELAY_ASTAR_ID || 2006);
export const POLKADEX_CHAIN = +(process.env.RELAY_POLKADEX_ID || 2040);
export const HYDRADX_CHAIN = +(process.env.RELAY_HYDRADX_ID || 2034);

export const QUARTZ_CHAIN = +(process.env.RELAY_QUARTZ_ID || 2095);
export const STATEMINE_CHAIN = +(process.env.RELAY_STATEMINE_ID || 1000);
export const KARURA_CHAIN = +(process.env.RELAY_KARURA_ID || 2000);
export const MOONRIVER_CHAIN = +(process.env.RELAY_MOONRIVER_ID || 2023);
export const SHIDEN_CHAIN = +(process.env.RELAY_SHIDEN_ID || 2007);

export const relayUrl = config.relayUrl;
export const statemintUrl = config.statemintUrl;
export const statemineUrl = config.statemineUrl;

export const acalaUrl = config.acalaUrl;
export const moonbeamUrl = config.moonbeamUrl;
export const astarUrl = config.astarUrl;
export const polkadexUrl = config.polkadexUrl;
export const hydraDxUrl = config.hydraDxUrl;

export const karuraUrl = config.karuraUrl;
export const moonriverUrl = config.moonriverUrl;
export const shidenUrl = config.shidenUrl;

export const SAFE_XCM_VERSION = 3;


export const RELAY_DECIMALS = 12;
export const STATEMINE_DECIMALS = 12;
export const KARURA_DECIMALS = 12;
export const SHIDEN_DECIMALS = 18n;
export const QTZ_DECIMALS = 18n;

export const ASTAR_DECIMALS = 18n;
export const UNQ_DECIMALS = 18n;

export const maxWaitBlocks = 6;

export const uniqueMultilocation = {
  parents: 1,
  interior: {
    X1: {
      Parachain: UNIQUE_CHAIN,
    },
  },
};
export const uniqueVersionedMultilocation = {
  V3: uniqueMultilocation,
};

export const uniqueAssetId = {
  Concrete: uniqueMultilocation,
};

export const expectFailedToTransact = async (helper: DevUniqueHelper, messageSent: any) => {
  await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash
        && event.outcome.isFailedToTransactAsset);
};
export const expectUntrustedReserveLocationFail = async (helper: DevUniqueHelper, messageSent: any) => {
  await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash
         && event.outcome.isUntrustedReserveLocation);
};

export const expectDownwardXcmNoPermission = async (helper: DevUniqueHelper) => {
  // The correct messageHash for downward messages can't be reliably obtained
  await helper.wait.expectEvent(maxWaitBlocks, Event.DmpQueue.ExecutedDownward, event => event.outcome.asIncomplete[1].isNoPermission);
};

export const expectDownwardXcmComplete = async (helper: DevUniqueHelper) => {
  // The correct messageHash for downward messages can't be reliably obtained
  await helper.wait.expectEvent(maxWaitBlocks, Event.DmpQueue.ExecutedDownward, event => event.outcome.isComplete);
};

export const NETWORKS = {
  acala: usingAcalaPlaygrounds,
  astar: usingAstarPlaygrounds,
  polkadex: usingPolkadexPlaygrounds,
  moonbeam: usingMoonbeamPlaygrounds,
  moonriver: usingMoonriverPlaygrounds,
  karura: usingKaruraPlaygrounds,
  shiden: usingShidenPlaygrounds,
  hydraDx: usingHydraDxPlaygrounds,
} as const;
type NetworkNames = keyof typeof NETWORKS;

type NativeRuntime = 'opal' | 'quartz' | 'unique';

export function mapToChainId(networkName: keyof typeof NETWORKS): number {
  switch (networkName) {
    case 'acala':
      return ACALA_CHAIN;
    case 'astar':
      return ASTAR_CHAIN;
    case 'moonbeam':
      return MOONBEAM_CHAIN;
    case 'polkadex':
      return POLKADEX_CHAIN;
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

export function mapToChainUrl(networkName: NetworkNames): string {
  switch (networkName) {
    case 'acala':
      return acalaUrl;
    case 'astar':
      return astarUrl;
    case 'moonbeam':
      return moonbeamUrl;
    case 'polkadex':
      return polkadexUrl;
    case 'moonriver':
      return moonriverUrl;
    case 'karura':
      return karuraUrl;
    case 'shiden':
      return shidenUrl;
    case 'hydraDx':
      return hydraDxUrl;
  }
}

export function getDevPlayground(name: NetworkNames) {
  return NETWORKS[name];
}

export const TRANSFER_AMOUNT = 2000000_000_000_000_000_000_000n;
export const SENDER_BUDGET = 2n * TRANSFER_AMOUNT;
export const SENDBACK_AMOUNT = TRANSFER_AMOUNT / 2n;
export const STAYED_ON_TARGET_CHAIN = TRANSFER_AMOUNT - SENDBACK_AMOUNT;
export const TARGET_CHAIN_TOKEN_TRANSFER_AMOUNT = 100_000_000_000n;

export class XcmTestHelper {
  private _balanceUniqueTokenInit: bigint = 0n;
  private _balanceUniqueTokenMiddle: bigint = 0n;
  private _balanceUniqueTokenFinal: bigint = 0n;
  private _unqFees: bigint = 0n;
  private _nativeRuntime: NativeRuntime;

  constructor(runtime: NativeRuntime) {
    this._nativeRuntime = runtime;
  }

  private _getNativeId() {
    switch (this._nativeRuntime) {
      case 'opal':
        // To-Do
        return 1001;
      case 'quartz':
        return QUARTZ_CHAIN;
      case 'unique':
        return UNIQUE_CHAIN;
    }
  }

  private _isAddress20FormatFor(network: NetworkNames) {
    switch (network) {
      case 'moonbeam':
      case 'moonriver':
        return true;
      default:
        return false;
    }
  }

  private _runtimeVersionedMultilocation() {
    return {
      V3: {
        parents: 1,
        interior: {
          X1: {
            Parachain: this._getNativeId(),
          },
        },
      },
    };
  }

  private _uniqueChainMultilocationForRelay() {
    return {
      V3: {
        parents: 0,
        interior: {
          X1: {Parachain: this._getNativeId()},
        },
      },
    };
  }

  async sendUnqTo(
    networkName: keyof typeof NETWORKS,
    randomAccount: IKeyringPair,
    randomAccountOnTargetChain = randomAccount,
  ) {
    const networkUrl = mapToChainUrl(networkName);
    const targetPlayground = getDevPlayground(networkName);
    await usingPlaygrounds(async (helper) => {
      this._balanceUniqueTokenInit = await helper.balance.getSubstrate(randomAccount.address);
      const destination = {
        V2: {
          parents: 1,
          interior: {
            X1: {
              Parachain: mapToChainId(networkName),
            },
          },
        },
      };

      const beneficiary = {
        V2: {
          parents: 0,
          interior: {
            X1: (
              this._isAddress20FormatFor(networkName) ?
                {
                  AccountKey20: {
                    network: 'Any',
                    key: randomAccountOnTargetChain.address,
                  },
                }
                :
                {
                  AccountId32: {
                    network: 'Any',
                    id: randomAccountOnTargetChain.addressRaw,
                  },
                }
            ),
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
      this._balanceUniqueTokenMiddle = await helper.balance.getSubstrate(randomAccount.address);

      this._unqFees = this._balanceUniqueTokenInit - this._balanceUniqueTokenMiddle - TRANSFER_AMOUNT;
      console.log('[%s -> %s] transaction fees: %s', this._nativeRuntime, networkName, helper.util.bigIntToDecimals(this._unqFees));
      expect(this._unqFees > 0n, 'Negative fees, looks like nothing was transferred').to.be.true;

      await targetPlayground(networkUrl, async (helper) => {
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
        if(networkName == 'polkadex' || networkName =='hydraDx') {
          await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Fail, event => event.messageHash == messageSent.messageHash);
        } else {
          await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Success, event => event.messageHash == messageSent.messageHash);
        }
      });

    });
  }

  async sendUnqBack(
    networkName: keyof typeof NETWORKS,
    sudoer: IKeyringPair,
    randomAccountOnUnq: IKeyringPair,
  ) {
    const networkUrl = mapToChainUrl(networkName);

    const targetPlayground = getDevPlayground(networkName);
    await usingPlaygrounds(async (helper) => {

      const xcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
        randomAccountOnUnq.addressRaw,
        {
          Concrete: {
            parents: 1,
            interior: {
              X1: {Parachain: this._getNativeId()},
            },
          },
        },
        SENDBACK_AMOUNT,
      );

      let xcmProgramSent: any;


      await targetPlayground(networkUrl, async (helper) => {
        if('getSudo' in helper) {
          await helper.getSudo().xcm.send(sudoer, this._runtimeVersionedMultilocation(), xcmProgram);
          xcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        } else if('fastDemocracy' in helper) {
          const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [this._runtimeVersionedMultilocation(), xcmProgram]);
          // Needed to bypass the call filter.
          const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
          await helper.fastDemocracy.executeProposal(`sending ${networkName} -> Unique via XCM program`, batchCall);
          xcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
      });

      await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.Success, event => event.messageHash == xcmProgramSent.messageHash);

      this._balanceUniqueTokenFinal = await helper.balance.getSubstrate(randomAccountOnUnq.address);

      expect(this._balanceUniqueTokenFinal).to.be.equal(this._balanceUniqueTokenInit - this._unqFees - STAYED_ON_TARGET_CHAIN);

    });
  }

  async sendOnlyOwnedBalance(
    networkName: keyof typeof NETWORKS,
    sudoer: IKeyringPair,
  ) {
    const networkUrl = mapToChainUrl(networkName);
    const targetPlayground = getDevPlayground(networkName);

    const targetChainBalance = 10000n * (10n ** UNQ_DECIMALS);

    await usingPlaygrounds(async (helper) => {
      const targetChainSovereignAccount = helper.address.paraSiblingSovereignAccount(mapToChainId(networkName));
      await helper.getSudo().balance.setBalanceSubstrate(sudoer, targetChainSovereignAccount, targetChainBalance);
      const moreThanTargetChainHas = 2n * targetChainBalance;

      const targetAccount = helper.arrange.createEmptyAccount();

      const maliciousXcmProgram = helper.arrange.makeXcmProgramWithdrawDeposit(
        targetAccount.addressRaw,
        {
          Concrete: {
            parents: 0,
            interior: 'Here',
          },
        },
        moreThanTargetChainHas,
      );

      let maliciousXcmProgramSent: any;


      await targetPlayground(networkUrl, async (helper) => {
        if('getSudo' in helper) {
          await helper.getSudo().xcm.send(sudoer, this._runtimeVersionedMultilocation(), maliciousXcmProgram);
          maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        } else if('fastDemocracy' in helper) {
          const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [this._runtimeVersionedMultilocation(), maliciousXcmProgram]);
          // Needed to bypass the call filter.
          const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
          await helper.fastDemocracy.executeProposal(`sending ${networkName} -> Unique via XCM program`, batchCall);
          maliciousXcmProgramSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
      });

      await expectFailedToTransact(helper, maliciousXcmProgramSent);

      const targetAccountBalance = await helper.balance.getSubstrate(targetAccount.address);
      expect(targetAccountBalance).to.be.equal(0n);
    });
  }

  async rejectReserveTransferUNQfrom(networkName: keyof typeof NETWORKS, sudoer: IKeyringPair) {
    const networkUrl = mapToChainUrl(networkName);
    const targetPlayground = getDevPlayground(networkName);

    await usingPlaygrounds(async (helper) => {
      const testAmount = 10_000n * (10n ** UNQ_DECIMALS);
      const targetAccount = helper.arrange.createEmptyAccount();

      const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
        targetAccount.addressRaw,
        {
          Concrete: {
            parents: 1,
            interior: {
              X1: {
                Parachain: this._getNativeId(),
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
      await targetPlayground(networkUrl, async (helper) => {
        if('getSudo' in helper) {
          await helper.getSudo().xcm.send(sudoer, this._runtimeVersionedMultilocation(), maliciousXcmProgramFullId);
          maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
        // Moonbeam case
        else if('fastDemocracy' in helper) {
          const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [this._runtimeVersionedMultilocation(), maliciousXcmProgramFullId]);
          // Needed to bypass the call filter.
          const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
          await helper.fastDemocracy.executeProposal(`${networkName} try to act like a reserve location for UNQ using path asset identification`,batchCall);

          maliciousXcmProgramFullIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
      });


      await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramFullIdSent);

      let accountBalance = await helper.balance.getSubstrate(targetAccount.address);
      expect(accountBalance).to.be.equal(0n);

      // Try to trick Unique using shortened UNQ identification
      await targetPlayground(networkUrl, async (helper) => {
        if('getSudo' in helper) {
          await helper.getSudo().xcm.send(sudoer, this._runtimeVersionedMultilocation(), maliciousXcmProgramHereId);
          maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
        else if('fastDemocracy' in helper) {
          const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [this._runtimeVersionedMultilocation(), maliciousXcmProgramHereId]);
          // Needed to bypass the call filter.
          const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
          await helper.fastDemocracy.executeProposal(`${networkName} try to act like a reserve location for UNQ using "here" asset identification`, batchCall);

          maliciousXcmProgramHereIdSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
      });

      await expectUntrustedReserveLocationFail(helper, maliciousXcmProgramHereIdSent);

      accountBalance = await helper.balance.getSubstrate(targetAccount.address);
      expect(accountBalance).to.be.equal(0n);
    });
  }

  async rejectNativeTokensFrom(networkName: keyof typeof NETWORKS, sudoerOnTargetChain: IKeyringPair) {
    const networkUrl = mapToChainUrl(networkName);
    const targetPlayground = getDevPlayground(networkName);
    let messageSent: any;

    await usingPlaygrounds(async (helper) => {
      const maliciousXcmProgramFullId = helper.arrange.makeXcmProgramReserveAssetDeposited(
        helper.arrange.createEmptyAccount().addressRaw,
        {
          Concrete: {
            parents: 1,
            interior: {
              X1: {
                Parachain: mapToChainId(networkName),
              },
            },
          },
        },
        TARGET_CHAIN_TOKEN_TRANSFER_AMOUNT,
      );
      await targetPlayground(networkUrl, async (helper) => {
        if('getSudo' in helper) {
          await helper.getSudo().xcm.send(sudoerOnTargetChain, this._runtimeVersionedMultilocation(), maliciousXcmProgramFullId);
          messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        } else if('fastDemocracy' in helper) {
          const xcmSend = helper.constructApiCall('api.tx.polkadotXcm.send', [this._runtimeVersionedMultilocation(), maliciousXcmProgramFullId]);
          // Needed to bypass the call filter.
          const batchCall = helper.encodeApiCall('api.tx.utility.batch', [[xcmSend]]);
          await helper.fastDemocracy.executeProposal(`${networkName} sending native tokens to the Unique via fast democracy`, batchCall);

          messageSent = await helper.wait.expectEvent(maxWaitBlocks, Event.XcmpQueue.XcmpMessageSent);
        }
      });
      await expectFailedToTransact(helper, messageSent);
    });
  }

  async registerRelayNativeTokenOnUnique(alice: IKeyringPair) {
    return await usingPlaygrounds(async (helper) => {
      const relayLocation = {
        parents: 1,
        interior: 'Here',
      };
      const relayAssetId = {Concrete: relayLocation};

      const relayCollectionId = await helper.foreignAssets.foreignCollectionId(relayAssetId);
      if(relayCollectionId == null) {
        const name = 'Relay Tokens';
        const tokenPrefix = 'xDOT';
        const decimals = 10;
        await helper.getSudo().foreignAssets.register(alice, relayAssetId, name, tokenPrefix, {Fungible: decimals});

        return await helper.foreignAssets.foreignCollectionId(relayAssetId);
      } else {
        console.log('Relay foreign collection is already registered');
        return relayCollectionId;
      }
    });
  }
}
