# EVM contract migration pallet

This pallet is only callable by root, it has functionality to migrate contract
from other ethereum chain to pallet-evm

Contract data includes contract code, and contract storage,
where contract storage is a mapping from evm word to evm word (evm word = 32 byte)

To import contract data into pallet-evm admin should call this pallet multiple times:
1. Start migration via `begin`
2. Insert all contract data using single or
   multiple (If data can't be fit into single extrinsic) calls
   to `set_data`
3. Finish migration using `finish`, providing contract code

During migration no one can insert code at address of this contract,
as [`pallet::OnMethodCall`] prevents this, and no one can call this contract,
as code is only supplied at final stage of contract deployment