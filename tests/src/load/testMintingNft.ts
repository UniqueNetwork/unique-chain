import {UNQ} from './helpers/balances';
import {getAccounts, arrangeTopUpAccounts} from './helpers/accounts';
import {arrangeCreateCollection, spamCreateMultipleItemsEx} from './helpers/collections';

/*
  Pool size limits:
  - Ready: 20mb = 20971520
  - Future: 1mb = 1048576

  If prop size per token is 32768
  20971520 / 32768 < 640 NFT/Pool (600)
*/

const CROWD_SIZE = 600;
const SUPER_DONOR = '//Eve';
const DONOR_BASE_SEED = '//Donor';
const CROWD_BASE_SEED = '//Loader';

const PROPS_NUMBER = 1;
const PROP_SIZE_BYTES = 32768;

const main = async () => {
  // Get donors and top up
  const donors = await getAccounts(1, DONOR_BASE_SEED);
  await arrangeTopUpAccounts(SUPER_DONOR, donors, UNQ(10000n));

  // Get crowd and beat it into chunks – 800 accounts each.
  // thats because we cannot keep more than 1024 subscriptions for a single ws-connection
  const crowd = await getAccounts(CROWD_SIZE, CROWD_BASE_SEED);
  // const chunkedCrowd = chunk(crowd, 500);

  // // Feed crowd
  // for (const chunk of chunkedCrowd) {
  //   await arrangeTopUpAccounts(SUPER_DONOR, chunk, UNQ(5n));
  // }

  // Generate props:
  const collectionProps = Array(PROPS_NUMBER)
    .fill({key: 'Prop', permission: {tokenOwner: true, collectionAdmin: true, mutable: true}})
    .map((prop, i) => {
      return {
        key: prop.key + i,
        permission: prop.permission,
      };
    });

  const tokenProps = collectionProps.map(prop => {
    return {
      key: prop.key,
      value: 'a'.repeat(PROP_SIZE_BYTES),
    };
  });

  // 1. Mint collection:
  const {collectionId} = await arrangeCreateCollection(donors[0], collectionProps);

  // 2. Mint tokens:
  const result = await spamCreateMultipleItemsEx(donors[0], crowd, 10, collectionId, tokenProps);
  const failed = result.filter(tx => tx.status === 'fail');
  console.log('Failed transactions', failed.length);
};

main().then(() => console.log('Done')).catch(console.error);
