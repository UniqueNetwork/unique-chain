export interface AcalaAssetMetadata {
  name: string,
  symbol: string,
  decimals: number,
  minimalBalance: bigint,
}

export interface MoonbeamAssetInfo {
  location: any,
  metadata: {
    name: string,
    symbol: string,
    decimals: number,
    isFrozen: boolean,
    minimalBalance: bigint,
  },
  existentialDeposit: bigint,
  isSufficient: boolean,
  unitsPerSecond: bigint,
  numAssetsWeightHint: number,
}

export interface DemocracyStandardAccountVote {
  balance: bigint,
  vote: {
    aye: boolean,
    conviction: number,
  },
}

export interface IForeignAssetMetadata {
  name?: number | Uint8Array,
  symbol?: string,
  decimals?: number,
  minimalBalance?: bigint,
}