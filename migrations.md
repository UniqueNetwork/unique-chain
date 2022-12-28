# **936041 < 930032**

### **pallet-collator-selection:**

* Added use of Collator Selection pallet, along with Session, Authorship, and Identity:
    * Aura authorities become Collator Selection's invulnerables
    * Session keys are put, and the first session is started

# **930032 < 924010**

### **pallet-common:**

* Removed the previous migration of:
    * if the storage version is below 1, all collections from storage **CollectionById** of struct **Collection** version 1 to version 2, consisting of:
        * displacing _offchain_schema, variable_on_chain_schema, const_on_chain_schema, schema_version_ into _properties_
        * displacing _acccess, mint_mode_ into _permissions.access, permissions.mint_mode_
        * adding _external_collection_ flag
* Added unconditional bump of the storage version to 1
* Replaced returned weight `0` with `Weight::zero()`

### **pallet-nonfungible:**

* Removed the previous migration of:
    * if the storage version is below 1, all items from storage **TokenData** of struct **ItemData** version 1 to version 2, consisting of:
        * displacing _const_data, variable_data_ into _properties_
        * adding permission for the collection admin to set the immutable __old_constData_ property
* Added unconditional bump of the storage version to 1
* Replaced returned weight `0` with `Weight::zero()`

### **pallet-refungible:**

* Removed the previous migration of:
    * if the storage version is below 1, all items from storage **TokenData** of struct **ItemData** version 1 to version 2, consisting of:
        * removing _variable_data_
* Added:
    * if the storage version is below 2, cleaning of all storage of now-redundant **TokenData** 
    * unconditional bump of the storage version to 2
* Replaced returned weight `0` with `Weight::zero()`

### **pallet-unique:**

* Removed the previous migration of:
    * unconditional cleaning of all storage of **VariableMetaDataBasket** (cache for sponosoring setting deprecated variable metadata)
