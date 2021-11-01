const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
const fs = require('fs');

const collectionId = 1;

function checkOwner(owner) {
  for (let i=0; i<32; i++) {
    if (owner[i] != 0) return true;
  }
  return false;
}

function mintAsync(api, admin) {
  return new Promise(async function(resolve, reject) {
    const unsub = await api.tx.nft
      .createItem(collectionId, "0x", admin.address)
      .signAndSend(admin, (result) => {
        console.log(`Current tx status is ${result.status}`);

        if (result.status.isInBlock) {
          console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
          resolve();
          unsub();
        } else if (result.status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
          resolve();
          unsub();
        }
      });
  });
}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);

  // Create the API and wait until ready
  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion, collection] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
    api.query.nft.collection(collectionId)
  ]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
  console.log(`Collection: ${collection}`);

  if (checkOwner(collection.owner.toString())) {
    // Import account from mnemonic phrase in config file
    const keyring = new Keyring({ type: 'sr25519' });
    const owner = keyring.addFromUri(config.ownerSeed);
    console.log("Owner address: ", owner.address)

    // Create Tokens
    for (let i=0; i<config.totalTokens; i++) {
      console.log(`=== Importing Token ${i+1} of ${config.totalTokens} ===`);

      // Mint
      await mintAsync(api, owner);
    }

  }
  else {
    console.log("\nERROR: Collection not found.\nCheck the ID and make sure you have created collection and set the admin");
  }

}

main().catch(console.error).finally(() => process.exit());
