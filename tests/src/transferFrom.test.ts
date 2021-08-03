//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import { IKeyringPair } from '@polkadot/types/types';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createFungibleItemExpectSuccess,
  createItemExpectSuccess,
  getAllowance,
  transferFromExpectFail,
  transferFromExpectSuccess,
  burnItemExpectSuccess,
  setCollectionLimitsExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('Execute the extrinsic and check nftItemList - owner of token', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);

      await transferFromExpectSuccess(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1, 'NFT');

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await transferFromExpectSuccess(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1, 'Fungible');

      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob, 100);
      await transferFromExpectSuccess(
        reFungibleCollectionId,
        newReFungibleTokenId,
        Bob,
        Alice,
        Charlie,
        100,
        'ReFungible',
      );
    });
  });

  it('Should reduce allowance if value is big', async () => {
    await usingApi(async () => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const charlie = privateKey('//Charlie');

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: 500000n });

      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, alice, bob, 500000n);
      await transferFromExpectSuccess(fungibleCollectionId, newFungibleTokenId, bob, alice, charlie, 500000n, 'Fungible');
      expect((await getAllowance(fungibleCollectionId, newFungibleTokenId, alice.address, bob.address)).toString()).to.equal('0');
    });
  });

  it('can be called by collection owner on non-owned item when OwnerCanTransfer == true', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);

    await transferFromExpectSuccess(collectionId, itemId, Alice, Bob, Charlie);
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  let Alice: IKeyringPair;
  let Bob: IKeyringPair;
  let Charlie: IKeyringPair;

  before(async () => {
    await usingApi(async () => {
      Alice = privateKey('//Alice');
      Bob = privateKey('//Bob');
      Charlie = privateKey('//Charlie');
    });
  });

  it('transferFrom for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      // nft
      const nftCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(nftCollectionCount + 1, 1, Alice, Bob);

      await transferFromExpectFail(nftCollectionCount + 1, 1, Bob, Alice, Charlie, 1);

      // fungible
      const fungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(fungibleCollectionCount + 1, 1, Alice, Bob);

      await transferFromExpectFail(fungibleCollectionCount + 1, 1, Bob, Alice, Charlie, 1);
      // reFungible
      const reFungibleCollectionCount = await api.query.nft.createdCollectionCount() as unknown as number;
      await approveExpectFail(reFungibleCollectionCount + 1, 1, Alice, Bob);

      await transferFromExpectFail(reFungibleCollectionCount + 1, 1, Bob, Alice, Charlie, 1);
    });
  });

  /* it('transferFrom for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  /* it('transferFrom a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  /* it('transferFrom a token that was deleted', async () => {
    await usingApi(async (api: ApiPromise) => {
      this test copies approve negative test
    });
  }); */

  it('transferFrom for not approved address', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');

      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1);
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await transferFromExpectFail(
        reFungibleCollectionId,
        newReFungibleTokenId,
        Bob,
        Alice,
        Charlie,
        1,
      );
    });
  });

  it('transferFrom incorrect token count', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);

      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 2);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 2);
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(
        reFungibleCollectionId,
        newReFungibleTokenId,
        Bob,
        Alice,
        Charlie,
        2,
      );
    });
  });

  it('execute transferFrom from account that is not owner of collection', async () => {
    await usingApi(async () => {
      const Dave = privateKey('//Dave');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      try {
        await approveExpectFail(nftCollectionId, newNftTokenId, Dave, Bob);
        await transferFromExpectFail(nftCollectionId, newNftTokenId, Dave, Alice, Charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }

      // await transferFromExpectFail(nftCollectionId, newNftTokenId, Dave, Alice, Charlie, 1);

      // fungible
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      try {
        await approveExpectFail(fungibleCollectionId, newFungibleTokenId, Dave, Bob);
        await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Dave, Alice, Charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
      // reFungible
      const reFungibleCollectionId = await
      createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      try {
        await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Dave, Bob);
        await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Dave, Alice, Charlie, 1);
      } catch (e) {
        // tslint:disable-next-line:no-unused-expression
        expect(e).to.be.exist;
      }
    });
  });
  it( 'transferFrom burnt token before approve NFT', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await burnItemExpectSuccess(Alice, nftCollectionId, newNftTokenId, Alice, 1);
      await approveExpectFail(nftCollectionId, newNftTokenId, Alice, Bob);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1);      
    });
  });
  it( 'transferFrom burnt token before approve Fungible', async () => {
    await usingApi(async () => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await burnItemExpectSuccess(Alice, fungibleCollectionId, 1, Alice, 10);
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  }); 
  it( 'transferFrom burnt token before approve ReFungible', async () => {
    await usingApi(async () => {
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await burnItemExpectSuccess(Alice, reFungibleCollectionId, newReFungibleTokenId, Alice, 1);
      await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  });
  
  it( 'transferFrom burnt token after approve NFT', async () => {
    await usingApi(async () => {
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, nftCollectionId, newNftTokenId, Alice, 1);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1);      
    });
  });
  it( 'transferFrom burnt token after approve Fungible', async () => {
    await usingApi(async () => {
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, fungibleCollectionId, 1, Alice, 10);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  }); 
  it( 'transferFrom burnt token after approve ReFungible', async () => {
    await usingApi(async () => {
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible'}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, reFungibleCollectionId, newReFungibleTokenId, Alice, 1);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  });

  it('fails when called by collection owner on non-owned item when OwnerCanTransfer == false', async () => {
    const collectionId = await createCollectionExpectSuccess();
    const itemId = await createItemExpectSuccess(Alice, collectionId, 'NFT', Bob.address);
    await setCollectionLimitsExpectSuccess(Alice, collectionId, { OwnerCanTransfer: false });

    await transferFromExpectFail(collectionId, itemId, Alice, Bob, Charlie);
  });
});
