import {expect} from 'chai';
import usingApi from "./substrate/substrate-api";

describe('Connection', () => {
  it('Connection can be established', async () => {
    await usingApi(async api => {
      const health = await api.rpc.system.health();
      expect(health).to.be.not.empty;
    });
  });
});