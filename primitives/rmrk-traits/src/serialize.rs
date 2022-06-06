use core::convert::AsRef;
use serde::ser::{self, Serialize};

pub mod vec {
    use super::*;

    pub fn serialize<D, V, C>(value: &C, serializer: D) -> Result<D::Ok, D::Error>
    where
        D: ser::Serializer,
        V: Serialize,
        C: AsRef<[V]>,
    {
        value.as_ref().serialize(serializer)
    }
}

pub mod opt_vec {
    use super::*;

    pub fn serialize<D, V, C>(value: &Option<C>, serializer: D) -> Result<D::Ok, D::Error>
    where
        D: ser::Serializer,
        V: Serialize,
        C: AsRef<[V]>,
    {
        match value {
            Some(value) => super::vec::serialize(value, serializer),
            None => serializer.serialize_none(),
        }
    }
}
