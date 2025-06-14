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
  await helper.getSudo().executeExtrinsic(alice, 'api.tx.balances.forceSetBalance', [alice.address, 1000000000000000000000000000000n]);
  const balance = await helper.balance.getSubstrate(alice.address);
  console.log('Balance:', balance);
  await helper.getSudo().executeExtrinsic(alice, 'api.tx.system.authorizeUpgrade', [hex]);
  await helper.getSudo().executeExtrinsicUncheckedWeight(alice, 'api.tx.system.applyAuthorizedUpgrade', [u8aToHex(code)]);
});
// We miss disconnect/unref somewhere.
process.exit(0);
