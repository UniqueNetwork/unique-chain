#!/bin/bash
service parachain-rococo-greg stop
sleep 5

service parachain-rococo-ferdie stop
sleep 5

service parachain-rococo-eve stop
sleep 5

service parachain-rococo-dave stop
sleep 5

service parachain-rococo-charlie stop
sleep 5

service parachain-rococo-bob stop
sleep 5

service parachain-rococo-alice stop
sleep 15

rm -rfv /var/local/nft-parachain/rococo/
