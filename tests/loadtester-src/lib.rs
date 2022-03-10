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

// Original License
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod loadtester {
    use ink_storage::collections::Vec as InkVec;

    #[ink(storage)]
    pub struct LoadTester {
        vector: InkVec<u64>,
    }

    impl LoadTester {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                vector: InkVec::new(),
            }
        }

        #[ink(message)]
        pub fn bloat(&mut self, count: u64){
            for i in 1..count+1 {
                self.vector.push(i);
            }
        }

        #[ink(message)]
        pub fn get(&self) -> u128 {
            let mut sum: u128 = 0;
            for num in self.vector.iter() {
                sum += *num as u128;
            }
            sum
        }
    }

    #[cfg(test)]
    mod tests {
       
        use super::*;

        #[test]
        fn it_works() {
            let mut lt = LoadTester::new();
            lt.bloat(4);
            assert_eq!(lt.get(), [1,2,3,4]);
            lt.bloat(3);
            assert_eq!(lt.get(), [1,2,3,4,1,2,3]);
        }
    }
}
