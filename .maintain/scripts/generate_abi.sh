#!/bin/sh
set -eu

dir=$PWD

tmp=$(mktemp -d)
cd $tmp
cp $dir/$INPUT input.sol
solcjs --abi -p input.sol

NAME=input_sol_$(basename $INPUT .sol)
mv $NAME.abi $NAME.json
prettier $NAME.json > $dir/$OUTPUT
