#!/bin/bash
service parachain-westend-greg stop
service parachain-westend-ferdie stop
service parachain-westend-eve stop
service parachain-westend-dave stop
service parachain-westend-charlie stop
service parachain-westend-bob stop
service parachain-westend-alice stop

sleep 15

rm -rfv /var/local/nft-parachain/westend/
