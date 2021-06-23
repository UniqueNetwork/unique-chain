import { expect } from "chai";
import privateKey from "../substrate/privateKey";
import { createCollectionExpectSuccess } from "../util/helpers";
import { collectionIdToAddress, createEthAccount, itWeb3, transferBalanceToEth } from "./util/helpers";
import fungibleMetadataAbi from './fungibleMetadataAbi.json';

describe('Common metadata', () => {
    itWeb3('Returns collection name', async ({ api, web3 }) => {
        const collection = await createCollectionExpectSuccess({
            name: 'token name',
            mode: { type: 'NFT' }
        });
        const caller = createEthAccount(web3);
        await transferBalanceToEth(api, privateKey('//Alice'), caller, 999999);

        const address = collectionIdToAddress(collection);
        const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address);
        const name = await contract.methods.name().call({ from: caller });

        expect(name).to.equal('token name');
    });

    itWeb3('Returns symbol name', async ({ api, web3 }) => {
        const collection = await createCollectionExpectSuccess({
            tokenPrefix: 'TOK',
            mode: { type: 'NFT' }
        });
        const caller = createEthAccount(web3);
        await transferBalanceToEth(api, privateKey('//Alice'), caller, 999999);

        const address = collectionIdToAddress(collection);
        const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address);
        const symbol = await contract.methods.symbol().call({ from: caller });

        expect(symbol).to.equal('TOK');
    });
});

describe('Fungible metadata', () => {
    itWeb3('Returns fungible decimals', async ({ api, web3 }) => {
        const collection = await createCollectionExpectSuccess({
            mode: { type: 'Fungible', decimalPoints: 6 }
        });
        const caller = createEthAccount(web3);
        await transferBalanceToEth(api, privateKey('//Alice'), caller, 999999);

        const address = collectionIdToAddress(collection);
        const contract = new web3.eth.Contract(fungibleMetadataAbi as any, address);
        const decimals = await contract.methods.decimals().call({ from: caller });

        expect(+decimals).to.equal(6);
    })
})