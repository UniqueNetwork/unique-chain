#!/usr/bin/env sh

set -eux

yarn polkadot-types

if [ ! -d unique-types-js ]; then
	git clone git@github.com:UniqueNetwork/unique-types-js.git
fi

rsync -ar --exclude .gitignore src/interfaces/ unique-types-js
for file in unique-types-js/augment-* unique-types-js/**/types.ts unique-types-js/registry.ts; do
	sed -i '1s;^;//@ts-nocheck\n;' $file
done
