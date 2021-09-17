#!/bin/bash
service relay-westend-ferdie stop
service relay-westend-eve stop
service relay-westend-dave stop
service relay-westend-charlie stop
service relay-westend-bob stop
service relay-westend-alice stop
sleep 15

rm -rfv /var/local/westend/
