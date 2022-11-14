# struct-versioning

The crate contains procedural macros for versioning data structures.
Macros [`versioned`] generate versioned variants of a struct.

Example:
```
# use struct_versioning::versioned;
#[versioned(version = 5, first_version = 2)]
struct Example {}

// versioned macro will generate suffixed versions of example struct,
// starting from `Version{first_version or 1}` to `Version{version}` inclusive
let _ver2 = ExampleVersion2 {};
let _ver3 = ExampleVersion3 {};
let _ver4 = ExampleVersion4 {};
let _ver5 = ExampleVersion5 {};

// last version will also be aliased with original struct name
let _orig: Example = ExampleVersion5 {};

#[versioned(version = 2, upper)]
#[derive(PartialEq, Debug)]
struct Upper {
    #[version(..2)]
    removed: u32,
    #[version(2.., upper(10))]
    added: u32,

    #[version(..2)]
    retyped: u32,
    #[version(2.., upper(retyped as u64))]
    retyped: u64,
}

// #[version] attribute on field allows to specify, in which versions of structs this field should present
// versions here works as standard rust ranges, start is inclusive, end is exclusive
let _up1 = UpperVersion1 {removed: 1, retyped: 0};
let _up2 = UpperVersion2 {added: 1, retyped: 0};

// and upper() allows to specify, which value should be assigned to this field in `From<OldVersion>` impl
assert_eq!(
    UpperVersion2::from(UpperVersion1 {removed: 0, retyped: 6}),
    UpperVersion2 {added: 10, retyped: 6},
);
```

In this case, the upgrade is described in `on_runtime_upgrade` using the `translate_values` substrate feature

```ignore
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn on_runtime_upgrade() -> Weight {
        if StorageVersion::get::<Pallet<T>>() < StorageVersion::new(1) {
            <TokenData<T>>::translate_values::<ItemDataVersion1, _>(|v| {
                Some(<ItemDataVersion2>::from(v))
            })
        }
        0
    }
}
```
