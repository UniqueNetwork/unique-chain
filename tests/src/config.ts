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

import process from 'process';

const config = {
  substrateUrl: process.env.substrateUrl || 'ws://127.0.0.1:9944',
  frontierUrl: process.env.frontierUrl || 'http://127.0.0.1:9933',
  relayUrl: process.env.relayUrl || 'ws://127.0.0.1:9844',
  acalaUrl: process.env.acalaUrl || 'ws://127.0.0.1:9946',
  karuraUrl: process.env.acalaUrl || 'ws://127.0.0.1:9946',
  moonbeamUrl: process.env.moonbeamUrl || 'ws://127.0.0.1:9947',
  moonriverUrl: process.env.moonbeamUrl || 'ws://127.0.0.1:9947',
  westmintUrl: process.env.westmintUrl || 'ws://127.0.0.1:9948',
};

export default config;
