#!/bin/sh
set -eu

dir=$PWD

tmp=$(mktemp -d)
cd $tmp
cp $dir/$INPUT input.sol
solcjs --optimize --bin input.sol

mv input_sol_$(basename $OUTPUT .raw).bin out.bin
xxd -r -p out.bin out.raw

mv out.raw $dir/$OUTPUT