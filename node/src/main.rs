//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

mod chain_spec;
#[macro_use]
mod service;
mod cli;
mod command;

fn main() -> sc_cli::Result<()> {
    command::run()
}
