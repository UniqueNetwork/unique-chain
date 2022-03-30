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

import {ApiPromise} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import privateKey from './substrate/privateKey';
import usingApi, { submitTransactionAsync } from './substrate/substrate-api';
import waitNewBlocks from './substrate/wait-new-blocks';
import {expect} from 'chai';
import { getGenericResult } from './util/helpers';
//import find from 'find-process';

let alice: IKeyringPair;
let bob: IKeyringPair;
let charlie: IKeyringPair;
let dave: IKeyringPair;
let eve: IKeyringPair;

const alice_port = 31200;
const bob_port = 31201;

describe('Make me a big great cloud', () => {
    before(async () => {    
        await usingApi(async () => {
            alice = privateKey('//Alice');
            bob = privateKey('//Bob');
            charlie = privateKey('//Charlie');
            dave = privateKey('//Dave');
            eve = privateKey('//Eve');
        });
    });

    it('Can\\t stand the heat', async () => {
        // let alice_processes = await find('port', alice_port);
        // expect(alice_processes).to.be.length.above(0);
        // alice_processes = alice_processes.filter((process) => process.name.includes('unique'));
        // expect(alice_processes).to.be.length(1);

        // let alice_pid = alice_processes[0].pid;
        // process.kill(alice_pid, 'SIGINT');
        // console.log(alice_pid)

        await usingApi(async (api) => {
            /*const currentDesiredCandidates = (await api.query.collatorSelection.desiredCandidates() as any).toBigInt();
            if (currentDesiredCandidates < )*/
            const tx = api.tx.session.setKeys(
                '0x' + Buffer.from(charlie.addressRaw).toString('hex'),
                '0x0'
            );
            const events = await submitTransactionAsync(charlie, tx);
            const result = getGenericResult(events);
            expect(result.success).to.be.true;

            const tx2 = api.tx.collatorSelection.setInvulnerables([
                bob.address,
                charlie.address
            ]);
            const sudoTx = api.tx.sudo.sudo(tx2 as any);
            const events2 = await submitTransactionAsync(alice, sudoTx);
            const result2 = getGenericResult(events2);
            expect(result2.success).to.be.true;

            let newInvulnerables = (await api.query.collatorSelection.invulnerables()).toJSON();
            expect(newInvulnerables).to.contain(charlie.address);

            const expectedSessionIndex = (await api.query.session.currentIndex() as any).toNumber() + 2;
            let currentSessionIndex = -1;
            while (currentSessionIndex < expectedSessionIndex) {
                await waitNewBlocks(api, 1);
                currentSessionIndex = (await api.query.session.currentIndex() as any).toNumber();
                // todo implement a timeout in case new blocks are not being produced
            }
        });
    });
});