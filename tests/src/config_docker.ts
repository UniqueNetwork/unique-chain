//
// This file is subject to the terms and conditions defined in
// file 'LICENSE', which is part of this source code package.
//

import process from 'process';

const config = {
  substrateUrl: process.env.substrateUrl || 'ws://blockchain_nodes:9944',
  frontierUrl: process.env.frontierUrl || 'http://blockchain_nodes:9933',
};

export default config;
