#!/bin/bash
#/opt/parity/polkadot build-spec --chain rococo-local --disable-default-bootnode > /opt/parity/chain-specs/rococo-local-v0.9.10-source.json
/opt/parity/polkadot build-spec --chain /opt/parity/chain-specs/rococo-local-v0.9.10-source.json --disable-default-bootnode --raw > /opt/parity/chain-specs/rococo-local-v0.9.10.json

service relay-rococo-alice start
sleep 5

service relay-rococo-bob start
sleep 5

service relay-rococo-charlie start
sleep 5

service relay-rococo-dave start
sleep 5

service relay-rococo-eve start
sleep 5

service relay-rococo-ferdie start
