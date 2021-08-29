//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import privateKey from '../substrate/privateKey';
import { expect } from 'chai';
import { createCollectionExpectSuccess, 
  createFungibleItemExpectSuccess, 
  transferExpectSuccess, 
  transferFromExpectSuccess, 
  createItemExpectSuccess, 
  setContractSponsoringRateLimitExpectSuccess,
  enableContractSponsoringExpectSuccess,
  setCollectionSponsorExpectSuccess,
  confirmSponsorshipExpectSuccess,
  enableContractSponsoringExpectFailure} from '../util/helpers';
import { collectionIdToAddress, 
  contractHelpers,
  createEthAccountWithBalance,
  createEthAccount,
  transferBalanceToEth,
  subToEth,
  deployFlipper,
  usingWeb3Http,
  deployFungibleContract,
  GAS_ARGS, itWeb3 } from './util/helpers';
import waitNewBlocks from '../substrate/wait-new-blocks';
import fungibleAbi from './fungibleAbi.json';
import nonFungibleAbi from './nonFungibleAbi.json';

describe.only('Sponsoring EVM contracts', () => {
  itWeb3.skip('Sponsoring can be set by the address that has deployed the contract', async ({api, web3}) => {
    await usingWeb3Http(async web3Http => {
      const owner = await createEthAccountWithBalance(api, web3Http);
      const fungible = await deployFungibleContract(web3Http, owner);
      await waitNewBlocks(api, 1);
      const helpers = contractHelpers(web3Http, owner);
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.false;
      await waitNewBlocks(api, 1);
      await helpers.methods.toggleSponsoring(fungible.options.address, true).send({from: owner});
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.true;
    });
  });

  itWeb3.skip('Sponsoring cannot be set by the address that did not deployed the contract', async ({api, web3}) => {
    await usingWeb3Http(async web3Http => {
      const owner = await createEthAccountWithBalance(api, web3Http);
      const notOwner = await createEthAccountWithBalance(api, web3Http);
      const fungible = await deployFungibleContract(web3Http, owner);
      await waitNewBlocks(api, 1);
      const helpers = contractHelpers(web3Http, owner);
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.false;
      await waitNewBlocks(api, 1);
      await expect(helpers.methods.toggleSponsoring(notOwner, true).send({from: notOwner})).to.rejected;
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.false;
    });
  });

  itWeb3('Sponsoring is set, an address that has no UNQ can send a transaction and it works', async ({api, web3}) => {
    await usingWeb3Http(async web3Http => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');
      const collection = await createCollectionExpectSuccess({
        mode: { type: 'Fungible', decimalPoints: 0 },
      });
      await createFungibleItemExpectSuccess(alice, collection, { Value: 200n }, alice.address);
      const owner = await createEthAccountWithBalance(api, web3Http);
      const notOwner = await createEthAccountWithBalance(api, web3Http);
      await transferExpectSuccess(collection, 0, alice, { ethereum: notOwner } , 200, 'Fungible');
      const address = collectionIdToAddress(collection);
      const fungible = await deployFungibleContract(web3Http, address);
      await transferBalanceToEth(api, alice, fungible.options.address);
      await waitNewBlocks(api, 1);
      const balanceBefore = await web3.eth.getBalance(fungible.options.address);

      const helpers = contractHelpers(web3Http, address);
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.false;
      await waitNewBlocks(api, 1);
      await helpers.methods.toggleSponsoring(fungible.options.address, true).send({from: owner});
      await waitNewBlocks(api, 1);
      expect(await helpers.methods.sponsoringEnabled(fungible.options.address).call()).to.be.true;

//      await fungible.methods.approve(owner, 50).send({ from: owner });
      await fungible.methods.transferFrom(notOwner, owner, 50).send({ from: notOwner });
      const balanceAfter = await web3.eth.getBalance(fungible.options.address);
      expect(+balanceAfter).to.lessThan(+balanceBefore);
    });
  });

});
