import {ApiPromise, WsProvider} from '@polkadot/api';
import {readFile} from 'fs/promises';
import {join} from 'path';
import {makeNames} from '@unique/test-utils/util.js';

const {dirname} = makeNames(import.meta.url);

async function fetchVersion(chain: string): Promise<string> {
  const api = await ApiPromise.create({provider: new WsProvider(chain)});
  const last = (await api.query.system.lastRuntimeUpgrade()).toJSON();
  await api.disconnect();
  return (last as any).specVersion.toString();
}

function setVar(env: string, key: string, value: string): string {
  let found = false;
  const newEnv = env.replace(new RegExp(`${key}=.+?\n`), () => {
    found = true;
    return `${key}=${value}\n`;
  });
  if(!found) throw new Error(`env key "${key}" is not found`);
  return newEnv;
}

// Fetch and format version string
async function ff(url: string, regex: RegExp, rep: string | ((substring: string, ...params:any[]) => string)): Promise<string> {
  const ver = await fetchVersion(url);
  if(ver.match(regex) === null)
    throw new Error(`bad regex for ${url}, ${regex} had no matches for ${ver}`);
  return ver.replace(regex, rep as any);
}
function fixupUnique(version: string): string {
  if(version === 'release-v930033')
    return 'release-v930033-fix-gas-price';
  if(version === 'release-v930034')
    return 'release-v930034-fix-gas-price';
  return version;
}

(async () => {
  let env = (await readFile(join(dirname, '../../.env'))).toString();
  await Promise.all([
    // Version from polkadot-fellows
    // ff('wss://rpc.polkadot.io/', /^(.)(...)(...)$/, 'v$1.$2.$3').then(v => env = setVar(env, 'POLKADOT_MAINNET_BRANCH', v)),
    ff('wss://rococo-rpc.polkadot.io/', /^(.)(...)(...)$/, 'v$1.$2.$3').then(v => env = setVar(env, 'POLKADOT_MAINNET_BRANCH', v)),
    ff('wss://polkadot-asset-hub-rpc.polkadot.io/', /^(....)$/, 'release-parachains-v$1').then(v => env = setVar(env, 'POLKADOT_ASSETHUB_BUILD_BRANCH', v)),
    ff('wss://acala-rpc-0.aca-api.network/', /^(.)(..)(.)$/, '$1.$2.$3').then(v => env = setVar(env, 'ACALA_BUILD_BRANCH', v)),
    ff('wss://wss.api.moonbeam.network/', /^(....)$/, 'runtime-$1').then(v => env = setVar(env, 'MOONBEAM_BUILD_BRANCH', v)),
    ff('wss://ws.unique.network/', /^(........)$/, 'release-v$1').then(v => env = setVar(env, 'MAINNET_BRANCH', fixupUnique(v))),

    // ff('wss://kusama-rpc.polkadot.io/', /^(.)(...)(...)$/, 'v$1.$2.$3').then(v => env = setVar(env, 'KUSAMA_MAINNET_BRANCH', v)),
    ff('wss://rococo-rpc.polkadot.io/', /^(.)(...)(...)$/, 'v$1.$2.$3').then(v => env = setVar(env, 'KUSAMA_MAINNET_BRANCH', v)),
    ff('wss://kusama-asset-hub-rpc.polkadot.io/', /^(....)$/, 'release-parachains-v$1').then(v => env = setVar(env, 'KUSAMA_ASSETHUB_BUILD_BRANCH', v)),
    ff('wss://karura-rpc-0.aca-api.network/', /^(.)(..)(.)$/, 'release-karura-$1.$2.$3').then(v => env = setVar(env, 'KARURA_BUILD_BRANCH', v)),
    ff('wss://wss.api.moonriver.moonbeam.network/', /^(....)$/, 'runtime-$1').then(v => env = setVar(env, 'MOONRIVER_BUILD_BRANCH', v)),
    ff('wss://ws-quartz.unique.network/', /^(........)$/, 'release-v$1').then(v => env = setVar(env, 'MAINNET_BRANCH', fixupUnique(v))),

    ff('wss://eu-ws-westend.unique.network/', /^(.)(..)(.)$/, 'release-v$1.$2.$3').then(v => env = setVar(env, 'UNIQUEWEST_MAINNET_BRANCH', v)),
    ff('wss://westend-asset-hub-rpc.polkadot.io/', /^(.......)$/, 'bad-branch-v$1').then(v => env = setVar(env, 'WESTEND_ASSETHUB_BUILD_BRANCH', v)),
    ff('wss://ws-opal.unique.network/', /^(........)$/, 'release-v$1').then(v => env = setVar(env, 'MAINNET_BRANCH', fixupUnique(v))),

    ff('wss://rpc.astar.network/', /^(.+)$/, (_, r) => {
      switch (r) {
        case '55': return 'v5.3.0';
        case '57': return 'v5.4.0';
        case '61': return 'v5.11.0';
        case '66': return 'v5.18.0';
        case '88': return 'v5.39.1';
        default: throw new Error('unknown astar branch for runtime ' + r);
      }
    }).then(v => env = setVar(env, 'ASTAR_BUILD_BRANCH', v)),
    ff('wss://shiden.api.onfinality.io/public-ws', /^(.+)$/, (_, r) => {
      switch (r) {
        case '90': return 'v4.49.0';
        case '96': return 'v5.4.0';
        case '100': return 'v5.10.0';
        case '104': return 'v5.15.0';
        case '106': return 'v5.18.0';
        case '127': return 'v5.39.1';
        default: throw new Error('unknown shiden branch for runtime ' + r);
      }
    }).then(v => env = setVar(env, 'SHIDEN_BUILD_BRANCH', v)),
  ]);
  console.log(env);
})().catch(e => {
  console.error('Fatal');
  console.error(e.stack);
  process.exit(1);
});
