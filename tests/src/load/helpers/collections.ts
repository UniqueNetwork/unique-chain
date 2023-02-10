import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from '../../util';
import {ICollectionCreationOptions, ITokenPropertyPermission} from '../../util/playgrounds/types';
import {WS_ENDPOINT} from '../config';
import {signSendAndWait, TxResult} from './sign';
import {chunk} from './accounts';

export async function arrangeCreateCollection(signer: IKeyringPair, tokenPropertyPermissions: ITokenPropertyPermission[]) {
  return await usingPlaygrounds(async (helper) => {
    const collectionOptions: ICollectionCreationOptions = {
      name: 'Load testing',
      description: 'Test chain limits',
      tokenPropertyPermissions,
    };
    const collection = await helper.nft.mintCollection(signer, collectionOptions);
    return collection;
  }, WS_ENDPOINT);
}

export async function spamCreateMultipleItemsEx(
  spamer: IKeyringPair, crowd: IKeyringPair[], tokensByTx: number,
  collectionId: number, properties: {key: string, value: string}[],
) {
  return await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();
    const chunkedCrowd = chunk(crowd, tokensByTx);
    let nonce = await helper.chain.getNonce(spamer.address);

    // create token data
    const chunkedTokens = chunkedCrowd.map(chunk => chunk.map(account => {
      return {
        owner: {Substrate: account.address},
        properties,
      };
    }));

    const transactions: Promise<TxResult>[] = [];
    console.log('Signing CreateMultipleItemsEx transactions for', crowd.length, 'accounts');

    for (const chunk of chunkedTokens) {
      const extrinsic = api.tx.unique.createMultipleItemsEx(collectionId, {NFT: chunk});
      transactions.push(signSendAndWait({extrinsic, signer: spamer, options: {nonce: nonce++}}));
    }

    console.log('Transactions sent, waiting for result...');
    const result = await Promise.all(transactions);
    return result;
  }, WS_ENDPOINT);
}