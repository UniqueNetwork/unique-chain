import {addToAllowListExpectSuccess, bigIntToSub, confirmSponsorshipExpectSuccess, createCollectionExpectSuccess, enablePublicMintingExpectSuccess, getDetailedCollectionInfo, setCollectionSponsorExpectSuccess} from '../util/helpers';
import {itWeb3, createEthAccount, collectionIdToAddress, GAS_ARGS, normalizeEvents, createEthAccountWithBalance, evmCollectionHelpers, getCollectionAddressFromResult, evmCollection, ethBalanceViaSub, subToEth} from './util/helpers';
import nonFungibleAbi from './nonFungibleAbi.json';
import {expect} from 'chai';
import {evmToAddress} from '@polkadot/util-crypto';
import {submitTransactionAsync} from '../substrate/substrate-api';
import getBalance from '../substrate/get-balance';

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

  itWeb3('Set substrate sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
    result = await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});
    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;
    
    const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
    await submitTransactionAsync(sponsor, confirmTx);
    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
    
    const sponsorTuple = await collectionEvm.methods.getCollectionSponsor().call({from: owner});
    expect(bigIntToSub(api, BigInt(sponsorTuple[1]))).to.be.eq(sponsor.address);
  });

  itWeb3('Remove sponsor', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
    result = await collectionEvm.methods.setCollectionSponsor(sponsor).send({from: owner});
    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.true;
    
    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
    expect(await collectionEvm.methods.hasCollectionPendingSponsor().call({from: owner})).to.be.false;
    
    await collectionEvm.methods.removeCollectionSponsor().send({from: owner});
    
    const sponsorTuple = await collectionEvm.methods.getCollectionSponsor().call({from: owner});
    expect(sponsorTuple.field_0).to.be.eq('0x0000000000000000000000000000000000000000');
  });

  itWeb3('Sponsoring collection from evm address via access list', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    result = await collectionEvm.methods.setCollectionSponsor(sponsor).send({from: owner});
    let collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    const ss58Format = (api.registry.getChainProperties())!.toJSON().ss58Format;
    expect(collectionSub.sponsorship.isUnconfirmed).to.be.true;
    expect(collectionSub.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor, Number(ss58Format)));
    await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');

    await collectionEvm.methods.confirmCollectionSponsorship().send({from: sponsor});
    collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isConfirmed).to.be.true;
    expect(collectionSub.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor, Number(ss58Format)));

    const user = createEthAccount(web3);
    const nextTokenId = await collectionEvm.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');

    const oldPermissions = (await getDetailedCollectionInfo(api, collectionId))!.permissions.toHuman();
    expect(oldPermissions.mintMode).to.be.false;
    expect(oldPermissions.access).to.be.equal('Normal');

    await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

    const newPermissions = (await getDetailedCollectionInfo(api, collectionId))!.permissions.toHuman();
    expect(newPermissions.mintMode).to.be.true;
    expect(newPermissions.access).to.be.equal('AllowList');

    const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);

    {
      const nextTokenId = await collectionEvm.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await collectionEvm.methods.mintWithTokenURI(
        user,
        nextTokenId,
        'Test URI',
      ).send({from: user});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: user,
            tokenId: nextTokenId,
          },
        },
      ]);

      const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
      const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);

      expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
      expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
      expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
    }
  });

  itWeb3('Sponsoring collection from substrate address via access list', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    const result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = privateKeyWrapper('//Alice');
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);

    await collectionEvm.methods.setCollectionSponsorSubstrate(sponsor.addressRaw).send({from: owner});
    
    const confirmTx = await api.tx.unique.confirmSponsorship(collectionId);
    await submitTransactionAsync(sponsor, confirmTx);
    
    const user = createEthAccount(web3);
    const nextTokenId = await collectionEvm.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');

    await collectionEvm.methods.setCollectionAccess(1 /*'AllowList'*/).send({from: owner});
    await collectionEvm.methods.addToCollectionAllowList(user).send({from: owner});
    await collectionEvm.methods.setCollectionMintMode(true).send({from: owner});

    const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
    const sponsorBalanceBefore = (await getBalance(api, [sponsor.address]))[0];

    {
      const nextTokenId = await collectionEvm.methods.nextTokenId().call();
      expect(nextTokenId).to.be.equal('1');
      const result = await collectionEvm.methods.mintWithTokenURI(
        user,
        nextTokenId,
        'Test URI',
      ).send({from: user});
      const events = normalizeEvents(result.events);

      expect(events).to.be.deep.equal([
        {
          address: collectionIdAddress,
          event: 'Transfer',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: user,
            tokenId: nextTokenId,
          },
        },
      ]);

      const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
      const sponsorBalanceAfter = (await getBalance(api, [sponsor.address]))[0];

      expect(await collectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
      expect(ownerBalanceBefore).to.be.eq(ownerBalanceAfter);
      expect(sponsorBalanceBefore > sponsorBalanceAfter).to.be.true;
    }
  });

  itWeb3('Check that transaction via EVM spend money from sponsor address', async ({api, web3, privateKeyWrapper}) => {
    const owner = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionHelpers = evmCollectionHelpers(web3, owner);
    let result = await collectionHelpers.methods.createNonfungibleCollection('Sponsor collection', '1', '1').send();
    const {collectionIdAddress, collectionId} = await getCollectionAddressFromResult(api, result);
    const sponsor = await createEthAccountWithBalance(api, web3, privateKeyWrapper);
    const collectionEvm = evmCollection(web3, owner, collectionIdAddress);
    result = await collectionEvm.methods.setCollectionSponsor(sponsor).send();
    let collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    const ss58Format = (api.registry.getChainProperties())!.toJSON().ss58Format;
    expect(collectionSub.sponsorship.isUnconfirmed).to.be.true;
    expect(collectionSub.sponsorship.asUnconfirmed.toHuman()).to.be.eq(evmToAddress(sponsor, Number(ss58Format)));
    await expect(collectionEvm.methods.confirmCollectionSponsorship().call()).to.be.rejectedWith('caller is not set as sponsor');
    const sponsorCollection = evmCollection(web3, sponsor, collectionIdAddress);
    await sponsorCollection.methods.confirmCollectionSponsorship().send();
    collectionSub = (await getDetailedCollectionInfo(api, collectionId))!;
    expect(collectionSub.sponsorship.isConfirmed).to.be.true;
    expect(collectionSub.sponsorship.asConfirmed.toHuman()).to.be.eq(evmToAddress(sponsor, Number(ss58Format)));

    const user = createEthAccount(web3);
    await collectionEvm.methods.addCollectionAdmin(user).send();
    
    const ownerBalanceBefore = await ethBalanceViaSub(api, owner);
    const sponsorBalanceBefore = await ethBalanceViaSub(api, sponsor);
    
  
    const userCollectionEvm = evmCollection(web3, user, collectionIdAddress);
    const nextTokenId = await userCollectionEvm.methods.nextTokenId().call();
    expect(nextTokenId).to.be.equal('1');
    result = await userCollectionEvm.methods.mintWithTokenURI(
      user,
      nextTokenId,
      'Test URI',
    ).send();

    const events = normalizeEvents(result.events);
    const address = collectionIdToAddress(collectionId);

    expect(events).to.be.deep.equal([
      {
        address,
        event: 'Transfer',
        args: {
          from: '0x0000000000000000000000000000000000000000',
          to: user,
          tokenId: nextTokenId,
        },
      },
    ]);
    expect(await userCollectionEvm.methods.tokenURI(nextTokenId).call()).to.be.equal('Test URI');
  
    const ownerBalanceAfter = await ethBalanceViaSub(api, owner);
    expect(ownerBalanceAfter).to.be.eq(ownerBalanceBefore);
    const sponsorBalanceAfter = await ethBalanceViaSub(api, sponsor);
    expect(sponsorBalanceAfter < sponsorBalanceBefore).to.be.true;
  });
});
