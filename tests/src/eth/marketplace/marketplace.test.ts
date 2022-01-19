import {readFile} from 'fs/promises';
import {getBalanceSingle, transferBalanceExpectSuccess} from '../../substrate/get-balance';
import privateKey from '../../substrate/privateKey';
import {addToAllowListExpectSuccess, confirmSponsorshipExpectSuccess, createCollectionExpectSuccess, createFungibleItemExpectSuccess, createItemExpectSuccess, getTokenOwner, setCollectionLimitsExpectSuccess, setCollectionSponsorExpectSuccess, transferExpectSuccess, transferFromExpectSuccess} from '../../util/helpers';
import {collectionIdToAddress, contractHelpers, createEthAccountWithBalance, executeEthTxOnSub, GAS_ARGS, itWeb3, SponsoringMode, subToEth, subToEthLowercase, transferBalanceToEth} from '../util/helpers';
import {evmToAddress} from '@polkadot/util-crypto';
import nonFungibleAbi from '../nonFungibleAbi.json';
import fungibleAbi from '../fungibleAbi.json';
import {expect} from 'chai';

const PRICE = 2000n;

describe('Matcher contract usage', () => {
  itWeb3('With UNQ', async ({api, web3}) => {
    const alice = privateKey('//Alice');
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments:[matcherOwner]}).send({from: matcherOwner});
    const helpers = contractHelpers(web3, matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});
    await transferBalanceToEth(api, alice, matcher.options.address);

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorApproveTimeout: 1});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), {from: matcherOwner});
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await transferBalanceToEth(api, alice, subToEth(alice.address));
    await confirmSponsorshipExpectSuccess(collectionId);

    await helpers.methods.toggleAllowed(matcher.options.address, subToEth(alice.address), true).send({from: matcherOwner});
    await addToAllowListExpectSuccess(alice, collectionId, evmToAddress(subToEth(alice.address)));

    const seller = privateKey(`//Seller/${Date.now()}`);
    await helpers.methods.toggleAllowed(matcher.options.address, subToEth(seller.address), true).send({from: matcherOwner});

    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {Ethereum: subToEth(seller.address)});

    // Token is owned by seller initially
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(seller.address)});

    // Ask
    {
      await executeEthTxOnSub(web3, api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(web3, api, seller, matcher, m => m.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, tokenId));
    }

    // Token is transferred to matcher
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = await getBalanceSingle(api, seller.address);
      await executeEthTxOnSub(web3, api, alice, matcher, m => m.buy(evmCollection.options.address, tokenId), {value: PRICE});
      expect(await getBalanceSingle(api, seller.address) - sellerBalanceBeforePurchase === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(alice.address)});

    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, {Ethereum: subToEth(alice.address)}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice, seller received funds
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Substrate: alice.address});
  });

  // selling for custom tokens excluded from release
  itWeb3.skip('With custom ERC20', async ({api, web3}) => {
    const alice = privateKey('//Alice');
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments: [matcherOwner]}).send({from: matcherOwner});

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), {from: matcherOwner});

    const fungibleId = await createCollectionExpectSuccess({mode: {type: 'Fungible', decimalPoints: 0}});
    const evmFungible = new web3.eth.Contract(fungibleAbi as any, collectionIdToAddress(fungibleId), {from: matcherOwner, ...GAS_ARGS});
    await createFungibleItemExpectSuccess(alice, fungibleId, {Value: PRICE}, {Ethereum: subToEth(alice.address)});

    const seller = privateKey('//Bob');

    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {Ethereum: subToEth(seller.address)});
    // Fees will be paid from EVM account, so we should have some balance here
    await transferBalanceExpectSuccess(api, seller, evmToAddress(subToEth(seller.address)), 10n ** 18n);
    await transferBalanceExpectSuccess(api, alice, evmToAddress(subToEth(alice.address)), 10n ** 18n);

    // Token is owned by seller initially
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(seller.address)});

    // Ask
    {
      await executeEthTxOnSub(web3, api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(web3, api, seller, matcher, m => m.addAsk(PRICE, evmFungible.options.address, evmCollection.options.address, tokenId, 1));
    }

    // Token is transferred to matcher
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Buy
    {
      const sellerBalanceBeforePurchase = BigInt(await evmFungible.methods.balanceOf(subToEth(seller.address)).call());
      const buyerBalanceBeforePurchase = BigInt(await evmFungible.methods.balanceOf(subToEth(alice.address)).call());

      await executeEthTxOnSub(web3, api, alice, evmFungible, m => m.approve(matcher.options.address, PRICE));
      // There is two functions named 'buy', so we should provide full signature
      await executeEthTxOnSub(web3, api, alice, matcher, m =>
        m['buy(address,uint256,address,uint256)'](evmCollection.options.address, tokenId, evmFungible.options.address, PRICE));

      // Approved price is removed from buyer balance, and added to seller
      expect(BigInt(await evmFungible.methods.balanceOf(subToEth(seller.address)).call()) - sellerBalanceBeforePurchase === PRICE);
      expect(buyerBalanceBeforePurchase - BigInt(await evmFungible.methods.balanceOf(subToEth(alice.address)).call()) === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(alice.address)});


    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, {Ethereum: subToEth(alice.address)}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Substrate: alice.address});
  });

  itWeb3('With escrow', async ({api, web3}) => {
    const alice = privateKey('//Alice');
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const escrow = await createEthAccountWithBalance(api, web3);
    const matcherContract = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlace.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await matcherContract.deploy({data: (await readFile(`${__dirname}/MarketPlace.bin`)).toString(), arguments: [matcherOwner]}).send({from: matcherOwner, gas: 10000000});
    await matcher.methods.setEscrow(escrow).send({from: matcherOwner});
    const helpers = contractHelpers(web3, matcherOwner);
    await helpers.methods.setSponsoringMode(matcher.options.address, SponsoringMode.Allowlisted).send({from: matcherOwner});
    await helpers.methods.setSponsoringRateLimit(matcher.options.address, 1).send({from: matcherOwner});
    await transferBalanceToEth(api, alice, matcher.options.address);

    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    await setCollectionLimitsExpectSuccess(alice, collectionId, {sponsorApproveTimeout: 1});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), {from: matcherOwner});
    await setCollectionSponsorExpectSuccess(collectionId, alice.address);
    await transferBalanceToEth(api, alice, subToEth(alice.address));
    await confirmSponsorshipExpectSuccess(collectionId);

    await helpers.methods.toggleAllowed(matcher.options.address, subToEth(alice.address), true).send({from: matcherOwner});
    await addToAllowListExpectSuccess(alice, collectionId, evmToAddress(subToEth(alice.address)));

    const seller = privateKey(`//Seller/${Date.now()}`);
    await helpers.methods.toggleAllowed(matcher.options.address, subToEth(seller.address), true).send({from: matcherOwner});

    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {Ethereum: subToEth(seller.address)});

    // Token is owned by seller initially
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(seller.address)});

    // Ask
    {
      await executeEthTxOnSub(web3, api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(web3, api, seller, matcher, m => m.addAsk(PRICE, '0x0000000000000000000000000000000000000001', evmCollection.options.address, tokenId));
    }

    // Token is transferred to matcher
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: matcher.options.address.toLowerCase()});

    // Give buyer KSM
    await matcher.methods.depositKSM(PRICE, subToEth(alice.address)).send({from: escrow});

    // Buy
    {
      expect(await matcher.methods.balanceKSM(subToEth(seller.address)).call()).to.be.equal('0');
      expect(await matcher.methods.balanceKSM(subToEth(alice.address)).call()).to.be.equal(PRICE.toString());

      await executeEthTxOnSub(web3, api, alice, matcher, m => m.buyKSM(evmCollection.options.address, tokenId, subToEth(alice.address), subToEth(alice.address)));

      // Price is removed from buyer balance, and added to seller
      expect(await matcher.methods.balanceKSM(subToEth(alice.address)).call()).to.be.equal('0');
      expect(await matcher.methods.balanceKSM(subToEth(seller.address)).call()).to.be.equal(PRICE.toString());
    }

    // Token is transferred to evm account of alice
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Ethereum: subToEthLowercase(alice.address)});

    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, {Ethereum: subToEth(alice.address)}, {Substrate: alice.address});

    // Token is transferred to substrate account of alice, seller received funds
    expect(await getTokenOwner(api, collectionId, tokenId)).to.be.deep.equal({Substrate: alice.address});
  });
});
