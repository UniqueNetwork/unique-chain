#!/bin/sh
set -eu

dir=$PWD

tmp=$(mktemp -d)
cd $tmp
mkdir refungible
mkdir api
cp $dir/tests/src/eth/fractionalizer/Fractionalizer.sol refungible/input.sol
cp $dir/tests/src/eth/api/CollectionHelpers.sol api/CollectionHelpers.sol
cp $dir/tests/src/eth/api/ContractHelpers.sol api/ContractHelpers.sol
cp $dir/tests/src/eth/api/UniqueRefungibleToken.sol api/UniqueRefungibleToken.sol
cp $dir/tests/src/eth/api/UniqueRefungible.sol api/UniqueRefungible.sol
cp $dir/tests/src/eth/api/UniqueNFT.sol api/UniqueNFT.sol
solcjs --optimize --bin refungible/input.sol -o $PWD
solcjs --abi -p refungible/input.sol

mv refungible_input_sol_Fractionalizer.bin $dir/tests/src/eth/fractionalizer/Fractionalizer.bin
mv refungible_input_sol_Fractionalizer.abi refungible_input_sol_Fractionalizer.json
prettier refungible_input_sol_Fractionalizer.json > $dir/tests/src/eth/fractionalizer/FractionalizerAbi.json
