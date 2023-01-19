#!/bin/bash

export BRANCH=feature/xcm-local-stand

echo "BRANCH="$BRANCH

pip install j2cli

# CHAIN=quartz
# export $CHAIN
export PATH="$PATH:$HOME/.local/bin"

for i in `cat .env`; do export $i; done

j2 Dockerfile-xcm-quartz-rococo.temp > Dockerfile-xcm-quartz-rococo
#cat Dockerfile-xcm-quartz-rococo.tmp | envsubst > Dockerfile-xcm-quartz-rococo
#exit
docker-compose -f ./docker-compose-xcm-quartz-rococo.yml up -d
