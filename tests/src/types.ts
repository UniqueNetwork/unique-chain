//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import BN from 'bn.js';

export interface ICollectionInterface {
  access: string;
  id: number;
  decimalPoints: BN;
  // constOnChainSchema
  description: [BN, BN]; // utf16
  isReFungible: boolean;
  limits: {
    accountTokenOwnershipLimit: number;
    sponsoredDataSize: number;
    sponsoredDataRateLimit?: number,
    tokenLimit: number;
    sponsorTimeout: number;
    ownerCanTransfer: boolean;
    ownerCanDestroy: boolean;
  };
  mintMode: boolean;
  mode: {
    nft: null;
  };
  name: [BN, BN]; // utf16
  offchainSchema: [Uint8Array];
  owner: [Uint8Array];
  schemaVersion: string;
  // prefix
  // sponsor
  // tokenPrefix
  // unconfirmedSponsor
  // variableOnChainSchema
}
