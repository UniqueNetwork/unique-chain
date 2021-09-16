#!/bin/bash
service parachain-westend-bob stop
sleep 5

service parachain-westend-alice stop
sleep 15

rm -rfv /var/local/nft-parachain/westend/alice
rm -rfv /var/local/nft-parachain/westend/bob
