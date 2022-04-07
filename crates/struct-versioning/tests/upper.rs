use struct_versioning::versioned;

#[versioned(version = 2, upper)]
#[derive(Debug, PartialEq)]
struct MyStruct {
	#[version(..2)]
	v: u32,
	#[version(2.., upper(v as u64 + 1))]
	v: u64,
}

#[test]
fn test() {
	let old = MyStructVersion1 { v: 1 };
	let new = MyStructVersion2::from(old);
	assert_eq!(new.v, 2);
}
