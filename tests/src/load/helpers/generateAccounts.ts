import {IKeyringPair} from '@polkadot/types/types';
import {usingPlaygrounds} from '../../util';
import {signSendAndWait, TransactionResult} from './sign';

export async function feedAccounts
(signer: IKeyringPair, accounts: IKeyringPair[], accountBalance: bigint): Promise<IKeyringPair[]> {
  return await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();
    let nonce = await helper.chain.getNonce(signer.address);

    const transactions: Promise<TransactionResult>[] = [];
    let i = 1;
    for (const account of accounts) {
      console.log(i++);
      // For each account creates immortal extrinsic, send it and push transactions[]:
      const extrinsic = api.tx.balances.transfer(account.address, accountBalance);
      transactions.push(signSendAndWait(signer, extrinsic, {era: 0, nonce: nonce++}));
    }

    // Waiting for all transfers to be resolved:
    await Promise.all(transactions);

    return accounts;
  });
  // wss://ws-rc.unique.network
}
