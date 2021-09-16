#!/bin/bash
#/opt/parity/polkadot build-spec --chain rococo-local --disable-default-bootnode --raw > /opt/parity/rococo-local.json

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
