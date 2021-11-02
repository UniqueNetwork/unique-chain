const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const config = require('./config');
var BigNumber = require('bn.js');
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
  // Test NFT
  const name = [0x54, 0x65, 0x73, 0x74, 0x20, 0x4e, 0x46, 0x54];
  // Test NFT Collection
  const description = [0x54, 0x65, 0x73, 0x74, 0x20, 0x4e, 0x46, 0x54, 0x20, 0x43, 0x6f, 0x6c, 0x6c, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e];
  // TestNFT
  const tokenPrefix = [0x54, 0x65, 0x73, 0x74, 0x4e, 0x46, 0x54];

  // Mode: NFT
  const tx = api.tx.nft.createCollection(name, description, tokenPrefix, {"NFT": config.collectionDataSize});
  await submitTransaction(alice, tx);

  const collectionId = 1;

  const tx2 = api.tx.nft.setOffchainSchema(collectionId, "https://ipfs-gateway.usetech.com/ipfs/QmVdFFZjnq6i3fNDjm6FQe2tfAtUDnqMNkBh8e4sYWUmbH/images/image{id}.png");
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
