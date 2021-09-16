#!/bin/bash
service relay-rococo-ferdie stop
service relay-rococo-eve stop
service relay-rococo-dave stop
service relay-rococo-charlie stop
service relay-rococo-bob stop
service relay-rococo-alice stop

sleep 15

rm -rfv /var/local/rococo/
