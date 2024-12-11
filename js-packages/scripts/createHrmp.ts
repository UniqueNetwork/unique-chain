import {usingPlaygrounds} from '@unique/test-utils/util.js';
import config from '../tests/config.js';

const profile = process.argv[2];
if(!profile) throw new Error('missing profile/relay argument');

await usingPlaygrounds(async (helper, privateKey) => {
  const bidirOpen = async (a: number, b: number) => {
    console.log(`Opening ${a} <=> ${b}`);
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.hrmp.forceOpenHrmpChannel', [a, b, 8, 512]);
    await helper.getSudo().executeExtrinsic(alice, 'api.tx.hrmp.forceOpenHrmpChannel', [b, a, 8, 512]);
  };
  const alice = await privateKey('//Alice');
  switch (profile) {
    case 'quartz':
      await bidirOpen(2095, 1000);
      await bidirOpen(2095, 2000);
      await bidirOpen(2095, 2023);
      await bidirOpen(2095, 2007);
      break;
    case 'unique':
      await bidirOpen(2037, 1000);
      await bidirOpen(2037, 2000);
      await bidirOpen(2037, 2004);
      await bidirOpen(2037, 2006);
      await bidirOpen(2037, 2040);
      await bidirOpen(2037, 2034);
      break;
    default:
      throw new Error(`unknown hrmp config profile: ${profile}`);
  }
}, config.relayUrl);
// We miss disconnect/unref somewhere.
process.exit(0);
