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

import {IKeyringPair} from '@polkadot/types/types';
import {expect, itSub, usingPlaygrounds} from '../util/playgrounds';
import {UniqueHelper, UniqueNFToken} from '../util/playgrounds/unique';

/**
 * ```dot
 * 4 -> 3 -> 2 -> 1
 * 7 -> 6 -> 5 -> 2
 * 8 -> 5
 * ```
 */
async function buildComplexObjectGraph(helper: UniqueHelper, sender: IKeyringPair): Promise<UniqueNFToken[]> {
  const collection = await helper.nft.mintCollection(sender, {permissions: {nesting: {tokenOwner: true}}});
  const tokens = await collection.mintMultipleTokens(sender, Array(8).fill({owner: {Substrate: sender.address}}));

  await tokens[7].nest(sender, tokens[4]);
  await tokens[6].nest(sender, tokens[5]);
  await tokens[5].nest(sender, tokens[4]);
  await tokens[4].nest(sender, tokens[1]);
  await tokens[3].nest(sender, tokens[2]);
  await tokens[2].nest(sender, tokens[1]);
  await tokens[1].nest(sender, tokens[0]);

  return tokens;
}

describe('Graphs', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingPlaygrounds(async (helper, privateKey) => {
      const donor = privateKey('//Alice');
      [alice] = await helper.arrange.createAccounts([10n], donor);
    });
  });

  itSub('Ouroboros can\'t be created in a complex graph', async ({helper}) => {
    const tokens = await buildComplexObjectGraph(helper, alice);

    // to self
    await expect(
      tokens[0].nest(alice, tokens[0]),
      'first transaction',  
    ).to.be.rejectedWith(/structure\.OuroborosDetected/);
    // to nested part of graph
    await expect(
      tokens[0].nest(alice, tokens[4]),
      'second transaction',
    ).to.be.rejectedWith(/structure\.OuroborosDetected/);
    await expect(
      tokens[1].transferFrom(alice, tokens[0].nestingAccount(), tokens[7].nestingAccount()),
      'third transaction',
    ).to.be.rejectedWith(/structure\.OuroborosDetected/);
  });
});
