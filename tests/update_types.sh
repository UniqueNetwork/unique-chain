#!/usr/bin/env sh

yarn polkadot-types

if [ ! -d unique-types-js ]; then
	git clone git@github.com:UniqueNetwork/unique-types-js.git
fi

rsync -ar --exclude .gitignore src/interfaces/ unique-types-js
for file in unique-types-js/augment-*; do
	sed -i '1s;^;//@ts-nocheck\n;' $file
done

pushd unique-types-js
git add .
git commit -m "chore: regenerate types"
popd
