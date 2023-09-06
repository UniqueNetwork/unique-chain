#!/bin/sh
set -e
BDK_DIR=$(dirname $(readlink -f "$0"))
cd $BDK_DIR/.bdk-env
docker compose down -v --remove-orphans
rm -rf discover.env secret specs
