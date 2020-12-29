//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

//! Substrate Node Template CLI library.
#![warn(missing_docs)]

mod chain_spec;
#[macro_use]
mod service;
mod cli;
mod command;
mod rpc;

fn main() -> sc_cli::Result<()> {
    command::run()
}
