//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi } from './substrate/substrate-api';
import {
  approveExpectFail,
  approveExpectSuccess,
  createCollectionExpectSuccess,
  createItemExpectSuccess,
  destroyCollectionExpectSuccess,
  transferFromExpectFail,
  transferFromExpectSuccess,
  burnItemExpectSuccess,
} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('Execute the extrinsic and check nftItemList - owner of token', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
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
      await transferFromExpectSuccess(reFungibleCollectionId,
        newReFungibleTokenId, Bob, Alice, Charlie, 100, 'ReFungible');
    });
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('transferFrom for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
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
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
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
      await transferFromExpectFail(reFungibleCollectionId,
        newReFungibleTokenId, Bob, Alice, Charlie, 1);
    });
  });

  it('transferFrom incorrect token count', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
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
      await transferFromExpectFail(reFungibleCollectionId,
        newReFungibleTokenId, Bob, Alice, Charlie, 2);
    });
  });

  it('execute transferFrom from account that is not owner of collection', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
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
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await burnItemExpectSuccess(Alice, nftCollectionId, newNftTokenId, 1);
      await approveExpectFail(nftCollectionId, newNftTokenId, Alice, Bob);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1);      
    });
  });
  it( 'transferFrom burnt token before approve Fungible', async () => {
    await usingApi(async (api: ApiPromise) => {
    const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await burnItemExpectSuccess(Alice, fungibleCollectionId, 1, 10);
      await approveExpectFail(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  }); 
  it( 'transferFrom burnt token before approve ReFungible', async () => {
    await usingApi(async (api: ApiPromise) => {
    const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await burnItemExpectSuccess(Alice, reFungibleCollectionId, newReFungibleTokenId, 1);
      await approveExpectFail(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  });
  
  it( 'transferFrom burnt token after approve NFT', async () => {
    await usingApi(async (api: ApiPromise) => {
      const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      // nft
      const nftCollectionId = await createCollectionExpectSuccess();
      const newNftTokenId = await createItemExpectSuccess(Alice, nftCollectionId, 'NFT');
      await approveExpectSuccess(nftCollectionId, newNftTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, nftCollectionId, newNftTokenId, 1);
      await transferFromExpectFail(nftCollectionId, newNftTokenId, Bob, Alice, Charlie, 1);      
    });
  });
  it( 'transferFrom burnt token after approve Fungible', async () => {
    await usingApi(async (api: ApiPromise) => {
    const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      const fungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      const newFungibleTokenId = await createItemExpectSuccess(Alice, fungibleCollectionId, 'Fungible');
      await approveExpectSuccess(fungibleCollectionId, newFungibleTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, fungibleCollectionId, 1, 10);
      await transferFromExpectFail(fungibleCollectionId, newFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  }); 
  it( 'transferFrom burnt token after approve ReFungible', async () => {
    await usingApi(async (api: ApiPromise) => {
    const Alice = privateKey('//Alice');
      const Bob = privateKey('//Bob');
      const Charlie = privateKey('//Charlie');
      const reFungibleCollectionId = await createCollectionExpectSuccess({mode: {type: 'ReFungible', decimalPoints: 0}});
      const newReFungibleTokenId = await createItemExpectSuccess(Alice, reFungibleCollectionId, 'ReFungible');
      await approveExpectSuccess(reFungibleCollectionId, newReFungibleTokenId, Alice, Bob);
      await burnItemExpectSuccess(Alice, reFungibleCollectionId, newReFungibleTokenId, 1);
      await transferFromExpectFail(reFungibleCollectionId, newReFungibleTokenId, Bob, Alice, Charlie, 1);
          
    });
  }); 
});
