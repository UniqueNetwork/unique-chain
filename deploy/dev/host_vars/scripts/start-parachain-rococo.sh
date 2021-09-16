#!/bin/bash
/opt/usetech/nft export-genesis-state --chain /opt/usetech/nft-rococo-local.json > /opt/usetech/nft-parachain-2000-genesis

/opt/usetech/nft export-genesis-wasm --chain /opt/usetech/nft-rococo-local.json > /opt/usetech/nft-parachain-2000-wasm


service parachain-rococo-alice start
#sleep 15

#service parachain-rococo-bob start
#sleep 15

#service parachain-rococo-charlie start
#sleep 15

#service parachain-rococo-dave start
#sleep 15

#service parachain-rococo-eve start
#sleep 15

#service parachain-rococo-ferdie start
#sleep 15

#service parachain-rococo-greg start
