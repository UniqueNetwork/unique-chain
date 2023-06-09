// Copyright 2019-2023 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {ApiPromise} from '@polkadot/api';
import {blake2AsHex, cryptoWaitReady} from '@polkadot/util-crypto';
import zombie from '@zombienet/orchestrator/dist';
import {readNetworkConfig} from '@zombienet/utils/dist';
import {resolve} from 'path';
import {usingPlaygrounds} from '.';
import {migrations} from './frankensteinMigrate';
import fs from 'fs';

const ZOMBIENET_CREDENTIALS = process.env.ZOMBIENET_CREDENTIALS || '../.env';
const NETWORK_CONFIG_FILE = process.argv[2] ?? '../launch-zombienet.toml';
const PARA_DIR = process.env.PARA_DIR || '../';
const RELAY_DIR = process.env.RELAY_DIR || '../../polkadot/';
const REPLICA_FROM = process.env.REPLICA_FROM || 'wss://ws-opal.unique.network:443';
const NEW_RELAY_BIN = process.env.NEW_RELAY_BIN;
const NEW_RELAY_WASM = process.env.NEW_RELAY_WASM;
const NEW_PARA_BIN = process.env.NEW_PARA_BIN;
const NEW_PARA_WASM = process.env.NEW_PARA_WASM;
const PARACHAIN_BLOCK_TIME = 12_000;
const SUPERUSER_KEY = '//Alice';

let network: zombie.Network | undefined;

// Stop the network if it is running
const stop = async () => {
  await network?.stop();
};

