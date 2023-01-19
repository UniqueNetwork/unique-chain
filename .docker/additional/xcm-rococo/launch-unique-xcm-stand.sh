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

# CHAIN=quartz
# export $CHAIN

export PATH="$PATH:$HOME/.local/bin"

for i in `cat .env`; do export $i; done

j2 Dockerfile-xcm-unique-rococo.temp > Dockerfile-xcm-unique-rococo
#cat Dockerfile-xcm-unique-rococo.tmp | envsubst > Dockerfile-xcm-unique-rococo
#exit
docker-compose -f ./docker-compose-xcm-unique-rococo.yml up -d
