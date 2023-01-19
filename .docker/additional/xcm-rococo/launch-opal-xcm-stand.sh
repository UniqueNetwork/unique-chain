#!/bin/bash

#export BRANCH=$1

echo -n "Set the branch for clone unique-chain: "
read BRANCH

if [ -z ${BRANCH} ]; then
    echo "Ветка для клонирования не задана"
    exit
else
    export BRANCH=$BRANCH
    echo "BRANCH="$BRANCH
fi

pip install j2cli

# CHAIN=opal
# export $CHAIN

export PATH="$PATH:$HOME/.local/bin"

for i in `cat .env`; do export $i; done

j2 Dockerfile-xcm-opal-rococo.temp > Dockerfile-xcm-opal-rococo
#cat Dockerfile-xcm-opal-rococo.tmp | envsubst > Dockerfile-xcm-opal-rococo
#exit
docker-compose -f ./docker-compose-xcm-opal-rococo.yml up -d
