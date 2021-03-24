#!/bin/bash

docker-compose -f docker-compose-tests.yml up -d --build --force-recreate --no-deps

# validate if testing container finished
while [ "$(docker ps | grep unit_test | wc -l)" -ge 1 ]; do echo "Unit test in process" && date && sleep 60; done && docker logs unit_test &> /home/polkadot/unit_test.log  & \
while [ "$(docker ps | grep integration_test | wc -l)" -ge 1 ]; do echo "Integration test in process" && sleep 60; done && docker logs integration_test &> /home/polkadot/integration_test.log
docker-compose -f docker-compose-tests.yml down -v
echo "Wrokflow finished"
docker system prune --force