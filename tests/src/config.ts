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
  relayUrl: process.env.RELAY_URL || 'ws://127.0.0.1:9844',
  substrateUrl: process.env.RELAY_OPAL_URL || process.env.RELAY_QUARTZ_URL || process.env.RELAY_UNIQUE_URL || process.env.RELAY_SAPPHIRE_URL || 'ws://127.0.0.1:9944',
  acalaUrl: process.env.RELAY_ACALA_URL || 'ws://127.0.0.1:9946',
  karuraUrl: process.env.RELAY_KARURA_URL || 'ws://127.0.0.1:9946',
  moonbeamUrl: process.env.RELAY_MOONBEAM_URL || 'ws://127.0.0.1:9947',
  moonriverUrl: process.env.RELAY_MOONRIVER_URL || 'ws://127.0.0.1:9947',
  astarUrl: process.env.RELAY_ASTAR_URL || 'ws://127.0.0.1:9949',
  shidenUrl: process.env.RELAY_SHIDEN_URL || 'ws://127.0.0.1:9949',
  westmintUrl: process.env.RELAY_WESTMINT_URL || 'ws://127.0.0.1:9948',
  statemineUrl: process.env.RELAY_STATEMINE_URL || 'ws://127.0.0.1:9948',
  statemintUrl: process.env.RELAY_STATEMINT_URL || 'ws://127.0.0.1:9948',
};

export default config;
