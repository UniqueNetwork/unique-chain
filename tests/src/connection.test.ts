import usingApi from "./substrate/substrate-api";
import { WsProvider } from '@polkadot/api';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Connection', () => {
  it('Connection can be established', async () => {
    await usingApi(async api => {
      const health = await api.rpc.system.health();
      expect(health).to.be.not.empty;
    });
  });

  it('Cannot connect to 0.0.0.0', () => {
    const neverConnectProvider = new WsProvider('ws://0.0.0.0:9944');
    expect((async () => {
      await usingApi(async api => {
        const health = await api.rpc.system.health();
      }, { provider: neverConnectProvider });
    })()).to.be.eventually.rejected;
  });
});