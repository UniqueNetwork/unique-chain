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

import {Keyring} from '@polkadot/api';
import {IKeyringPair} from '@polkadot/types/types';

// WARNING: the WASM interface must be initialized before this function is called. 
// Use either `usingApi`, or `cryptoWaitReady` for consistency.
export default function privateKey(account: string, ss58Format?: number): IKeyringPair {
  const keyring = new Keyring({ss58Format, type: 'sr25519'});

  return keyring.addFromUri(account);
}
