#!/bin/bash
/opt/usetech/nft export-genesis-state --parachain-id 2000 > /opt/usetech/nft-parachain-2000-genesis

/opt/usetech/nft export-genesis-wasm > /opt/usetech/nft-parachain-2000-wasm


service parachain-westend-alice start
sleep 15

service parachain-westend-bob start
