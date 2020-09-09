import createSubstrateApi from "./substrate-api";
import {expect} from 'chai';

describe('Connection', () => {
  it('Connection can be established', async () => {
    const api = await createSubstrateApi();
    const health = await api.rpc.system.health();
    expect(health).to.be.not.empty;
  });
});