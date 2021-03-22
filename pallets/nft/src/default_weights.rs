use frame_support::weights::{Weight, constants::RocksDbWeight as DbWeight};

impl crate::WeightInfo for () {
	fn create_collection() -> Weight {
		(70_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(7 as Weight))
			.saturating_add(DbWeight::get().writes(5 as Weight))
	}
	fn destroy_collection() -> Weight {
		(90_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(2 as Weight))
			.saturating_add(DbWeight::get().writes(5 as Weight))
	}
	fn add_to_white_list() -> Weight {
		(30_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(3 as Weight))
			.saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn remove_from_white_list() -> Weight {
		(35_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(3 as Weight))
			.saturating_add(DbWeight::get().writes(1 as Weight))
	}
	fn set_public_access_mode() -> Weight {
		(27_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(1 as Weight))
			.saturating_add(DbWeight::get().writes(1 as Weight))
	}
	fn set_mint_permission() -> Weight {
		(27_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(1 as Weight))
			.saturating_add(DbWeight::get().writes(1 as Weight))
	}
	fn change_collection_owner() -> Weight {
		(27_000_000 as Weight)
			.saturating_add(DbWeight::get().reads(1 as Weight))
			.saturating_add(DbWeight::get().writes(1 as Weight))
	}
	fn add_collection_admin() -> Weight {
        (32_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(3 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
	}
	fn remove_collection_admin() -> Weight {
		(50_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_collection_sponsor() -> Weight {
		(32_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }  
    fn confirm_sponsorship() -> Weight {
		(22_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(1 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }  
    fn remove_collection_sponsor() -> Weight {
		(24_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(1 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }  
    fn create_item(s: usize, ) -> Weight {
        (130_000_000 as Weight)
            .saturating_add((2135 as Weight).saturating_mul(s as Weight).saturating_mul(500 as Weight)) // 500 is temporary multiplier, fee for storage
            .saturating_add(DbWeight::get().reads(10 as Weight))
            .saturating_add(DbWeight::get().writes(8 as Weight))
    }  
    fn burn_item() -> Weight {
		(170_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(9 as Weight))
            .saturating_add(DbWeight::get().writes(7 as Weight))
    }  
    fn transfer() -> Weight {
        (125_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(7 as Weight))
            .saturating_add(DbWeight::get().writes(7 as Weight))
    }  
    fn approve() -> Weight {
        (45_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(3 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn transfer_from() -> Weight {
        (150_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(9 as Weight))
            .saturating_add(DbWeight::get().writes(8 as Weight))
    }
    fn set_offchain_schema() -> Weight {
        (33_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_const_on_chain_schema() -> Weight {
        (11_100_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_variable_on_chain_schema() -> Weight {
        (11_100_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_variable_meta_data() -> Weight {
        (17_500_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn enable_contract_sponsoring() -> Weight {
        (13_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(1 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_schema_version() -> Weight {
        (8_500_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_chain_limits() -> Weight {
        (1_300_000 as Weight)
            .saturating_add(DbWeight::get().reads(0 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn set_contract_sponsoring_rate_limit() -> Weight {
        (3_500_000 as Weight)
            .saturating_add(DbWeight::get().reads(0 as Weight))
            .saturating_add(DbWeight::get().writes(2 as Weight))
    }    
    fn set_variable_meta_data_sponsoring_rate_limit() -> Weight {
        (3_500_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
    fn toggle_contract_white_list() -> Weight {
        (3_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(0 as Weight))
            .saturating_add(DbWeight::get().writes(2 as Weight))
    }    
    fn add_to_contract_white_list() -> Weight {
        (3_000_000 as Weight)
            .saturating_add(DbWeight::get().reads(0 as Weight))
            .saturating_add(DbWeight::get().writes(2 as Weight))
    }    
    fn remove_from_contract_white_list() -> Weight {
        (3_200_000 as Weight)
            .saturating_add(DbWeight::get().reads(0 as Weight))
            .saturating_add(DbWeight::get().writes(2 as Weight))
    }
    fn set_collection_limits() -> Weight {
        (8_900_000 as Weight)
            .saturating_add(DbWeight::get().reads(2 as Weight))
            .saturating_add(DbWeight::get().writes(1 as Weight))
    }
}
