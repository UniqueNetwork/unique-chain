#!/usr/bin/env sh

set -eux

./update_apps.sh

pushd polkadot-apps
yarn start
popd
