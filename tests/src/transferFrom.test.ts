//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//
import { ApiPromise } from '@polkadot/api';
import BN from 'bn.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import privateKey from './substrate/privateKey';
import { default as usingApi, submitTransactionAsync, submitTransactionExpectFailAsync } from './substrate/substrate-api';
import {createCollectionExpectSuccess, destroyCollectionExpectSuccess} from './util/helpers';

chai.use(chaiAsPromised);
const expect = chai.expect;

interface ITokenDataType {
  Owner: number[];
  ConstData: number[];
  VariableData: number[];
}

describe('Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('Execute the extrinsic and check nftItemList - owner of toren', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});

describe('Negative Integration Test transferFrom(from, recipient, collection_id, item_id, value):', () => {
  it('transferFrom for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom a token that was deleted', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom for not approved address', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('transferFrom incorrect token count', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('execute transferFrom from account that is not owner of collection', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});
