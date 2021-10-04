#!/bin/bash
#/opt/usetech/nft build-spec --disable-default-bootnode > /opt/usetech/chain-specs/nft-rococo-local-v0.9.10-source.json
/opt/usetech/nft build-spec --chain /opt/usetech/chain-specs/nft-rococo-local-v0.9.10-source.json --raw --disable-default-bootnode > /opt/usetech/chain-specs/nft-rococo-local-v0.9.10.json
/opt/usetech/nft export-genesis-state --chain /opt/usetech/chain-specs/nft-rococo-local-v0.9.10.json > /opt/usetech/nft-parachain-2000-genesis
/opt/usetech/nft export-genesis-wasm --chain /opt/usetech/chain-specs/nft-rococo-local-v0.9.10.json > /opt/usetech/nft-parachain-2000-wasm

service parachain-rococo-alice start
sleep 5

service parachain-rococo-bob start
sleep 5

service parachain-rococo-charlie start
sleep 5

service parachain-rococo-dave start
sleep 5

service parachain-rococo-eve start
sleep 5

service parachain-rococo-ferdie start
sleep 5

service parachain-rococo-greg start
