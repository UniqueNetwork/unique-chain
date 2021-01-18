import chai from "chai";
import chaiAsPromised from 'chai-as-promised';
import usingApi, { submitTransactionAsync, submitTransactionExpectFailAsync } from "./substrate/substrate-api";
import privateKey from "./substrate/privateKey";
import {
  deployFlipper,
  getFlipValue
} from "./util/contracthelpers";
import {
  getGenericResult
} from "./util/helpers"

chai.use(chaiAsPromised);
const expect = chai.expect;

const value = 0;
const gasLimit = 3000n * 1000000n;

describe('Integration Test toggleContractWhiteList', () => {

  it(`Enable white list contract mode`, async () => {
    await usingApi(async api => {
      const [contract, deployer] = await deployFlipper(api);

      const enabledBefore = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();
      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, true);
      const enableEvents = await submitTransactionAsync(deployer, enableWhiteListTx);
      const enabled = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();

      expect(getGenericResult(enableEvents).success).to.be.true;
      expect(enabledBefore).to.be.false;
      expect(enabled).to.be.true;
    });
  });

  it(`Only whitelisted account can call contract`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");

      const [contract, deployer] = await deployFlipper(api);

      let expectedFlipValue = await getFlipValue(contract, deployer);

      const flip = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, flip);
      expectedFlipValue = !expectedFlipValue;
      const afterFlip = await getFlipValue(contract,deployer);
      expect(afterFlip).to.be.eq(expectedFlipValue, `Anyone can call new contract.`);

      const deployerCanFlip = async () => {
        expectedFlipValue = !expectedFlipValue;
        const deployerFlip = contract.exec('flip', value, gasLimit);
        await submitTransactionAsync(deployer, deployerFlip);
        const aliceFlip1Response = await getFlipValue(contract, deployer);
        expect(aliceFlip1Response).to.be.eq(expectedFlipValue, `Deployer always can flip.`);
      };
      await deployerCanFlip();

      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, true);
      const enableResult = await submitTransactionAsync(deployer, enableWhiteListTx);
      const flipWithEnabledWhiteList = contract.exec('flip', value, gasLimit);
      await expect(submitTransactionExpectFailAsync(bob, flipWithEnabledWhiteList)).to.be.rejected;
      const flipValueAfterEnableWhiteList = await getFlipValue(contract, deployer);
      expect(flipValueAfterEnableWhiteList).to.be.eq(expectedFlipValue, `Enabling whitelist doesn't make it possible to call contract for everyone.`);

      await deployerCanFlip();

      const addBobToWhiteListTx = api.tx.nft.addToContractWhiteList(contract.address, bob.address);
      const addBobResult = await submitTransactionAsync(deployer, addBobToWhiteListTx);
      const flipWithWhitelistedBob = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, flipWithWhitelistedBob);
      expectedFlipValue = !expectedFlipValue;
      const flipAfterWhiteListed = await getFlipValue(contract,deployer);
      expect(flipAfterWhiteListed).to.be.eq(expectedFlipValue, `Bob was whitelisted, now he can flip.`);

      await deployerCanFlip();

      const removeBobFromWhiteListTx = api.tx.nft.removeFromContractWhiteList(contract.address, bob.address);
      const removeBobResult = await submitTransactionAsync(deployer, removeBobFromWhiteListTx);
      const bobRemoved = contract.exec('flip', value, gasLimit);
      await expect(submitTransactionExpectFailAsync(bob, bobRemoved)).to.be.rejected;
      const afterBobRemoved = await getFlipValue(contract, deployer);
      expect(afterBobRemoved).to.be.eq(expectedFlipValue, `Bob can't call contract, now when he is removeed from white list.`);

      await deployerCanFlip();

      const disableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, false);
      const disableWhiteListResult = await submitTransactionAsync(deployer, disableWhiteListTx);
      const whiteListDisabledFlip = contract.exec('flip', value, gasLimit);
      await submitTransactionAsync(bob, whiteListDisabledFlip);
      expectedFlipValue = !expectedFlipValue;
      const afterWhiteListDisabled = await getFlipValue(contract,deployer);
      expect(afterWhiteListDisabled).to.be.eq(expectedFlipValue, `Anyone can call contract with disabled whitelist.`);

    });
  });

  it(`Enabling white list repeatedly should not produce errors`, async () => {
    await usingApi(async api => {
      const [contract, deployer] = await deployFlipper(api);

      const enabledBefore = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();
      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, true);
      const enableEvents = await submitTransactionAsync(deployer, enableWhiteListTx);
      const enabled = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();
      const enableAgainEvents = await submitTransactionAsync(deployer, enableWhiteListTx);
      const enabledAgain = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();

      expect(getGenericResult(enableEvents).success).to.be.true;
      expect(enabledBefore).to.be.false;
      expect(enabled).to.be.true;
      expect(getGenericResult(enableAgainEvents).success).to.be.true;
      expect(enabledAgain).to.be.true;
    });
  });

});

describe('Negative Integration Test toggleContractWhiteList', () => {

  it(`Enable white list for a non-contract`, async () => {
    await usingApi(async api => {
      const alice = privateKey("//Alice");
      const bobGuineaPig = privateKey("//Bob");

      const enabledBefore = (await api.query.nft.contractWhiteListEnabled(bobGuineaPig.address)).toJSON();
      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(bobGuineaPig.address, true);
      await expect(submitTransactionExpectFailAsync(alice, enableWhiteListTx)).to.be.rejected;
      const enabled = (await api.query.nft.contractWhiteListEnabled(bobGuineaPig.address)).toJSON();

      expect(enabledBefore).to.be.false;
      expect(enabled).to.be.false;
    });
  });

  it(`Enable white list using a non-owner address`, async () => {
    await usingApi(async api => {
      const bob = privateKey("//Bob");
      const [contract, deployer] = await deployFlipper(api);

      const enabledBefore = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();
      const enableWhiteListTx = api.tx.nft.toggleContractWhiteList(contract.address, true);
      await expect(submitTransactionExpectFailAsync(bob, enableWhiteListTx)).to.be.rejected;
      const enabled = (await api.query.nft.contractWhiteListEnabled(contract.address)).toJSON();

      expect(enabledBefore).to.be.false;
      expect(enabled).to.be.false;
    });
  });

});
