//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import BN from 'bn.js';

export interface ICollectionInterface {
  Access: string;
  id: number;
  DecimalPoints: BN;
  // constOnChainSchema
  Description: [BN, BN]; // utf16
  isReFungible: boolean;
  Limits: {
    AccountTokenOwnershipLimit: number;
    SponsoredDataSize: number;
    SponsoredDataRateLimit?: number,
    TokenLimit: number;
    SponsorTimeout: number;
    OwnerCanTransfer: boolean;
    OwnerCanDestroy: boolean;
  };
  MintMode: boolean;
  Mode: {
    Nft: null;
  };
  Name: [BN, BN]; // utf16
  OffchainSchema: [Uint8Array];
  Owner: [Uint8Array];
  SchemaVersion: string;
  // prefix
  // sponsor
  // tokenPrefix
  // unconfirmedSponsor
  // variableOnChainSchema
}
