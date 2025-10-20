import {readFile, writeFile} from 'fs/promises';
import {encodeAddress, addressToEvm} from '@polkadot/util-crypto';
import {u8aToHex} from '@polkadot/util';
import {  } from 'fs';

const accounts = JSON.parse((await readFile(`../scripts/currencyDistribution/balances.json`, "utf8")).toString());

let result = {} as any;
for (let hexAddress in accounts) {
    if (accounts[hexAddress].data.free == 0)
        continue;
    const subAddress = encodeAddress(hexAddress);
    const evmAddress = u8aToHex(addressToEvm(subAddress));
    result[evmAddress] = accounts[hexAddress].data.free;
}

await writeFile(`../scripts/currencyDistribution/balances.out.json`, JSON.stringify(result));
