const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
const fs = require('fs');

function submitTransaction(sender, transaction) {
  return new Promise(async function(resolve, reject) {
    try {
      const unsub = await transaction
      .signAndSend(sender, (result) => {
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
    }
    catch (e) {
      reject(e.toString());
    }
  });
}

async function createCollectionAsync(api, alice) {
  // Artwork
  const name = [65, 114, 116, 119, 111, 114, 107];
  // Collection of photos
  const description = [67, 111, 108, 108, 101, 99, 116, 105, 111, 110, 32, 111, 102, 32, 112, 104, 111, 116, 111, 115];
  // ART
  const tokenPrefix = [65, 82, 84];

  // Mode: Re-Fungible
  const tx = api.tx.nft.createCollection(name, description, tokenPrefix, {"ReFungible": [config.collectionDataSize, config.decimalPoints]});
  await submitTransaction(alice, tx);

  const tx2 = api.tx.nft.setOffchainSchema(2, "https://ipfs-gateway.usetech.com/ipfs/QmUSv64cUmL2m44QYkUFWmH89qykC8VLPFwjhpeAScjejS/image{id}.jpg");
  await submitTransaction(alice, tx2);
}

async function main() {
  // Initialise the provider to connect to the node
  const wsProvider = new WsProvider(config.wsEndpoint);
  // Create the API and wait until ready
  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  // Owners's keypair
  const keyring = new Keyring({ type: 'sr25519' });
  const owner = keyring.addFromUri(config.ownerSeed);
  console.log("Collection owner address: ", owner.address);

  // Create collection as owner
  console.log("=== Create collection ===");
  await createCollectionAsync(api, owner);

}

main().catch(console.error).finally(() => process.exit());
