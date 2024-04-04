import {readFile} from 'fs/promises';
import {u8aToHex} from '@polkadot/util';
import {usingPlaygrounds} from '@unique/test-utils/util.js';
import {blake2AsHex} from '@polkadot/util-crypto';


const codePath = process.argv[2];
if(!codePath) throw new Error('missing code path argument');

const code = await readFile(codePath);

await usingPlaygrounds(async (helper, privateKey) => {
  const alice = await privateKey('//Alice');
  const hex = blake2AsHex(code);
  await helper.getSudo().executeExtrinsic(alice, 'api.tx.parachainSystem.authorizeUpgrade', [hex, true]);
  await helper.getSudo().executeExtrinsicUncheckedWeight(alice, 'api.tx.parachainSystem.enactAuthorizedUpgrade', [u8aToHex(code)]);
});
// We miss disconnect/unref somewhere.
process.exit(0);
