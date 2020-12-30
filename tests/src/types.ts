import BN from 'bn.js';

export interface ICollectionInterface {
  Access: string;
  id: number;
  DecimalPoints: BN;
  // constOnChainSchema
  Description: [BN, BN]; // utf16
  isReFungible: boolean;
  MintMode: boolean;
  Mode: {
    Nft: null;
  };
  Name: [BN, BN]; // utf16
  OffchainSchema: [Uint8Array];
  SchemaVersion: string;
  Owner: [Uint8Array];
  // prefix
  // sponsor
  // tokenPrefix
  // unconfirmedSponsor
  // variableOnChainSchema
}
