#!/usr/bin/env sh

./update_apps.sh

pushd polkadot-apps
yarn start
popd