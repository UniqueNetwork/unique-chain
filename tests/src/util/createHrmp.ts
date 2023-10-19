import {usingPlaygrounds} from '.';
import config from '../config';

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
    case 'opal':
      await bidirOpen(1001, 1002);
      break;
    case 'quartz':
    case 'unique':
      await bidirOpen(1001, 1002);
      await bidirOpen(1001, 1003);
      await bidirOpen(1001, 1004);
      await bidirOpen(1001, 1005);
      break;
    default:
      throw new Error(`unknown hrmp config profile: ${profile}`);
  }
}, config.relayUrl);
// We miss disconnect/unref somewhere.
process.exit(0);
