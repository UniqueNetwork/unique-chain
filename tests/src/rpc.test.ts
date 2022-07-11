import {IKeyringPair} from '@polkadot/types/types';
import {expect} from 'chai';
import usingApi from './substrate/substrate-api';
import {createCollection, createCollectionExpectSuccess, createFungibleItemExpectSuccess, CrossAccountId, getTokenOwner, normalizeAccountId, transfer, U128_MAX} from './util/helpers';

let alice: IKeyringPair;
let bob: IKeyringPair;


describe('integration test: RPC methods', () => {
  before(async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      alice = privateKeyWrapper('//Alice');
      bob = privateKeyWrapper('//Bob');
    });
  });

  
  it('returns None for fungible collection', async () => {
    await usingApi(async api => {
      const collection = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
      await expect(getTokenOwner(api, collection, 0)).to.be.rejectedWith(/^owner == null$/);
    });
  });
  
  it('RPC method tokenOnewrs for fungible collection and token', async () => {
    await usingApi(async (api, privateKeyWrapper) => {
      const ethAcc = {Ethereum: '0x67fb3503a61b284dc83fa96dceec4192db47dc7c'};
      const facelessCrowd = Array.from(Array(7).keys()).map(i => normalizeAccountId(privateKeyWrapper(i.toString())));
      
      const createCollectionResult = await createCollection(api, alice, {mode: {type: 'Fungible', decimalPoints: 0}});
      const collectionId = createCollectionResult.collectionId;
      const aliceTokenId = await createFungibleItemExpectSuccess(alice, collectionId, {Value: U128_MAX}, alice.address);
     
      await transfer(api, collectionId, aliceTokenId, alice, bob, 1000n);
      await transfer(api, collectionId, aliceTokenId, alice, ethAcc, 900n);
            
      for (let i = 0; i < 7; i++) {
        await transfer(api, collectionId, aliceTokenId, alice, facelessCrowd[i], 1);
      } 
      
      const owners = await api.rpc.unique.tokenOwners(collectionId, aliceTokenId);
      const ids = (owners.toJSON() as CrossAccountId[]).map(s => normalizeAccountId(s));
      const aliceID = normalizeAccountId(alice);
      const bobId = normalizeAccountId(bob);

      // What to expect
      // tslint:disable-next-line:no-unused-expression
      expect(ids).to.deep.include.members([aliceID, ethAcc, bobId, ...facelessCrowd]);
      expect(owners.length == 10).to.be.true;
      
      const eleven = privateKeyWrapper('11');
      expect(await transfer(api, collectionId, aliceTokenId, alice, eleven, 10n)).to.be.true;
      expect((await api.rpc.unique.tokenOwners(collectionId, aliceTokenId)).length).to.be.equal(10);
    });
  });
});