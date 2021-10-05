#!/bin/bash

/opt/usetech/nft build-spec --chain=/opt/usetech/chain-specs/nft-westend-local-v0.9.9-source.json --raw --disable-default-bootnode > /opt/usetech/chain-specs/nft-westend-local-v0.9.9.json
/opt/usetech/nft export-genesis-state --chain /opt/usetech/chain-specs/nft-westend-local-v0.9.9.json > /opt/usetech/nft-parachain-2000-genesis
/opt/usetech/nft export-genesis-wasm --chain /opt/usetech/chain-specs/nft-westend-local-v0.9.9.json > /opt/usetech/nft-parachain-2000-wasm


service parachain-westend-alice start
sleep 5

service parachain-westend-bob start
sleep 5

service parachain-westend-charlie start
sleep 5

service parachain-westend-dave start
sleep 5

service parachain-westend-eve start
sleep 5

service parachain-westend-ferdie start
sleep 5

service parachain-westend-greg start
