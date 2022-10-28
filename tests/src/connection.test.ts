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

import {itSub, expect, usingPlaygrounds} from './util';

describe('Connection smoke test', () => {
  itSub('Connection can be established', async ({helper}) => {
    const health = (await helper.callRpc('api.rpc.system.health')).toJSON();
    expect(health).to.be.not.empty;
  });

  it('Cannot connect to 255.255.255.255', async () => {
    await expect((async () => {
      await usingPlaygrounds(async helper => {
        await helper.callRpc('api.rpc.system.health');
      }, 'ws://255.255.255.255:9944');
    })()).to.be.eventually.rejected;
  });
});
