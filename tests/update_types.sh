#!/usr/bin/env sh

yarn polkadot-types

cd ../..
if [ ! -f unique-types-js ]; then
	git clone git@github.com:UniqueNetwork/unique-types-js.git
fi

rsync -ar --delete unique-chain/tests/src/interfaces/ unique-types-js/src/interfaces
for file in unique-types-js/src/interfaces/augment-*; do
	sed -i '1s;^;//@ts-nocheck\n;' $file
done

cd unique-types-js
git add src/interfaces/
git commit -m "chore: regenerate types"
cd ../unique-chain/tests