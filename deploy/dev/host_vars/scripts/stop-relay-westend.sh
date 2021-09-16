#!/bin/bash
service relay-westend-dave stop
sleep 5

service relay-westend-charlie stop
sleep 5

service relay-westend-bob stop
sleep 5

service relay-westend-alice stop
sleep 15

rm -rfv /var/local/westend/dave/chains/westend_local_testnet/db
rm -rfv /var/local/westend/dave/chains/westend_local_testnet/keystore

rm -rfv /var/local/westend/charlie/chains/westend_local_testnet/db
rm -rfv /var/local/westend/charlie/chains/westend_local_testnet/keystore

rm -rfv /var/local/westend/bob/chains/westend_local_testnet/db
rm -rfv /var/local/westend/bob/chains/westend_local_testnet/keystore

rm -rfv /var/local/westend/alice/chains/westend_local_testnet/db
rm -rfv /var/local/westend/alice/chains/westend_local_testnet/keystore
