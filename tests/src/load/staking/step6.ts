/* eslint-disable indent */
// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import fs from 'fs';
import path from 'path';

function main() {
  const balances = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'balances.json')).toString());
  const LOWER = 100300375300000000000n;
  const UPPER = 100312000000000000000n;
  // const UPPER = 100350525400000000000n;
  
  // Get accounts with a
  balances.forEach((balance: any) => {
    if (balance.stakes.length === 1) {
      // if(BigInt(balance.stakes[0].amount) < LOWER) console.log(balance.address, balance.stakes[0].amount);
      if(BigInt(balance?.stakes[0].amount) > UPPER) console.log(balance.address, balance.stakes[0].amount);
    } else {
      console.log('balance.stakes.length !== 1', balance.address);
    }
  });

}

function calculateIncome(base: bigint, iter = 0, calcPeriod = 4n): bigint {
  const DAY = 7200n;
  const ACCURACY = 1_000_000_000n;
  // 5n / 10_000n = 0.05% p/day
  const income = base + base * (ACCURACY * (calcPeriod * 5n) / (10_000n * DAY)) / ACCURACY ;
  
  if (iter > 1) {
    return calculateIncome(income, iter - 1, calcPeriod);
  } else return income;
}

// console.log(calculateIncome(100n * (10n**18n), 1, 96550n));

main();