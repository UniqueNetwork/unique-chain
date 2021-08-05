//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from '@polkadot/types/types';
import { ApiPromise, Keyring } from '@polkadot/api';
import privateKey from './substrate/privateKey';
import usingApi from './substrate/substrate-api';
import {
  createCollectionExpectSuccess,
  addCollectionAdminExpectSuccess,
  setChainLimitsExpectFailure,
  setChainLimitsExpectSuccess,
  IChainLimits,
} from './util/helpers';

describe.only('Collection Limits vs Chain Limits', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;
  let Dave: IKeyringPair;
  let ChainLimits: IChainLimits;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
      Dave = privateKey('//Dave');
      ChainLimits = {
        CollectionNumbersLimit : 1,
        AccountTokenOwnershipLimit: 1,
        CollectionsAdminsLimit: 1,
        CustomDataLimit: 1,
        NftSponsorTransferTimeout: 1,
        FungibleSponsorTransferTimeout: 1,
        RefungibleSponsorTransferTimeout: 1,
        OffchainSchemaLimit: 1,
        VariableOnChainSchemaLimit: 1,
        ConstOnChainSchemaLimit: 1,
      };
    });
  });

  it(' Collection limits allow greater number than chain limits, chain limits are enforced', async () => {
    let collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });

    await setChainLimitsExpectSuccess(Alice, ChainLimits);
    // await usingApi(async (api: ApiPromise) => {

    //   const collectionLimits = {
    //     AccountTokenOwnershipLimit: 2,
    //     SponsoredMintSize: 2,
    //     TokenLimit: 2,
    //     SponsorTimeout: 0,
    //     OwnerCanTransfer: true,
    //     OwnerCanDestroy: true,
    //   };
  
    //   // The first time
    //   const tx1 = api.tx.nft.setCollectionLimits(
    //       collectionId,
    //       collectionLimits,
    //     );
    //   });
  });

  // it('Collection admin cannot set chain limits'setChainLimitsExpectSuccess, async () => {
  //   const collectionId = await createCollectionExpectSuccess({ mode: { type: 'NFT' } });
  //   await addCollectionAdminExpectSuccess(alice, collectionId, bob);
  //   await setChainLimitsExpectFailure(bob, limits);
  // });
  
  // it('Regular user cannot set chain limits', async () => {
  //   await setChainLimitsExpectFailure(dave, limits);
  // });
});
