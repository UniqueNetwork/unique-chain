import {usingAcalaPlaygrounds, usingAstarPlaygrounds, usingMoonbeamPlaygrounds, usingPolkadexPlaygrounds} from '../util';
import {DevUniqueHelper, Event} from '../util/playgrounds/unique.dev';
import config from '../config';

export const UNIQUE_CHAIN = +(process.env.RELAY_UNIQUE_ID || 2037);
export const STATEMINT_CHAIN = +(process.env.RELAY_STATEMINT_ID || 1000);
export const ACALA_CHAIN = +(process.env.RELAY_ACALA_ID || 2000);
export const MOONBEAM_CHAIN = +(process.env.RELAY_MOONBEAM_ID || 2004);
export const ASTAR_CHAIN = +(process.env.RELAY_ASTAR_ID || 2006);
export const POLKADEX_CHAIN = +(process.env.RELAY_POLKADEX_ID || 2040);

export const acalaUrl = config.acalaUrl;
export const moonbeamUrl = config.moonbeamUrl;
export const astarUrl = config.astarUrl;
export const polkadexUrl = config.polkadexUrl;

export const SAFE_XCM_VERSION = 3;

export const maxWaitBlocks = 6;


export const ASTAR_DECIMALS = 18n;
export const UNQ_DECIMALS = 18n;

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

export const NETWORKS = {
  acala: usingAcalaPlaygrounds,
  astar: usingAstarPlaygrounds,
  polkadex: usingPolkadexPlaygrounds,
  moonbeam: usingMoonbeamPlaygrounds,
} as const;

export function mapToChainId(networkName: keyof typeof NETWORKS) {
  switch (networkName) {
    case 'acala':
      return ACALA_CHAIN;
    case 'astar':
      return ASTAR_CHAIN;
    case 'moonbeam':
      return MOONBEAM_CHAIN;
    case 'polkadex':
      return POLKADEX_CHAIN;
  }
}

export function mapToChainUrl(networkName: keyof typeof NETWORKS): string {
  switch (networkName) {
    case 'acala':
      return acalaUrl;
    case 'astar':
      return astarUrl;
    case 'moonbeam':
      return moonbeamUrl;
    case 'polkadex':
      return polkadexUrl;
  }
}

export function getDevPlayground<T extends keyof typeof NETWORKS>(name: T) {
  return NETWORKS[name];
}