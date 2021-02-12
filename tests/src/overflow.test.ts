//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import { IKeyringPair } from "@polkadot/types/types";
import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
import privateKey from "./substrate/privateKey";
import usingApi from "./substrate/substrate-api";
import { approveExpectFail, approveExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, getAllowance, getFungibleBalance, transferExpectFail, transferExpectSuccess, transferFromExpectFail, transferFromExpectSuccess, U128_MAX } from "./util/helpers";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Integration Test fungible overflows', () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;
    let charlie: IKeyringPair;

    before(async () => {
        await usingApi(async () => {
            alice = privateKey('//Alice');
            bob = privateKey('//Bob');
            charlie = privateKey('//Charlie');
        });
    });

    it('fails when overflows on transfer', async () => {
        const fungibleCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });

        await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: U128_MAX });
        await transferExpectSuccess(fungibleCollectionId, 0, alice, bob, U128_MAX, 'Fungible');

        await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: 1n });
        await transferExpectFail(fungibleCollectionId, 0, alice, bob, 1, 'Fungible');

        expect(await getFungibleBalance(fungibleCollectionId, alice.address)).to.equal(1n);
        expect(await getFungibleBalance(fungibleCollectionId, bob.address)).to.equal(U128_MAX);
    });

    it('fails on allowance overflow', async () => {
        const fungibleCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });

        await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: U128_MAX });
        await approveExpectSuccess(fungibleCollectionId, 0, alice, bob, U128_MAX);
        await approveExpectFail(fungibleCollectionId, 0, alice, bob, U128_MAX);
    });

    it('fails when overflows on transferFrom', async () => {
        const fungibleCollectionId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });

        await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: U128_MAX });
        await approveExpectSuccess(fungibleCollectionId, 0, alice, bob, U128_MAX);
        await transferFromExpectSuccess(fungibleCollectionId, 0, bob, alice, charlie, U128_MAX, 'Fungible');

        expect(await getFungibleBalance(fungibleCollectionId, charlie.address)).to.equal(U128_MAX);
        expect((await getAllowance(fungibleCollectionId, 0, alice.address, bob.address)).toString()).to.equal('0');

        await createFungibleItemExpectSuccess(alice, fungibleCollectionId, { Value: U128_MAX });
        await approveExpectSuccess(fungibleCollectionId, 0, alice, bob, 1n);
        await transferFromExpectFail(fungibleCollectionId, 0, bob, alice, charlie, 1);

        expect(await getFungibleBalance(fungibleCollectionId, charlie.address)).to.equal(U128_MAX);
        expect((await getAllowance(fungibleCollectionId, 0, alice.address, bob.address)).toString()).to.equal('1');
    });
});
