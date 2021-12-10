//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import usingApi from './substrate/substrate-api';
import {WsProvider} from '@polkadot/api';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Connection smoke test', () => {
  it('Connection can be established', async () => {
    await usingApi(async api => {
      const health = await api.rpc.system.health();
      expect(health).to.be.not.empty;
    });
  });

  it('Cannot connect to 255.255.255.255', async () => {
    const neverConnectProvider = new WsProvider('ws://255.255.255.255:9944');
    await expect((async () => {
      await usingApi(async api => {
        await api.rpc.system.health();
      }, {provider: neverConnectProvider});
    })()).to.be.eventually.rejected;
  });
});
