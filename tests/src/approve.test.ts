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

describe('Integration Test approve(spender, collection_id, item_id, amount):', () => {
  it('Execute the extrinsic and check approvedList', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});

describe('Negative Integration Test approve(spender, collection_id, item_id, amount):', () => {
  it('Approve for a collection that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Approve for a collection that was destroyed', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Approve transfer of a token that does not exist', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Approve using the address that does not own the approved token', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });

  it('Remove approval by using 0 amount', async () => {
    await usingApi(async (api: ApiPromise) => {

    });
  });
});
