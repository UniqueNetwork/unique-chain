import {UNQ} from '../helpers/balances';
import {getAccounts, topUpAccounts, emptyAccounts, chunk} from '../helpers/testAccounts';

const CROWD_SIZE = 3200;

const main = async () => {
  // Get donors and top up
  const donors = getAccounts(10, '//Donor');
  await topUpAccounts('//Alice', donors, UNQ(100000n));

  // Get crowd and beat it into chunks – 800 accounts each.
  // thats because we cannot keep more than 1024 subscriptions for a single ws-connection
  const crowd = chunk(getAccounts(CROWD_SIZE, '//Account'), 800);


  // 1. Feed crowd using different donors for each chunk:
  const topUpBalanceTransactions = crowd.map((subCrowd, i) => topUpAccounts(donors[i], subCrowd, UNQ(2n)));
  const topUpResult = await Promise.all(topUpBalanceTransactions);

  // 2. Empty crowd:
  const emptyBalanceTransactions = crowd.map(subCrowd => emptyAccounts(subCrowd, donors[0]));
  const emptyResult = await Promise.all(emptyBalanceTransactions);

  console.log('Top up balance transactions failed:', topUpResult.flat().filter(res => res.status === 'fail').length);
  console.log('Empty balance transactions failed:', emptyResult.flat().filter(res => res.status === 'fail').length);
};

main().then(() => console.log('Done')).catch(console.error);
