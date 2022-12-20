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
import {deserializeStaker, StakedBalance} from './helpers';

function main() {
  const balances: StakedBalance[] = JSON
    .parse(fs.readFileSync(path.resolve(__dirname, 'balances.json')).toString())
    .map(deserializeStaker);
  const LOWER = 200350525400000000000n;
  const UPPER = 200363000000000000000n;
  // const UPPER = 100350525400000000000n;
  
  // Get accounts with a
  balances.forEach((balance) => {
    console.log(balance.address, balance.stakes.length);

    // expect(balance.balance.miscFrozen).to.eq(balance.balance.feeFrozen);
    // expect(balance.balance.miscFrozen - LOWER > 0n).to.be.true;
    // expect(balance.balance.miscFrozen - UPPER < 0n).to.be.true;
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