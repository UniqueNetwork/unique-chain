#!/bin/bash
service parachain-rococo-greg stop
service parachain-rococo-ferdie stop
service parachain-rococo-eve stop
service parachain-rococo-dave stop
service parachain-rococo-charlie stop
service parachain-rococo-bob stop
service parachain-rococo-alice stop

sleep 15

rm -rfv /var/local/nft-parachain/rococo/
