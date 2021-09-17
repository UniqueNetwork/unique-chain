#!/bin/bash
/opt/parity/polkadot build-spec --chain /opt/parity/chain-specs/westend-local-v0.9.9-source.json --disable-default-bootnode --raw > /opt/parity/chain-specs/westend-local-v0.9.9.json

service relay-westend-alice start
sleep 5

service relay-westend-bob start
sleep 5

service relay-westend-charlie start
sleep 5

service relay-westend-dave start
sleep 5

service relay-westend-eve start
sleep 5

service relay-westend-ferdie start
