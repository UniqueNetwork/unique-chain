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
