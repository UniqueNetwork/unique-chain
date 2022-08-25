# EVM Contract Helpers

This pallet extends pallet-evm contracts with several new functions.

## Overview

Evm contract helpers pallet provides ability to

- Tracking and getting of user, which deployed contract
- Sponsoring EVM contract calls (Make transaction calls to be free for users, instead making them being paid from contract address)
- Allowlist access mode

As most of those functions are intented to be consumed by ethereum users, only API provided by this pallet is [ContractHelpers magic contract](./src/stubs/ContractHelpers.sol)