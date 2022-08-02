#[macro_export]
macro_rules! construct_runtime_impl {
    (
        select_runtime($select_runtime:ident);

        pub enum Runtime where
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
            select_runtime($select_runtime),
            selected_pallets(),

            where_clause($($where_ident = $where_ty),*),
            pallets(
                $(
                    $(#[runtimes($($pallet_runtimes),+)])?
                    $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index
                ),*,
            )
        }
    }
}

#[macro_export]
macro_rules! construct_runtime_helper {
    (
        select_runtime($select_runtime:ident),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            #[runtimes($($pallet_runtimes:ident),+)]
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,

            $($pallets_tl:tt)*
        )
    ) => {
        $crate::add_runtime_specific_pallets! {
            select_runtime($select_runtime),
            runtimes($($pallet_runtimes),+,),
            selected_pallets($($selected_pallets)*),

            where_clause($($where_clause)*),
            pallets(
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
                $($pallets_tl)*
            )
        }
    };

    (
        select_runtime($select_runtime:ident),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,

            $($pallets_tl:tt)*
        )
    ) => {
        $crate::construct_runtime_helper! {
            select_runtime($select_runtime),
            selected_pallets(
                $($selected_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            where_clause($($where_clause)*),
            pallets($($pallets_tl)*)
        }
    };

    (
        select_runtime($select_runtime:ident),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets()
    ) => {
        frame_support::construct_runtime! {
            pub enum Runtime where
                $($where_clause)*
            {
                $($selected_pallets)*
            }
        }
    };
}

#[macro_export]
macro_rules! add_runtime_specific_pallets {
    (
        select_runtime(opal),
        runtimes(opal, $($_runtime_tl:tt)*),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        )
    ) => {
        $crate::construct_runtime_helper! {
            select_runtime(opal),
            selected_pallets(
                $($selected_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            where_clause($($where_clause)*),
            pallets($($pallets_tl)*)
        }
    };

    (
        select_runtime(quartz),
        runtimes(quartz, $($_runtime_tl:tt)*),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        )
    ) => {
        $crate::construct_runtime_helper! {
            select_runtime(quartz),
            selected_pallets(
                $($selected_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            where_clause($($where_clause)*),
            pallets($($pallets_tl)*)
        }
    };

    (
        select_runtime(unique),
        runtimes(unique, $($_runtime_tl:tt)*),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            $pallet_name:ident: $pallet_mod:ident::{$($pallet_parts:ty),*} = $index:literal,
            $($pallets_tl:tt)*
        )
    ) => {
        $crate::construct_runtime_helper! {
            select_runtime(unique),
            selected_pallets(
                $($selected_pallets)*
                $pallet_name: $pallet_mod::{$($pallet_parts),*} = $index,
            ),

            where_clause($($where_clause)*),
            pallets($($pallets_tl)*)
        }
    };

    (
        select_runtime($select_runtime:ident),
        runtimes($_current_runtime:ident, $($runtime_tl:tt)*),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets($($pallets:tt)*)
    ) => {
        $crate::add_runtime_specific_pallets! {
            select_runtime($select_runtime),
            runtimes($($runtime_tl)*),
            selected_pallets($($selected_pallets)*),

            where_clause($($where_clause)*),
            pallets($($pallets)*)
        }
    };

    (
        select_runtime($select_runtime:ident),
        runtimes(),
        selected_pallets($($selected_pallets:tt)*),

        where_clause($($where_clause:tt)*),
        pallets(
            $_pallet_name:ident: $_pallet_mod:ident::{$($_pallet_parts:ty),*} = $_index:literal,
            $($pallets_tl:tt)*
        )
    ) => {
        $crate::construct_runtime_helper! {
            select_runtime($select_runtime),
            selected_pallets($($selected_pallets)*),

            where_clause($($where_clause)*),
            pallets($($pallets_tl)*)
        }
    };
}
