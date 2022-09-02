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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {ApiPromise, WsProvider} from '@polkadot/api';
import {ApiOptions} from '@polkadot/api/types';
import {IKeyringPair} from '@polkadot/types/types';
import usingApi, {submitTransactionAsync} from '../substrate/substrate-api';
import {getGenericResult, generateKeyringPair} from '../util/helpers';
import waitNewBlocks from '../substrate/wait-new-blocks';
import getBalance from '../substrate/get-balance';

chai.use(chaiAsPromised);
const expect = chai.expect;

const UNIQUE_CHAIN = 2037;
const ACALA_CHAIN = 2000;
const ACALA_PORT = '9946';

async function traverseEvents(api: ApiPromise): Promise<boolean> {
  api.query.system.events((events) => {
    console.log(`\nReceived ${events.length} events:`);

    const results = events.map((record) => {
      const { event, phase } = record;
      const types = event.typeDef;

      console.log(`\t${event.section}:${event.method}:: (phase=${phase.toString()})`);

      // The kind of event we're looking for
      if (event.section === 'xcmpQueue' && event.method === 'Success') {
        return true;
      }

      event.data.forEach((data, index) => {
        console.log(`\t\t\t${types[index].type}: ${data.toString()}`);
      });
      return false;
    });

    // TODO: should send this value to result of traverseEvents. My JS knowledge ends here.
    const result: boolean = results.filter(v => v).length != 0;
    return result;
  });
}

/// Gets events from api. 4 blocks should be enough
async function subscribeEvents(api: ApiPromise, blocksCount = 4): Promise<void> {
  const promise = new Promise<void>(async (resolve) => {

    const unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
      console.log('Header: %d ', header.number);

      traverseEvents(api);

      if (blocksCount > 0) {
        blocksCount--;
      } else {
        unsubscribe();
        resolve();
      }
    });
  });

  return promise;
}

async function sendSubscribeXcmVersion(api: ApiPromise, destParaId: number, from: IKeyringPair, queryId: number): Promise<void> {
  const maxResponseWeight = 800_000_000;
  const destination = {
    V0: {
      X2: [
        'Parent',
        {
          Parachain: destParaId,
        },
      ],
    },
  };

  const message = {
    V1: {
      'SubscribeVersion': {
        'queryId': queryId,
        'maxResponseWeight': maxResponseWeight,
      },
    },
  };


  const tx = api.tx.polkadotXcm.send(destination, message);
  const sudoTx = api.tx.sudo.sudo(tx as any);
  const events = await submitTransactionAsync(from, sudoTx);
  const result = getGenericResult(events);
  expect(result.success).to.be.true;
}

describe('Before', () => {
  let alice: IKeyringPair;

  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
    });
  });

  it('test_itself', async () => {
    /// Random number. Do not really know how to get it's actual value from API.
    const queryId = 4;

    const acalaApiOptions: ApiOptions = {
      provider: new WsProvider('ws://127.0.0.1:' + ACALA_PORT),
    };

    const sendSubscribeFromUnique  = usingApi(async (api) => {
      await sendSubscribeXcmVersion(api, ACALA_CHAIN, alice, queryId);
    });
    const subscribeEventsAcala = usingApi( async(api) => {
      await subscribeEvents(api);
    }, acalaApiOptions);
    Promise.all([sendSubscribeFromUnique, subscribeEventsAcala]);

  });

});