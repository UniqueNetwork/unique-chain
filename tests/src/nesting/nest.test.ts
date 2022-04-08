import {expect} from 'chai';
import {tokenIdToAddress} from '../eth/util/helpers';
import privateKey from '../substrate/privateKey';
import usingApi from '../substrate/substrate-api';
import {createCollectionExpectSuccess, createItemExpectSuccess, getTokenOwner, getTopmostTokenOwner, setCollectionLimitsExpectSuccess, transferExpectSuccess, transferFromExpectSuccess} from '../util/helpers';

describe('nesting', () => {
  it('allows to nest/unnest token', async () => {
    await usingApi(async api => {
      const alice = privateKey('//Alice');
      const bob = privateKey('//Bob');

      const collection = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
      await setCollectionLimitsExpectSuccess(alice, collection, {nestingRule:{OwnerRestricted:[collection]}});
      const targetToken = await createItemExpectSuccess(alice, collection, 'NFT');

      const nestedToken = await createItemExpectSuccess(alice, collection, 'NFT');

      // Nest
      await transferExpectSuccess(collection, nestedToken, alice, {Ethereum: tokenIdToAddress(collection, targetToken)});
  
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: alice.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Move bundle to different user
      await transferExpectSuccess(collection, targetToken, alice, {Substrate: bob.address});
  
      expect(await getTopmostTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: bob.address});
      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Ethereum: tokenIdToAddress(collection, targetToken).toLowerCase()});

      // Unnest
      await transferFromExpectSuccess(collection, nestedToken, bob, {Ethereum: tokenIdToAddress(collection, targetToken)}, {Substrate: bob.address});

      expect(await getTokenOwner(api, collection, nestedToken)).to.be.deep.equal({Substrate: bob.address});
    });
  });
});
