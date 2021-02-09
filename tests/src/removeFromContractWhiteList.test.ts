import privateKey from "./substrate/privateKey";
import usingApi from "./substrate/substrate-api";
import { deployFlipper, toggleFlipValueExpectFailure, toggleFlipValueExpectSuccess } from "./util/contracthelpers";
import { addToContractWhiteListExpectSuccess, isWhitelistedInContract, removeFromContractWhiteListExpectFailure, removeFromContractWhiteListExpectSuccess, toggleContractWhitelistExpectSuccess } from "./util/helpers";
import { IKeyringPair } from '@polkadot/types/types';
import { expect } from "chai";

describe('Integration Test removeFromContractWhiteList', () => {
    let bob: IKeyringPair;

    before(() => {
        bob = privateKey('//Bob');
    });

    it('user is no longer whitelisted after removal', async () => {
        await usingApi(async (api) => {
            const [flipper, deployer] = await deployFlipper(api);

            await addToContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
            await removeFromContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);

            expect(await isWhitelistedInContract(flipper.address, bob.address)).to.be.false;
        });
    });

    it('user can\'t execute contract after removal', async () => {
        await usingApi(async (api) => {
            const [flipper, deployer] = await deployFlipper(api);
            await toggleContractWhitelistExpectSuccess(deployer, flipper.address, true);

            await addToContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
            await toggleFlipValueExpectSuccess(bob, flipper);

            await removeFromContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
            await toggleFlipValueExpectFailure(bob, flipper);
        });
    });

    it('can be called twice', async () => {
        await usingApi(async (api) => {
            const [flipper, deployer] = await deployFlipper(api);

            await addToContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
            await removeFromContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
            await removeFromContractWhiteListExpectSuccess(deployer, flipper.address, bob.address);
        });
    });
});

describe('Negative Integration Test removeFromContractWhiteList', () => {
    let alice: IKeyringPair;
    let bob: IKeyringPair;

    before(() => {
        alice = privateKey('//Alice');
        bob = privateKey('//Bob');
    });

    it('fails when called with non-contract address', async () => {
        await usingApi(async () => {
            await removeFromContractWhiteListExpectFailure(alice, alice.address, bob.address);
        });
    });

    it('fails when executed by non owner', async () => {
        await usingApi(async (api) => {
            const [flipper, _] = await deployFlipper(api);

            await removeFromContractWhiteListExpectFailure(alice, flipper.address, bob.address);
        });
    });
});
