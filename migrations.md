# **930032 < 930031**

No migration changes.

# **930031 < 929031**

No migration changes.

# **929031 < 929030**

No migration changes.

# **929030 < 927030**

### **pallet-common**

* Replaced returned weight `0` with `Weight::zero()`

### **pallet-nonfungible**

* Replaced returned weight `0` with `Weight::zero()`

### **pallet-refungible**

* Replaced returned weight `0` with `Weight::zero()`

### **pallet-unique**

* Replaced returned weight `0` with `Weight::zero()`

# **927030 < 927020**

No migration changes.

# **927020 < 924020**

No migration changes.

# **924020 < 924012**

### **pallet-refungible**:

* Removed the previous migration:
    * bump of the storage version to 1
* Added:
    * cleaning all storage of now-redundant **TokenData** if the storage version is below 2
    * bump of the storage version to 2

# **924012 < 924011**

### **pallet-unique:**

* Removed the previous migration:
    * forceful cleaning all storage of **VariableMetaDataBasket**, cache for sponosoring setting deprecated variable metadata

# **924011 < 924010**

### **pallet-common:**

* Removed the previous migration:
    * all collections from **Collection** version 1 to version 2, if the storage version is below 1:
        * displacing _offchain_schema, variable_on_chain_schema, const_on_chain_schema, schema_version_ into _properties_
        * displacing _acccess, mint_mode_ into _permissions.access, permissions.mint_mode_
        * adding _external_collection_ flag
* Added forceful bump of the storage version to 1

### **pallet-nonfungible:**

* Removed the previous migration:
    * all items from nonfungible **ItemData** version 1 to version 2, if the storage version is below 1:
        * displacing _const_data, variable_data_ into _properties_
        * adding permission for the collection admin to set the immutable __old_constData_ property
* Added forceful bump of the storage version to 1

### **pallet-refungible:**

* Removed the previous migration:
    * all items from refungible **ItemData** version 1 to version 2, if the storage version is below 1:
        * removing _variable_data_
* Added forceful bump of the storage version to 1