#[macro_export]
macro_rules! construct_runtime_impl {
    (
        pub enum $runtime:ident where
            $($where_ident:ident = $where_ty:ty),* $(,)?
        {
            $(
                $(#[runtimes($($pallet_runtimes:ident),+ $(,)?)])?
                $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal
            ),*
            $(,)?
        }
    ) => {
        $crate::construct_runtime_helper! {
            runtime($runtime),
            where_clause($($where_ident = $where_ty),*),
            pallets(
                $(
                    $(#[runtimes($($pallet_runtimes),+)])?
                    $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index
                ),*,
            ),

            opal_pallets(),
            quartz_pallets(),
            unique_pallets(),
        }
    }
}

#[macro_export]
macro_rules! construct_runtime_helper {
    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            #[runtimes($($pallet_runtimes:ident),+)]
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,

            $($pallets_tl:tt)*
        ),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::add_runtime_specific_pallets! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets(
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
                $($pallets_tl)*
            ),

            runtimes($($pallet_runtimes),+,),

            opal_pallets($($opal_pallets)*),
            quartz_pallets($($quartz_pallets)*),
            unique_pallets($($unique_pallets)*),
        }
    };

    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,

            $($pallets_tl:tt)*
        ),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::construct_runtime_helper! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets($($pallets_tl)*),

            opal_pallets(
                $($opal_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            quartz_pallets(
                $($quartz_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            unique_pallets(
                $($unique_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),
        }
    };

    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        #[cfg(feature = "opal-runtime")]
        frame_support::construct_runtime! {
            pub enum $runtime where
                $($where_clause)*
            {
                $($opal_pallets)*
            }
        }

        #[cfg(feature = "quartz-runtime")]
        frame_support::construct_runtime! {
            pub enum $runtime where
                $($where_clause)*
            {
                $($quartz_pallets)*
            }
        }

        #[cfg(feature = "unique-runtime")]
        frame_support::construct_runtime! {
            pub enum $runtime where
                $($where_clause)*
            {
                $($unique_pallets)*
            }
        }
    };
}

#[macro_export]
macro_rules! add_runtime_specific_pallets {
    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        ),

        runtimes(
            opal,

            $($runtime_tl:tt)*
        ),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::add_runtime_specific_pallets! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets(
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
                $($pallets_tl)*
            ),

            runtimes($($runtime_tl)*),

            opal_pallets(
                $($opal_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),
            quartz_pallets($($quartz_pallets)*),
            unique_pallets($($unique_pallets)*),
        }
    };

    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        ),

        runtimes(
            quartz,

            $($runtime_tl:tt)*
        ),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::add_runtime_specific_pallets! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets(
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
                $($pallets_tl)*
            ),

            runtimes($($runtime_tl)*),

            opal_pallets($($opal_pallets)*),
            quartz_pallets(
                $($quartz_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),
            unique_pallets($($unique_pallets)*),
        }
    };

    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        ),

        runtimes(
            unique,

            $($runtime_tl:tt)*
        ),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::add_runtime_specific_pallets! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets(
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
                $($pallets_tl)*
            ),

            runtimes($($runtime_tl)*),

            opal_pallets($($opal_pallets)*),
            quartz_pallets($($quartz_pallets)*),
            unique_pallets(
                $($unique_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),
        }
    };

    (
        runtime($runtime:ident),
        where_clause($($where_clause:tt)*),
        pallets(
            $_pallet_name:ident: $_pallet_mod:ident::{$($_pallet_parts:ty),*} = $_index:literal,
            $($pallets_tl:tt)*
        ),

        runtimes(),

        opal_pallets($($opal_pallets:tt)*),
        quartz_pallets($($quartz_pallets:tt)*),
        unique_pallets($($unique_pallets:tt)*),
    ) => {
        $crate::construct_runtime_helper! {
            runtime($runtime),
            where_clause($($where_clause)*),
            pallets($($pallets_tl)*),

            opal_pallets($($opal_pallets)*),
            quartz_pallets($($quartz_pallets)*),
            unique_pallets($($unique_pallets)*),
        }
    };
}
