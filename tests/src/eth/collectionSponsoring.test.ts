import {addToAllowListExpectSuccess, confirmSponsorshipExpectSuccess, createCollectionExpectSuccess, enablePublicMintingExpectSuccess, setCollectionSponsorExpectSuccess} from '../util/helpers';
import {itWeb3, createEthAccount, collectionIdToAddress, GAS_ARGS, normalizeEvents} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';

describe('evm collection sponsoring', () => {
  itWeb3('sponsors mint transactions', async ({web3, privateKeyWrapper}) => {
    const alice = privateKeyWrapper('//Alice');

    const collection = await createCollectionExpectSuccess();
    await setCollectionSponsorExpectSuccess(collection, alice.address);
    await confirmSponsorshipExpectSuccess(collection);

    const minter = createEthAccount(web3);
    expect(await web3.eth.getBalance(minter)).to.equal('0');

    const address = collectionIdToAddress(collection);
    const contract = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collection), {from: minter, ...GAS_ARGS});

    await enablePublicMintingExpectSuccess(alice, collection);
    await addToAllowListExpectSuccess(alice, collection, {Ethereum: minter});

    const nextTokenId = await contract.methods.nextTokenId().call();
    expect(nextTokenId).to.equal('1');
    const result = await contract.methods.mint(minter, nextTokenId).send();
    const events = normalizeEvents(result.events);
    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: minter,
          tokenId: nextTokenId,
        },
      },
    ]);
  });
});
