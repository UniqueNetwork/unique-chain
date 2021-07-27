contract ContractHelpers {
    uint8 _dummmy = 0;
    address _dummy_addr = 0x0000000000000000000000000000000000000000;
	string stub_error = "this contract does not exists, contract helpers are implemented on substrate chain side";

    function contractOwner(address contract_address) public view returns (address) {
        require(false, stub_error);
        contract_address;
        return _dummy_addr;
    }
    
    function sponsoringEnabled(address contract_address) public view returns (bool) {
        require(false, stub_error);
        contract_address;
        _dummmy;
        return false;
    }
    
    function toggleSponsoring(address contract_address, bool enabled) public {
        require(false, stub_error);
        contract_address;
        enabled;
        _dummmy = 0;
    }
    
    function toggleAllowlist(address contract_address, bool enabled) public {
        require(false, stub_error);
        contract_address;
        enabled;
        _dummmy = 0;
    }
    
    function toggleAllowed(address contract_address, address user, bool allowed) public {
        require(false, stub_error);
        contract_address;
        user;
        allowed;
        _dummmy = 0;
    }
}