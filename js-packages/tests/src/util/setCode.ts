import {readFile} from 'fs/promises';
import {u8aToHex} from '@polkadot/util';
import {usingPlaygrounds} from '.';

const codePath = process.argv[2];
if(!codePath) throw new Error('missing code path argument');

const code = await readFile(codePath);

await usingPlaygrounds(async (helper, privateKey) => {
  const alice = await privateKey('//Alice');
  await helper.getSudo().executeExtrinsicUncheckedWeight(alice, 'api.tx.system.setCode', [u8aToHex(code)]);
});
// We miss disconnect/unref somewhere.
process.exit(0);
