#!/bin/bash
/opt/parity/polkadot build-spec --chain westend-local --disable-default-bootnode --raw > /opt/parity/westend-local.json

service relay-westend-alice start
sleep 15

service relay-westend-bob start
sleep 15

service relay-westend-charlie start
sleep 15

service relay-westend-dave start
