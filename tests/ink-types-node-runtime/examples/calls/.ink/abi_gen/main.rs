// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

fn main() -> Result<(), std::io::Error> {
    let abi = <contract::Calls as ink_lang::GenerateAbi>::generate_abi();
    let contents = serde_json::to_string_pretty(&abi)?;
    std::fs::create_dir("target").ok();
    std::fs::write("target/metadata.json", contents)?;
    Ok(())
}
