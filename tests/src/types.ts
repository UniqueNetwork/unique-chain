import BN from 'bn.js';

export interface ICollectionInterface {
  Access: string;
  id: number;
  DecimalPoints: BN;
  // constOnChainSchema
  Description: [BN, BN]; // utf16
  isReFungible: boolean;
  Limits: {
    AccountTokenOwnershipLimit: BN;
    SponsoredMintSize: BN;
    TokenLimit: BN;
    SponsorTimeout: BN;
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
