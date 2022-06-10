#!/usr/bin/env sh

./update_types.sh

if [ ! -d polkadot-apps ]; then
	git clone git@github.com:polkadot-js/apps.git polkadot-apps --depth=1
fi

pushd polkadot-apps
yarn link ../unique-types-js
popd