#!/usr/bin/env sh

if [[ ! -f unique-types-js ]]; then
	git clone git@github.com:UniqueNetwork/unique-types-js.git
fi

yarn polkadot-types

rsync -ar --delete src/interfaces/ unique-types-js/src/interfaces
for file in unique-types-js/src/interfaces/augment-*; do
	sed -i '1s;^;//@ts-nocheck\n;' $file
done

pushd unique-types-js
git add src/interfaces/
git commit -m "chore: regenerate types"
popd
