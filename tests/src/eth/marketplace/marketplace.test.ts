import { readFile } from 'fs/promises';
import { getBalanceSingle, transferBalanceExpectSuccess } from '../../substrate/get-balance';
import privateKey from '../../substrate/privateKey';
import { createCollectionExpectSuccess, createFungibleItemExpectSuccess, createItemExpectSuccess, queryNftOwner, transferExpectSuccess, transferFromExpectSuccess } from '../../util/helpers';
import { collectionIdToAddress, createEthAccountWithBalance, executeEthTxOnSub, GAS_ARGS, itWeb3, subToEth, subToEthLowercase } from '../util/helpers';
import { evmToAddress } from '@polkadot/util-crypto';
import nonFungibleAbi from '../nonFungibleAbi.json';
import fungibleAbi from '../fungibleAbi.json';
import waitNewBlocks from '../../substrate/wait-new-blocks';
import { expect } from 'chai';

const PRICE = 2000n;

describe('Matcher contract usage', () => {
  itWeb3('With UNQ', async ({api, web3}) => {
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const Matcher = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlaceUNQ.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await Matcher.deploy({ data: (await readFile(`${__dirname}/MarketPlaceUNQ.bin`)).toString() }).send({ from: matcherOwner });

    const alice = privateKey('//Alice');
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), { from: matcherOwner });

    const seller = privateKey('//Bob');
  
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {ethereum: subToEth(seller.address)});
    // Fees will be paid from EVM account, so we should have some balance here
    await transferBalanceExpectSuccess(api, seller, evmToAddress(subToEth(seller.address)), 10n ** 18n);
    await transferBalanceExpectSuccess(api, alice, evmToAddress(subToEth(alice.address)), 10n ** 18n);
    await waitNewBlocks(api, 1);

    // Token is owned by seller initially
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(seller.address) });

    // Ask
    {
      await executeEthTxOnSub(api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(api, seller, matcher, m => m.setAsk(PRICE, '0x0000000000000000000000000000000000000000', evmCollection.options.address, tokenId, 1));
    }
      
    // Token is transferred to matcher
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: matcher.options.address.toLowerCase() });

    // Buy
    {
      const sellerBalanceBeforePurchase = await getBalanceSingle(api, seller.address);
      // There is two functions named 'buy', so we should provide full signature
      await executeEthTxOnSub(api, alice, matcher, m => m['buy(address,uint256)'](evmCollection.options.address, tokenId), { value: PRICE });
      expect(await getBalanceSingle(api, seller.address) - sellerBalanceBeforePurchase === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(alice.address) });

  
    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, { ethereum: subToEth(alice.address) }, { substrate: alice.address });
    
    // Token is transferred to substrate account of alice, seller received funds
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ substrate: alice.address });
  });

  itWeb3('With custom ERC20', async ({api, web3}) => {
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const Matcher = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlaceUNQ.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await Matcher.deploy({ data: (await readFile(`${__dirname}/MarketPlaceUNQ.bin`)).toString() }).send({ from: matcherOwner });

    const alice = privateKey('//Alice');
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), { from: matcherOwner });

    const fungibleId = await createCollectionExpectSuccess({ mode: { type: 'Fungible', decimalPoints: 0 } });
    const evmFungible = new web3.eth.Contract(fungibleAbi as any, collectionIdToAddress(fungibleId), { from: matcherOwner, ...GAS_ARGS });
    await createFungibleItemExpectSuccess(alice, fungibleId, { Value: PRICE }, { ethereum: subToEth(alice.address) });

    const seller = privateKey('//Bob');
  
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {ethereum: subToEth(seller.address)});
    // Fees will be paid from EVM account, so we should have some balance here
    await transferBalanceExpectSuccess(api, seller, evmToAddress(subToEth(seller.address)), 10n ** 18n);
    await transferBalanceExpectSuccess(api, alice, evmToAddress(subToEth(alice.address)), 10n ** 18n);
    await waitNewBlocks(api, 1);

    // Token is owned by seller initially
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(seller.address) });

    // Ask
    {
      await executeEthTxOnSub(api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(api, seller, matcher, m => m.setAsk(PRICE, evmFungible.options.address, evmCollection.options.address, tokenId, 1));
    }
      
    // Token is transferred to matcher
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: matcher.options.address.toLowerCase() });

    // Buy
    {
      const sellerBalanceBeforePurchase = BigInt(await evmFungible.methods.balanceOf(subToEth(seller.address)).call());
      const buyerBalanceBeforePurchase = BigInt(await evmFungible.methods.balanceOf(subToEth(alice.address)).call());

      await executeEthTxOnSub(api, alice, evmFungible, m => m.approve(matcher.options.address, PRICE));
      // There is two functions named 'buy', so we should provide full signature
      await executeEthTxOnSub(api, alice, matcher, m =>
        m['buy(address,uint256,address,uint256)'](evmCollection.options.address, tokenId, evmFungible.options.address, PRICE));

      // Approved price is removed from buyer balance, and added to seller
      expect(BigInt(await evmFungible.methods.balanceOf(subToEth(seller.address)).call()) - sellerBalanceBeforePurchase === PRICE);
      expect(buyerBalanceBeforePurchase - BigInt(await evmFungible.methods.balanceOf(subToEth(alice.address)).call()) === PRICE);
    }

    // Token is transferred to evm account of alice
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(alice.address) });

  
    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, { ethereum: subToEth(alice.address) }, { substrate: alice.address });
    
    // Token is transferred to substrate account of alice
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ substrate: alice.address });
  });

  itWeb3('With escrow', async ({ api, web3 }) => {
    const matcherOwner = await createEthAccountWithBalance(api, web3);
    const escrow = await createEthAccountWithBalance(api, web3);
    const Matcher = new web3.eth.Contract(JSON.parse((await readFile(`${__dirname}/MarketPlaceKSM.abi`)).toString()), undefined, {
      from: matcherOwner,
      ...GAS_ARGS,
    });
    const matcher = await Matcher.deploy({ data: (await readFile(`${__dirname}/MarketPlaceKSM.bin`)).toString(), arguments: [escrow] }).send({ from: matcherOwner });
    
    const ksmToken = 11;

    const alice = privateKey('//Alice');
    const collectionId = await createCollectionExpectSuccess({mode: {type: 'NFT'}});
    const evmCollection = new web3.eth.Contract(nonFungibleAbi as any, collectionIdToAddress(collectionId), { from: matcherOwner });

    const seller = privateKey('//Bob');
  
    const tokenId = await createItemExpectSuccess(alice, collectionId, 'NFT', seller.address);

    // To transfer item to matcher it first needs to be transfered to EVM account of bob
    await transferExpectSuccess(collectionId, tokenId, seller, {ethereum: subToEth(seller.address)});
    // Fees will be paid from EVM account, so we should have some balance here
    await transferBalanceExpectSuccess(api, seller, evmToAddress(subToEth(seller.address)), 10n ** 18n);
    await transferBalanceExpectSuccess(api, alice, evmToAddress(subToEth(alice.address)), 10n ** 18n);
    await waitNewBlocks(api, 1);

    // Token is owned by seller initially
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(seller.address) });

    // Ask
    {
      await executeEthTxOnSub(api, seller, evmCollection, m => m.approve(matcher.options.address, tokenId));
      await executeEthTxOnSub(api, seller, matcher, m => m.setAsk(PRICE, ksmToken, evmCollection.options.address, tokenId, 1));
    }
      
    // Token is transferred to matcher
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: matcher.options.address.toLowerCase() });

    // Give buyer KSM
    await matcher.methods.deposit(PRICE, ksmToken, subToEth(alice.address)).send({ from: escrow });
    await waitNewBlocks(api, 1);
  
    // Buy
    {
      expect(await matcher.methods.escrowBalance(ksmToken, subToEth(seller.address)).call()).to.be.equal('0');
      expect(await matcher.methods.escrowBalance(ksmToken, subToEth(alice.address)).call()).to.be.equal(PRICE.toString());

      await executeEthTxOnSub(api, alice, matcher, m => m.buy(evmCollection.options.address, tokenId));
      await waitNewBlocks(api, 1);

      // Price is removed from buyer balance, and added to seller
      expect(await matcher.methods.escrowBalance(ksmToken, subToEth(alice.address)).call()).to.be.equal('0');
      expect(await matcher.methods.escrowBalance(ksmToken, subToEth(seller.address)).call()).to.be.equal(PRICE.toString());
    }

    // Token is transferred to evm account of alice
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ ethereum: subToEthLowercase(alice.address) });
  
    // Transfer token to substrate side of alice
    await transferFromExpectSuccess(collectionId, tokenId, alice, { ethereum: subToEth(alice.address) }, { substrate: alice.address });
    
    // Token is transferred to substrate account of alice, seller received funds
    expect(await queryNftOwner(api, collectionId, tokenId)).to.be.deep.equal({ substrate: alice.address });
  });
});
