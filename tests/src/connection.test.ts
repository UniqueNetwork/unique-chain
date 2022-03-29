// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

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
