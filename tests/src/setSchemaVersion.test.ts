import { BigNumber } from 'bignumber.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync } from './substrate/substrate-api';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('setSchemaVersion positive', () => {
  it('execute setSchemaVersion with image url and unique json ', async () => {
    await usingApi(async api => {

    });
  });

  it('validate schema version with just entered data', async () => {
    await usingApi(async api => {

    });
  });
});

describe('setSchemaVersion negative', () => {
  it('execute setSchemaVersion for not exists collection', async () => {
    await usingApi(async api => {

    });
  });

  it('execute setSchemaVersion for deleted collection', async () => {
    await usingApi(async api => {

    });
  });

  it('execute setSchemaVersion with not correct image url', async () => {
    await usingApi(async api => {

    });
  });

  it('execute setSchemaVersion with not correct unique', async () => {
    await usingApi(async api => {

    });
  });
});
