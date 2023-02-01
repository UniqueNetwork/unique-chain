import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';
import {feedAccounts} from './generateAccounts';
import {usingPlaygrounds} from '../../util';
import {signSendAndWait, TransactionResult} from './sign';

/*
  Helper functions related to test accounts.
*/

export function getDonors(): IKeyringPair[] {
  //FIXME: use secret seeds
  const keyring = new Keyring();
  return Array(10).fill('//Donor').map((donor, i) => keyring.addFromUri(donor + `//${i}`));
}

export function getCrowd(crowdSize: number): IKeyringPair[] {
  //FIXME: use secret seeds
  const keyring = new Keyring();
  return Array(crowdSize).fill('//Loader').map((donor, i) => keyring.addFromUri(donor + `//${i}`));
}

export async function feedDonors(amountOfTokens: bigint): Promise<IKeyringPair[]> {
  const donors = getDonors();
  // The first donor is main
  console.log('super donor', donors[0].address);
  await feedAccounts(donors[0], donors.slice(1), amountOfTokens);
  return donors;
}

export async function feedCrowd
(crowdSize: number, amountOfTokens: bigint): Promise<IKeyringPair[]> {
  const donors = getDonors();
  const crowd = getCrowd(crowdSize);
  // Each donor can proccess near 900 accounts effectively
  const neededDonors = crowdSize / 900;
  for (let i = 0; i < neededDonors; i++) {
    const accountsToFeed = crowd.slice(0, 900 * (i + 1));
    await feedAccounts(donors[i], accountsToFeed, amountOfTokens);
  }
  return crowd;
}

export async function emptyCrowd(crowd: IKeyringPair[]) {
  await usingPlaygrounds(async (helper) => {
    const api = helper.getApi();

    const transactions: Promise<TransactionResult>[] = [];
    let i = 1;
    crowd.map(account => {
      console.log(i++);
      const extrinsic = api.tx.balances.transferAll(getDonors()[0].address, false);
      transactions.push(signSendAndWait(account, extrinsic, {era: 0}));
    });
    // for (const account of crowd) {
    //   console.log(i++);
    //   const extrinsic = api.tx.balances.transferAll(getDonors()[0].address, false);
    //   transactions.push(signSendAndWait(account, extrinsic, {era: 0}));
    // }

    await Promise.all(transactions);
  });
}