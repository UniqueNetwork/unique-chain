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

j2 Dockerfile-xcm-quartz-rococo.temp > Dockerfile-xcm-quartz-rococo
#cat Dockerfile-xcm-quartz-rococo.tmp | envsubst > Dockerfile-xcm-quartz-rococo
#exit
docker-compose -f ./docker-compose-xcm-quartz-rococo.yml up -d
