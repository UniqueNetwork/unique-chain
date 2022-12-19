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
  
  // Get accounts with a
  // balances.forEach((balance: any) => {
  //   if (balance.stakes.length === 1) {
  //     if(BigInt(balance.stakes[0].amount) - 100050000000000000000n > 2500000000000000n) console.log(balance.address, balance.stakes[0].amount);
  //     // if(BigInt(balance?.stakes[0].amount) - 100050000000000000000n < 0n) console.log(balance.address, balance.stakes[0].amount);
  //   }
  // });

}

main();