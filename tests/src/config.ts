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
  substrateUrl: process.env.SUBSTRATE_URL || 'ws://127.0.0.1:9944',
  relayUrl: process.env.RELAY_URL || 'ws://127.0.0.1:9844',
  acalaUrl: process.env.ACALA_URL || 'ws://127.0.0.1:9946',
  karuraUrl: process.env.ACALA_URL || 'ws://127.0.0.1:9946',
  moonbeamUrl: process.env.MOONBEAM_URL || 'ws://127.0.0.1:9947',
  moonriverUrl: process.env.MOONBEAM_URL || 'ws://127.0.0.1:9947',
  astarUrl: process.env.ASTAR_URL || 'ws://127.0.0.1:9949',
  shidenUrl: process.env.SHIDEN_URL || 'ws://127.0.0.1:9949',
  westmintUrl: process.env.WESTMINT_URL || 'ws://127.0.0.1:9948',
  statemineUrl: process.env.STATEMINE_URL || 'ws://127.0.0.1:9948',
  statemintUrl: process.env.STATEMINT_URL || 'ws://127.0.0.1:9948',
};

export default config;