// Promise of a timeout
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Countdown with time left on display
async function waitWithTimer(time: number) {
  const secondsTotal = Math.ceil(time / 1000);
  for(let i = secondsTotal; i > 0; i--) {
    // could also introduce hours, but wth
    const seconds = i % 60;
    const text = `Time left: ${Math.floor(i / 60)}:${seconds < 10 ? '0' + seconds : seconds}`;
    if(process.stdout.isTTY)
      process.stdout.write(text);
    else if(seconds % 10 == 0)
      console.log(text);
    await delay(1000);
    if(process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }
}

// Get the runtime's current version
function getSpecVersion(api: ApiPromise): number {
  return (api.consts.system.version as any).specVersion.toNumber();
}

// Get the required information on the relay chain
function getRelayInfo(api: ApiPromise): {specVersion: number, epochBlockLength: number, blockTime: number, epochTime: number} {
  const info = {
    specVersion: getSpecVersion(api),
    epochBlockLength: (api.consts.babe.epochDuration as any).toNumber(),
    blockTime: (api.consts.babe.expectedBlockTime as any).toNumber(),
    epochTime: 0,
  };
  info.epochTime = info.epochBlockLength * info.blockTime;
  return info;
}

// Enable or disable maintenance mode if present on the chain
async function toggleMaintenanceMode(value: boolean, wsUri: string) {
  await usingPlaygrounds(async (helper, privateKey) => {
    const superuser = await privateKey(SUPERUSER_KEY);
    try {
      const toggle = value ? 'enable' : 'disable';
      await helper.getSudo().executeExtrinsic(superuser, `api.tx.maintenance.${toggle}`, []);
      console.log(`Maintenance mode ${value ? 'engaged' : 'disengaged'}.`);
    } catch (e) {
      console.error('Couldn\'t set maintenance mode. The maintenance pallet probably does not exist. Log:', e);
    }
  }, wsUri);
}

const raiseZombienet = async (): Promise<void> => {
  const isUpgradeTesting = !!NEW_RELAY_BIN || !!NEW_RELAY_WASM || !!NEW_PARA_BIN || !!NEW_PARA_WASM;
  /*
  // If there is nothing to upgrade, what is the point
  if (!isUpgradeTesting) {
    console.warn('\nNeither the relay nor the parachain were selected for an upgrade! ' +
      'Please pass environment vars `NEW_RELAY_BIN`, `NEW_RELAY_WASM`, `NEW_PARA_BIN`, `NEW_PARA_WASM`.');
    process.exit(1);
  }
  */

  // an unsavory practice, but very convenient, mwahahah
  process.env.PARA_DIR = PARA_DIR;
  process.env.RELAY_DIR = RELAY_DIR;
  process.env.REPLICA_FROM = REPLICA_FROM;

  const configPath = resolve(NETWORK_CONFIG_FILE);
  const networkConfig = readNetworkConfig(configPath);
  // console.log(networkConfig);
  if(networkConfig.settings.provider !== 'native') {
    throw new Error(`Oh no! Expected native network, got ${networkConfig.settings.provider}.`);
  }

  await cryptoWaitReady();

  // Launch Zombienet!
  network = await zombie.start(ZOMBIENET_CREDENTIALS, networkConfig, {silent: false});

  // Get the relay chain info like the epoch length and spec version
  // Then restart each parachain's binaries
  // // Stop and restart each node
  // // Send specified keys to parachain nodes in case the parachain requires it
  // If it is not needed to upgrade runtimes themselves, the job is done!

  // Record some required information regarding the relay chain
  await network.relay[0].connectApi();
  let relayInfo = getRelayInfo((network.relay[0] as any).apiInstance!);
  await network.relay[0].apiInstance!.disconnect();
  if(isUpgradeTesting) {
    console.log('Relay stats:', relayInfo);
  }

  // non-exported functionality of NativeClient
  const networkClient = (network.client as any);

  if(NEW_RELAY_BIN) {
    console.log('\n🧶 Restarting relay nodes');

    for(const [index, node] of network.relay.entries()) {
      await node.apiInstance?.disconnect();

      console.log(`\n🚦 Starting timeout for the epoch change (node ${index + 1}/${network.relay.length})...`);
      await waitWithTimer(relayInfo.epochTime);

      // Replace the node-starting command with the new binary
      const cmd = networkClient.processMap[node.name].cmd[0].split(' ')[0];
      networkClient.processMap[node.name].cmd = networkClient.processMap[node.name].cmd.map((arg: string) => arg.replace(cmd, NEW_RELAY_BIN));

      await node.restart();
    }

    console.log('\n🌒 All relay nodes restarted with the new binaries.');
  }

  if(NEW_PARA_BIN) {
    for(const paraId in network.paras) {
      const para = network.paras[paraId];
      console.log(`\n🧶 Restarting collator nodes of parachain ${paraId}`);

      for(const [_index, node] of para.nodes.entries()) {
        await node.apiInstance?.disconnect();

        // Replace the node-starting command with the new binary
        const cmd = networkClient.processMap[node.name].cmd[0].split(' ')[0];
        networkClient.processMap[node.name].cmd = networkClient.processMap[node.name].cmd.map((arg: string) => arg.replace(cmd, NEW_PARA_BIN));

        await node.restart();
        // applyaurakey?
        // Zombienet handles it on first-time node creation
      }
    }

    console.log('\n🌗 All parachain collators restarted with the new binaries.');
  }

  // Re-establish connection to the relay node and get the runtime upgrade validation delay for parachains
  // For the relay, connect and set the new runtime code
  // For each parachain, connect, authorize and upgrade its runtime
  // Ping the the chains for the runtime upgrade after the minimal time and then every few blocks
  // // For each parachain, re-connect and verify that the runtime upgrade is successful

  let relayUpgradeCompleted = false, paraUpgradeCompleted = false;

  if(NEW_RELAY_WASM) {
    const relayOldVersion = relayInfo.specVersion;
    console.log('\n🚦 Starting timeout for the next epoch before upgrading the relay runtime code...');
    await waitWithTimer(relayInfo.epochTime);

    console.log('--- Upgrading the relay chain runtime \t---');

    // Read the new WASM code and set it as the relay's new code
    const code = fs.readFileSync(NEW_RELAY_WASM).toString('hex');
    await usingPlaygrounds(async (helper, privateKey) => {
      const superuser = await privateKey(SUPERUSER_KEY);

      const result = await helper.executeExtrinsic(
        superuser,
        'api.tx.sudo.sudoUncheckedWeight',
        [helper.constructApiCall('api.tx.system.setCode', [`0x${code}`]), {}],
      );

      if(result.status == 'Fail') {
        console.error('Failed to upgrade the runtime:', result);
      }

      // Get the updated information from the relay's new runtime
      relayInfo = getRelayInfo(helper.getApi());
    }, network.relay[0].wsUri);

    if(relayOldVersion != relayInfo.specVersion) {
      // eslint-disable-next-line no-useless-escape
      console.log(`\n\🛰️ The relay has successfully upgraded from version ${relayOldVersion} to ${relayInfo.specVersion}!`);
      relayUpgradeCompleted = true;
    } else {
      console.error(`\nThe relay did not upgrade from version ${relayOldVersion}!`);
    }
  } else {
    // If the relay did not need to be upgraded, it's already technically completed
    relayUpgradeCompleted = true;
  }

  if(NEW_PARA_WASM) {
    let codeValidationDelayBlocks = 0;
    const upgradingParas: {[id: string]: {version: number, upgraded: boolean}} = {};
    // Calculate the code validation delay of the relay chain,
    // so that we know how much to wait before the parachains can be upgraded after the extrinsic
    await usingPlaygrounds(async (helper) => {
      const {validationUpgradeDelay, minimumValidationUpgradeDelay} =
        (await helper.callRpc('api.query.configuration.activeConfig', [])).toJSON() as any;

      codeValidationDelayBlocks = Math.max(validationUpgradeDelay ?? 0, minimumValidationUpgradeDelay ?? 0);
    }, network.relay[0].wsUri);

    // Wait for the next epoch so that the parachains will start cooperating with the relay
    if(relayUpgradeCompleted && NEW_RELAY_WASM) {
      console.log('\n🚥 Starting timeout for the next epoch before upgrading the parachains code...');
      await waitWithTimer(relayInfo.epochTime);
    }

    const migration = migrations[process.env.DESTINATION_SPEC_VERSION!];
    for(const paraId in network.paras) {
      console.log(`\n--- Upgrading the runtime of parachain ${paraId} \t---`);
      const para = network.paras[paraId];

      // Enable maintenance mode if present
      await toggleMaintenanceMode(true, para.nodes[0].wsUri);
      if(migration) await migration.before();

      // Read the WASM code and authorize the upgrade with its hash and set it as the new runtime
      const code = fs.readFileSync(NEW_PARA_WASM);
      const codeHash = blake2AsHex(code);
      await usingPlaygrounds(async (helper, privateKey) => {
        const superuser = await privateKey(SUPERUSER_KEY);

        upgradingParas[paraId] = {version: getSpecVersion(helper.getApi()), upgraded: false};

        console.log('--- Authorizing the parachain runtime upgrade \t---');
        let result = await helper.executeExtrinsic(
          superuser,
          'api.tx.sudo.sudoUncheckedWeight',
          [helper.constructApiCall('api.tx.parachainSystem.authorizeUpgrade', [codeHash, false]), {}],
        );

        if(result.status == 'Fail') {
          console.error('Failed to authorize the upgrade:', result);
          return;
        }

        console.log('--- Enacting the parachain runtime upgrade \t---');
        result = await helper.executeExtrinsic(
          superuser,
          'api.tx.sudo.sudoUncheckedWeight',
          [helper.constructApiCall('api.tx.parachainSystem.enactAuthorizedUpgrade', [`0x${code.toString('hex')}`]), {}],
        );

        if(result.status == 'Fail') {
          console.error('Failed to upgrade the runtime:', result);
        }
      }, para.nodes[0].wsUri);
    }

    // Check the upgrades of the parachains, first after the minimum code validation delay, and then after some block time increments
    let firstPass = true;
    for(let attempt = 0; attempt < 3 && !paraUpgradeCompleted; attempt++) {
      if(firstPass) {
        console.log('\nCode validation delay:', codeValidationDelayBlocks, 'blocks');
        console.log('🚥 Waiting for the minimum code validation delay before the parachain can upgrade...');
        await waitWithTimer(relayInfo.blockTime * codeValidationDelayBlocks);
        firstPass = false;
      } else {
        console.log('\n🚥 Waiting for a few blocks more to verify that the parachain upgrades are successful...');
        await waitWithTimer(PARACHAIN_BLOCK_TIME * 3);
      }

      // Ping the parachains' nodes for new runtime versions
      let upgradeFailed = false;
      for(const paraId in network.paras) {
        if(upgradingParas[paraId].upgraded) continue;

        const para = network.paras[paraId];
        // eslint-disable-next-line require-await
        await usingPlaygrounds(async (helper) => {
          const specVersion = getSpecVersion(helper.getApi());

          if(specVersion != upgradingParas[paraId].version) {
            // eslint-disable-next-line no-useless-escape
            console.log(`\n\🛰️  Parachain ${paraId} has successfully upgraded from version ${upgradingParas[paraId].version} to ${specVersion}!`);
            upgradingParas[paraId].upgraded = true;
          } else {
            console.error(`\nParachain ${paraId} failed to upgrade from version ${upgradingParas[paraId].version}!`);
            upgradeFailed = true;
          }
        }, para.nodes[0].wsUri);

        paraUpgradeCompleted = !upgradeFailed;
      }
    }

    // Disable maintenance mode if present
    for(const paraId in network.paras) {
      // TODO only if our parachain
      if(migration) await migration.after();
      await toggleMaintenanceMode(false, network.paras[paraId].nodes[0].wsUri);
    }
  } else {
    // If the relay did not need to be upgraded, it's already technically completed
    paraUpgradeCompleted = true;
  }

  // await network.stop();

  if(isUpgradeTesting) {
    if(paraUpgradeCompleted && relayUpgradeCompleted) {
      console.log("\n🛸 PARACHAINS' RUNTIME UPGRADE TESTING COMPLETE 🛸");
    } else {
      console.error("\n🚧 PARACHAINS' RUNTIME UPGRADE TESTING FAILED 🚧");
    }
  } else {
    console.log('🚀 ZOMBIENET RAISED 🚀');
  }
};

raiseZombienet()/*.then(async () => await stop())*/.catch(async (e) => {
  console.error(e);
  await stop();
  process.exit(1);
});
